"""
SIHPS124 — Video Upload & Status Routes

POST /api/videos/upload   — upload a real video + optional GPS file
GET  /api/videos/{id}/status  — real processing status with progress
"""

import logging
import os
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from database import get_db
from models import Video, VideoStatus
from schemas import VideoStatusResponse, VideoUploadResponse
from services.video_processor import process_video_background

logger = logging.getLogger("sihps.routes.videos")
router = APIRouter()

# ---------------------------------------------------------------------------
# Directories
# ---------------------------------------------------------------------------

BACKEND_DIR = Path(__file__).parent.parent
UPLOAD_DIR  = BACKEND_DIR / "uploads"
GPS_DIR     = BACKEND_DIR / "uploads" / "gps"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
GPS_DIR.mkdir(parents=True, exist_ok=True)

SUPPORTED_VIDEO_EXTS = {".mp4", ".mov", ".avi", ".mkv"}
SUPPORTED_GPS_EXTS   = {".gpx", ".csv", ".txt"}
MAX_VIDEO_SIZE_BYTES = 2_000 * 1024 * 1024  # 2 GB


# ---------------------------------------------------------------------------
# Upload
# ---------------------------------------------------------------------------

@router.post("/api/videos/upload", response_model=VideoUploadResponse)
async def upload_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    route_label: Optional[str] = Form(None),
    gps_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
):
    """
    Upload a road inspection video.

    - Validates file type and size.
    - Saves the video with a UUID filename (safe path, no path traversal).
    - Creates a Video DB record with status=queued.
    - Starts background processing immediately.
    """
    # --- Validate video file ---
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided.")

    orig_name = Path(file.filename).name          # Strip any directory component
    ext       = Path(orig_name).suffix.lower()
    if ext not in SUPPORTED_VIDEO_EXTS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported video format '{ext}'. Accepted: {', '.join(SUPPORTED_VIDEO_EXTS)}",
        )

    # Read and size-check
    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded video file is empty.")
    if len(content) > MAX_VIDEO_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Video exceeds maximum allowed size of 2 GB ({len(content) // 1024 // 1024} MB received).",
        )

    # Save video to disk with UUID filename
    stored_filename = f"{uuid.uuid4().hex}{ext}"
    video_path      = UPLOAD_DIR / stored_filename
    video_path.write_bytes(content)
    logger.info(f"[VIDEO] Uploaded: {orig_name} → {stored_filename} ({len(content) // 1024} KB)")

    # --- Handle optional GPS file ---
    gps_file_path: Optional[str] = None
    if gps_file and gps_file.filename:
        gps_ext = Path(gps_file.filename).suffix.lower()
        if gps_ext in SUPPORTED_GPS_EXTS:
            gps_content = await gps_file.read()
            if gps_content:
                gps_stored = f"{uuid.uuid4().hex}{gps_ext}"
                gps_path   = GPS_DIR / gps_stored
                gps_path.write_bytes(gps_content)
                gps_file_path = str(gps_path)
                logger.info(f"[GPS] GPS file saved: {gps_file.filename} → {gps_stored}")
        else:
            logger.warning(f"[GPS] Unsupported GPS extension '{gps_ext}'; ignoring GPS file.")

    # --- Create DB record ---
    route = (route_label or "").strip() or None
    video = Video(
        filename      = stored_filename,
        original_name = orig_name,
        route_label   = route,
        status        = VideoStatus.queued,
        file_size_bytes = len(content),
    )
    db.add(video)
    db.commit()
    db.refresh(video)
    logger.info(f"[DB] Video record created: id={video.id} route='{route}'")

    # --- Queue background processing ---
    background_tasks.add_task(
        process_video_background,
        video_id      = video.id,
        video_path    = str(video_path),
        route_label   = route,
        gps_file_path = gps_file_path,
    )

    return VideoUploadResponse(
        video_id    = video.id,
        status      = VideoStatus.queued.value,
        route_label = route,
        message     = "Video uploaded and queued for AI processing.",
    )


# ---------------------------------------------------------------------------
# Status
# ---------------------------------------------------------------------------

@router.get("/api/videos/{video_id}/status", response_model=VideoStatusResponse)
def get_video_status(
    video_id: int,
    db: Session = Depends(get_db),
):
    """
    Returns the real processing status of an uploaded video.

    Includes:
      - status (queued | processing | completed | failed)
      - progress 0-100
      - frames_processed / total_frames
      - detections_found
      - error_message (if failed)
    """
    video = db.get(Video, video_id)
    if video is None:
        raise HTTPException(status_code=404, detail=f"Video {video_id} not found.")

    return VideoStatusResponse(
        video_id                 = video.id,
        status                   = video.status.value if video.status else "unknown",
        progress                 = video.progress or 0.0,
        frames_processed         = video.frames_processed or 0,
        total_frames             = video.total_frames or 0,
        detections_found         = video.detections_found or 0,
        error_message            = video.error_message,
        route_label              = video.route_label,
        duration_seconds         = video.duration_seconds,
        processing_started_at    = video.processing_started_at,
        processing_completed_at  = video.processing_completed_at,
    )
