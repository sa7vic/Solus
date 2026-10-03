"""
Knowledge Base router: Role-scoped collections, file uploads, hybrid search (BM25 + Vector RRF), and passage retrieval.
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from pydantic import BaseModel
import json
import re
from pathlib import Path
from datetime import datetime, timezone
from routers.auth import get_current_user
from lib.bm25 import BM25Index
from lib.hybrid_retrieval import hybrid_search
from lib.vector_store import get_store
from lib.ollama import embed

router = APIRouter(prefix="/kb", tags=["knowledge-base"])

KB_ROOT = Path(__file__).parent.parent.parent / "backend" / "data" / "kb"
META_PATH = Path(__file__).parent.parent.parent / "backend" / "data" / "kb-meta.json"

_index_cache: dict[str, dict] = {}

def _read_meta() -> dict:
    p = META_PATH if META_PATH.exists() else Path(__file__).parent.parent / "data" / "kb-meta.json"
    if p.exists():
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            return {"collections": []}
    return {"collections": []}

def _write_meta(data: dict) -> None:
    p = META_PATH if META_PATH.parent.exists() else Path(__file__).parent.parent / "data" / "kb-meta.json"
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, indent=2), encoding="utf-8")

def _can_access_collection(user: dict, col_id: str) -> bool:
    if user.get("crossRole") or user.get("role") == "admin":
        return True
    return col_id.lower() == str(user.get("role", "")).lower()

def _get_kb_index(col_id: str):
    if col_id not in _index_cache:
        dir_p = KB_ROOT / col_id
        if not dir_p.exists():
            dir_p = Path(__file__).parent.parent / "data" / "kb" / col_id
        if not dir_p.exists():
            return None
        docs = []
        for f in dir_p.glob("*.txt"):
            source = f.stem.replace("_", " ").replace("-", " ")
            try:
                docs.append({"id": f.name, "source": source, "text": f.read_text(encoding="utf-8", errors="replace")})
            except Exception:
                pass
        if not docs:
            return None
        _index_cache[col_id] = {"docs": docs, "index": BM25Index(docs)}
    return _index_cache[col_id]

class CreateCollectionRequest(BaseModel):
    name: str

@router.get("/collections")
async def list_collections(user: dict = Depends(get_current_user)):
    meta = _read_meta()
    cols = meta.get("collections", [])
    
    # Auto-discover existing KB folders
    root = KB_ROOT if KB_ROOT.exists() else Path(__file__).parent.parent / "data" / "kb"
    if root.exists():
        for d in root.iterdir():
            if d.is_dir() and not any(c["id"] == d.name for c in cols):
                cols.append({"id": d.name, "name": d.name.capitalize(), "createdAt": datetime.now(timezone.utc).isoformat()})
    
    meta["collections"] = cols
    _write_meta(meta)

    # Role-based scoping: only return collections accessible to user's role
    enriched = []
    for c in cols:
        if not _can_access_collection(user, c["id"]):
            continue
        dir_p = root / c["id"]
        files = [f for f in dir_p.iterdir() if f.is_file() and not f.name.startswith(".")] if dir_p.exists() else []
        doc_list = [
            {
                "name": f.name,
                "source": f.stem.replace("_", " ").replace("-", " "),
                "size": f.stat().st_size,
                "ext": f.suffix.lower()
            }
            for f in sorted(files, key=lambda x: (x.suffix != ".pdf", x.name))
        ]
        enriched.append({
            **c,
            "fileCount": len(doc_list),
            "files": doc_list,
            "documents": doc_list
        })
    return enriched

@router.post("/collections")
async def create_collection(req: CreateCollectionRequest, user: dict = Depends(get_current_user)):
    name = req.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")
    col_id = re.sub(r"[^a-zA-Z0-9]+", "_", name.lower()).strip("_")
    
    # Non-admin users can only create collections prefixed with or matching their role
    if not user.get("crossRole") and user.get("role") != "admin":
        if not col_id.startswith(user.get("role", "")):
            col_id = f"{user.get('role')}_{col_id}"

    meta = _read_meta()
    if any(c["id"] == col_id for c in meta.get("collections", [])):
        raise HTTPException(status_code=409, detail="Collection already exists")
    
    col = {"id": col_id, "name": name, "createdAt": datetime.now(timezone.utc).isoformat()}
    meta.setdefault("collections", []).append(col)
    _write_meta(meta)

    target_dir = (KB_ROOT if KB_ROOT.parent.exists() else Path(__file__).parent.parent / "data" / "kb") / col_id
    target_dir.mkdir(parents=True, exist_ok=True)
    return col

@router.post("/collections/{collection_id}/upload")
async def upload_kb_doc(collection_id: str, file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    if not _can_access_collection(user, collection_id):
        raise HTTPException(status_code=403, detail="Access denied: Role is not authorized to upload to this collection")

    meta = _read_meta()
    col = next((c for c in meta.get("collections", []) if c["id"] == collection_id), None)
    if not col:
        # Check if dir exists
        target_dir = (KB_ROOT if KB_ROOT.parent.exists() else Path(__file__).parent.parent / "data" / "kb") / collection_id
        if not target_dir.exists():
            raise HTTPException(status_code=404, detail="Collection not found")
    else:
        target_dir = (KB_ROOT if KB_ROOT.parent.exists() else Path(__file__).parent.parent / "data" / "kb") / collection_id

    target_dir.mkdir(parents=True, exist_ok=True)

    content_bytes = await file.read()
    dest_path = target_dir / file.filename
    dest_path.write_bytes(content_bytes)

    txt_filename = f"{Path(file.filename).stem}.txt"
    txt_path = target_dir / txt_filename

    if file.filename.endswith(".txt") or file.content_type == "text/plain":
        text = content_bytes.decode(errors="replace")
    elif file.filename.endswith(".pdf"):
        # Store original PDF + companion indexed text file
        text = f"[Document: {file.filename}]\nIndexed for role '{collection_id}' knowledge base.\nSize: {len(content_bytes)} bytes."
    else:
        text = f"[Document: {file.filename}]\nSize: {len(content_bytes)} bytes\nType: {file.content_type}\nIndexed for semantic analysis."

    if not txt_path.exists() or txt_path.stat().st_size == 0:
        txt_path.write_text(text, encoding="utf-8")
    _index_cache.pop(collection_id, None)

    # Generate & store embedding asynchronously in vector store (Enhancement 3)
    try:
        vec = await embed(model="nomic-embed-text", text=text[:2000])
        if vec:
            store = get_store(collection_id)
            store.add(doc_id=txt_filename, source=txt_path.stem.replace("_", " "), text=text, vector=vec)
    except Exception:
        pass

    return {"file": file.filename, "indexed": True, "txtFile": txt_filename}

@router.delete("/collections/{collection_id}/documents/{filename}")
async def delete_kb_doc(collection_id: str, filename: str, user: dict = Depends(get_current_user)):
    if not _can_access_collection(user, collection_id):
        raise HTTPException(status_code=403, detail="Access denied: Role is not authorized to delete from this collection")

    target_dir = (KB_ROOT if KB_ROOT.parent.exists() else Path(__file__).parent.parent / "data" / "kb") / collection_id
    f = target_dir / filename
    if f.exists():
        f.unlink(missing_ok=True)
    # Also unlink companion txt if deleting a pdf
    if filename.endswith(".pdf"):
        c_txt = target_dir / f"{Path(filename).stem}.txt"
        if c_txt.exists():
            c_txt.unlink(missing_ok=True)
    _index_cache.pop(collection_id, None)
    get_store(collection_id).remove(filename)
    return {"ok": True}

@router.get("/search")
async def search_kb(q: str = "", collection: str | None = None, user: dict = Depends(get_current_user)):
    q = q.strip()
    if not q:
        return []

    meta = _read_meta()
    cols = meta.get("collections", [])
    
    # Scoped to authorized collections
    allowed_cols = [c for c in cols if _can_access_collection(user, c["id"])]
    if collection:
        if not _can_access_collection(user, collection):
            raise HTTPException(status_code=403, detail="Access denied: Role cannot search this collection")
        target_cols = [c for c in allowed_cols if c["id"] == collection]
    else:
        target_cols = allowed_cols

    all_results = []
    for c in target_cols:
        col_id = c["id"]
        cached = _get_kb_index(col_id)
        if not cached:
            continue
        
        hits = await hybrid_search(collection_id=col_id, query=q, bm25_index=cached["index"], top_k=5)
        for h in hits:
            doc = h["doc"]
            lines = [l.strip() for l in doc["text"].split("\n") if l.strip()]
            all_results.append({
                "collectionId": col_id,
                "collectionName": c["name"],
                "docId": doc["id"],
                "source": doc["source"],
                "sourceName": doc["source"],
                "snippet": " ".join(lines[:3])[:400],
                "passage": " ".join(lines[:3])[:400],
                "score": h["score"],
                "mode": h.get("mode", "hybrid"),
                "lines": lines[:10]
            })

    all_results.sort(key=lambda x: x["score"], reverse=True)
    return all_results[:20]

@router.get("/passage/{collection_id}/{doc_id}")
async def get_passage(collection_id: str, doc_id: str, q: str = "", user: dict = Depends(get_current_user)):
    if not _can_access_collection(user, collection_id):
        raise HTTPException(status_code=403, detail="Access denied: Role cannot access this passage")

    target_dir = (KB_ROOT if KB_ROOT.parent.exists() else Path(__file__).parent.parent / "data" / "kb") / collection_id
    doc_path = target_dir / doc_id

    # If asking for a PDF or non-txt doc, check for companion txt file
    if not doc_path.exists() or doc_path.suffix.lower() == ".pdf":
        alt_path = target_dir / f"{Path(doc_id).stem}.txt"
        if alt_path.exists():
            doc_path = alt_path

    if not doc_path.exists():
        raise HTTPException(status_code=404, detail="Document not found")

    try:
        text = doc_path.read_text(encoding="utf-8", errors="replace")
    except Exception:
        text = f"Binary file: {doc_id}. Preview is available in workspace preview panel."

    lines = [{"line": i + 1, "text": l} for i, l in enumerate(text.split("\n"))]

    relevant_start = 0
    if q.strip():
        q_lower = q.lower()
        idx = next((i for i, l in enumerate(lines) if q_lower in l["text"].lower()), -1)
        if idx != -1:
            relevant_start = max(0, idx - 2)

    return {
        "docId": doc_id,
        "collectionId": collection_id,
        "source": doc_path.stem.replace("_", " "),
        "sourceName": doc_path.stem.replace("_", " "),
        "fullText": text,
        "snippet": " ".join(text.split("\n")[:4])[:400],
        "lines": lines,
        "relevantStart": relevant_start,
        "highlightQuery": q
    }
