"""
Chat router: SSE streaming chat from Ollama and persistent chat session CRUD.
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json
import httpx
from pathlib import Path
from datetime import datetime, timezone
from routers.auth import get_current_user
from lib.ollama import OLLAMA_HOST

router = APIRouter(prefix="/chat", tags=["chat"])

SESSIONS_PATH = Path(__file__).parent.parent.parent / "backend" / "data" / "chat-sessions.json"

def _read_sessions() -> list[dict]:
    p = SESSIONS_PATH if SESSIONS_PATH.exists() else Path(__file__).parent.parent / "data" / "chat-sessions.json"
    if p.exists():
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            return []
    return []

def _write_sessions(data: list[dict]) -> None:
    p = SESSIONS_PATH if SESSIONS_PATH.parent.exists() else Path(__file__).parent.parent / "data" / "chat-sessions.json"
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, indent=2), encoding="utf-8")

class CreateSessionRequest(BaseModel):
    title: str | None = None

class RenameSessionRequest(BaseModel):
    title: str

class SendMessageRequest(BaseModel):
    content: str
    model: str | None = None
    systemPrompt: str | None = None

@router.get("/sessions")
async def list_sessions(user: dict = Depends(get_current_user)):
    sessions = _read_sessions()
    return [{k: v for k, v in s.items() if k != "messages"} for s in sessions]

@router.post("/sessions")
async def create_session(req: CreateSessionRequest, user: dict = Depends(get_current_user)):
    sessions = _read_sessions()
    now = datetime.now(timezone.utc).isoformat()
    session = {
        "id": f"chat_{int(datetime.now().timestamp()*1000)}",
        "title": req.title or "New conversation",
        "createdAt": now,
        "updatedAt": now,
        "messages": []
    }
    sessions.insert(0, session)
    _write_sessions(sessions)
    return session

@router.get("/sessions/{session_id}")
async def get_session(session_id: str, user: dict = Depends(get_current_user)):
    sessions = _read_sessions()
    session = next((s for s in sessions if s["id"] == session_id), None)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@router.patch("/sessions/{session_id}")
async def rename_session(session_id: str, req: RenameSessionRequest, user: dict = Depends(get_current_user)):
    sessions = _read_sessions()
    session = next((s for s in sessions if s["id"] == session_id), None)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session["title"] = req.title.strip()
    session["updatedAt"] = datetime.now(timezone.utc).isoformat()
    _write_sessions(sessions)
    return session

@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, user: dict = Depends(get_current_user)):
    sessions = _read_sessions()
    sessions = [s for s in sessions if s["id"] != session_id]
    _write_sessions(sessions)
    return {"ok": True}

@router.post("/sessions/{session_id}/messages")
async def send_message(session_id: str, req: SendMessageRequest, user: dict = Depends(get_current_user)):
    sessions = _read_sessions()
    session = next((s for s in sessions if s["id"] == session_id), None)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    user_msg = {
        "role": "user",
        "content": req.content,
        "ts": datetime.now(timezone.utc).isoformat()
    }
    session["messages"].append(user_msg)
    session["updatedAt"] = datetime.now(timezone.utc).isoformat()
    _write_sessions(sessions)

    async def _stream_generator():
        from lib.registry import request_by_tag
        model_name = req.model
        if not model_name:
            try:
                m = await request_by_tag("draft")
                model_name = m["tag"]
            except Exception:
                model_name = "qwen2.5:7b"

        yield f"event: meta\ndata: {json.dumps({'model': model_name})}\n\n"

        ollama_messages = []
        if req.systemPrompt:
            ollama_messages.append({"role": "system", "content": req.systemPrompt})
        for m in session["messages"]:
            ollama_messages.append({"role": m["role"], "content": m["content"]})

        full_content = ""
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                async with client.stream(
                    "POST",
                    f"{OLLAMA_HOST}/api/chat",
                    json={"model": model_name, "messages": ollama_messages, "stream": True}
                ) as resp:
                    if not resp.is_success:
                        yield f"data: {json.dumps({'error': f'Ollama status {resp.status_code}'})}\n\n"
                        return

                    async for line in resp.aiter_lines():
                        line = line.strip()
                        if not line:
                            continue
                        try:
                            chunk = json.loads(line)
                            delta = chunk.get("message", {}).get("content", "")
                            if delta:
                                full_content += delta
                                yield f"data: {json.dumps({'delta': delta})}\n\n"

                            if chunk.get("done"):
                                assistant_msg = {
                                    "role": "assistant",
                                    "content": full_content,
                                    "model": model_name,
                                    "ts": datetime.now(timezone.utc).isoformat()
                                }
                                session["messages"].append(assistant_msg)
                                if session.get("title") == "New conversation" and len(session["messages"]) == 2:
                                    session["title"] = req.content[:60] + ("..." if len(req.content) > 60 else "")
                                session["updatedAt"] = datetime.now(timezone.utc).isoformat()
                                _write_sessions(sessions)
                                yield f"event: done\ndata: {json.dumps({'assistantMsg': assistant_msg, 'sessionTitle': session['title']})}\n\n"
                        except json.JSONDecodeError:
                            pass
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(_stream_generator(), media_type="text/event-stream")

