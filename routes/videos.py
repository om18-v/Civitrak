import os
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from database import get_db
from models import Video
from schemas import VideoStatusResponse, VideoUploadResponse
from services.video_processor import process_video_background


router = APIRouter(
    prefix="/api/videos",
    tags=["Videos"],
)


# ---------------------------------------------------------
# Upload configuration
# ---------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"

UPLOAD_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


# Allowed video formats
ALLOWED_VIDEO_EXTENSIONS = {
    ".mp4",
    ".avi",
    ".mov",
    ".mkv",
    ".webm",
}


# Maximum upload size:
# 500 MB
MAX_FILE_SIZE = 500 * 1024 * 1024


# ---------------------------------------------------------
# Helper functions
# ---------------------------------------------------------

def get_file_extension(filename: Optional[str]) -> str:
    """
    Return the lowercase file extension.
    """

    if not filename:
        return ""

    return Path(filename).suffix.lower()


def is_allowed_video(filename: Optional[str]) -> bool:
    """
    Check whether the uploaded file has a supported
    video extension.
    """

    extension = get_file_extension(filename)

    return extension in ALLOWED_VIDEO_EXTENSIONS


# ---------------------------------------------------------
# Upload video
# ---------------------------------------------------------

@router.post(
    "/upload",
    response_model=VideoUploadResponse,
)
async def upload_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    route_label: str = Form(...),
    db: Session = Depends(get_db),
):
    """
    Upload a road/traffic video for AI processing.

    Flow:

        Frontend
            ↓
        Upload video
            ↓
        Save file
            ↓
        Create videos database record
            ↓
        Start background AI processing
            ↓
        Return video_id immediately
    """

    # -----------------------------------------------------
    # Validate filename
    # -----------------------------------------------------

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No video filename was provided.",
        )

    # -----------------------------------------------------
    # Validate extension
    # -----------------------------------------------------

    if not is_allowed_video(file.filename):
        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported video format. "
                "Allowed formats: MP4, AVI, MOV, MKV, WEBM."
            ),
        )

    # -----------------------------------------------------
    # Validate route label
    # -----------------------------------------------------

    route_label = route_label.strip()

    if not route_label:
        raise HTTPException(
            status_code=400,
            detail="Route label is required.",
        )

    # -----------------------------------------------------
    # Generate safe unique filename
    # -----------------------------------------------------

    extension = get_file_extension(file.filename)

    unique_filename = (
        f"{uuid.uuid4().hex}{extension}"
    )

    video_path = UPLOAD_DIR / unique_filename

    # -----------------------------------------------------
    # Save uploaded file
    # -----------------------------------------------------

    total_size = 0

    try:

        with video_path.open("wb") as buffer:

            while True:

                chunk = await file.read(1024 * 1024)

                if not chunk:
                    break

                total_size += len(chunk)

                # Prevent extremely large uploads
                if total_size > MAX_FILE_SIZE:

                    buffer.close()

                    if video_path.exists():
                        video_path.unlink()

                    raise HTTPException(
                        status_code=413,
                        detail=(
                            "Video file is too large. "
                            "Maximum allowed size is 500 MB."
                        ),
                    )

                buffer.write(chunk)

    except HTTPException:
        raise

    except Exception as exc:

        if video_path.exists():
            video_path.unlink()

        raise HTTPException(
            status_code=500,
            detail=f"Could not save uploaded video: {exc}",
        )

    finally:
        await file.close()

    # -----------------------------------------------------
    # Create video database record
    # -----------------------------------------------------

    video = Video(
        filename=unique_filename,
        uploaded_by=None,
        route_label=route_label,
        status="processing",
    )

    db.add(video)
    db.commit()
    db.refresh(video)

    # -----------------------------------------------------
    # Start background processing
    # -----------------------------------------------------

    background_tasks.add_task(
        process_video_background,
        video_id=video.id,
        video_path=str(video_path),
        route_label=route_label,
    )

    # -----------------------------------------------------
    # Return immediately
    # -----------------------------------------------------

    return VideoUploadResponse(
        video_id=video.id,
        status="processing",
        message=(
            "Video uploaded successfully. "
            "AI processing has started."
        ),
    )


# ---------------------------------------------------------
# Get video processing status
# ---------------------------------------------------------

@router.get(
    "/{video_id}/status",
    response_model=VideoStatusResponse,
)
def get_video_status(
    video_id: int,
    db: Session = Depends(get_db),
):
    """
    Return the current processing status of a video.

    Possible statuses:

        processing
        done
        failed
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

    return VideoStatusResponse(
        video_id=video.id,
        status=video.status,
    )