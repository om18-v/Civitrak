"""
SIHPS124 — Pydantic Schemas

All schemas reflect REAL data from the database — no mock fields.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class LoginRequest(BaseModel):
    email: str
    password: str
    role: Optional[str] = None
    contractor_id: Optional[int] = None


class LoginResponse(BaseModel):
    token: str
    user: dict


# ---------------------------------------------------------------------------
# Video
# ---------------------------------------------------------------------------

class VideoUploadResponse(BaseModel):
    video_id:    int
    status:      str
    route_label: Optional[str] = None
    message:     str


class VideoStatusResponse(BaseModel):
    video_id:                int
    status:                  str           # queued | processing | completed | failed
    progress:                float         # 0-100
    frames_processed:        int
    total_frames:            int
    detections_found:        int
    error_message:           Optional[str] = None
    route_label:             Optional[str] = None
    duration_seconds:        Optional[float] = None
    processing_started_at:   Optional[datetime] = None
    processing_completed_at: Optional[datetime] = None


# ---------------------------------------------------------------------------
# Evidence
# ---------------------------------------------------------------------------

class EvidenceResponse(BaseModel):
    id:                  int
    image_path:          Optional[str] = None
    image_url:           Optional[str] = None     # /ai-output/... URL
    frame_number:        Optional[int] = None
    timestamp_in_video:  Optional[float] = None
    confidence:          Optional[float] = None
    evidence_type:       str                       # best_frame | additional_frame | repair_before | repair_after
    note:                Optional[str] = None
    submitted_at:        Optional[datetime] = None


# ---------------------------------------------------------------------------
# Bounding box
# ---------------------------------------------------------------------------

class BoundingBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float


# ---------------------------------------------------------------------------
# Issue status history
# ---------------------------------------------------------------------------

class IssueStatusHistoryEntry(BaseModel):
    id:         int
    old_status: Optional[str] = None
    new_status: str
    changed_at: Optional[datetime] = None
    comment:    Optional[str] = None


# ---------------------------------------------------------------------------
# Detection / Issue
# ---------------------------------------------------------------------------

class DetectionResponse(BaseModel):
    id:                   int
    case_id:              Optional[str] = None
    video_id:             int
    defect_type:          str
    confidence:           float
    severity:             Optional[str] = None     # low | medium | high | critical
    timestamp_in_video:   Optional[float] = None   # seconds
    frame_number:         Optional[int] = None
    first_seen_frame:     Optional[int] = None
    last_seen_frame:      Optional[int] = None
    bounding_box:         Optional[BoundingBox] = None
    route_label:          Optional[str] = None
    latitude:             Optional[float] = None   # None = no GPS
    longitude:            Optional[float] = None
    location_source:      str = "route_label"      # gps_extracted | gpx_file | route_label | manual
    gps_quality:          Optional[str] = "ROUTE_GEOCODED"
    gps_status:           Optional[str] = "APPROXIMATE"
    annotated_image_url:  Optional[str] = None     # Real annotated frame URL
    thumbnail_url:        Optional[str] = None
    status:               str = "detected"         # detected | needs_review | verified | assigned | repairing | escalated | resolved | false_positive
    is_false_positive:    Optional[bool] = False
    false_positive_reason: Optional[str] = None
    created_at:           Optional[datetime] = None
    evidence:             List[EvidenceResponse] = []
    normalized_bbox:       Optional[dict] = None
    video_width:           Optional[int] = None
    video_height:          Optional[int] = None


class DetectionListResponse(BaseModel):
    video_id:         int
    route_label:      Optional[str] = None
    total_detections: int
    detections:       List[DetectionResponse]


# ---------------------------------------------------------------------------
# Issue verify & false-positive
# ---------------------------------------------------------------------------

class IssueVerifyRequest(BaseModel):
    comment: Optional[str] = None


class FalsePositiveRequest(BaseModel):
    reason: str = "other"  # vehicle | shadow | water | construction | glare | other
    notes:  Optional[str] = None


class IssueVerifyResponse(BaseModel):
    issue_id:   int
    case_id:    Optional[str] = None
    new_status: str
    message:    str


# ---------------------------------------------------------------------------
# Work Order
# ---------------------------------------------------------------------------

class CreateWorkOrderRequest(BaseModel):
    contractor_id: Optional[int] = None
    deadline_days: int = 7
    notes:         Optional[str] = None


class WorkOrderStatusUpdate(BaseModel):
    status: str
    note:   Optional[str] = None


class ReworkRequest(BaseModel):
    notes: str


class RepairProofRequest(BaseModel):
    note: Optional[str] = None


class WorkOrderResponse(BaseModel):
    id:                  int
    case_id:             Optional[str] = None
    detection_id:        int
    contractor_id:       Optional[int] = None
    contractor_name:     Optional[str] = None
    assignment_reason:   Optional[str] = None
    status:              str
    priority:            Optional[str] = None
    notes:               Optional[str] = None
    escalated:           Optional[bool] = False
    escalation_reason:   Optional[str] = None
    rework_notes:        Optional[str] = None
    sla_hours:           Optional[int] = 48
    hours_remaining:     Optional[float] = 48.0
    is_overdue:          Optional[bool] = False
    assigned_date:       Optional[datetime] = None
    deadline_date:       Optional[datetime] = None
    dispatched_at:       Optional[datetime] = None
    completed_at:        Optional[datetime] = None
    repair_proof_note:   Optional[str] = None
    repair_submitted_at: Optional[datetime] = None
    created_at:          Optional[datetime] = None
    # Denormalized issue fields (for contractor dashboard convenience)
    defect_type:         Optional[str] = None
    severity:            Optional[str] = None
    route_label:         Optional[str] = None
    latitude:            Optional[float] = None
    longitude:           Optional[float] = None
    location_source:     Optional[str] = None
    gps_quality:         Optional[str] = None
    annotated_image_url: Optional[str] = None


# ---------------------------------------------------------------------------
# Contractor
# ---------------------------------------------------------------------------

class ContractorResponse(BaseModel):
    id:             int
    name:           str
    contact_person: Optional[str] = None
    phone:          Optional[str] = None
    email:          Optional[str] = None
    assigned_area:  Optional[str] = None
    rating:         Optional[float] = None
    is_active:      bool
    rating_count:   int = 0


# ---------------------------------------------------------------------------
# Public stats
# ---------------------------------------------------------------------------

class PublicStatsResponse(BaseModel):
    total_videos:       int
    total_issues:       int
    resolved_issues:    int
    active_work_orders: int
    critical_issues:    int
    active_contractors: int


class ContractorRatingRequest(BaseModel):
    rating: float
    comment: Optional[str] = None
    citizen_name: str = "CiviTrak Citizen"


class ContractorRatingResponse(BaseModel):
    id: int
    work_order_id: int
    contractor_id: int
    contractor_name: str
    rating: float
    comment: Optional[str] = None
    citizen_name: str
    created_at: Optional[datetime] = None


# ---------------------------------------------------------------------------
# System Health & Case & Performance
# ---------------------------------------------------------------------------

class SystemComponentHealth(BaseModel):
    status: str
    details: str
    healthy: bool


class SystemHealthResponse(BaseModel):
    overall: str
    version: str
    api: SystemComponentHealth
    database: SystemComponentHealth
    ai_model: SystemComponentHealth
    gps_engine: SystemComponentHealth
    storage: SystemComponentHealth


class PublicCaseResponse(BaseModel):
    case_id: str
    issue_id: int
    defect_type: str
    defect_label: str
    severity: Optional[str] = None
    status: str
    route_label: Optional[str] = None
    approx_location: Optional[dict] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    thumbnail_url: Optional[str] = None
    evidence_urls: List[str] = []
    contractor: Optional[dict] = None
    work_order: Optional[dict] = None
    timeline: List[IssueStatusHistoryEntry] = []
    qr_url: Optional[str] = None
    is_resolved: bool = False
    citizen_rating: Optional[float] = None


class ContractorPerformanceResponse(BaseModel):
    id: int
    name: str
    assigned_area: Optional[str] = None
    rating: float
    rating_count: int
    assigned_jobs: int
    completed_jobs: int
    on_time_percentage: float
    sla_breaches: int
    average_resolution_hours: float
    rework_count: int
