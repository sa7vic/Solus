"""
Async HTTP client for a local Ollama server.
All functions call the actual Ollama API — no mocking.
"""
import httpx
import os
import json
from typing import Callable, AsyncGenerator

OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")


async def ping() -> bool:
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            r = await client.get(f"{OLLAMA_HOST}/api/tags")
            return r.is_success
    except Exception:
        return False


async def list_installed() -> list[str]:
    async with httpx.AsyncClient(timeout=5.0) as client:
        r = await client.get(f"{OLLAMA_HOST}/api/tags")
        r.raise_for_status()
        data = r.json()
        return [m["name"] for m in (data.get("models") or [])]


async def chat(*, model: str, messages: list[dict], temperature: float = 0.2, fmt: str | None = None) -> str:
    body: dict = {"model": model, "messages": messages, "stream": False, "options": {"temperature": temperature}}
    if fmt:
        body["format"] = fmt
    async with httpx.AsyncClient(timeout=120.0) as client:
        r = await client.post(f"{OLLAMA_HOST}/api/chat", json=body)
        if not r.is_success:
            raise RuntimeError(f"Ollama /api/chat {r.status_code}: {r.text[:300]}")
        return r.json().get("message", {}).get("content", "")


async def chat_with_image(*, model: str, prompt: str, image_base64: str, temperature: float = 0.2) -> str:
    return await chat(
        model=model,
        messages=[{"role": "user", "content": prompt, "images": [image_base64]}],
        temperature=temperature,
    )


async def embed(*, model: str, text: str) -> list[float]:
    """Call Ollama's /api/embed to get a dense vector for the given text."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.post(f"{OLLAMA_HOST}/api/embed", json={"model": model, "input": text})
        if not r.is_success:
            raise RuntimeError(f"Ollama /api/embed {r.status_code}: {r.text[:300]}")
        data = r.json()
        # Ollama returns {"embeddings": [[...]]} or {"embedding": [...]}
        embeddings = data.get("embeddings") or [data.get("embedding", [])]
        return embeddings[0] if embeddings else []


async def pull(model: str, on_progress: Callable[[dict], None] | None = None) -> None:
    async with httpx.AsyncClient(timeout=None) as client:
        async with client.stream("POST", f"{OLLAMA_HOST}/api/pull", json={"model": model, "stream": True}) as resp:
            if not resp.is_success:
                raise RuntimeError(f"Ollama /api/pull {resp.status_code}")
            async for line in resp.aiter_lines():
                line = line.strip()
                if not line:
                    continue
                try:
                    evt = json.loads(line)
                    if on_progress:
                        on_progress(evt)
                except json.JSONDecodeError:
                    pass
