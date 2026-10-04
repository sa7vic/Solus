"""
Model Registry router: Registry CRUD, live status, capability assignment, and Ollama pull streaming.
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json
from routers.auth import get_current_user
from lib.registry import (
    registry_with_live_status,
    add_model,
    remove_model,
    set_assignment,
    _read_registry
)
from lib.ollama import pull, list_installed

router = APIRouter(prefix="/models", tags=["models"])

class AddModelRequest(BaseModel):
    name: str
    displayName: str | None = None
    tag: str
    capabilities: list[str]

class UseModelRequest(BaseModel):
    capability: str

@router.get("")
@router.get("/")
async def get_legacy_models(user: dict = Depends(get_current_user)):
    # Legacy seeded models for UI fallback
    reg = await registry_with_live_status()
    return reg.get("models", [])

@router.get("/registry")
async def get_registry(user: dict = Depends(get_current_user)):
    return await registry_with_live_status()

@router.post("/registry")
async def create_model(req: AddModelRequest, user: dict = Depends(get_current_user)):
    try:
        return add_model(req.dict())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/registry/{name}")
async def delete_model(name: str, user: dict = Depends(get_current_user)):
    return remove_model(name)

@router.post("/registry/{name}/use")
async def use_model(name: str, req: UseModelRequest, user: dict = Depends(get_current_user)):
    try:
        return set_assignment(req.capability, name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/registry-pull/{tag}")
async def pull_model_stream(tag: str, user: dict = Depends(get_current_user)):
    async def _stream():
        import asyncio
        queue = asyncio.Queue()

        def on_prog(evt):
            queue.put_nowait(evt)

        async def _run_pull():
            try:
                await pull(tag, on_progress=on_prog)
                queue.put_nowait({"status": "success", "done": True})
            except Exception as e:
                queue.put_nowait({"status": "error", "error": str(e)})

        task = asyncio.create_task(_run_pull())

        while not task.done() or not queue.empty():
            try:
                evt = await asyncio.wait_for(queue.get(), timeout=1.0)
                yield f"data: {json.dumps(evt)}\n\n"
                if evt.get("done") or evt.get("status") == "error":
                    break
            except asyncio.TimeoutError:
                pass

    return StreamingResponse(_stream(), media_type="text/event-stream")

class AutoRegisterRequest(BaseModel):
    tag: str
    displayName: str | None = None

@router.post("/registry-auto")
async def auto_register_model(req: AutoRegisterRequest, user: dict = Depends(get_current_user)):
    """Auto-register an already-installed Ollama model with detected capabilities."""
    tag = req.tag.strip()
    if not tag:
        raise HTTPException(status_code=400, detail="tag is required")
    
    # Auto-detect capabilities from tag name
    tag_lower = tag.lower()
    caps = ["draft"]
    if any(k in tag_lower for k in ["coder", "code", "starcoder", "deepseek-coder"]):
        caps = ["code", "draft"]
    elif any(k in tag_lower for k in ["vl", "vision", "llava", "minicpm", "qwen2-vl", "qwen2.5vl"]):
        caps = ["vision", "draft"]
    elif any(k in tag_lower for k in ["r1", "deepseek", "reasoning"]):
        caps = ["verify", "draft"]
    elif any(k in tag_lower for k in ["1.5b", "0.5b", "1b"]):
        caps = ["routing", "draft"]
    
    # Derive a clean name from tag
    name = tag.replace(":", "_").replace("/", "_")
    display = req.displayName or tag.split(":")[0].replace("-", " ").title()
    
    try:
        result = add_model({
            "name": name,
            "displayName": display,
            "tag": tag,
            "capabilities": caps
        })
        return {"ok": True, "name": name, "tag": tag, "capabilities": caps, "registry": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
