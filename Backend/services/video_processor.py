"""
SIHPS124 — Background Video Processor

Runs in a FastAPI BackgroundTask:
  1. Updates Video.status = processing
  2. Optionally parses GPS from uploaded GPX/CSV file
  3. Calls detect.process_video() — the real AI pipeline
  4. Saves deduplicated issues + evidence to the database
  5. Auto-creates a work order when a matching contractor is found
  6. Updates Video.status = completed | failed

NEVER creates fake detections or fabricates GPS coordinates.
"""

import logging
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

from sqlalchemy.orm import Session

from database import SessionLocal
from models import (
    Detection, Evidence, IssueStatusHistory,
    IssueStatus, EvidenceType, LocationSource, Severity,
    Video, VideoStatus, WorkOrder, WorkOrderStatus,
)
from ai_ml.detect import process_video as run_ai_pipeline
from services.work_orders import match_contractor, create_work_orders_for_detections
from services.gps_parser import parse_gps_file

logger = logging.getLogger("sihps.processor")

DEMO_DEADLINE_DAYS = 7


def _severity_enum(s: str) -> Optional[Severity]:
    try:
        return Severity(s)
    except Exception:
        return None


def _location_source_enum(s: str) -> LocationSource:
    try:
        return LocationSource(s)
    except Exception:
        return LocationSource.route_label


def _issue_status_for_confidence(confidence: float, cfg_thresholds: dict) -> IssueStatus:
    """
    Map AI confidence to initial issue status.

    auto_accept_threshold  >= → IssueStatus.verified
    review_threshold       >= → IssueStatus.detected  (will show as needs_review visually)
    below review           → IssueStatus.needs_review
    """
    auto = float(cfg_thresholds.get("auto_accept_threshold", 0.80))
    review = float(cfg_thresholds.get("review_threshold", 0.60))
    if confidence >= auto:
        return IssueStatus.verified
    if confidence >= review:
        return IssueStatus.detected
    return IssueStatus.needs_review


def process_video_background(
    video_id: int,
    video_path: str,
    route_label: Optional[str],
    gps_file_path: Optional[str] = None,
) -> None:
    """
    Entry point called by FastAPI BackgroundTasks.
    Uses its own DB session (separate from the request session).
    """
    db = SessionLocal()
    try:
        _run(db, video_id, video_path, route_label, gps_file_path)
    except Exception as exc:
        logger.exception(f"[PROCESSOR] Unhandled error for video_id={video_id}: {exc}")
        _mark_failed(db, video_id, str(exc))
    finally:
        db.close()


def _run(
    db: Session,
    video_id: int,
    video_path: str,
    route_label: Optional[str],
    gps_file_path: Optional[str],
) -> None:
    video = db.get(Video, video_id)
    if video is None:
        logger.error(f"[PROCESSOR] Video id={video_id} not found in DB.")
        return

    # --- Mark as processing ---
    video.status = VideoStatus.processing
    video.processing_started_at = datetime.utcnow()
    video.error_message = None
    db.commit()
    logger.info(f"[VIDEO] Processing started: id={video_id} route='{route_label}'")

    # --- Parse optional GPS file ---
    gps_track = None
    if gps_file_path and os.path.exists(gps_file_path):
        try:
            gps_track = parse_gps_file(gps_file_path)
            if gps_track:
                video.has_gps = True
                video.gps_source = LocationSource.gpx_file
                logger.info(f"[GPS] Loaded {len(gps_track)} GPS points from file")
            else:
                logger.info("[GPS] GPS file parsed but contained no usable waypoints.")
        except Exception as exc:
            logger.warning(f"[GPS] GPS file parsing failed: {exc} — proceeding without GPS")
    else:
        logger.info("[GPS] No external GPS file provided.")

    # --- Progress callback ---
    def on_progress(frames_done: int, total: int, n_issues: int) -> None:
        try:
            pct = min(99.0, (frames_done / max(1, total)) * 100)
            video.progress         = pct
            video.frames_processed = frames_done
            video.total_frames     = total
            video.detections_found = n_issues
            db.commit()
        except Exception:
            pass  # Non-critical; do not abort processing

    # --- Run AI pipeline ---
    result = run_ai_pipeline(
        video_path       = video_path,
        route_label      = route_label,
        gps_track        = gps_track,
        progress_callback = on_progress,
    )

    if result.get("error"):
        _mark_failed(db, video_id, result["error"])
        return

    # --- Update video metadata from pipeline result ---
    video.total_frames     = result.get("total_frames", 0)
    video.frames_processed = result.get("frames_processed", 0)
    if result.get("warnings"):
        logger.warning("[AI] %s", " | ".join(result["warnings"]))

    # Try to read video metadata (duration, fps, dimensions)
    import cv2
    try:
        cap = cv2.VideoCapture(video_path)
        if cap.isOpened():
            video.fps    = cap.get(cv2.CAP_PROP_FPS)
            video.width  = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            video.height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            n_frames     = cap.get(cv2.CAP_PROP_FRAME_COUNT)
            video.duration_seconds = n_frames / video.fps if video.fps else None
            if not video.total_frames:
                video.total_frames = int(n_frames)
            cap.release()
    except Exception as exc:
        logger.warning(f"[VIDEO] Could not read video metadata: {exc}")

    # --- Save issues to database ---
    issues = result.get("issues", [])
    logger.info(f"[DB] Saving {len(issues)} confirmed issues to database")

    # Load inference thresholds from config for status assignment
    import yaml
    cfg_path = Path(__file__).parent.parent / "ai_ml" / "config" / "config.yaml"
    with open(cfg_path) as f:
        full_cfg = yaml.safe_load(f)
    inf_cfg = full_cfg.get("inference", {})

    saved_detections = []
    for iss in issues:
        conf        = iss["best_confidence"]
        bbox        = iss["best_bbox"]           # (x1, y1, x2, y2)
        ann_path    = iss.get("best_annotated")
        sev_str     = iss.get("severity", "medium")
        lat         = iss.get("latitude")
        lng         = iss.get("longitude")
        loc_src_str = iss.get("location_source", "route_label")
        iss_status  = _issue_status_for_confidence(conf, inf_cfg)

        # Make annotated_path relative to Backend directory for serving via /ai-output/
        rel_ann_path = None
        if ann_path:
            try:
                backend_dir = Path(__file__).parent.parent
                rel_ann_path = str(Path(ann_path).relative_to(backend_dir))
            except ValueError:
                rel_ann_path = ann_path  # Keep as-is if not relative

        det = Detection(
            video_id           = video_id,
            defect_type        = iss["defect_class"],
            confidence         = conf,
            bbox_x1            = bbox[0],
            bbox_y1            = bbox[1],
            bbox_x2            = bbox[2],
            bbox_y2            = bbox[3],
            timestamp_in_video = iss.get("best_timestamp"),
            frame_number       = iss.get("best_frame_idx"),
            first_seen_frame   = iss.get("first_seen_frame"),
            last_seen_frame    = iss.get("last_seen_frame"),
            severity           = _severity_enum(sev_str),
            latitude           = lat,
            longitude          = lng,
            location_source    = _location_source_enum(loc_src_str),
            route_label        = route_label,
            thumbnail_path     = rel_ann_path,
            annotated_path     = rel_ann_path,
            status             = iss_status,
        )
        db.add(det)
        db.flush()  # Get det.id before adding evidence

        logger.info(
            f"[DB] Saved issue ISS-{det.id}: class={det.defect_type} "
            f"conf={conf:.3f} sev={sev_str} status={iss_status}"
        )

        # Save initial status history entry
        db.add(IssueStatusHistory(
            detection_id = det.id,
            old_status   = None,
            new_status   = iss_status,
            comment      = f"Auto-detected by AI (model_mode={result.get('model_mode', 'unknown')})",
        ))

        # Save evidence frames
        ev_frames = iss.get("evidence_frames", [])
        for i, ev in enumerate(ev_frames):
            ev_path = ev.get("annotated_path")
            rel_ev  = None
            if ev_path:
                try:
                    backend_dir = Path(__file__).parent.parent
                    rel_ev = str(Path(ev_path).relative_to(backend_dir))
                except ValueError:
                    rel_ev = ev_path
            ev_type = EvidenceType.best_frame if i == 0 else EvidenceType.additional_frame
            db.add(Evidence(
                detection_id       = det.id,
                image_path         = rel_ev or "",
                frame_number       = ev.get("frame_idx"),
                timestamp_in_video = ev.get("timestamp"),
                confidence         = ev.get("confidence"),
                evidence_type      = ev_type,
            ))

        saved_detections.append(det)

    db.flush()

    # Work orders are intentionally NOT dispatched during scanning.
    # The citizen reviews the complete report first and explicitly submits it
    # to the area contractor from the Results page.
    # --- Mark completed ---
    video.status                  = VideoStatus.completed
    video.progress                = 100.0
    video.detections_found        = len(saved_detections)
    video.processing_completed_at = datetime.utcnow()
    db.commit()

    logger.info(
        f"[VIDEO] Processing complete: id={video_id} | "
        f"issues={len(saved_detections)} | work_orders=0 (dispatch occurs after citizen submission)"
    )


def _mark_failed(db: Session, video_id: int, error_msg: str) -> None:
    try:
        video = db.get(Video, video_id)
        if video:
            video.status        = VideoStatus.failed
            video.error_message = error_msg[:1000]  # Truncate to column size
            video.processing_completed_at = datetime.utcnow()
            db.commit()
            logger.error(f"[VIDEO] Processing FAILED id={video_id}: {error_msg}")
    except Exception as exc:
        logger.exception(f"[PROCESSOR] Could not mark video {video_id} as failed: {exc}")
