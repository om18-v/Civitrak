"""
SIHPS124 — Detection / Issue Routes

GET  /api/videos/{id}/detections        — real detections for a video
GET  /api/issues/{id}                   — full issue detail
GET  /api/issues/{id}/timeline          — status history
POST /api/issues/{id}/verify            — authority verifies issue
POST /api/issues/{id}/work-order        — create work order from issue
GET  /api/public/stats                  — real aggregate statistics
"""

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import (
    Detection, Evidence, IssueStatus, IssueStatusHistory,
    Video, WorkOrder, WorkOrderStatus, Severity, Contractor,
)
from schemas import (
    BoundingBox, ContractorResponse, CreateWorkOrderRequest,
    DetectionListResponse, DetectionResponse, EvidenceResponse,
    IssueStatusHistoryEntry, IssueVerifyRequest, IssueVerifyResponse,
    PublicStatsResponse, WorkOrderResponse,
)
from services.work_orders import match_contractor

from datetime import datetime, timedelta

logger = logging.getLogger("sihps.routes.detections")
router = APIRouter()

_BASE_URL = ""   # Will be overridden by config / env if needed


def _annotated_url(path: Optional[str]) -> Optional[str]:
    """Convert relative annotated path to a /ai-output/ URL."""
    if not path:
        return None
    # Strip leading path components to get the part after ai_ml/outputs/
    clean = path.replace("\\", "/")
    if "ai_ml/outputs/" in clean:
        rel = clean.split("ai_ml/outputs/", 1)[1]
        return f"/ai-output/{rel}"
    return f"/ai-output/{clean.lstrip('/')}"


def _detection_to_response(det: Detection) -> DetectionResponse:
    bbox = None
    normalized_bbox = None
    if det.bbox_x1 is not None:
        bbox = BoundingBox(x1=det.bbox_x1, y1=det.bbox_y1, x2=det.bbox_x2, y2=det.bbox_y2)
        w = float(det.video.width or 1280) if det.video else 1280.0
        h = float(det.video.height or 720) if det.video else 720.0
        normalized_bbox = {"x": det.bbox_x1 / w * 100, "y": det.bbox_y1 / h * 100, "width": max(0, det.bbox_x2-det.bbox_x1) / w * 100, "height": max(0, det.bbox_y2-det.bbox_y1) / h * 100}

    evidence_list = [
        EvidenceResponse(
            id                 = ev.id,
            image_path         = ev.image_path,
            image_url          = _annotated_url(ev.image_path),
            frame_number       = ev.frame_number,
            timestamp_in_video = ev.timestamp_in_video,
            confidence         = ev.confidence,
            evidence_type      = ev.evidence_type.value if ev.evidence_type else "additional_frame",
            note               = ev.note,
            submitted_at       = ev.submitted_at,
        )
        for ev in (det.evidence or [])
    ]

    return DetectionResponse(
        id                 = det.id,
        video_id           = det.video_id,
        defect_type        = det.defect_type,
        confidence         = det.confidence,
        severity           = det.severity.value if det.severity else None,
        timestamp_in_video = det.timestamp_in_video,
        frame_number       = det.frame_number,
        first_seen_frame   = det.first_seen_frame,
        last_seen_frame    = det.last_seen_frame,
        bounding_box       = bbox,
        route_label        = det.route_label,
        latitude           = det.latitude,
        longitude          = det.longitude,
        location_source    = det.location_source.value if det.location_source else "route_label",
        annotated_image_url = _annotated_url(det.annotated_path),
        thumbnail_url      = _annotated_url(det.thumbnail_path),
        status             = det.status.value if det.status else "detected",
        created_at         = det.created_at,
        evidence           = evidence_list,
        normalized_bbox    = normalized_bbox,
        video_width        = int(det.video.width or 1280) if det.video else 1280,
        video_height       = int(det.video.height or 720) if det.video else 720,
    )


# ---------------------------------------------------------------------------
# GET /api/videos/{video_id}/detections
# ---------------------------------------------------------------------------

@router.get("/api/videos/{video_id}/detections", response_model=DetectionListResponse)
def get_video_detections(
    video_id: int,
    db: Session = Depends(get_db),
):
    """Return all real detections for a video. Empty list if none found."""
    video = db.get(Video, video_id)
    if video is None:
        raise HTTPException(status_code=404, detail=f"Video {video_id} not found.")

    detections = (
        db.query(Detection)
        .filter(Detection.video_id == video_id)
        .order_by(Detection.timestamp_in_video)
        .all()
    )

    return DetectionListResponse(
        video_id          = video_id,
        route_label       = video.route_label,
        total_detections  = len(detections),
        detections        = [_detection_to_response(d) for d in detections],
    )


# ---------------------------------------------------------------------------
# GET /api/issues/{issue_id}
# ---------------------------------------------------------------------------

@router.get("/api/issues/{issue_id}", response_model=DetectionResponse)
def get_issue(
    issue_id: int,
    db: Session = Depends(get_db),
):
    """Return full details of a specific issue."""
    det = db.get(Detection, issue_id)
    if det is None:
        raise HTTPException(status_code=404, detail=f"Issue {issue_id} not found.")
    return _detection_to_response(det)


# ---------------------------------------------------------------------------
# GET /api/issues/{issue_id}/timeline
# ---------------------------------------------------------------------------

@router.get("/api/issues/{issue_id}/timeline", response_model=List[IssueStatusHistoryEntry])
def get_issue_timeline(
    issue_id: int,
    db: Session = Depends(get_db),
):
    """Return status history (timeline) for an issue."""
    det = db.get(Detection, issue_id)
    if det is None:
        raise HTTPException(status_code=404, detail=f"Issue {issue_id} not found.")

    history = (
        db.query(IssueStatusHistory)
        .filter(IssueStatusHistory.detection_id == issue_id)
        .order_by(IssueStatusHistory.changed_at)
        .all()
    )
    return [
        IssueStatusHistoryEntry(
            id         = h.id,
            old_status = h.old_status.value if h.old_status else None,
            new_status = h.new_status.value if h.new_status else "",
            changed_at = h.changed_at,
            comment    = h.comment,
        )
        for h in history
    ]


# ---------------------------------------------------------------------------
# POST /api/issues/{issue_id}/verify
# ---------------------------------------------------------------------------

@router.post("/api/issues/{issue_id}/verify", response_model=IssueVerifyResponse)
def verify_issue(
    issue_id: int,
    body: IssueVerifyRequest,
    db: Session = Depends(get_db),
):
    """
    Authority verifies a detected issue.

    Allowed transitions:
      detected      → verified
      needs_review  → verified

    Once verified, work orders can be created.
    """
    det = db.get(Detection, issue_id)
    if det is None:
        raise HTTPException(status_code=404, detail=f"Issue {issue_id} not found.")

    if det.status not in (IssueStatus.detected, IssueStatus.needs_review):
        raise HTTPException(
            status_code=409,
            detail=f"Issue is already '{det.status.value}'; cannot verify from this state.",
        )

    old_status  = det.status
    det.status  = IssueStatus.verified
    det.updated_at = datetime.utcnow()

    db.add(IssueStatusHistory(
        detection_id = det.id,
        old_status   = old_status,
        new_status   = IssueStatus.verified,
        comment      = body.comment or "Verified by authority.",
    ))
    db.commit()
    logger.info(f"[ISSUE] ISS-{issue_id} verified by authority.")

    return IssueVerifyResponse(
        issue_id   = issue_id,
        new_status = IssueStatus.verified.value,
        message    = "Issue verified. A work order can now be created.",
    )


# ---------------------------------------------------------------------------
# POST /api/issues/{issue_id}/work-order
# ---------------------------------------------------------------------------

@router.post("/api/issues/{issue_id}/work-order", response_model=WorkOrderResponse)
def create_work_order(
    issue_id: int,
    body: CreateWorkOrderRequest,
    db: Session = Depends(get_db),
):
    """
    Create a work order for a verified issue.

    - Must be verified first (call /verify).
    - Optionally specify contractor_id; otherwise auto-matched by route label.
    - Returns the new work order.
    """
    det = db.get(Detection, issue_id)
    if det is None:
        raise HTTPException(status_code=404, detail=f"Issue {issue_id} not found.")

    if det.status not in (IssueStatus.verified, IssueStatus.assigned):
        raise HTTPException(
            status_code=409,
            detail=(
                f"Issue must be 'verified' before creating a work order. "
                f"Current status: '{det.status.value}'."
            ),
        )

    # Check no active work order already exists
    existing = (
        db.query(WorkOrder)
        .filter(WorkOrder.detection_id == issue_id)
        .filter(WorkOrder.status.notin_([WorkOrderStatus.rejected, WorkOrderStatus.completed]))
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"An active work order (WO-{existing.id}) already exists for this issue.",
        )

    # Resolve contractor
    contractor = None
    if body.contractor_id:
        contractor = db.get(Contractor, body.contractor_id)
        if contractor is None:
            raise HTTPException(status_code=404, detail=f"Contractor {body.contractor_id} not found.")
    else:
        contractor = match_contractor(db, det.route_label)

    now = datetime.utcnow()
    wo = WorkOrder(
        detection_id  = issue_id,
        contractor_id = contractor.id if contractor else None,
        status        = WorkOrderStatus.sent,
        priority      = det.severity,
        notes         = body.notes,
        assigned_date = now,
        deadline_date = now + timedelta(days=body.deadline_days),
        created_at    = now,
    )
    db.add(wo)

    # Transition issue to assigned
    det.status     = IssueStatus.assigned
    det.updated_at = now
    db.add(IssueStatusHistory(
        detection_id = det.id,
        old_status   = IssueStatus.verified,
        new_status   = IssueStatus.assigned,
        comment      = f"Work order created. Assigned to: {contractor.name if contractor else 'Unassigned'}.",
    ))

    db.commit()
    db.refresh(wo)
    logger.info(f"[WO] Created WO-{wo.id} for ISS-{issue_id}")

    return _work_order_to_response(wo, det)


def _work_order_to_response(wo: WorkOrder, det: Optional[Detection] = None) -> WorkOrderResponse:
    return WorkOrderResponse(
        id                  = wo.id,
        detection_id        = wo.detection_id,
        contractor_id       = wo.contractor_id,
        contractor_name     = wo.contractor.name if wo.contractor else None,
        status              = wo.status.value if wo.status else "pending",
        priority            = wo.priority.value if wo.priority else None,
        notes               = wo.notes,
        escalated           = wo.escalated,
        escalation_reason   = wo.escalation_reason,
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
        annotated_image_url = _annotated_url(det.annotated_path) if det else None,
    )


# ---------------------------------------------------------------------------
# GET /api/contractors
# ---------------------------------------------------------------------------

@router.get("/api/contractors", response_model=List[ContractorResponse])
def list_contractors(db: Session = Depends(get_db)):
    """List all active contractors from the real database."""
    contractors = db.query(Contractor).filter(Contractor.is_active == True).all()
    return [
        ContractorResponse(
            id             = c.id,
            name           = c.name,
            contact_person = c.contact_person,
            phone          = c.phone,
            email          = c.email,
            assigned_area  = c.assigned_area,
            rating         = c.rating,
            is_active      = c.is_active,
            rating_count   = len(c.ratings),
        )
        for c in contractors
    ]


# ---------------------------------------------------------------------------
# GET /api/public/stats
# ---------------------------------------------------------------------------

@router.get("/api/public/stats", response_model=PublicStatsResponse)
def get_public_stats(db: Session = Depends(get_db)):
    """Return real aggregate statistics from the database."""
    from sqlalchemy import func

    total_videos  = db.query(func.count(Video.id)).scalar() or 0
    total_issues  = db.query(func.count(Detection.id)).scalar() or 0
    resolved      = db.query(func.count(Detection.id)).filter(
        Detection.status == IssueStatus.resolved
    ).scalar() or 0
    active_wos    = db.query(func.count(WorkOrder.id)).filter(
        WorkOrder.status.notin_([WorkOrderStatus.completed, WorkOrderStatus.rejected])
    ).scalar() or 0
    critical      = db.query(func.count(Detection.id)).filter(
        Detection.severity == Severity.critical
    ).scalar() or 0
    active_contractors = db.query(func.count(Contractor.id)).filter(
        Contractor.is_active == True
    ).scalar() or 0

    return PublicStatsResponse(
        total_videos       = total_videos,
        total_issues       = total_issues,
        resolved_issues    = resolved,
        active_work_orders = active_wos,
        critical_issues    = critical,
        active_contractors = active_contractors,
    )


# ---------------------------------------------------------------------------
# Citizen report workflow helpers
# ---------------------------------------------------------------------------

def _contractor_for_video(db: Session, video: Video):
    return match_contractor(db, video.route_label)


@router.get("/api/videos/{video_id}/inspection-summary")
def inspection_summary(video_id: int, db: Session = Depends(get_db)):
    """Return the complete citizen-facing inspection bundle: location, contractor, detections and work orders."""
    video=db.get(Video, video_id)
    if not video: raise HTTPException(status_code=404, detail="Inspection not found")
    contractor=_contractor_for_video(db, video)
    dets=db.query(Detection).filter(Detection.video_id==video_id).order_by(Detection.timestamp_in_video).all()
    orders=[]
    for d in dets:
        for wo in d.work_orders:
            orders.append(_work_order_to_response(wo,d).model_dump())
    address=video.route_label or "Citizen-uploaded road inspection area"
    service_area=contractor.assigned_area if contractor else "Municipal service area"
    return {
        "video_id":video.id,"status":video.status.value,"route_label":video.route_label,
        "address":address,"service_area":service_area,
        "contractor": None if not contractor else {"id":contractor.id,"name":contractor.name,"assigned_area":contractor.assigned_area,"rating":contractor.rating,"rating_count":len(contractor.ratings),"email":contractor.email,"phone":contractor.phone},
        "summary":{"total_issues":len(dets),"potholes":sum(1 for d in dets if d.defect_type=='pothole'),"critical":sum(1 for d in dets if d.severity==Severity.critical),"high":sum(1 for d in dets if d.severity==Severity.high),"medium":sum(1 for d in dets if d.severity==Severity.medium),"low":sum(1 for d in dets if d.severity==Severity.low)},
        "detections":[_detection_to_response(d).model_dump() for d in dets],
        "work_orders":orders,
        "submitted":bool(orders),
    }


@router.post("/api/videos/{video_id}/submit-to-contractor")
def submit_report_to_contractor(video_id:int, db:Session=Depends(get_db)):
    """Citizen action: dispatch every unresolved detected issue to the area contractor."""
    video=db.get(Video,video_id)
    if not video: raise HTTPException(status_code=404,detail="Inspection not found")
    if video.status != __import__('models').VideoStatus.completed:
        raise HTTPException(status_code=409,detail="Inspection must finish before it can be submitted.")
    contractor=_contractor_for_video(db,video)
    if not contractor: raise HTTPException(status_code=409,detail="No active contractor is configured for this area.")
    dets=db.query(Detection).filter(Detection.video_id==video_id).all()
    created=[]; now=datetime.utcnow()
    for d in dets:
        active=next((w for w in d.work_orders if w.status not in (WorkOrderStatus.completed,WorkOrderStatus.rejected)),None)
        if active: created.append(_work_order_to_response(active,d).model_dump()); continue
        # Citizen submission starts the lifecycle; authority can still verify/monitor later.
        if d.status in (IssueStatus.detected,IssueStatus.needs_review,IssueStatus.verified):
            old=d.status; d.status=IssueStatus.assigned; d.updated_at=now
            db.add(IssueStatusHistory(detection_id=d.id,old_status=old,new_status=IssueStatus.assigned,comment=f"Citizen submitted inspection report to area contractor {contractor.name}."))
        days=1 if d.severity==Severity.critical else 3 if d.severity==Severity.high else 7
        wo=WorkOrder(detection_id=d.id,contractor_id=contractor.id,status=WorkOrderStatus.sent,priority=d.severity,notes=f"Citizen inspection report submitted for {video.route_label or 'road inspection area'}.",assigned_date=now,deadline_date=now+timedelta(days=days),dispatched_at=now,created_at=now)
        db.add(wo); db.flush(); created.append(_work_order_to_response(wo,d).model_dump())
    db.commit()
    return {"message":f"Inspection report submitted to {contractor.name}.","contractor":{"id":contractor.id,"name":contractor.name,"assigned_area":contractor.assigned_area},"work_orders":created}
