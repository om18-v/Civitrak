"""
SIHPS124 — Work Order Routes

GET   /api/work-orders                     — list all work orders (real DB)
GET   /api/work-orders/{id}                — get single work order
PATCH /api/work-orders/{id}/status         — update work order status
POST  /api/work-orders/{id}/repair-proof   — contractor submits repair evidence
POST  /api/work-orders/{id}/resolve        — authority resolves the issue
GET   /api/work-orders/escalated           — overdue / escalated work orders
GET   /api/reports/{video_id}/pdf          — PDF inspection report
"""

import logging
import os
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from database import get_db
from models import (
    Detection, Evidence, EvidenceType, IssueStatus, IssueStatusHistory,
    WorkOrder, WorkOrderStatus, ContractorRating, Contractor,
)
from schemas import (
    RepairProofRequest, WorkOrderResponse, WorkOrderStatusUpdate,
    ContractorRatingRequest, ContractorRatingResponse, ContractorResponse,
    ReworkRequest, ContractorPerformanceResponse,
)

from services.work_orders import match_contractor, sweep_overdue_work_orders
from services.auth import require_role

logger = logging.getLogger("sihps.routes.work_orders")
router = APIRouter()

BACKEND_DIR   = Path(__file__).parent.parent
REPAIR_DIR    = BACKEND_DIR / "ai_ml" / "outputs" / "repair_proof"
REPAIR_DIR.mkdir(parents=True, exist_ok=True)


def _annotated_url(path: Optional[str]) -> Optional[str]:
    if not path:
        return None
    clean = path.replace("\\", "/")
    if "ai_ml/outputs/" in clean:
        rel = clean.split("ai_ml/outputs/", 1)[1]
        return f"/ai-output/{rel}"
    return f"/ai-output/{clean.lstrip('/')}"


def _wo_response(wo: WorkOrder) -> WorkOrderResponse:
    det = wo.detection
    return WorkOrderResponse(
        id                  = wo.id,
        case_id             = wo.case_id,
        detection_id        = wo.detection_id,
        contractor_id       = wo.contractor_id,
        contractor_name     = wo.contractor.name if wo.contractor else None,
        assignment_reason   = getattr(wo, "assignment_reason", "Area Jurisdiction Match") or "Area Jurisdiction Match",
        status              = wo.status.value if wo.status else "pending",
        priority            = wo.priority.value if wo.priority else None,
        notes               = wo.notes,
        escalated           = wo.escalated,
        escalation_reason   = wo.escalation_reason,
        rework_notes        = getattr(wo, "rework_notes", None),
        sla_hours           = wo.sla_hours,
        hours_remaining     = wo.hours_remaining,
        is_overdue          = wo.is_overdue,
        assigned_date       = wo.assigned_date,
        deadline_date       = wo.deadline_date,
        dispatched_at       = wo.dispatched_at,
        completed_at        = wo.completed_at,
        repair_proof_note   = wo.repair_proof_note,
        repair_submitted_at = wo.repair_submitted_at,
        created_at          = wo.created_at,
        defect_type         = det.defect_type if det else None,
        severity            = det.severity.value if (det and det.severity) else None,
        route_label         = det.route_label if det else None,
        latitude            = det.latitude if det else None,
        longitude           = det.longitude if det else None,
        location_source     = det.location_source.value if (det and det.location_source) else None,
        gps_quality         = getattr(det, "gps_quality", "ROUTE_GEOCODED") if det else None,
        annotated_image_url = _annotated_url(det.annotated_path) if det else None,
    )


# ---------------------------------------------------------------------------
# LIST
# ---------------------------------------------------------------------------

@router.get("/api/work-orders", response_model=List[WorkOrderResponse])
def list_work_orders(
    contractor_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """List live work orders and automatically synchronize overdue SLA state."""
    sweep_overdue_work_orders(db)
    q = db.query(WorkOrder)
    if contractor_id:
        q = q.filter(WorkOrder.contractor_id == contractor_id)
    if status:
        try:
            st = WorkOrderStatus(status)
            q = q.filter(WorkOrder.status == st)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status}")
    orders = q.order_by(WorkOrder.created_at.desc()).all()
    return [_wo_response(wo) for wo in orders]


@router.get("/api/work-orders/escalated", response_model=List[WorkOrderResponse])
def list_escalated(
    db: Session = Depends(get_db),
):
    """List work orders that are overdue or escalated."""
    sweep_overdue_work_orders(db)
    orders = (
        db.query(WorkOrder)
        .filter(
            (WorkOrder.escalated == True) |
            (WorkOrder.status == WorkOrderStatus.escalated)
        )
        .order_by(WorkOrder.deadline_date)
        .all()
    )
    return [_wo_response(wo) for wo in orders]


# ---------------------------------------------------------------------------
# GET single
# ---------------------------------------------------------------------------

@router.get("/api/work-orders/{work_order_id}", response_model=WorkOrderResponse)
def get_work_order(
    work_order_id: int,
    db: Session = Depends(get_db),
):
    wo = db.get(WorkOrder, work_order_id)
    if wo is None:
        raise HTTPException(status_code=404, detail=f"Work order {work_order_id} not found.")
    return _wo_response(wo)


# ---------------------------------------------------------------------------
# PATCH status
# ---------------------------------------------------------------------------

_VALID_TRANSITIONS = {
    WorkOrderStatus.pending:     {WorkOrderStatus.sent},
    WorkOrderStatus.sent:        {WorkOrderStatus.acknowledged, WorkOrderStatus.escalated},
    WorkOrderStatus.acknowledged:{WorkOrderStatus.in_progress, WorkOrderStatus.escalated},
    WorkOrderStatus.in_progress: {WorkOrderStatus.submitted, WorkOrderStatus.escalated},
    WorkOrderStatus.submitted:   {WorkOrderStatus.completed, WorkOrderStatus.rejected},
    WorkOrderStatus.rejected:    {WorkOrderStatus.in_progress},
    WorkOrderStatus.escalated:   {WorkOrderStatus.in_progress, WorkOrderStatus.completed},
    WorkOrderStatus.completed:   set(),  # Terminal
}


@router.patch("/api/work-orders/{work_order_id}/status", response_model=WorkOrderResponse)
def update_work_order_status(
    work_order_id: int,
    body: WorkOrderStatusUpdate,
    db: Session = Depends(get_db),
):
    """
    Transition a work order to a new status.
    Only valid lifecycle transitions are permitted.
    """
    wo = db.get(WorkOrder, work_order_id)
    if wo is None:
        raise HTTPException(status_code=404, detail=f"Work order {work_order_id} not found.")

    try:
        new_status = WorkOrderStatus(body.status)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status: {body.status}")

    allowed = _VALID_TRANSITIONS.get(wo.status, set())
    if new_status not in allowed:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Cannot transition from '{wo.status.value}' to '{new_status.value}'. "
                f"Allowed next states: {[s.value for s in allowed]}"
            ),
        )

    now = datetime.utcnow()
    wo.status     = new_status
    wo.updated_at = now

    if new_status == WorkOrderStatus.in_progress:
        wo.dispatched_at = wo.dispatched_at or now
    if new_status == WorkOrderStatus.escalated:
        wo.escalated = True
        wo.escalation_reason = body.note or "SLA deadline breached."

    # Sync issue status
    det = wo.detection
    if det:
        issue_map = {
            WorkOrderStatus.sent:        IssueStatus.assigned,
            WorkOrderStatus.acknowledged: IssueStatus.assigned,
            WorkOrderStatus.in_progress: IssueStatus.repairing,
            WorkOrderStatus.submitted:   IssueStatus.repairing,
            WorkOrderStatus.escalated:   IssueStatus.escalated,
        }
        new_issue_status = issue_map.get(new_status)
        if new_issue_status and det.status != new_issue_status:
            old = det.status
            det.status     = new_issue_status
            det.updated_at = now
            db.add(IssueStatusHistory(
                detection_id = det.id,
                old_status   = old,
                new_status   = new_issue_status,
                comment      = body.note or f"Work order transitioned to {new_status.value}.",
            ))

    db.commit()
    db.refresh(wo)
    logger.info(f"[WO] WO-{work_order_id} status → {new_status.value}")
    return _wo_response(wo)


# ---------------------------------------------------------------------------
# POST repair-proof
# ---------------------------------------------------------------------------

@router.post("/api/work-orders/{work_order_id}/repair-proof", response_model=WorkOrderResponse)
async def submit_repair_proof(
    work_order_id: int,
    note: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
):
    """
    Contractor submits repair proof (after-photo + optional note).

    - Saves the uploaded image securely.
    - Creates an Evidence record of type repair_after.
    - Transitions work order to submitted.
    """
    wo = db.get(WorkOrder, work_order_id)
    if wo is None:
        raise HTTPException(status_code=404, detail=f"Work order {work_order_id} not found.")

    if wo.status not in (WorkOrderStatus.in_progress, WorkOrderStatus.acknowledged):
        raise HTTPException(
            status_code=409,
            detail=f"Repair proof can only be submitted when status is in_progress or acknowledged. "
                   f"Current: '{wo.status.value}'.",
        )

    # Save repair image
    saved_path = None
    if image and image.filename:
        ext = Path(image.filename).suffix.lower()
        if ext not in {".jpg", ".jpeg", ".png", ".webp"}:
            raise HTTPException(status_code=400, detail="Repair proof must be a JPEG or PNG image.")
        content = await image.read()
        if len(content) > 50 * 1024 * 1024:  # 50 MB
            raise HTTPException(status_code=413, detail="Repair image exceeds 50 MB limit.")
        filename = f"repair_{work_order_id}_{uuid.uuid4().hex[:8]}{ext}"
        out_path = REPAIR_DIR / filename
        out_path.write_bytes(content)
        saved_path = f"repair_proof/{filename}"
        logger.info(f"[WO] Repair proof image saved: {out_path}")

    now = datetime.utcnow()

    # Add Evidence record
    if wo.detection_id:
        db.add(Evidence(
            detection_id  = wo.detection_id,
            image_path    = saved_path or "",
            evidence_type = EvidenceType.repair_after,
            note          = note,
            submitted_at  = now,
        ))

    wo.repair_proof_image  = saved_path
    wo.repair_proof_note   = note
    wo.repair_submitted_at = now
    wo.status              = WorkOrderStatus.submitted
    wo.updated_at          = now

    db.commit()
    db.refresh(wo)
    logger.info(f"[WO] Repair proof submitted for WO-{work_order_id}")
    return _wo_response(wo)


# ---------------------------------------------------------------------------
# POST resolve
# ---------------------------------------------------------------------------

@router.post("/api/work-orders/{work_order_id}/resolve", response_model=WorkOrderResponse)
def resolve_work_order(
    work_order_id: int,
    body: WorkOrderStatusUpdate,
    db: Session = Depends(get_db),
):
    """
    Authority approves repair and resolves the issue.

    - Work order must be in 'submitted' state.
    - Marks work order as completed.
    - Marks issue as resolved.
    """
    wo = db.get(WorkOrder, work_order_id)
    if wo is None:
        raise HTTPException(status_code=404, detail=f"Work order {work_order_id} not found.")

    if wo.status != WorkOrderStatus.submitted:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Work order must be in 'submitted' state (contractor must submit repair proof) "
                f"before resolving. Current status: '{wo.status.value}'."
            ),
        )

    now = datetime.utcnow()
    wo.status       = WorkOrderStatus.completed
    wo.completed_at = now
    wo.updated_at   = now

    # Resolve the associated issue
    det = wo.detection
    if det:
        old = det.status
        det.status     = IssueStatus.resolved
        det.updated_at = now
        db.add(IssueStatusHistory(
            detection_id = det.id,
            old_status   = old,
            new_status   = IssueStatus.resolved,
            comment      = body.note or "Repair verified and approved by authority.",
        ))

    db.commit()
    db.refresh(wo)
    logger.info(f"[WO] WO-{work_order_id} resolved. Issue ISS-{wo.detection_id} → resolved.")
    return _wo_response(wo)


# ---------------------------------------------------------------------------
# POST rework request
# ---------------------------------------------------------------------------

@router.post("/api/work-orders/{work_order_id}/rework", response_model=WorkOrderResponse)
def request_rework(
    work_order_id: int,
    body: ReworkRequest,
    db: Session = Depends(get_db),
):
    """Authority rejects submitted repair evidence and sends the job back for rework."""
    wo = db.get(WorkOrder, work_order_id)
    if wo is None:
        raise HTTPException(status_code=404, detail="Work order not found.")
    if wo.status != WorkOrderStatus.submitted:
        raise HTTPException(status_code=409, detail="Rework can only be requested after contractor submission.")
    now = datetime.utcnow()
    wo.status = WorkOrderStatus.rejected
    wo.rework_notes = body.notes.strip()
    wo.rework_requested_at = now
    wo.updated_at = now
    if wo.detection:
        old = wo.detection.status
        wo.detection.status = IssueStatus.assigned
        wo.detection.updated_at = now
        db.add(IssueStatusHistory(detection_id=wo.detection.id, old_status=old, new_status=IssueStatus.assigned, comment=f"Rework requested: {body.notes.strip()}"))
    db.commit(); db.refresh(wo)
    return _wo_response(wo)


# ---------------------------------------------------------------------------
# Contractor performance
# ---------------------------------------------------------------------------

@router.get("/api/contractors/{contractor_id}/performance", response_model=ContractorPerformanceResponse)
def contractor_performance(contractor_id: int, db: Session = Depends(get_db)):
    sweep_overdue_work_orders(db)
    contractor = db.get(Contractor, contractor_id)
    if contractor is None:
        raise HTTPException(status_code=404, detail="Contractor not found.")
    orders = db.query(WorkOrder).filter(WorkOrder.contractor_id == contractor_id).all()
    completed = [o for o in orders if o.status == WorkOrderStatus.completed]
    timed = [o for o in completed if o.assigned_date and o.completed_at]
    on_time = [o for o in timed if o.deadline_date and o.completed_at <= o.deadline_date]
    durations = [(o.completed_at - o.assigned_date).total_seconds()/3600 for o in timed]
    ratings = db.query(ContractorRating).filter(ContractorRating.contractor_id == contractor_id).all()
    return ContractorPerformanceResponse(
        id=contractor.id, name=contractor.name, assigned_area=contractor.assigned_area,
        rating=float(contractor.rating or 0), rating_count=len(ratings), assigned_jobs=len(orders),
        completed_jobs=len(completed), on_time_percentage=round((len(on_time)/len(timed)*100) if timed else 0,1),
        sla_breaches=sum(1 for o in orders if o.escalated or (o.deadline_date and o.deadline_date < datetime.utcnow() and o.status != WorkOrderStatus.completed)),
        average_resolution_hours=round(sum(durations)/len(durations),1) if durations else 0,
        rework_count=sum(1 for o in orders if o.rework_notes),
    )


# ---------------------------------------------------------------------------
# PDF Report
# ---------------------------------------------------------------------------

@router.get("/api/reports/{video_id}/pdf")
def generate_pdf_report(
    video_id: int,
    db: Session = Depends(get_db),
):
    """Generate a basic PDF inspection report for a completed video."""
    from models import Video
    video = db.get(Video, video_id)
    if video is None:
        raise HTTPException(status_code=404, detail=f"Video {video_id} not found.")

    detections = (
        db.query(Detection)
        .filter(Detection.video_id == video_id)
        .order_by(Detection.timestamp_in_video)
        .all()
    )

    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib import colors
        import tempfile

        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
        doc = SimpleDocTemplate(tmp.name, pagesize=A4)
        styles = getSampleStyleSheet()
        story = []

        story.append(Paragraph(f"SIHPS124 — Road Inspection Report", styles["Title"]))
        story.append(Paragraph(f"Video ID: {video_id} | Route: {video.route_label or 'N/A'}", styles["Normal"]))
        story.append(Paragraph(f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}", styles["Normal"]))
        story.append(Spacer(1, 12))

        if not detections:
            story.append(Paragraph("No road issues detected in this video.", styles["Normal"]))
        else:
            story.append(Paragraph(f"Detections ({len(detections)} unique issues):", styles["Heading2"]))
            data = [["ID", "Type", "Confidence", "Severity", "Timestamp", "Status"]]
            for d in detections:
                data.append([
                    str(d.id),
                    d.defect_type,
                    f"{d.confidence:.2%}",
                    d.severity.value if d.severity else "N/A",
                    f"{d.timestamp_in_video:.1f}s" if d.timestamp_in_video else "N/A",
                    d.status.value if d.status else "N/A",
                ])
            t = Table(data)
            t.setStyle(TableStyle([
                ("BACKGROUND", (0,0), (-1,0), colors.grey),
                ("TEXTCOLOR", (0,0), (-1,0), colors.whitesmoke),
                ("GRID", (0,0), (-1,-1), 0.5, colors.black),
                ("FONTSIZE", (0,0), (-1,-1), 8),
            ]))
            story.append(t)

        doc.build(story)
        return FileResponse(
            tmp.name,
            media_type="application/pdf",
            filename=f"sihps_report_video_{video_id}.pdf",
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {exc}")


@router.post("/api/work-orders/{work_order_id}/rating", response_model=ContractorRatingResponse)
def rate_completed_work(work_order_id: int, body: ContractorRatingRequest, db: Session = Depends(get_db)):
    """Public citizen rating for a completed work order. One rating per closed job."""
    if body.rating < 0 or body.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 0 and 5.")
    wo = db.get(WorkOrder, work_order_id)
    if wo is None:
        raise HTTPException(status_code=404, detail="Work order not found.")
    if wo.status != WorkOrderStatus.completed:
        raise HTTPException(status_code=409, detail="Only completed work can be rated.")
    if not wo.contractor_id:
        raise HTTPException(status_code=409, detail="This work order has no assigned contractor.")
    existing = db.query(ContractorRating).filter(ContractorRating.work_order_id == work_order_id).first()
    if existing:
        raise HTTPException(status_code=409, detail="This work order has already been rated.")
    rating = ContractorRating(work_order_id=work_order_id, contractor_id=wo.contractor_id, rating=body.rating, comment=body.comment, citizen_name=body.citizen_name[:255])
    db.add(rating)
    db.flush()
    contractor = wo.contractor
    values = [r.rating for r in db.query(ContractorRating).filter(ContractorRating.contractor_id == contractor.id).all()]
    contractor.rating = round(sum(values) / len(values), 2) if values else contractor.rating
    db.commit(); db.refresh(rating)
    return ContractorRatingResponse(id=rating.id, work_order_id=rating.work_order_id, contractor_id=rating.contractor_id, contractor_name=contractor.name, rating=rating.rating, comment=rating.comment, citizen_name=rating.citizen_name, created_at=rating.created_at)


@router.get("/api/contractors/{contractor_id}/ratings", response_model=List[ContractorRatingResponse])
def list_contractor_ratings(contractor_id: int, db: Session = Depends(get_db)):
    contractor = db.get(Contractor, contractor_id)
    if contractor is None:
        raise HTTPException(status_code=404, detail="Contractor not found.")
    rows = db.query(ContractorRating).filter(ContractorRating.contractor_id == contractor_id).order_by(ContractorRating.created_at.desc()).all()
    return [ContractorRatingResponse(id=r.id, work_order_id=r.work_order_id, contractor_id=r.contractor_id, contractor_name=contractor.name, rating=r.rating, comment=r.comment, citizen_name=r.citizen_name, created_at=r.created_at) for r in rows]
