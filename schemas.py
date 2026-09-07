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