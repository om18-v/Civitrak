"""CiviTrak GIS analytics and edge-efficiency endpoints."""
from collections import defaultdict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import Detection, Evidence, Video, WorkOrder, WorkOrderStatus, IssueStatus

router = APIRouter()


def _is_resolved(det: Detection, work_orders_by_detection: dict[int, list[WorkOrder]]) -> bool:
    if det.status in {IssueStatus.resolved, IssueStatus.verified}:
        return True
    return any(wo.status == WorkOrderStatus.completed for wo in work_orders_by_detection.get(det.id, []))


@router.get("/api/analytics/overview")
def analytics_overview(db: Session = Depends(get_db)):
    """Return live route analytics, GIS heat points and edge-processing metrics.

    Edge efficiency is an estimate of the reduction possible when the edge device
    transmits only AI evidence/alerts instead of every decoded video frame. It is
    deliberately labelled as estimated; no network traffic is fabricated here.
    """
    videos = db.query(Video).all()
    detections = db.query(Detection).all()
    evidence = db.query(Evidence).all()
    work_orders = db.query(WorkOrder).all()

    wo_by_detection: dict[int, list[WorkOrder]] = defaultdict(list)
    for wo in work_orders:
        wo_by_detection[wo.detection_id].append(wo)

    evidence_by_detection: dict[int, int] = defaultdict(int)
    for ev in evidence:
        evidence_by_detection[ev.detection_id] += 1

    route_map: dict[str, dict] = {}
    for det in detections:
        route = (det.route_label or "Unlabelled route").strip()
        item = route_map.setdefault(route, {
            "route": route, "issues": 0, "critical": 0, "high": 0,
            "resolved": 0, "assigned": 0, "coordinates": []
        })
        item["issues"] += 1
        if det.severity and det.severity.value == "critical": item["critical"] += 1
        if det.severity and det.severity.value == "high": item["high"] += 1
        if _is_resolved(det, wo_by_detection): item["resolved"] += 1
        if det.status in {IssueStatus.assigned, IssueStatus.dispatched, IssueStatus.repairing} or wo_by_detection.get(det.id):
            item["assigned"] += 1
        if det.latitude is not None and det.longitude is not None and (det.latitude or det.longitude):
            item["coordinates"].append([det.latitude, det.longitude])

    route_analytics = sorted(route_map.values(), key=lambda x: (-x["issues"], x["route"]))

    # GIS heat points use severity as weight so the frontend can render a dynamic
    # density layer without another paid map/heatmap API.
    weight_map = {"low": 0.35, "medium": 0.55, "high": 0.8, "critical": 1.0}
    heat_points = []
    for det in detections:
        if det.latitude is None or det.longitude is None or not (det.latitude or det.longitude):
            continue
        heat_points.append({
            "lat": det.latitude,
            "lng": det.longitude,
            "weight": weight_map.get(det.severity.value if det.severity else "medium", 0.55),
            "severity": det.severity.value if det.severity else "medium",
            "defect_type": det.defect_type,
            "route": det.route_label or "Unlabelled route",
        })

    total_frames = sum(max(0, int(v.total_frames or 0)) for v in videos)
    processed_frames = sum(max(0, int(v.frames_processed or 0)) for v in videos)
    evidence_frames = sum(evidence_by_detection.values())
    source_frames = processed_frames or total_frames
    estimated_transmitted_frames = min(source_frames, evidence_frames + len(detections))
    estimated_reduction = 0.0
    if source_frames:
        estimated_reduction = max(0.0, min(99.9, (1 - estimated_transmitted_frames / source_frames) * 100))

    return {
        "edge_ai": {
            "mode": "local_ai_inference",
            "status": "ready",
            "message": "AI inference runs locally before evidence/alerts are surfaced to the platform.",
            "source_frames_processed": source_frames,
            "evidence_frames": evidence_frames,
            "alerts": len(detections),
            "estimated_bandwidth_reduction_percent": round(estimated_reduction, 1),
            "basis": "Estimated from processed frames versus evidence frames + alerts; not a measured network transfer rate."
        },
        "route_analytics": route_analytics,
        "heat_points": heat_points,
        "workflow": {
            "detected": sum(1 for d in detections if d.status in {IssueStatus.detected, IssueStatus.needs_review}),
            "verified": sum(1 for d in detections if d.status == IssueStatus.verified),
            "assigned": sum(1 for d in detections if d.status in {IssueStatus.assigned, IssueStatus.dispatched}),
            "repairing": sum(1 for d in detections if d.status == IssueStatus.repairing),
            "resolved": sum(1 for d in detections if _is_resolved(d, wo_by_detection)),
            "work_orders": len(work_orders),
        },
    }
