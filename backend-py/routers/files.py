"""
Files router: Serves documents with accurate Content-Type and headers for inline browser preview.
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from pathlib import Path
from routers.auth import get_current_user

router = APIRouter(prefix="/files", tags=["files"])

UPLOADS_ROOT = Path(__file__).parent.parent.parent / "backend" / "uploads"

MIME_TYPES = {
    ".pdf": "application/pdf",
    ".txt": "text/plain; charset=utf-8",
    ".md": "text/plain; charset=utf-8",
    ".py": "text/plain; charset=utf-8",
    ".json": "application/json",
    ".csv": "text/csv",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml"
}

@router.get("/serve/{role}/{workspace_id}/{folder}/{filename}")
async def serve_file_in_folder(role: str, workspace_id: str, folder: str, filename: str, user: dict = Depends(get_current_user)):
    p = UPLOADS_ROOT / role / workspace_id / filename
    if not p.exists():
        # Fallback to backend-py/data or subfolder
        p = Path(__file__).parent.parent / "uploads" / role / workspace_id / filename
        if not p.exists():
            raise HTTPException(status_code=404, detail="File not found")

    ext = p.suffix.lower()
    media_type = MIME_TYPES.get(ext, "application/octet-stream")
    is_inline = ext in [".pdf", ".txt", ".md", ".py", ".json", ".csv", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"]

    return FileResponse(
        str(p),
        media_type=media_type,
        headers={"Content-Disposition": f"{'inline' if is_inline else 'attachment'}; filename=\"{filename}\""}
    )

@router.get("/serve/{role}/{workspace_id}/{filename}")
async def serve_file_direct(role: str, workspace_id: str, filename: str, user: dict = Depends(get_current_user)):
    return await serve_file_in_folder(role, workspace_id, "Uploads", filename, user)

