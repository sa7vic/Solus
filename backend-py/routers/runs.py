"""
Runs router: Agent invocations, run status, SSE live trace streaming, downloads, and audit logs.
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel
import json
import base64
import asyncio
from pathlib import Path
from datetime import datetime, timezone
from routers.auth import get_current_user
from lib.orchestrator import (
    run_generate_document,
    run_fix_code,
    run_calculate,
    run_vision_describe,
    run_analyze_blueprint,
    run_ocr_pdf,
    get_run,
    list_runs,
    listeners,
    audit_chain
)
from lib.ollama import ping

router = APIRouter(tags=["runs"])

UPLOADS_ROOT = Path(__file__).parent.parent.parent / "backend" / "uploads"

class GenerateDocRequest(BaseModel):
    task: str
    format: str = "docx"

class FixCodeRequest(BaseModel):
    task: str
    sourceCode: str
    testCode: str
    filename: str = "solution.py"

class CalculateRequest(BaseModel):
    task: str

@router.get("/ollama/health")
async def ollama_health(user: dict = Depends(get_current_user)):
    return {"reachable": await ping()}

from lib.ollama import list_installed

@router.get("/ollama/models")
async def ollama_models(user: dict = Depends(get_current_user)):
    """Returns raw list of all models installed in Ollama (auto-discovery)."""
    try:
        tags = await list_installed()
        return {"models": [{"tag": t, "name": t.split(":")[0]} for t in tags]}
    except Exception as e:
        return {"models": [], "error": str(e)}

@router.get("/runs")
async def get_all_runs(user: dict = Depends(get_current_user)):
    return list_runs()

@router.post("/run/generate-document/{role}/{workspace_id}")
async def start_generate_doc(role: str, workspace_id: str, req: GenerateDocRequest, user: dict = Depends(get_current_user)):
    if not req.task.strip():
        raise HTTPException(status_code=400, detail="task is required")
    out_dir = UPLOADS_ROOT / role / workspace_id
    out_dir.mkdir(parents=True, exist_ok=True)
    run_id = await run_generate_document(role, workspace_id, req.task, fmt=req.format, out_dir=str(out_dir))
    return {"runId": run_id}

@router.post("/run/fix-code")
async def start_fix_code(req: FixCodeRequest, user: dict = Depends(get_current_user)):
    if not req.task or not req.sourceCode or not req.testCode:
        raise HTTPException(status_code=400, detail="task, sourceCode, and testCode are required")
    run_id = await run_fix_code(req.task, req.sourceCode, req.testCode, req.filename)
    return {"runId": run_id}

@router.post("/run/calculate")
async def start_calculate(req: CalculateRequest, user: dict = Depends(get_current_user)):
    if not req.task.strip():
        raise HTTPException(status_code=400, detail="task is required")
    out_dir = Path(__file__).parent.parent / "data" / "calc_reports"
    out_dir.mkdir(parents=True, exist_ok=True)
    run_id = await run_calculate(req.task, out_dir=str(out_dir))
    return {"runId": run_id}

@router.post("/run/vision-describe")
async def start_vision_describe(file: UploadFile = File(...), kind: str = Form("photograph"), user: dict = Depends(get_current_user)):
    content = await file.read()
    b64 = base64.b64encode(content).decode()
    run_id = await run_vision_describe(b64, kind=kind, filename=file.filename)
    return {"runId": run_id}

@router.post("/run/analyze-blueprint")
async def start_analyze_blueprint(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    content = await file.read()
    b64 = base64.b64encode(content).decode()
    run_id = await run_analyze_blueprint(b64, filename=file.filename)
    return {"runId": run_id}

@router.post("/run/ocr-pdf")
async def start_ocr_pdf(file: UploadFile = File(...), role: str = Form("inspection"), user: dict = Depends(get_current_user)):
    content = await file.read()
    run_id = await run_ocr_pdf(content, filename=file.filename, role=role)
    return {"runId": run_id}

@router.get("/run/{run_id}")
async def get_run_status(run_id: str, user: dict = Depends(get_current_user)):
    run = get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return {"status": run["status"], "trace": run["trace"], "result": run["result"], "error": run["error"]}

@router.get("/run/{run_id}/stream")
async def stream_run(run_id: str, token: str | None = None):
    run = get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    async def _event_generator():
        for t in run.get("trace", []):
            yield f"data: {json.dumps(t)}\n\n"

        if run.get("status") != "running":
            yield f"event: done\ndata: {json.dumps({'status': run['status'], 'result': run['result'], 'error': run['error']})}\n\n"
            return

        queue = asyncio.Queue()
        listeners.setdefault(run_id, set()).add(queue)

        try:
            while True:
                try:
                    entry = await asyncio.wait_for(queue.get(), timeout=1.0)
                    yield f"data: {json.dumps(entry)}\n\n"
                except asyncio.TimeoutError:
                    pass

                cur = get_run(run_id)
                if cur and cur.get("status") != "running":
                    yield f"event: done\ndata: {json.dumps({'status': cur['status'], 'result': cur['result'], 'error': cur['error']})}\n\n"
                    break
        finally:
            listeners.get(run_id, set()).discard(queue)

    return StreamingResponse(_event_generator(), media_type="text/event-stream")

@router.get("/run/download/{role}/{workspace_id}/{filename}")
async def download_file(role: str, workspace_id: str, filename: str, user: dict = Depends(get_current_user)):
    candidate_paths = [
        UPLOADS_ROOT / role / workspace_id / filename,
        UPLOADS_ROOT / "workflow" / workspace_id / filename,
        Path(__file__).parent.parent / "data" / "chat_tasks" / filename,
        Path(__file__).parent.parent / "data" / "workflow_runs" / filename,
        Path(__file__).parent.parent.parent / "backend" / "uploads" / "workflow" / workspace_id / filename,
        Path(__file__).parent.parent.parent / "backend" / "uploads" / role / workspace_id / filename,
    ]
    for p in candidate_paths:
        if p.exists():
            return FileResponse(str(p), filename=filename)
    raise HTTPException(status_code=404, detail=f"File '{filename}' not found")


@router.get("/audit/verify")
async def verify_audit(user: dict = Depends(get_current_user)):
    return audit_chain.verify()

@router.get("/audit/chain")
async def get_audit_chain(user: dict = Depends(get_current_user)):
    return audit_chain.all()

class ApproveRequest(BaseModel):
    decision: str = "approve"  # "approve" or "reject"
    comment: str | None = None

@router.post("/run/approve/{run_id}")
async def approve_run(run_id: str, req: ApproveRequest, user: dict = Depends(get_current_user)):
    """Approve or reject a pending human-approval step in a run."""
    from lib.orchestrator import _runs, _emit
    run = _runs.get(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    if run.get("status") != "awaiting_approval":
        raise HTTPException(status_code=409, detail="Run is not awaiting approval")
    
    decision = req.decision
    run["approval"] = {"decision": decision, "comment": req.comment, "by": user.get("username"), "at": datetime.now(timezone.utc).isoformat()}
    run["status"] = "running" if decision == "approve" else "rejected"
    
    trace_entry = {
        "agent": "Human Approval",
        "status": "approved" if decision == "approve" else "rejected",
        "text": f"{'Approved' if decision == 'approve' else 'Rejected'} by {user.get('username', 'user')}: {req.comment or ''}",
        "ts": datetime.now(timezone.utc).isoformat()
    }
    run["trace"].append(trace_entry)
    _emit(run_id, trace_entry)
    
    # Signal the approval event so waiting orchestrator coroutine can continue
    approval_event = run.get("_approval_event")
    if approval_event:
        approval_event.set()
    
    return {"ok": True, "decision": decision}

class ChatTaskRequest(BaseModel):
    task: str
    role: str | None = None  # Allow null / None from frontend
    session_id: str | None = None
    format: str = "docx"  # output format if a document is needed
    template: str | None = None  # for PPTX: template name

@router.post("/run/chat-task")
async def start_chat_task(req: ChatTaskRequest, user: dict = Depends(get_current_user)):
    """Start an agentic task from the chat interface. Supports docx, pptx, xlsx, and code sandbox."""
    if not req.task.strip():
        raise HTTPException(status_code=400, detail="task is required")
    
    role = req.role or user.get("role") or "inspection"
    out_dir = UPLOADS_ROOT / role / "chat_tasks"
    out_dir_local = Path(__file__).parent.parent / "data" / "chat_tasks"
    actual_dir = out_dir if UPLOADS_ROOT.parent.exists() else out_dir_local
    actual_dir.mkdir(parents=True, exist_ok=True)
    
    fmt = (req.format or "docx").lower()
    if fmt in ("xlsx", "excel", "sheet", "calc"):
        from lib.orchestrator import run_calculate
        run_id = await run_calculate(task=req.task, out_dir=str(actual_dir))
    elif fmt in ("code", "py", "sandbox"):
        from lib.orchestrator import run_fix_code
        run_id = await run_fix_code(
            task=req.task,
            source_code="# Internal Industrial Tooling Script\n",
            test_code="",
            filename="tool_script.py"
        )
    else:
        doc_fmt = "pptx" if fmt in ("pptx", "presentation", "deck", "slides") else "docx"
        run_id = await run_generate_document(
            role=role,
            workspace_id="chat_tasks",
            task=req.task,
            fmt=doc_fmt,
            out_dir=str(actual_dir)
        )
    return {"runId": run_id}

@router.get("/audit")
async def get_audit(user: dict = Depends(get_current_user)):
    from lib.hashchain import HashChain
    from pathlib import Path
    audit_path = Path(__file__).parent.parent.parent / "backend" / "data" / "hashchain-audit.json"
    local_path = Path(__file__).parent.parent / "data" / "hashchain-audit.json"
    p = audit_path if audit_path.exists() else local_path
    chain = HashChain(str(p))
    return chain.all()

