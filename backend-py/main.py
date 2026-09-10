"""
Solus Sovereign AI Workbench — FastAPI Application Entrypoint.
Air-gapped, fully autonomous industrial workbench backend.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path

from routers import (
    auth,
    workspaces,
    chat,
    kb,
    models,
    runs,
    system,
    files,
    plugins
)

app = FastAPI(
    title="Solus Sovereign AI Workbench",
    description="Air-gapped, local-first industrial workbench backend powered by open-weight reasoning models.",
    version="1.0.0"
)

# CORS configuration matching frontend dev port and air-gap localhost
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health():
    return {
        "ok": True,
        "engine": "FastAPI (Python 3.12)",
        "airgap": True,
        "note": "Solus Sovereign AI Workbench API running natively on Python FastAPI."
    }

# Register all API routers under /api
app.include_router(auth.router, prefix="/api")
app.include_router(workspaces.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(kb.router, prefix="/api")
app.include_router(models.router, prefix="/api")
app.include_router(runs.router, prefix="/api")
app.include_router(system.router, prefix="/api")
app.include_router(files.router, prefix="/api")
app.include_router(plugins.router, prefix="/api")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=4000, reload=True)
