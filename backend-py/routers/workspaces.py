"""
Workspaces router: Roles, workspaces CRUD, uploads with sensitivity classification, and folder/file ops.
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from pydantic import BaseModel
import json
import shutil
from pathlib import Path
from datetime import datetime, timezone
from routers.auth import get_current_user

router = APIRouter(tags=["workspaces"])

DATA_PATH = Path(__file__).parent.parent.parent / "backend" / "data" / "workspaces.json"
ROLES_PATH = Path(__file__).parent.parent.parent / "backend" / "data" / "roles.json"
UPLOADS_ROOT = Path(__file__).parent.parent.parent / "backend" / "uploads"

def _read_workspaces() -> dict:
    p = DATA_PATH if DATA_PATH.exists() else Path(__file__).parent.parent / "data" / "workspaces.json"
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}

def _write_workspaces(data: dict) -> None:
    p = DATA_PATH if DATA_PATH.parent.exists() else Path(__file__).parent.parent / "data" / "workspaces.json"
    p.write_text(json.dumps(data, indent=2), encoding="utf-8")

def _read_roles() -> list[dict]:
    p = ROLES_PATH if ROLES_PATH.exists() else Path(__file__).parent.parent / "data" / "roles.json"
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else []

def classify(filename: str) -> dict:
    f = filename.lower()
    if any(k in f for k in ["financ", "confidential", "strategy"]):
        return {"tier": None, "status": "pending_review", "reason": "Ambiguous / high-sensitivity filename — Tier 3 requires manual confirmation."}
    if any(k in f for k in ["sop", "inspection", "incident", "quote"]):
        return {"tier": 2, "status": "classified", "reason": "Matched a restricted-document standard pattern."}
    return {"tier": 1, "status": "classified", "reason": "No restricted pattern matched — unclassified."}

class CreateWorkspaceRequest(BaseModel):
    name: str

class CreateFolderRequest(BaseModel):
    name: str

@router.get("/roles")
async def get_roles(user: dict = Depends(get_current_user)):
    return _read_roles()

@router.get("/workspaces/{role}")
async def list_workspaces(role: str, user: dict = Depends(get_current_user)):
    all_ws = _read_workspaces()
    ws_list = all_ws.get(role)
    if ws_list is None:
        raise HTTPException(status_code=404, detail="Unknown role")
    
    summaries = []
    for w in ws_list:
        files = w.get("files", {})
        summaries.append({
            "id": w["id"],
            "name": w["name"],
            "createdAt": w["createdAt"],
            "lastActive": w["lastActive"],
            "generatedCount": len(files.get("Generated", [])),
            "uploadsCount": len(files.get("Uploads", []))
        })
    summaries.sort(key=lambda x: x["lastActive"], reverse=True)
    return summaries

@router.post("/workspaces/{role}")
async def create_workspace(role: str, req: CreateWorkspaceRequest, user: dict = Depends(get_current_user)):
    all_ws = _read_workspaces()
    if role not in all_ws:
        all_ws[role] = []
    
    ws_list = all_ws[role]
    kb_files = ws_list[0].get("files", {}).get("Knowledge Base", []) if ws_list else []
    now = datetime.now(timezone.utc).isoformat()
    
    new_ws = {
        "id": f"ws_{int(datetime.now().timestamp()*1000)}",
        "name": req.name.strip(),
        "createdAt": now,
        "lastActive": now,
        "trace": [],
        "evidence": [],
        "files": {"Knowledge Base": kb_files, "Uploads": [], "Generated": []}
    }
    all_ws[role].append(new_ws)
    _write_workspaces(all_ws)
    return new_ws

@router.get("/workspaces/{role}/{workspace_id}")
async def get_workspace(role: str, workspace_id: str, user: dict = Depends(get_current_user)):
    all_ws = _read_workspaces()
    ws_list = all_ws.get(role, [])
    ws = next((w for w in ws_list if w["id"] == workspace_id), None)
    role_obj = next((r for r in _read_roles() if r["id"] == role), None)
    
    if not ws or not role_obj:
        raise HTTPException(status_code=404, detail="Workspace or role not found")

    ws["lastActive"] = datetime.now(timezone.utc).isoformat()
    _write_workspaces(all_ws)
    return {"role": role_obj, **ws}

@router.post("/workspaces/{role}/{workspace_id}/upload")
async def upload_file(role: str, workspace_id: str, file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    all_ws = _read_workspaces()
    ws_list = all_ws.get(role, [])
    ws = next((w for w in ws_list if w["id"] == workspace_id), None)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    dest_dir = UPLOADS_ROOT / role / workspace_id
    dest_dir.mkdir(parents=True, exist_ok=True)
    target_path = dest_dir / file.filename
    
    with target_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    classification = classify(file.filename)
    ws.setdefault("files", {}).setdefault("Uploads", []).append({
        "name": file.filename,
        "tier": classification["tier"],
        "status": classification["status"]
    })
    ws["lastActive"] = datetime.now(timezone.utc).isoformat()
    _write_workspaces(all_ws)
    return {"file": file.filename, **classification}

@router.post("/workspaces/{role}/{workspace_id}/folders")
async def create_folder(role: str, workspace_id: str, req: CreateFolderRequest, user: dict = Depends(get_current_user)):
    all_ws = _read_workspaces()
    ws = next((w for w in all_ws.get(role, []) if w["id"] == workspace_id), None)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    folder_name = req.name.strip()
    if not folder_name:
        raise HTTPException(status_code=400, detail="Folder name is required")
    if folder_name in ws.setdefault("files", {}):
        raise HTTPException(status_code=409, detail="Folder already exists")
    
    ws["files"][folder_name] = []
    ws["lastActive"] = datetime.now(timezone.utc).isoformat()
    _write_workspaces(all_ws)
    return {"name": folder_name}

@router.delete("/workspaces/{role}/{workspace_id}/folders/{name}")
async def delete_folder(role: str, workspace_id: str, name: str, user: dict = Depends(get_current_user)):
    all_ws = _read_workspaces()
    ws = next((w for w in all_ws.get(role, []) if w["id"] == workspace_id), None)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    ws.get("files", {}).pop(name, None)
    ws["lastActive"] = datetime.now(timezone.utc).isoformat()
    _write_workspaces(all_ws)
    return {"ok": True}

@router.delete("/workspaces/{role}/{workspace_id}/files/{folder}/{filename}")
async def delete_file(role: str, workspace_id: str, folder: str, filename: str, user: dict = Depends(get_current_user)):
    all_ws = _read_workspaces()
    ws = next((w for w in all_ws.get(role, []) if w["id"] == workspace_id), None)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    file_list = ws.get("files", {}).get(folder, [])
    ws["files"][folder] = [f for f in file_list if f["name"] != filename]
    ws["lastActive"] = datetime.now(timezone.utc).isoformat()
    _write_workspaces(all_ws)

    p = UPLOADS_ROOT / role / workspace_id / filename
    if p.exists():
        p.unlink(missing_ok=True)
    return {"ok": True}

@router.get("/search/{role}")
async def search_role_workspaces(role: str, q: str = "", user: dict = Depends(get_current_user)):
    q = q.strip().lower()
    if not q:
        return []
    all_ws = _read_workspaces()
    ws_list = all_ws.get(role, [])
    results = []

    for ws in ws_list:
        if q in ws.get("name", "").lower():
            results.append({"workspaceId": ws["id"], "workspaceName": ws["name"], "type": "workspace", "snippet": ws["name"]})
        for folder, files in ws.get("files", {}).items():
            for f in files:
                if q in f.get("name", "").lower():
                    results.append({"workspaceId": ws["id"], "workspaceName": ws["name"], "type": "file", "snippet": f"{folder}/{f['name']}"})
        for t in ws.get("trace", []):
            if q in t.get("text", "").lower():
                results.append({"workspaceId": ws["id"], "workspaceName": ws["name"], "type": "trace", "snippet": f"{t.get('agent')}: {t.get('text')}"})

    return results[:25]

