"""
Retrieval Agent: Loads local role KB documents and performs Hybrid Retrieval (BM25 + Vector RRF).
"""
from pathlib import Path
from lib.bm25 import BM25Index
from lib.hybrid_retrieval import hybrid_search

KB_ROOT = Path(__file__).parent.parent.parent / "backend" / "data" / "kb"

_kb_cache: dict[str, dict] = {}

def load_kb(role: str) -> list[dict]:
    dir_path = KB_ROOT / role
    if not dir_path.exists():
        # Try local fallback
        dir_path = Path(__file__).parent.parent / "data" / "kb" / role
        if not dir_path.exists():
            return []
    
    docs = []
    for f in dir_path.glob("*.txt"):
        source_name = f.stem.replace("_", " ").replace("-", " ")
        text = f.read_text(encoding="utf-8")
        docs.append({"id": f.name, "source": source_name, "text": text})
    return docs

def get_kb_index(role: str):
    if role not in _kb_cache:
        docs = load_kb(role)
        index = BM25Index(docs) if docs else None
        _kb_cache[role] = {"docs": docs, "index": index}
    return _kb_cache[role]

async def retrieve(role: str, query: str, top_k: int = 2) -> list[dict]:
    kb = get_kb_index(role)
    docs = kb["docs"]
    bm25 = kb["index"]
    if not docs or not bm25:
        return []

    hits = await hybrid_search(collection_id=role, query=query, bm25_index=bm25, top_k=top_k)
    
    results = []
    for h in hits:
        doc = h["doc"]
        lines = [l.strip() for l in doc["text"].split("\n") if l.strip()]
        snippet = " ".join(lines[:3])[:260]
        results.append({
            "source": doc["source"],
            "snippet": snippet,
            "full_text": doc["text"],
            "score": h["score"],
            "mode": h.get("mode", "bm25")
        })
    return results

