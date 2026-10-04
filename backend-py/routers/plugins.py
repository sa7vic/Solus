"""
Plugins router: Air-gapped tool registry for role-scoped industrial and PSU capabilities.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import json
from pathlib import Path
from .auth import get_current_user

router = APIRouter(prefix="/plugins", tags=["plugins"])

PLUGINS_FILE = Path(__file__).parent.parent.parent / "backend" / "data" / "plugins.json"

def _read_plugins() -> list[dict]:
    p = PLUGINS_FILE if PLUGINS_FILE.exists() else Path(__file__).parent.parent / "data" / "plugins.json"
    if p.exists():
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            return []
    return []

def _write_plugins(data: list[dict]) -> None:
    p = PLUGINS_FILE if PLUGINS_FILE.parent.exists() else Path(__file__).parent.parent / "data" / "plugins.json"
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, indent=2), encoding="utf-8")

class TogglePluginRequest(BaseModel):
    installed: bool

@router.get("")
@router.get("/")
async def list_plugins(user: dict = Depends(get_current_user)):
    plugins = _read_plugins()
    return plugins

@router.patch("/{plugin_id}")
async def toggle_plugin(plugin_id: str, req: TogglePluginRequest, user: dict = Depends(get_current_user)):
    plugins = _read_plugins()
    found = None
    for p in plugins:
        if p["id"] == plugin_id:
            # Check role scope if not admin
            if not user.get("crossRole") and user.get("role") != "admin":
                user_role = str(user.get("role", "")).lower()
                allowed_roles = [r.lower() for r in p.get("role_scope", [])]
                if user_role not in allowed_roles:
                    raise HTTPException(
                        status_code=403, 
                        detail=f"Plugin '{p['name']}' is restricted to roles: {', '.join(p.get('role_scope', []))}"
                    )
            p["installed"] = req.installed
            found = p
            break
            
    if not found:
        raise HTTPException(status_code=404, detail="Plugin not found")
        
    _write_plugins(plugins)
    return found

