"""
Auth router: JWT generation, demo accounts, and token validation.
"""
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
import json
from pathlib import Path
import bcrypt
from jose import jwt, JWTError
from datetime import datetime, timedelta, timezone

router = APIRouter(prefix="/auth", tags=["auth"])

SECRET_KEY = "solus_sovereign_ai_workbench_airgapped_jwt_secret_key"
ALGORITHM = "HS256"

USERS_PATH = Path(__file__).parent.parent.parent / "backend" / "data" / "users.json"

def _read_users() -> list[dict]:
    p = USERS_PATH if USERS_PATH.exists() else Path(__file__).parent.parent / "data" / "users.json"
    if p.exists():
        return json.loads(p.read_text(encoding="utf-8"))
    return []

class LoginRequest(BaseModel):
    username: str
    password: str

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=12)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(authorization: str | None = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("username")
        if not username:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        users = _read_users()
        user = next((u for u in users if u["username"] == username), None)
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        safe_user = {k: v for k, v in user.items() if k != "passwordHash"}
        return safe_user
    except JWTError:
        raise HTTPException(status_code=401, detail="Token verification failed")

@router.post("/login")
async def login(req: LoginRequest):
    users = _read_users()
    user = next((u for u in users if u["username"] == req.username), None)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    # Direct bcrypt verify
    try:
        valid = bcrypt.checkpw(req.password.encode("utf-8"), user["passwordHash"].encode("utf-8"))
    except Exception:
        valid = False

    if not valid:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    safe_user = {k: v for k, v in user.items() if k != "passwordHash"}
    token = create_access_token({
        "sub": str(user["id"]),
        "username": user["username"],
        "role": user.get("role"),
        "crossRole": bool(user.get("crossRole"))
    })
    return {"token": token, "user": safe_user}

@router.get("/demo-accounts")
async def demo_accounts():
    users = _read_users()
    return [{k: v for k, v in u.items() if k != "passwordHash"} for u in users]

@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return {"user": user}
