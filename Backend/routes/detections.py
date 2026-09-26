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

from fastapi import APIRouter, Depends, HTTPException, Response
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
    PublicStatsResponse, WorkOrderResponse, FalsePositiveRequest,
    PublicCaseResponse,
)
from services.work_orders import match_contractor
from services.auth import require_role

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
        case_id            = det.case_id,
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
        gps_quality        = getattr(det, "gps_quality", "ROUTE_GEOCODED") or "ROUTE_GEOCODED",
        gps_status         = getattr(det, "gps_status", "APPROXIMATE") or "APPROXIMATE",
        annotated_image_url = _annotated_url(det.annotated_path),
        thumbnail_url      = _annotated_url(det.thumbnail_path),
        status             = det.status.value if det.status else "detected",
        is_false_positive  = bool(getattr(det, "is_false_positive", False)),
        false_positive_reason = getattr(det, "false_positive_reason", None),
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
    _role: str = Depends(require_role(["authority", "admin"])),
):
    """
    Authority verifies a detected issue.
    Allowed transitions: detected / needs_review → verified
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
        comment      = body.comment or "Verified by municipal authority.",
    ))
    db.commit()
    logger.info(f"[ISSUE] ISS-{issue_id} ({det.case_id}) verified by authority.")

    return IssueVerifyResponse(
        issue_id   = issue_id,
        case_id    = det.case_id,
        new_status = IssueStatus.verified.value,
        message    = "Issue verified. A work order can now be created.",
    )


# ---------------------------------------------------------------------------
# POST /api/issues/{issue_id}/false-positive
# ---------------------------------------------------------------------------

@router.post("/api/issues/{issue_id}/false-positive", response_model=IssueVerifyResponse)
def mark_false_positive(
    issue_id: int,
    body: FalsePositiveRequest,
    db: Session = Depends(get_db),
    _role: str = Depends(require_role(["authority", "admin"])),
):
    """
    Authority action: mark detection as false positive.
    Preserves original detection record for future AI training/feedback.
    """
    det = db.get(Detection, issue_id)
    if det is None:
        raise HTTPException(status_code=404, detail=f"Issue {issue_id} not found.")

    old_status = det.status
    det.status = IssueStatus.false_positive
    det.is_false_positive = True
    det.false_positive_reason = body.reason
    det.updated_at = datetime.utcnow()

    # Cancel any active pending work orders for this false positive
    for wo in det.work_orders:
        if wo.status not in (WorkOrderStatus.completed, WorkOrderStatus.rejected):
            wo.status = WorkOrderStatus.rejected
            wo.notes = f"Cancelled: Marked as false positive ({body.reason}). {body.notes or ''}"

    db.add(IssueStatusHistory(
        detection_id = det.id,
        old_status   = old_status,
        new_status   = IssueStatus.false_positive,
        comment      = f"Marked as false positive by authority. Reason: {body.reason}. {body.notes or ''}",
    ))
    db.commit()
    logger.info(f"[ISSUE] ISS-{issue_id} ({det.case_id}) marked as false positive: {body.reason}")

    return IssueVerifyResponse(
        issue_id   = issue_id,
        case_id    = det.case_id,
        new_status = IssueStatus.false_positive.value,
        message    = f"Issue marked as false positive ({body.reason}). Work orders cancelled.",
    )


# ---------------------------------------------------------------------------
# POST /api/issues/{issue_id}/work-order
# ---------------------------------------------------------------------------

@router.post("/api/issues/{issue_id}/work-order", response_model=WorkOrderResponse)
def create_work_order(
    issue_id: int,
    body: CreateWorkOrderRequest,
    db: Session = Depends(get_db),
    _role: str = Depends(require_role(["authority", "admin"])),
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
    if det is None:
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


# ---------------------------------------------------------------------------
# GET /api/cases/{case_id} — Public Case View
# ---------------------------------------------------------------------------

@router.get("/api/cases/{case_id}", response_model=PublicCaseResponse)
def get_public_case(case_id: str, db: Session = Depends(get_db)):
    """
    Public sanitized case lookup for citizen tracking & QR codes.
    Matches CIVI-2026-000001, WO-01, or numeric id.
    """
    raw_id = None
    clean = case_id.strip()
    if clean.isdigit():
        raw_id = int(clean)
    elif "CIVI-" in clean.upper() or "WO-" in clean.upper():
        digits = "".join(c for c in clean.split("-")[-1] if c.isdigit())
        if digits:
            raw_id = int(digits)

    det = None
    if raw_id is not None:
        det = db.get(Detection, raw_id)
        if not det:
            wo = db.get(WorkOrder, raw_id)
            if wo:
                det = wo.detection

    if not det:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")

    primary_wo = det.work_orders[-1] if det.work_orders else None
    contractor = primary_wo.contractor if (primary_wo and primary_wo.contractor) else None

    history = (
        db.query(IssueStatusHistory)
        .filter(IssueStatusHistory.detection_id == det.id)
        .order_by(IssueStatusHistory.changed_at)
        .all()
    )

    ev_urls = [_annotated_url(ev.image_path) for ev in det.evidence if ev.image_path]

    label_map = {
        "pothole": "Pothole Defect",
        "open_manhole": "Open Manhole Hazard",
        "road_crack": "Surface Edge Crack",
        "damaged_surface": "Damaged Pavement Surface",
        "damaged_signboard": "Damaged Signboard",
        "faded_zebra_crossing": "Faded Zebra Crossing",
    }

    rating_val = None
    if primary_wo and primary_wo.rating:
        rating_val = primary_wo.rating.rating

    return PublicCaseResponse(
        case_id = det.case_id,
        issue_id = det.id,
        defect_type = det.defect_type,
        defect_label = label_map.get(det.defect_type, det.defect_type.replace("_", " ").title()),
        severity = det.severity.value if det.severity else "medium",
        status = det.status.value,
        route_label = det.route_label or "Municipal Road Sector",
        approx_location = {
            "latitude": det.latitude,
            "longitude": det.longitude,
            "source": det.location_source.value if det.location_source else "route_label",
            "quality": getattr(det, "gps_quality", "ROUTE_GEOCODED") or "ROUTE_GEOCODED",
        } if (det.latitude and det.longitude) else None,
        created_at = det.created_at,
        updated_at = det.updated_at,
        thumbnail_url = _annotated_url(det.thumbnail_path),
        evidence_urls = [u for u in ev_urls if u],
        contractor = {
            "name": contractor.name,
            "area": contractor.assigned_area,
            "rating": contractor.rating,
        } if contractor else None,
        work_order = {
            "id": f"WO-{primary_wo.id}",
            "status": primary_wo.status.value,
            "sla_hours": primary_wo.sla_hours,
            "hours_remaining": primary_wo.hours_remaining,
            "is_overdue": primary_wo.is_overdue,
            "deadline": primary_wo.deadline_date.isoformat() if primary_wo.deadline_date else None,
            "repair_proof_url": _annotated_url(primary_wo.repair_proof_image) if primary_wo.repair_proof_image else None,
        } if primary_wo else None,
        timeline = [
            IssueStatusHistoryEntry(
                id = h.id,
                old_status = h.old_status.value if h.old_status else None,
                new_status = h.new_status.value if h.new_status else "",
                changed_at = h.changed_at,
                comment = h.comment,
            ) for h in history
        ],
        qr_url = f"/api/cases/{det.case_id}/qr",
        is_resolved = det.status == IssueStatus.resolved or (primary_wo and primary_wo.status == WorkOrderStatus.completed),
        citizen_rating = rating_val,
    )


# ---------------------------------------------------------------------------
# GET /api/cases/{case_id}/qr — QR Code Image
# ---------------------------------------------------------------------------

@router.get("/api/cases/{case_id}/qr")
def get_case_qr_code(case_id: str):
    """Generate a clean QR code PNG for this public case."""
    try:
        from reportlab.graphics.barcode.qr import QrCodeWidget
        from reportlab.graphics.shapes import Drawing
        from reportlab.graphics import renderPM

        qr_widget = QrCodeWidget(f"https://civitrak.gov.in/case/{case_id}")
        bounds = qr_widget.getBounds()
        w = bounds[2] - bounds[0]
        h = bounds[3] - bounds[1]
        drawing = Drawing(160, 160, transform=[160.0/w, 0, 0, 160.0/h, 0, 0])
        drawing.add(qr_widget)
        png_data = renderPM.drawToString(drawing, fmt="PNG")
        return Response(content=png_data, media_type="image/png")
    except Exception as exc:
        logger.warning(f"[QR] Error generating QR code: {exc}")
        # Return 1x1 transparent png on failure
        return Response(status_code=500, content=f"QR generation failed: {exc}")


# ---------------------------------------------------------------------------
# GET /api/issues/recurring — Recurring Defect Detection
# ---------------------------------------------------------------------------

@router.get("/api/issues/recurring")
def list_recurring_issues(db: Session = Depends(get_db)):
    """Identify issues that have reappeared in proximate geographic zones."""
    detections = db.query(Detection).filter(Detection.is_false_positive == False).all()
    import math

    def dist_meters(lat1, lon1, lat2, lon2):
        if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
            return 999999.0
        # Haversine
        R = 6371000.0
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlam = math.radians(lon2 - lon1)
        a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlam/2)**2
        return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    clusters = []
    visited = set()

    for i, d1 in enumerate(detections):
        if d1.id in visited:
            continue
        group = [d1]
        visited.add(d1.id)

        for j, d2 in enumerate(detections):
            if d2.id in visited:
                continue
            if d1.defect_type == d2.defect_type:
                d = dist_meters(d1.latitude, d1.longitude, d2.latitude, d2.longitude)
                same_route = bool(d1.route_label and d2.route_label and (d1.route_label.lower() in d2.route_label.lower() or d2.route_label.lower() in d1.route_label.lower()))
                if d <= 60.0 or (same_route and d <= 150.0):
                    group.append(d2)
                    visited.add(d2.id)

        if len(group) > 1:
            group.sort(key=lambda x: x.created_at or datetime.min)
            latest = group[-1]
            earliest = group[0]
            clusters.append({
                "case_id": latest.case_id,
                "defect_type": latest.defect_type,
                "route_label": latest.route_label or "Inspection Route",
                "latitude": latest.latitude,
                "longitude": latest.longitude,
                "repeat_count": len(group),
                "first_detected": earliest.created_at.isoformat() if earliest.created_at else None,
                "latest_detected": latest.created_at.isoformat() if latest.created_at else None,
                "history_cases": [d.case_id for d in group],
                "resolved_previously": any(d.status == IssueStatus.resolved for d in group[:-1]),
            })

    return {"total_recurring": len(clusters), "recurring_clusters": clusters}
