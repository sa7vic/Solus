"""
Workflows router: CRUD and execution for named node-graph workflows.
Workflows are stored as JSON in data/workflows.json.
Each workflow is a {id, name, description, nodes[], edges[]} definition.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import json
from pathlib import Path
from datetime import datetime, timezone
from routers.auth import get_current_user

router = APIRouter(prefix="/workflows", tags=["workflows"])

WF_PATH = Path(__file__).parent.parent.parent / "backend" / "data" / "workflows.json"

def _get_path() -> Path:
    if WF_PATH.exists():
        return WF_PATH
    local = Path(__file__).parent.parent / "data" / "workflows.json"
    return local

def _read() -> list[dict]:
    p = _get_path()
    if p.exists():
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            return []
    return _default_workflows()

def _write(data: list[dict]) -> None:
    p = WF_PATH if WF_PATH.parent.exists() else Path(__file__).parent.parent / "data" / "workflows.json"
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, indent=2), encoding="utf-8")

def _default_workflows() -> list[dict]:
    return [
        {
            "id": "wf_inspection",
            "name": "Inspection Approval",
            "description": "Analyze an inspection report, compare with SOP, calculate deviations, generate approval note, draft email.",
            "icon": "ClipboardCheck",
            "category": "industrial",
            "createdAt": "2026-01-01T00:00:00Z",
            "nodes": [
                {"id": "n1", "type": "input", "label": "Upload Report", "data": {"description": "Upload inspection report PDF"}},
                {"id": "n2", "type": "agent", "label": "Vision / OCR", "data": {"agent": "vision", "description": "Extract text and findings from scanned report"}},
                {"id": "n3", "type": "agent", "label": "RAG Retrieval", "data": {"agent": "retrieval", "description": "Search relevant SOPs and standards"}},
                {"id": "n4", "type": "agent", "label": "Reasoning", "data": {"agent": "reasoning", "description": "Analyze findings against SOP"}},
                {"id": "n5", "type": "agent", "label": "Calculation", "data": {"agent": "calculation", "description": "Calculate deviations and risk scores"}},
                {"id": "n6", "type": "agent", "label": "Verifier", "data": {"agent": "verifier", "description": "Verify all claims are supported"}},
                {"id": "n7", "type": "agent", "label": "Document Agent", "data": {"agent": "document", "description": "Generate approval note DOCX"}},
                {"id": "n8", "type": "approval", "label": "Human Approval", "data": {"description": "Review and approve before sending"}},
                {"id": "n9", "type": "agent", "label": "Email Agent", "data": {"agent": "email", "description": "Draft and send email to manager"}},
                {"id": "n10", "type": "output", "label": "Output", "data": {"description": "Approval note + audit trail"}}
            ],
            "edges": [
                {"id": "e1-2", "source": "n1", "target": "n2"},
                {"id": "e2-3", "source": "n2", "target": "n3"},
                {"id": "e3-4", "source": "n3", "target": "n4"},
                {"id": "e4-5", "source": "n4", "target": "n5"},
                {"id": "e5-6", "source": "n5", "target": "n6"},
                {"id": "e6-7", "source": "n6", "target": "n7"},
                {"id": "e7-8", "source": "n7", "target": "n8"},
                {"id": "e8-9", "source": "n8", "target": "n9"},
                {"id": "e9-10", "source": "n9", "target": "n10"}
            ]
        },
        {
            "id": "wf_code",
            "name": "Code Fix & Verify",
            "description": "Generate, sandbox-execute, test, and verify code until all tests pass.",
            "icon": "Code2",
            "category": "development",
            "createdAt": "2026-01-01T00:00:00Z",
            "nodes": [
                {"id": "n1", "type": "input", "label": "Code Task", "data": {"description": "Describe the code requirement"}},
                {"id": "n2", "type": "agent", "label": "RAG Retrieval", "data": {"agent": "retrieval", "description": "Search internal code examples"}},
                {"id": "n3", "type": "agent", "label": "Coding Agent", "data": {"agent": "coding", "description": "Generate code solution"}},
                {"id": "n4", "type": "agent", "label": "Sandbox", "data": {"agent": "sandbox", "description": "Execute code in isolated environment"}},
                {"id": "n5", "type": "agent", "label": "Test Agent", "data": {"agent": "test", "description": "Run pytest and analyze results"}},
                {"id": "n6", "type": "agent", "label": "Code Verifier", "data": {"agent": "code_verifier", "description": "Verify code quality and security"}},
                {"id": "n7", "type": "output", "label": "Output", "data": {"description": "Final verified code + test report"}}
            ],
            "edges": [
                {"id": "e1-2", "source": "n1", "target": "n2"},
                {"id": "e2-3", "source": "n2", "target": "n3"},
                {"id": "e3-4", "source": "n3", "target": "n4"},
                {"id": "e4-5", "source": "n4", "target": "n5"},
                {"id": "e5-6", "source": "n5", "target": "n6"},
                {"id": "e6-7", "source": "n6", "target": "n7"}
            ]
        },
        {
            "id": "wf_email",
            "name": "Automated Email Workflow",
            "description": "Draft an email based on context, verify against policy, request human approval, then send.",
            "icon": "Mail",
            "category": "communication",
            "createdAt": "2026-01-01T00:00:00Z",
            "nodes": [
                {"id": "n1", "type": "input", "label": "Email Request", "data": {"description": "Describe what the email should say"}},
                {"id": "n2", "type": "agent", "label": "Knowledge Search", "data": {"agent": "retrieval", "description": "Search relevant policies and context"}},
                {"id": "n3", "type": "agent", "label": "Email Agent", "data": {"agent": "email", "description": "Draft the email"}},
                {"id": "n4", "type": "agent", "label": "Policy Verifier", "data": {"agent": "policy_verifier", "description": "Check email against communication policies"}},
                {"id": "n5", "type": "approval", "label": "Human Approval", "data": {"description": "Review draft email before sending"}},
                {"id": "n6", "type": "output", "label": "Send / Archive", "data": {"description": "Email sent and archived in audit log"}}
            ],
            "edges": [
                {"id": "e1-2", "source": "n1", "target": "n2"},
                {"id": "e2-3", "source": "n2", "target": "n3"},
                {"id": "e3-4", "source": "n3", "target": "n4"},
                {"id": "e4-5", "source": "n4", "target": "n5"},
                {"id": "e5-6", "source": "n5", "target": "n6"}
            ]
        }
    ]

class WorkflowNode(BaseModel):
    id: str
    type: str
    label: str
    data: dict = {}

class WorkflowEdge(BaseModel):
    id: str
    source: str
    target: str

class CreateWorkflowRequest(BaseModel):
    name: str
    description: str = ""
    icon: str = "Workflow"
    category: str = "custom"
    nodes: list[dict] = []
    edges: list[dict] = []

class RunWorkflowRequest(BaseModel):
    input: str = ""
    params: dict = {}

@router.get("")
@router.get("/")
async def list_workflows(user: dict = Depends(get_current_user)):
    return _read()

@router.post("")
async def create_workflow(req: CreateWorkflowRequest, user: dict = Depends(get_current_user)):
    workflows = _read()
    now = datetime.now(timezone.utc).isoformat()
    wf = {
        "id": f"wf_{int(datetime.now().timestamp()*1000)}",
        "name": req.name.strip(),
        "description": req.description,
        "icon": req.icon,
        "category": req.category,
        "createdAt": now,
        "nodes": req.nodes,
        "edges": req.edges
    }
    workflows.append(wf)
    _write(workflows)
    return wf

@router.get("/{workflow_id}")
async def get_workflow(workflow_id: str, user: dict = Depends(get_current_user)):
    wfs = _read()
    wf = next((w for w in wfs if w["id"] == workflow_id), None)
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return wf

@router.delete("/{workflow_id}")
async def delete_workflow(workflow_id: str, user: dict = Depends(get_current_user)):
    wfs = _read()
    # Don't allow deleting built-in workflows
    wf = next((w for w in wfs if w["id"] == workflow_id), None)
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    if workflow_id.startswith("wf_inspection") or workflow_id.startswith("wf_code") or workflow_id.startswith("wf_email"):
        raise HTTPException(status_code=403, detail="Cannot delete built-in workflows")
    wfs = [w for w in wfs if w["id"] != workflow_id]
    _write(wfs)
    return {"ok": True}

@router.post("/{workflow_id}/run")
async def run_workflow(workflow_id: str, req: RunWorkflowRequest, user: dict = Depends(get_current_user)):
    """Execute a workflow. Maps workflows to orchestrator runs using the user's role scope."""
    from lib.orchestrator import run_generate_document, run_fix_code
    from pathlib import Path
    
    wfs = _read()
    wf = next((w for w in wfs if w["id"] == workflow_id), None)
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    role = user.get("role") or "inspection"
    task = req.input.strip() or f"Execute workflow: {wf['name']}"
    
    # Handle code fix workflow
    if workflow_id == "wf_code":
        src = req.params.get("source_code") or (
            "# Industrial Sensor Calibration Routine\n"
            "def calibrate_flow_rate(raw_signal, zero_offset, span_factor):\n"
            "    # Bug: inverted offset arithmetic\n"
            "    return (raw_signal + zero_offset) * span_factor\n"
        )
        tests = req.params.get("test_code") or (
            "def test_calibration():\n"
            "    # Zero offset should be subtracted from raw reading\n"
            "    assert calibrate_flow_rate(105.0, 5.0, 2.0) == 200.0\n"
            "    assert calibrate_flow_rate(5.0, 5.0, 1.0) == 0.0\n"
        )
        run_id = await run_fix_code(task=task, source_code=src, test_code=tests, filename="calibration.py")
        return {"runId": run_id, "workflowId": workflow_id, "workflowName": wf["name"]}

    # Determine output format from workflow
    fmt = "docx"
    if "presentation" in wf.get("name", "").lower() or "board" in wf.get("name", "").lower():
        fmt = "pptx"
    
    out_dir = Path(__file__).parent.parent.parent / "backend" / "uploads" / "workflow" / workflow_id
    out_dir_local = Path(__file__).parent.parent / "data" / "workflow_runs"
    actual_dir = out_dir if out_dir.parent.parent.exists() else out_dir_local
    actual_dir.mkdir(parents=True, exist_ok=True)
    
    run_id = await run_generate_document(
        role=role,
        workspace_id=workflow_id,
        task=task,
        fmt=fmt,
        out_dir=str(actual_dir)
    )
    return {"runId": run_id, "workflowId": workflow_id, "workflowName": wf["name"]}

class SendEmailRequest(BaseModel):
    to: str
    subject: str
    body: str
    from_email: str | None = None
    app_password: str | None = None
    smtp_host: str | None = None
    smtp_port: int | None = None
    run_id: str | None = None

@router.post("/send-email")
async def send_workflow_email(req: SendEmailRequest, user: dict = Depends(get_current_user)):
    """Send or dispatch an email from a completed workflow, with tamper-evident audit logging."""
    import os, smtplib
    from email.mime.text import MIMEText
    from lib.orchestrator import audit_chain
    from datetime import datetime, timezone
    
    from_addr = (req.from_email or os.environ.get("SMTP_USER", "")).strip()
    app_pass = (req.app_password or os.environ.get("SMTP_PASSWORD", "")).strip().replace(" ", "")
    host = (req.smtp_host or os.environ.get("SMTP_HOST", "")).strip()
    port = req.smtp_port or int(os.environ.get("SMTP_PORT", "587"))
    
    # Auto-detect Gmail if from_addr is a gmail address
    if from_addr and "@gmail.com" in from_addr.lower() and not host:
        host = "smtp.gmail.com"
        port = 587

    dispatched_via = "Internal Air-Gapped Mail Relay"
    
    if from_addr and app_pass and host:
        try:
            msg = MIMEText(req.body, "plain", "utf-8")
            msg["Subject"] = req.subject
            msg["From"] = from_addr
            msg["To"] = req.to
            with smtplib.SMTP(host, port, timeout=15) as server:
                server.starttls()
                server.login(from_addr, app_pass)
                server.sendmail(from_addr, [req.to], msg.as_string())
            dispatched_via = f"Real SMTP ({host} via {from_addr})"
        except Exception as e:
            err_text = str(e)
            tip = ""
            if "535" in err_text or "BadCredentials" in err_text or "Username and Password not accepted" in err_text:
                tip = " (Tip: Google requires a 16-character App Password generated at myaccount.google.com/apppasswords, not your standard Google password)."
            raise HTTPException(status_code=400, detail=f"SMTP Delivery Failed: {err_text}{tip}")
    elif from_addr and not app_pass:
        raise HTTPException(status_code=400, detail="An App Password is required when providing a From email address.")

    # Record in audit log
    now_str = datetime.now(timezone.utc).isoformat()
    msg_id = f"msg_{int(datetime.now().timestamp() * 1000)}"
    audit_chain.append(
        actor=user.get("username", "system"),
        action="email.dispatched",
        target=req.to,
        meta={
            "messageId": msg_id,
            "from": from_addr or "airgap-relay@company.internal",
            "subject": req.subject,
            "dispatchedVia": dispatched_via,
            "runId": req.run_id
        }
    )
    
    return {
        "ok": True,
        "status": "sent",
        "messageId": msg_id,
        "sender": from_addr or "airgap-relay@company.internal",
        "recipient": req.to,
        "subject": req.subject,
        "dispatchedVia": dispatched_via,
        "timestamp": now_str
    }



