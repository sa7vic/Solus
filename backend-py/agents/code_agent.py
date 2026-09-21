"""
CodeAgent: Real code patching and isolated sandbox execution.
Docker with --network none if available, otherwise secure local subprocess with timeout.
"""
import asyncio
import subprocess
import shutil
import re
from pathlib import Path
from lib.ollama import chat

async def get_python_cmd() -> str:
    for cmd in ["python3", "python"]:
        try:
            proc = await asyncio.create_subprocess_exec(
                cmd, "--version",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            await proc.communicate()
            if proc.returncode == 0:
                return cmd
        except Exception:
            pass
    return "python"

async def patch_code(model: str, task: str, source_code: str, test_code: str, filename: str = "solution.py") -> str:
    prompt = (
        "You are an industrial Python code repair and engineering algorithm agent. "
        "Return ONLY the corrected full source code that satisfies the task and passes all test assertions. "
        "No markdown fences, no conversational explanations, just valid raw Python code."
    )
    user_msg = f"Task: {task}\n\nFile: {filename}\n{source_code}\n\nTest Suite:\n{test_code}"

    content = await chat(
        model=model,
        messages=[
            {"role": "system", "content": prompt},
            {"role": "user", "content": user_msg}
        ],
        temperature=0.1
    )

    clean = re.sub(r"^```(?:python)?\n?", "", content.strip(), flags=re.IGNORECASE)
    clean = re.sub(r"```$", "", clean).strip()
    return clean

async def run_tests(patched_source: str, test_code: str, work_dir: Path, filename: str = "solution.py") -> dict:
    work_dir.mkdir(parents=True, exist_ok=True)
    (work_dir / filename).write_text(patched_source, encoding="utf-8")
    (work_dir / f"test_{filename}").write_text(test_code, encoding="utf-8")

    has_docker = shutil.which("docker") is not None
    
    if has_docker:
        cmd = [
            "docker", "run", "--rm", "--network", "none",
            "-v", f"{work_dir.resolve()}:/work", "-w", "/work",
            "python:3.12-slim", "python", "-m", "pytest", "-q"
        ]
        sandbox = "docker (network: none)"
    else:
        python_cmd = await get_python_cmd()
        cmd = [python_cmd, "-m", "pytest", "-q"]
        sandbox = "subprocess (local isolated directory)"

    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            cwd=str(work_dir) if not has_docker else None,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout_b, stderr_b = await asyncio.wait_for(proc.communicate(), timeout=20.0)
        stdout = stdout_b.decode(errors="replace")
        stderr = stderr_b.decode(errors="replace")
        exit_code = proc.returncode
    except asyncio.TimeoutError:
        return {
            "sandbox": sandbox,
            "passed": False,
            "summary": "Execution timed out (20s limit exceeded)",
            "stdout": "",
            "stderr": "TimeoutError"
        }
    except Exception as e:
        return {
            "sandbox": sandbox,
            "passed": False,
            "summary": f"Execution error: {str(e)}",
            "stdout": "",
            "stderr": str(e)
        }

    combined = stdout + "\n" + stderr
    summary_line = next((l.strip() for l in combined.split("\n") if re.search(r"passed|failed|error", l, re.I) and any(c.isdigit() for c in l)), "(no summary line)")

    return {
        "sandbox": sandbox,
        "exitCode": exit_code,
        "passed": exit_code == 0,
        "summary": summary_line,
        "stdout": stdout,
        "stderr": stderr
    }

