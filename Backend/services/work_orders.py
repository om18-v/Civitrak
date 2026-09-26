"""
SIHPS124 — Work Order Service Helpers

Contains:
  match_contractor()                    — find a contractor for a route label
  create_work_orders_for_detections()   — bulk auto-create WOs for high-conf verified issues
"""

import logging
from datetime import datetime, timedelta
from typing import List, Optional

from sqlalchemy.orm import Session

from models import (
    Contractor, Detection, IssueStatus, IssueStatusHistory,
    Severity, WorkOrder, WorkOrderStatus,
)

logger = logging.getLogger("sihps.services.work_orders")

AUTO_WO_MIN_SEVERITY = {Severity.high, Severity.critical}
DEFAULT_DEADLINE_DAYS = 7


def match_contractor(
    db: Session,
    route_label: Optional[str],
) -> Optional[Contractor]:
    """
    Find an active contractor for the given route label.
    Matches by assigned_area substring (case-insensitive).
    Returns the first match, or any active contractor as fallback, or None.
    """
    q = db.query(Contractor).filter(Contractor.is_active == True)
    if route_label:
        rl = route_label.lower()
        candidates = q.all()
        # Exact/sub-string service-area match first.
        for c in candidates:
            if c.assigned_area and (c.assigned_area.lower() in rl or rl in c.assigned_area.lower()):
                return c
        # Token overlap makes routes such as "Panvel-New Panvel Road" resolve to
        # the seeded "Panvel" service area instead of always choosing contractor #1.
        tokens={t for t in __import__('re').split(r'[^a-z0-9]+',rl) if len(t)>=4}
        ranked=[]
        for c in candidates:
            area_tokens={t for t in __import__('re').split(r'[^a-z0-9]+',(c.assigned_area or '').lower()) if len(t)>=4}
            overlap=len(tokens & area_tokens)
            if overlap: ranked.append((overlap,c))
        if ranked:
            ranked.sort(key=lambda item:item[0],reverse=True)
            return ranked[0][1]
    return q.first()


def create_work_orders_for_detections(
    db: Session,
    detections: List[Detection],
    route_label: Optional[str],
) -> int:
    """
    Auto-create work orders for high/critical severity verified issues.
    Skips issues that already have an active work order.
    Returns count of work orders created.
    """
    created = 0
    for det in detections:
        # Only auto-create for verified issues with high/critical severity
        if det.status != IssueStatus.verified:
            continue
        if det.severity not in AUTO_WO_MIN_SEVERITY:
            continue

        # Skip if already has an active WO
        existing = (
            db.query(WorkOrder)
            .filter(WorkOrder.detection_id == det.id)
            .filter(WorkOrder.status.notin_([WorkOrderStatus.rejected, WorkOrderStatus.completed]))
            .first()
        )
        if existing:
            continue

        contractor = match_contractor(db, route_label)
        now = datetime.utcnow()
        wo = WorkOrder(
            detection_id  = det.id,
            contractor_id = contractor.id if contractor else None,
            status        = WorkOrderStatus.sent,
            priority      = det.severity,
            assigned_date = now,
            deadline_date = now + timedelta(days=DEFAULT_DEADLINE_DAYS),
            created_at    = now,
            notes         = f"Auto-created from AI detection (confidence={det.confidence:.2f}).",
        )
        db.add(wo)

        det.status     = IssueStatus.assigned
        det.updated_at = now
        db.add(IssueStatusHistory(
            detection_id = det.id,
            old_status   = IssueStatus.verified,
            new_status   = IssueStatus.assigned,
            comment      = (
                f"Work order auto-created. "
                f"Assigned to: {contractor.name if contractor else 'Unassigned'}."
            ),
        ))
        created += 1
        logger.info(
            f"[WO] Auto-created work order for ISS-{det.id} "
            f"sev={det.severity.value} contractor={contractor.name if contractor else 'None'}"
        )

    if created:
        db.flush()
    return created
