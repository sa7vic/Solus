"""
System info, hardware metrics, GPU status via nvidia-smi, and Air-Gap Network Watchdog router.
"""
from fastapi import APIRouter, Depends
import os
import platform
import psutil
import subprocess
import shutil
from routers.auth import get_current_user
from lib.ollama import ping, list_installed
from lib.network_watchdog import watchdog

router = APIRouter(tags=["system"])

def get_gpu_info() -> dict:
    if not shutil.which("nvidia-smi"):
        return {"available": False}
    try:
        proc = subprocess.run(
            ["nvidia-smi", "--query-gpu=name,memory.total,memory.used,memory.free,utilization.gpu", "--format=csv,noheader,nounits"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=3
        )
        if proc.returncode == 0:
            parts = [p.strip() for p in proc.stdout.strip().split(",")]
            if len(parts) >= 5:
                return {
                    "available": True,
                    "name": parts[0],
                    "vramTotal": int(parts[1]) if parts[1].isdigit() else 0,
                    "vramUsed": int(parts[2]) if parts[2].isdigit() else 0,
                    "vramFree": int(parts[3]) if parts[3].isdigit() else 0,
                    "utilization": int(parts[4]) if parts[4].isdigit() else 0
                }
    except Exception:
        pass
    return {"available": False}

@router.get("/system/info")
async def system_info(user: dict = Depends(get_current_user)):
    ollama_ok = await ping()
    try:
        installed = await list_installed()
    except Exception:
        installed = []

    vm = psutil.virtual_memory()
    cpus = psutil.cpu_count(logical=True)
    gpu = get_gpu_info()

    return {
        "cpu": {
            "cores": cpus,
            "model": platform.processor() or "Multi-Core CPU",
            "percent": psutil.cpu_percent()
        },
        "memory": {
            "total": vm.total,
            "free": vm.available,
            "used": vm.used,
            "percent": vm.percent
        },
        "gpu": gpu,
        "ollama": {
            "reachable": ollama_ok,
            "installedModels": installed
        },
        "platform": platform.system(),
        "arch": platform.machine(),
        "hostname": platform.node()
    }

@router.get("/network/stats")
async def network_stats(user: dict = Depends(get_current_user)):
    return watchdog.get_stats()

@router.get("/network/log")
async def network_log(user: dict = Depends(get_current_user)):
    return watchdog.get_recent_events()

