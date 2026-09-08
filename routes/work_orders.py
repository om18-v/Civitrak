import base64
import binascii
import hashlib
import hmac
import os
from datetime import datetime
from io import BytesIO
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from fastapi.responses import Response
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import Contractor, Detection, User, Video, WorkOrder
from schemas import (
    ContractorResponse,
    LoginRequest,
    LoginResponse,
    WorkOrderListResponse,
    WorkOrderResponse,
    WorkOrderStatusUpdate,
)
from services.work_orders import (
    COMPLETED_STATUS,
    escalate_overdue_work_orders,
    update_contractor_rating,
)


router = APIRouter(prefix="/api", tags=["Work Orders"])
VALID_STATUSES = {"sent", "acknowledged", "in_progress", "completed", "escalated"}
STATUS_TRANSITIONS = {
    "sent": {"acknowledged"},
    "acknowledged": {"in_progress"},
    "in_progress": {"completed"},
    "escalated": {"in_progress", "completed"},
}


def _password_matches(password: str, stored_hash: Optional[str]) -> bool:
    if not stored_hash:
        return False
    if stored_hash.startswith("pbkdf2_sha256$"):
        try:
            _, iterations, salt, expected = stored_hash.split("$", 3)
        except ValueError:
            return False
        actual = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode(),
            salt.encode(),
            int(iterations),
        ).hex()
        return hmac.compare_digest(actual, expected)
    return hmac.compare_digest(password, stored_hash)


def _make_token(user: User) -> str:
    secret = _auth_secret()
    payload = f"{user.id}:{user.role}"
    signature = hmac.new(secret, payload.encode(), hashlib.sha256).hexdigest()
    return base64.urlsafe_b64encode(f"{payload}:{signature}".encode()).decode()


def _auth_secret() -> bytes:
    secret = os.getenv("CIVITRAK_AUTH_SECRET")
    if not secret:
        raise RuntimeError("CIVITRAK_AUTH_SECRET must be configured.")
    return secret.encode()


def _token_identity(authorization: Optional[str]) -> Optional[tuple[int, str]]:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    try:
        decoded = base64.urlsafe_b64decode(
            authorization.split(" ", 1)[1].encode()
        ).decode()
        user_id, role, signature = decoded.split(":", 2)
        secret = _auth_secret()
        expected = hmac.new(
            secret,
            f"{user_id}:{role}".encode(),
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(signature, expected):
            return None
        return int(user_id), role
    except (ValueError, TypeError, UnicodeDecodeError, binascii.Error):
        return None


def _current_user(
    authorization: Optional[str],
    db: Session,
) -> User:
    try:
        identity = _token_identity(authorization)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    if identity is None:
        raise HTTPException(status_code=401, detail="Authentication required.")

    user = db.query(User).filter(User.id == identity[0]).first()
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid authentication token.")

    return user


def _require_role(user: User, *roles: str) -> None:
    if (user.role or "").lower() not in {role.lower() for role in roles}:
        raise HTTPException(status_code=403, detail="Insufficient permissions.")


def _contractor_id_for_identity(
    db: Session,
    identity: Optional[tuple[int, str]],
) -> Optional[int]:
    if not identity or identity[1].lower() != "contractor":
        return None

    user = db.query(User).filter(User.id == identity[0]).first()
    if user is None:
        return None

    contractor = (
        db.query(Contractor)
        .filter(Contractor.email == user.email)
        .first()
    )
    return contractor.id if contractor is not None else None


def _work_order_response(work_order: WorkOrder) -> WorkOrderResponse:
    detection = work_order.detection
    return WorkOrderResponse(
        id=work_order.id,
        detection_id=work_order.detection_id,
        contractor_id=work_order.contractor_id,
        defect_type=detection.defect_type if detection else None,
        route_label=(
            detection.video.route_label
            if detection and detection.video
            else None
        ),
        assigned_date=work_order.assigned_date,
        deadline_date=work_order.deadline_date,
        status=work_order.status,
        escalated=bool(work_order.escalated),
        completed_at=work_order.completed_at,
    )


@router.post("/auth/login", response_model=LoginResponse)
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    user = (
        db.query(User)
        .filter(func.lower(User.email) == credentials.email.strip().lower())
        .first()
    )
    if user is None or not _password_matches(credentials.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    try:
        token = _make_token(user)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return LoginResponse(access_token=token, role=user.role, user_id=user.id)


@router.get("/work-orders", response_model=WorkOrderListResponse)
def list_work_orders(
    contractor_id: Optional[int] = Query(default=None),
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
):
    user = _current_user(authorization, db)
    _require_role(user, "authority", "contractor")
    token_contractor_id = _contractor_id_for_identity(
        db,
        (user.id, user.role),
    )
    if (user.role or "").lower() == "contractor":
        if token_contractor_id is None:
            raise HTTPException(
                status_code=403,
                detail="Contractor account is not linked to a contractor record.",
            )
        contractor_id = token_contractor_id

    query = db.query(WorkOrder)
    if contractor_id is not None:
        query = query.filter(WorkOrder.contractor_id == contractor_id)

    return WorkOrderListResponse(
        work_orders=[
            _work_order_response(work_order)
            for work_order in query.order_by(WorkOrder.id.asc()).all()
        ]
    )


@router.get("/work-orders/escalated", response_model=WorkOrderListResponse)
def list_escalated_work_orders(
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
):
    user = _current_user(authorization, db)
    _require_role(user, "authority")
    escalate_overdue_work_orders(db)
    db.commit()
    work_orders = (
        db.query(WorkOrder)
        .filter(
            WorkOrder.status == "escalated",
            WorkOrder.status != COMPLETED_STATUS,
        )
        .order_by(WorkOrder.deadline_date.asc())
        .all()
    )
    return WorkOrderListResponse(
        work_orders=[_work_order_response(item) for item in work_orders]
    )


@router.patch("/work-orders/{work_order_id}/status", response_model=WorkOrderResponse)
def update_work_order_status(
    work_order_id: int,
    update: WorkOrderStatusUpdate,
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
):
    user = _current_user(authorization, db)
    _require_role(user, "authority", "contractor")
    work_order = (
        db.query(WorkOrder)
        .filter(WorkOrder.id == work_order_id)
        .first()
    )
    if work_order is None:
        raise HTTPException(status_code=404, detail="Work order not found.")

    if (user.role or "").lower() == "contractor":
        contractor_id = _contractor_id_for_identity(
            db,
            (user.id, user.role),
        )
        if contractor_id != work_order.contractor_id:
            raise HTTPException(
                status_code=403,
                detail="Work order is not assigned to this contractor.",
            )

    requested = update.status.strip().lower()
    if requested not in VALID_STATUSES:
        raise HTTPException(status_code=422, detail="Invalid work-order status.")
    if requested != work_order.status and requested not in STATUS_TRANSITIONS.get(
        work_order.status,
        set(),
    ):
        raise HTTPException(
            status_code=422,
            detail=f"Cannot change status from {work_order.status} to {requested}.",
        )

    work_order.status = requested
    if requested == COMPLETED_STATUS:
        work_order.completed_at = datetime.utcnow()
        work_order.escalated = False
        contractor = (
            db.query(Contractor)
            .filter(Contractor.id == work_order.contractor_id)
            .first()
        )
        if contractor is not None:
            update_contractor_rating(db, contractor)

    db.commit()
    db.refresh(work_order)
    return _work_order_response(work_order)


@router.get("/contractors", response_model=list[ContractorResponse])
def list_contractors(
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
):
    user = _current_user(authorization, db)
    _require_role(user, "authority")
    return db.query(Contractor).order_by(Contractor.rating.desc()).all()


@router.get("/reports/{video_id}/pdf")
def download_video_report(
    video_id: int,
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
):
    user = _current_user(authorization, db)
    _require_role(user, "authority")
    video = db.query(Video).filter(Video.id == video_id).first()
    if video is None:
        raise HTTPException(status_code=404, detail="Video not found.")

    detections = (
        db.query(Detection)
        .filter(Detection.video_id == video_id)
        .order_by(Detection.timestamp_in_video.asc())
        .all()
    )
    work_orders = (
        db.query(WorkOrder)
        .join(WorkOrder.detection)
        .filter(Detection.video_id == video_id)
        .order_by(WorkOrder.id.asc())
        .all()
    )

    output = BytesIO()
    document = canvas.Canvas(output, pagesize=letter)
    width, height = letter
    y = height - 48
    document.setTitle(f"Civitrak report for video {video_id}")
    document.setFont("Helvetica-Bold", 16)
    document.drawString(48, y, "Civitrak Video Detection Report")
    y -= 28
    document.setFont("Helvetica", 10)
    document.drawString(48, y, f"Video ID: {video.id}    Route: {video.route_label or 'N/A'}")
    y -= 16
    document.drawString(48, y, f"Status: {video.status or 'N/A'}    Detections: {len(detections)}")
    y -= 28
    document.setFont("Helvetica-Bold", 11)
    document.drawString(48, y, "Detections")
    y -= 18
    document.setFont("Helvetica", 9)
    for detection in detections:
        line = (
            f"{detection.defect_type} | confidence {detection.confidence_score:.2f} | "
            f"time {detection.timestamp_in_video:.1f}s | thumbnail "
            f"{detection.thumbnail_path or 'N/A'}"
        )
        document.drawString(52, y, line[:115])
        y -= 14
        if y < 72:
            document.showPage()
            y = height - 48
            document.setFont("Helvetica", 9)

    y -= 10
    document.setFont("Helvetica-Bold", 11)
    document.drawString(48, y, f"Work orders: {len(work_orders)}")
    y -= 18
    document.setFont("Helvetica", 9)
    for work_order in work_orders:
        line = (
            f"#{work_order.id} | contractor {work_order.contractor_id} | "
            f"status {work_order.status} | deadline "
            f"{work_order.deadline_date or 'N/A'}"
        )
        document.drawString(52, y, line[:115])
        y -= 14
        if y < 48:
            document.showPage()
            y = height - 48
            document.setFont("Helvetica", 9)

    document.save()
    return Response(
        content=output.getvalue(),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="civitrak-report-{video_id}.pdf"'
        },
    )
