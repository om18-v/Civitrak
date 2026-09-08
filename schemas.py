from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict



class VideoUploadResponse(BaseModel):
    video_id: int
    status: str
    message: str



class VideoStatusResponse(BaseModel):
    video_id: int
    status: str



class DetectionResponse(BaseModel):
    id: int
    video_id: int
    defect_type: str
    confidence_score: float
    timestamp_in_video: float

    latitude: Optional[float] = None
    longitude: Optional[float] = None

    thumbnail_path: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)



class DetectionsResponse(BaseModel):
    video_id: int
    route_label: Optional[str] = None
    total_detections: int
    detections: list[DetectionResponse]



class PublicStatsResponse(BaseModel):
    total: int
    fixed: int
    pending: int



class ErrorResponse(BaseModel):
    detail: str


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: int


class WorkOrderStatusUpdate(BaseModel):
    status: str


class ContractorResponse(BaseModel):
    id: int
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    assigned_area: Optional[str] = None
    rating: float

    model_config = ConfigDict(from_attributes=True)


class WorkOrderResponse(BaseModel):
    id: int
    detection_id: int
    contractor_id: int
    defect_type: Optional[str] = None
    route_label: Optional[str] = None
    assigned_date: Optional[datetime] = None
    deadline_date: Optional[datetime] = None
    status: str
    escalated: bool
    completed_at: Optional[datetime] = None


class WorkOrderListResponse(BaseModel):
    work_orders: list[WorkOrderResponse]