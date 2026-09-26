"""Server-issued role authentication for CiviTrak portals."""
import base64, hashlib, hmac, json, os, time
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User
from schemas import LoginRequest, LoginResponse

router = APIRouter()
SECRET = os.getenv("CIVITRAK_AUTH_SECRET", "change-this-civitrak-secret")

def _password_hash(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

def issue_token(user: User) -> str:
    payload = {"uid": user.id, "role": user.role, "contractor_id": user.contractor_id, "exp": int(time.time()) + 12*3600}
    raw = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode()
    body = base64.urlsafe_b64encode(raw).decode().rstrip("=")
    sig = hmac.new(SECRET.encode(), body.encode(), hashlib.sha256).hexdigest()
    return f"ctk.{body}.{sig}"

@router.post("/api/auth/login", response_model=LoginResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    role = (body.role or "").lower()
    if role == "user":
        # Citizens do not require a municipal account for public tracking.
        payload = {"uid": "citizen", "role": "citizen", "contractor_id": None, "exp": int(time.time()) + 12*3600}
        raw = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode()
        enc = base64.urlsafe_b64encode(raw).decode().rstrip("=")
        token = f"ctk.{enc}.{hmac.new(SECRET.encode(), enc.encode(), hashlib.sha256).hexdigest()}"
        return LoginResponse(token=token, user={"id":"citizen","name":"CiviTrak Citizen","role":"citizen","contractor_id":None})
    user = db.query(User).filter(User.email == body.email.lower().strip(), User.is_active == True).first()
    if not user or not hmac.compare_digest(user.hashed_password, _password_hash(body.password)):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    if role and user.role.lower() != role:
        raise HTTPException(status_code=403, detail=f"Account is registered for the {user.role} portal.")
    return LoginResponse(token=issue_token(user), user={"id":str(user.id),"name":user.name,"role":user.role,"contractor_id":user.contractor_id})
