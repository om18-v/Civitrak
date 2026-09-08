from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from models import Contractor, Detection, WorkOrder


DEMO_DEADLINE_DAYS = 7
COMPLETED_STATUS = "completed"


def match_contractor(
    db: Session,
    route_label: Optional[str],
) -> Optional[Contractor]:
    """Find the first contractor responsible for the uploaded route or area."""
    if not route_label:
        return None

    route = " ".join(route_label.strip().lower().split())
    contractors = db.query(Contractor).order_by(Contractor.id.asc()).all()

    normalized = [
        (
            contractor,
            " ".join((contractor.assigned_area or "").strip().lower().split()),
        )
        for contractor in contractors
    ]

    for contractor, assigned_area in normalized:
        if assigned_area and assigned_area == route:
            return contractor

    matching = [
        (contractor, assigned_area)
        for contractor, assigned_area in normalized
        if assigned_area
        and (assigned_area in route or route in assigned_area)
    ]
    matching.sort(key=lambda item: (-len(item[1]), item[0].id))
    if matching:
        return matching[0][0]

    return None


def create_work_orders_for_detections(
    db: Session,
    detections: list[Detection],
    route_label: Optional[str],
) -> int:
    """Create one idempotent, seven-day work order per matched detection."""
    contractor = match_contractor(db, route_label)
    if contractor is None:
        return 0

    created = 0
    now = datetime.utcnow()
    for detection in detections:
        existing = (
            db.query(WorkOrder)
            .filter(WorkOrder.detection_id == detection.id)
            .first()
        )
        if existing is not None:
            continue

        try:
            with db.begin_nested():
                db.add(
                    WorkOrder(
                        detection_id=detection.id,
                        contractor_id=contractor.id,
                        assigned_date=now,
                        deadline_date=now + timedelta(days=DEMO_DEADLINE_DAYS),
                        status="sent",
                        escalated=False,
                    )
                )
                db.flush()
            created += 1
        except IntegrityError:
            continue

    return created


def escalate_overdue_work_orders(db: Session) -> int:
    """Mark incomplete work orders past their deadline as escalated."""
    now = datetime.utcnow()
    overdue = (
        db.query(WorkOrder)
        .filter(
            WorkOrder.deadline_date.isnot(None),
            WorkOrder.deadline_date < now,
            WorkOrder.status != COMPLETED_STATUS,
        )
        .all()
    )

    for work_order in overdue:
        work_order.status = "escalated"
        work_order.escalated = True

    return len(overdue)


def update_contractor_rating(db: Session, contractor: Contractor) -> None:
    """Set a deterministic 0-5 rating based on completed jobs finished on time."""
    completed = (
        db.query(WorkOrder)
        .filter(
            WorkOrder.contractor_id == contractor.id,
            WorkOrder.status == COMPLETED_STATUS,
        )
        .all()
    )
    if not completed:
        return

    on_time = sum(
        1
        for work_order in completed
        if work_order.completed_at is not None
        and (
            work_order.deadline_date is None
            or work_order.completed_at <= work_order.deadline_date
        )
    )
    contractor.rating = round(5.0 * on_time / len(completed), 2)
