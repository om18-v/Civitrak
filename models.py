from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from database import Base



class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100))
    email = Column(String(150), unique=True)
    password_hash = Column(String(255))
    role = Column(String(20))

    videos = relationship(
        "Video",
        back_populates="uploader"
    )



class Video(Base):
    __tablename__ = "videos"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255))
    uploaded_by = Column(
        Integer,
        ForeignKey("users.id")
    )
    upload_date = Column(
        DateTime,
        default=datetime.utcnow
    )
    route_label = Column(String(255))
    status = Column(String(20))

    uploader = relationship(
        "User",
        back_populates="videos"
    )

    detections = relationship(
        "Detection",
        back_populates="video",
        cascade="all, delete-orphan"
    )

    reports = relationship(
        "Report",
        back_populates="video",
        cascade="all, delete-orphan"
    )



class Detection(Base):
    __tablename__ = "detections"

    id = Column(Integer, primary_key=True, index=True)

    video_id = Column(
        Integer,
        ForeignKey("videos.id")
    )

    defect_type = Column(String(50))

    confidence_score = Column(Float)

    timestamp_in_video = Column(Float)

    latitude = Column(Float)

    longitude = Column(Float)

    thumbnail_path = Column(String(255))

    video = relationship(
        "Video",
        back_populates="detections"
    )

    work_orders = relationship(
        "WorkOrder",
        back_populates="detection",
        cascade="all, delete-orphan"
    )



class Contractor(Base):
    __tablename__ = "contractors"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String(150))

    phone = Column(String(20))

    email = Column(String(150))

    assigned_area = Column(String(255))

    rating = Column(
        Float,
        default=5.0
    )

    # Relationship with Work Orders
    work_orders = relationship(
        "WorkOrder",
        back_populates="contractor"
    )


class WorkOrder(Base):
    __tablename__ = "work_orders"
    __table_args__ = (
        UniqueConstraint(
            "detection_id",
            name="uq_work_orders_detection_id",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)

    detection_id = Column(
        Integer,
        ForeignKey("detections.id")
    )

    contractor_id = Column(
        Integer,
        ForeignKey("contractors.id")
    )

    assigned_date = Column(
        DateTime,
        default=datetime.utcnow
    )

    deadline_date = Column(DateTime)

    status = Column(String(20))

    completed_at = Column(DateTime)

    escalated = Column(
        Boolean,
        default=False
    )

    detection = relationship(
        "Detection",
        back_populates="work_orders"
    )

    contractor = relationship(
        "Contractor",
        back_populates="work_orders"
    )


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)

    video_id = Column(
        Integer,
        ForeignKey("videos.id")
    )

    total_defects = Column(Integer)

    category_breakdown = Column(JSONB)

    generated_pdf_path = Column(String(255))

    video = relationship(
        "Video",
        back_populates="reports"
    )