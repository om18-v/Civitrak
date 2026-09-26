"""
SIHPS124 - Database Models

Updated to support the full real-world pipeline:
  Video → Detection/Issue → Evidence → WorkOrder → IssueStatusHistory
"""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Text,
    ForeignKey, Enum as SAEnum
)
from sqlalchemy.orm import relationship
from database import Base
import enum


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class VideoStatus(str, enum.Enum):
    queued      = "queued"
    processing  = "processing"
    completed   = "completed"
    failed      = "failed"


class IssueStatus(str, enum.Enum):
    detected      = "detected"
    needs_review  = "needs_review"
    verified      = "verified"
    assigned      = "assigned"
    dispatched    = "dispatched"
    repairing     = "repairing"
    resolved      = "resolved"
    escalated     = "escalated"


class Severity(str, enum.Enum):
    low      = "low"
    medium   = "medium"
    high     = "high"
    critical = "critical"


class LocationSource(str, enum.Enum):
    gps_extracted  = "gps_extracted"   # GPS pulled from video metadata
    gpx_file       = "gpx_file"         # External GPX/CSV file uploaded by user
    route_label    = "route_label"      # Only a text route label, no coordinates
    none           = "none"


class WorkOrderStatus(str, enum.Enum):
    pending    = "pending"
    sent       = "sent"
    acknowledged = "acknowledged"
    in_progress  = "in_progress"
    submitted  = "submitted"   # Contractor submitted repair proof
    completed  = "completed"
    escalated  = "escalated"
    rejected   = "rejected"   # Authority rejected repair proof


class EvidenceType(str, enum.Enum):
    best_frame      = "best_frame"
    additional_frame = "additional_frame"
    repair_before   = "repair_before"
    repair_after    = "repair_after"


# ---------------------------------------------------------------------------
# User (authority / contractor accounts)
# ---------------------------------------------------------------------------

class User(Base):
    __tablename__ = "users"

    id              = Column(Integer, primary_key=True, index=True)
    email           = Column(String(255), unique=True, nullable=False, index=True)
    name            = Column(String(255), nullable=False)
    role            = Column(String(50), nullable=False, default="authority")  # authority | contractor
    hashed_password = Column(String(255), nullable=False)
    contractor_id   = Column(Integer, ForeignKey("contractors.id"), nullable=True)
    created_at      = Column(DateTime, default=datetime.utcnow)
    is_active       = Column(Boolean, default=True)

    contractor = relationship("Contractor", back_populates="users", foreign_keys=[contractor_id])


# ---------------------------------------------------------------------------
# Video
# ---------------------------------------------------------------------------

class Video(Base):
    __tablename__ = "videos"

    id          = Column(Integer, primary_key=True, index=True)
    filename    = Column(String(512), nullable=False)        # UUID-based stored filename
    original_name = Column(String(512), nullable=True)       # Original filename from upload
    route_label = Column(String(512), nullable=True)         # User-supplied route label

    # Processing state
    status      = Column(SAEnum(VideoStatus), default=VideoStatus.queued, nullable=False)
    progress    = Column(Float, default=0.0)                 # 0-100 percent
    frames_processed = Column(Integer, default=0)
    total_frames     = Column(Integer, default=0)
    detections_found = Column(Integer, default=0)
    error_message    = Column(Text, nullable=True)

    # Video metadata
    duration_seconds = Column(Float, nullable=True)
    fps              = Column(Float, nullable=True)
    width            = Column(Integer, nullable=True)
    height           = Column(Integer, nullable=True)
    file_size_bytes  = Column(Integer, nullable=True)

    # GPS/location metadata
    has_gps          = Column(Boolean, default=False)
    gps_source       = Column(SAEnum(LocationSource), default=LocationSource.none)

    # Timestamps
    uploaded_at          = Column(DateTime, default=datetime.utcnow)
    processing_started_at  = Column(DateTime, nullable=True)
    processing_completed_at = Column(DateTime, nullable=True)

    detections = relationship("Detection", back_populates="video", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# Detection / Issue
#
# One record per UNIQUE road issue (after deduplication/tracking).
# Multiple raw detections across frames are grouped into one Issue.
# ---------------------------------------------------------------------------

class Detection(Base):
    __tablename__ = "detections"

    id          = Column(Integer, primary_key=True, index=True)
    video_id    = Column(Integer, ForeignKey("videos.id"), nullable=False, index=True)

    # AI classification
    defect_type = Column(String(100), nullable=False)   # pothole, open_manhole, ...
    confidence  = Column(Float, nullable=False)          # Best-frame confidence (0-1)
    bbox_x1     = Column(Float, nullable=True)           # Bounding box pixels (best frame)
    bbox_y1     = Column(Float, nullable=True)
    bbox_x2     = Column(Float, nullable=True)
    bbox_y2     = Column(Float, nullable=True)

    # Temporal
    timestamp_in_video = Column(Float, nullable=True)    # Seconds from start
    frame_number       = Column(Integer, nullable=True)  # Frame index
    first_seen_frame   = Column(Integer, nullable=True)  # First frame this issue appeared
    last_seen_frame    = Column(Integer, nullable=True)  # Last frame this issue appeared

    # Severity — computed by severity rules, NOT random
    severity    = Column(SAEnum(Severity), nullable=True)

    # Location
    latitude        = Column(Float, nullable=True)
    longitude       = Column(Float, nullable=True)
    location_source = Column(SAEnum(LocationSource), default=LocationSource.route_label)
    route_label     = Column(String(512), nullable=True)

    # Evidence
    thumbnail_path  = Column(String(512), nullable=True)  # Relative to /ai-output/
    annotated_path  = Column(String(512), nullable=True)  # Annotated frame with bbox

    # Lifecycle status
    status = Column(SAEnum(IssueStatus), default=IssueStatus.detected, nullable=False)

    created_at  = Column(DateTime, default=datetime.utcnow)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    video      = relationship("Video", back_populates="detections")
    evidence   = relationship("Evidence", back_populates="detection", cascade="all, delete-orphan")
    work_orders = relationship("WorkOrder", back_populates="detection", cascade="all, delete-orphan")
    status_history = relationship("IssueStatusHistory", back_populates="detection", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# Evidence — multiple frames for the same issue
# ---------------------------------------------------------------------------

class Evidence(Base):
    __tablename__ = "evidence"

    id           = Column(Integer, primary_key=True, index=True)
    detection_id = Column(Integer, ForeignKey("detections.id"), nullable=False, index=True)

    image_path   = Column(String(512), nullable=False)   # Relative path under /ai-output/
    frame_number = Column(Integer, nullable=True)
    timestamp_in_video = Column(Float, nullable=True)    # Seconds
    confidence   = Column(Float, nullable=True)
    evidence_type = Column(SAEnum(EvidenceType), default=EvidenceType.additional_frame)

    # Repair proof fields (contractor-submitted)
    note         = Column(Text, nullable=True)
    submitted_at = Column(DateTime, nullable=True)
    submitted_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    created_at   = Column(DateTime, default=datetime.utcnow)

    detection = relationship("Detection", back_populates="evidence")


# ---------------------------------------------------------------------------
# Issue Status History
# ---------------------------------------------------------------------------

class IssueStatusHistory(Base):
    __tablename__ = "issue_status_history"

    id           = Column(Integer, primary_key=True, index=True)
    detection_id = Column(Integer, ForeignKey("detections.id"), nullable=False, index=True)
    old_status   = Column(SAEnum(IssueStatus), nullable=True)
    new_status   = Column(SAEnum(IssueStatus), nullable=False)
    changed_by   = Column(Integer, ForeignKey("users.id"), nullable=True)
    changed_at   = Column(DateTime, default=datetime.utcnow)
    comment      = Column(Text, nullable=True)

    detection = relationship("Detection", back_populates="status_history")


# ---------------------------------------------------------------------------
# Contractor
# ---------------------------------------------------------------------------

class Contractor(Base):
    __tablename__ = "contractors"

    id              = Column(Integer, primary_key=True, index=True)
    name            = Column(String(255), nullable=False)
    contact_person  = Column(String(255), nullable=True)
    phone           = Column(String(50), nullable=True)
    email           = Column(String(255), nullable=True)
    assigned_area   = Column(String(512), nullable=True)   # Service area / route label
    is_active       = Column(Boolean, default=True)
    rating          = Column(Float, default=0.0)           # 0-5, computed from completed jobs
    created_at      = Column(DateTime, default=datetime.utcnow)

    work_orders = relationship("WorkOrder", back_populates="contractor")
    ratings     = relationship("ContractorRating", back_populates="contractor", cascade="all, delete-orphan")
    users       = relationship("User", back_populates="contractor", foreign_keys="User.contractor_id")


# ---------------------------------------------------------------------------
# Work Order
# ---------------------------------------------------------------------------

class WorkOrder(Base):
    __tablename__ = "work_orders"

    id              = Column(Integer, primary_key=True, index=True)
    detection_id    = Column(Integer, ForeignKey("detections.id"), nullable=False, index=True)
    contractor_id   = Column(Integer, ForeignKey("contractors.id"), nullable=True)

    status          = Column(SAEnum(WorkOrderStatus), default=WorkOrderStatus.pending, nullable=False)
    priority        = Column(SAEnum(Severity), nullable=True)
    notes           = Column(Text, nullable=True)
    escalated       = Column(Boolean, default=False)
    escalation_reason = Column(Text, nullable=True)

    # Repair proof (contractor-submitted)
    repair_proof_image = Column(String(512), nullable=True)
    repair_proof_note  = Column(Text, nullable=True)
    repair_submitted_at = Column(DateTime, nullable=True)

    # Timestamps
    assigned_date   = Column(DateTime, nullable=True)
    deadline_date   = Column(DateTime, nullable=True)
    dispatched_at   = Column(DateTime, nullable=True)
    completed_at    = Column(DateTime, nullable=True)
    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    detection  = relationship("Detection", back_populates="work_orders")
    contractor = relationship("Contractor", back_populates="work_orders")
    rating     = relationship("ContractorRating", back_populates="work_order", uselist=False, cascade="all, delete-orphan")


class ContractorRating(Base):
    __tablename__ = "contractor_ratings"

    id = Column(Integer, primary_key=True, index=True)
    work_order_id = Column(Integer, ForeignKey("work_orders.id"), nullable=False, unique=True, index=True)
    contractor_id = Column(Integer, ForeignKey("contractors.id"), nullable=False, index=True)
    rating = Column(Float, nullable=False)
    comment = Column(Text, nullable=True)
    citizen_name = Column(String(255), nullable=False, default="CiviTrak Citizen")
    created_at = Column(DateTime, default=datetime.utcnow)

    work_order = relationship("WorkOrder", back_populates="rating")
    contractor = relationship("Contractor", back_populates="ratings")
