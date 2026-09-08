import logging
import os
from typing import Any, Callable, Optional

from database import SessionLocal
from models import Detection, Video
from services.work_orders import create_work_orders_for_detections


# ---------------------------------------------------------
# Logging
# ---------------------------------------------------------

logger = logging.getLogger(__name__)


# ---------------------------------------------------------
# Member 6 AI integration
# ---------------------------------------------------------

def get_ai_processor() -> Callable[[str], list[dict[str, Any]]]:
    """
    Load Member 6's AI video-processing function.

    Member 6 should provide:

        ai_ml/detect.py

    containing:

        def process_video(video_path: str) -> list[dict]:
            ...

    The import is done lazily so the backend can start even
    before the AI module is connected.
    """

    try:
        from ai_ml.detect import process_video

        return process_video

    except ImportError as exc:
        raise RuntimeError(
            "Member 6 AI module is not connected yet. "
            "Expected: ai_ml/detect.py with a process_video() function."
        ) from exc


# ---------------------------------------------------------
# Location handling
# ---------------------------------------------------------

def get_detection_location(
    route_label: Optional[str],
    timestamp_in_video: float,
    gps_track: Optional[list[dict[str, float]]] = None,
) -> tuple[Optional[float], Optional[float]]:
    """
    Determine latitude and longitude for a detection.

    Priority:
    1. GPS track, if supplied.
    2. Otherwise return None.

    Important:
    A normal video does NOT automatically contain real-world
    GPS coordinates. The route label tells us WHERE the video
    belongs to, while a GPS track can provide exact coordinates.

    The GPS track format is expected to be:

        [
            {
                "timestamp": 0.0,
                "latitude": 18.9894,
                "longitude": 73.1175
            },
            ...
        ]

    For now, if no GPS track is available, coordinates remain
    NULL in the database instead of inventing a location.
    """

    if not gps_track:
        return None, None

    closest_point = min(
        gps_track,
        key=lambda point: abs(
            float(point.get("timestamp", 0.0))
            - float(timestamp_in_video)
        ),
    )

    latitude = closest_point.get("latitude")
    longitude = closest_point.get("longitude")

    return latitude, longitude


# ---------------------------------------------------------
# Detection normalization
# ---------------------------------------------------------

def normalize_detection(
    raw_detection: dict[str, Any],
    route_label: Optional[str],
    gps_track: Optional[list[dict[str, float]]] = None,
) -> dict[str, Any]:
    """
    Convert Member 6's detection result into the format
    required by the database.

    Member 6 contract:

        {
            "defect_type": "pothole",
            "confidence": 0.87,
            "timestamp_in_video": 12.4,
            "annotated_thumbnail_path": "thumbs/frame_012.jpg"
        }
    """

    defect_type = str(
        raw_detection.get("defect_type", "unknown")
    )

    confidence = float(
        raw_detection.get("confidence", 0.0)
    )

    timestamp = float(
        raw_detection.get("timestamp_in_video", 0.0)
    )

    thumbnail_path = raw_detection.get(
        "annotated_thumbnail_path"
    )

    latitude, longitude = get_detection_location(
        route_label=route_label,
        timestamp_in_video=timestamp,
        gps_track=gps_track,
    )

    return {
        "defect_type": defect_type,
        "confidence_score": confidence,
        "timestamp_in_video": timestamp,
        "latitude": latitude,
        "longitude": longitude,
        "thumbnail_path": thumbnail_path,
    }


# ---------------------------------------------------------
# Database insertion
# ---------------------------------------------------------

def save_detections(
    db,
    video_id: int,
    detections: list[dict[str, Any]],
    route_label: Optional[str],
    gps_track: Optional[list[dict[str, float]]] = None,
) -> int:
    """
    Save all AI detections into the detections table.

    Returns:
        Number of detections successfully inserted.
    """

    inserted_count = 0
    inserted_detections = []

    for raw_detection in detections:

        if not isinstance(raw_detection, dict):
            logger.warning(
                "Skipping invalid detection for video %s: %s",
                video_id,
                raw_detection,
            )
            continue

        detection_data = normalize_detection(
            raw_detection=raw_detection,
            route_label=route_label,
            gps_track=gps_track,
        )

        detection = Detection(
            video_id=video_id,
            defect_type=detection_data["defect_type"],
            confidence_score=detection_data["confidence_score"],
            timestamp_in_video=detection_data["timestamp_in_video"],
            latitude=detection_data["latitude"],
            longitude=detection_data["longitude"],
            thumbnail_path=detection_data["thumbnail_path"],
        )

        db.add(detection)
        inserted_detections.append(detection)

        inserted_count += 1

    db.flush()
    create_work_orders_for_detections(
        db=db,
        detections=inserted_detections,
        route_label=route_label,
    )
    return inserted_count


# ---------------------------------------------------------
# Main background processing function
# ---------------------------------------------------------

def process_video_background(
    video_id: int,
    video_path: str,
    route_label: Optional[str] = None,
    gps_track: Optional[list[dict[str, float]]] = None,
) -> None:
    """
    Background processing pipeline for an uploaded video.

    Flow:

        Uploaded video
              ↓
        Member 6 AI processor
              ↓
        Detection results
              ↓
        Save detections in PostgreSQL
              ↓
        Update video status
              ↓
        Frontend can fetch results

    This function is called by FastAPI BackgroundTasks.
    """

    db = SessionLocal()

    try:
        logger.info(
            "Starting video processing: video_id=%s",
            video_id,
        )

        # -------------------------------------------------
        # Check video exists
        # -------------------------------------------------

        video = (
            db.query(Video)
            .filter(Video.id == video_id)
            .first()
        )

        if video is None:
            logger.error(
                "Video %s was not found in database.",
                video_id,
            )
            return

        # -------------------------------------------------
        # Check uploaded file exists
        # -------------------------------------------------

        if not os.path.exists(video_path):
            logger.error(
                "Video file does not exist: %s",
                video_path,
            )

            video.status = "failed"
            db.commit()

            return

        # -------------------------------------------------
        # Keep status as processing
        # -------------------------------------------------

        video.status = "processing"
        db.commit()

        # -------------------------------------------------
        # Load Member 6 AI processor
        # -------------------------------------------------

        ai_processor = get_ai_processor()

        logger.info(
            "Running AI detection for video %s...",
            video_id,
        )

        # -------------------------------------------------
        # Run AI processing
        # -------------------------------------------------

        raw_detections = ai_processor(video_path)

        if raw_detections is None:
            raw_detections = []

        if not isinstance(raw_detections, list):
            raise ValueError(
                "Member 6 process_video() must return a list of detections."
            )

        logger.info(
            "AI processing completed for video %s. "
            "Detected %s objects.",
            video_id,
            len(raw_detections),
        )



        inserted_count = save_detections(
            db=db,
            video_id=video_id,
            detections=raw_detections,
            route_label=route_label,
            gps_track=gps_track,
        )


        video.status = "done"

        db.commit()

        logger.info(
            "Video %s processing completed successfully. "
            "%s detections saved.",
            video_id,
            inserted_count,
        )

    except Exception as exc:

        logger.exception(
            "Video processing failed for video %s: %s",
            video_id,
            exc,
        )


        try:
            video = (
                db.query(Video)
                .filter(Video.id == video_id)
                .first()
            )

            if video is not None:
                video.status = "failed"
                db.commit()

        except Exception:
            db.rollback()

    finally:

        db.close()