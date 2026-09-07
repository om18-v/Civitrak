from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import Detection, Video, WorkOrder
from schemas import (
    DetectionResponse,
    DetectionsResponse,
    PublicStatsResponse,
)


router = APIRouter(
    prefix="/api",
    tags=["Detections"],
)



@router.get(
    "/videos/{video_id}/detections",
    response_model=DetectionsResponse,
)
def get_video_detections(
    video_id: int,
    db: Session = Depends(get_db),
):
    """
    Return all AI detections belonging to a video.

    Used by:
    - Results page
    - Map page
    - Public dashboard
    """

    video = (
        db.query(Video)
        .filter(Video.id == video_id)
        .first()
    )

    if video is None:
        raise HTTPException(
            status_code=404,
            detail="Video not found.",
        )


    detections = (
        db.query(Detection)
        .filter(Detection.video_id == video_id)
        .order_by(Detection.timestamp_in_video.asc())
        .all()
    )


    return DetectionsResponse(
        video_id=video.id,
        route_label=video.route_label,
        total_detections=len(detections),
        detections=detections,
    )



@router.get(
    "/public/stats",
    response_model=PublicStatsResponse,
)
def get_public_stats(
    db: Session = Depends(get_db),
):
    """
    Return public road-defect statistics.

    total:
        Total number of detected issues.

    fixed:
        Number of detections linked to completed work orders.

    pending:
        Number of detections that are not yet fixed.
    """


    total = (
        db.query(func.count(Detection.id))
        .scalar()
        or 0
    )


    fixed = (
        db.query(func.count(func.distinct(WorkOrder.detection_id)))
        .filter(
            WorkOrder.status == "completed"
        )
        .scalar()
        or 0
    )


    pending = max(
        int(total) - int(fixed),
        0,
    )


    return PublicStatsResponse(
        total=int(total),
        fixed=int(fixed),
        pending=int(pending),
    )