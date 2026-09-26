"""
SIHPS124 — Automated Test Suite

Run:
  cd Backend
  pip install pytest
  pytest ai_ml/tests/test_pipeline.py -v
"""

import sys
import tempfile
from pathlib import Path

import cv2
import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).parent.parent.parent))


def _make_video(path, n=30, w=640, h=480):
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    vw = cv2.VideoWriter(path, fourcc, 10.0, (w, h))
    for i in range(n):
        frame = np.full((h, w, 3), (i*8%255, 100, 200), dtype=np.uint8)
        vw.write(frame)
    vw.release()
    return path


# IoU tests
def test_iou_identical():
    from ai_ml.detect import _iou
    b = (0,0,100,100)
    assert abs(_iou(b,b)-1.0) < 1e-6

def test_iou_no_overlap():
    from ai_ml.detect import _iou
    assert _iou((0,0,50,50),(100,100,200,200)) == 0.0

def test_iou_partial():
    from ai_ml.detect import _iou
    s = _iou((0,0,100,100),(50,0,150,100))
    assert 0.3 < s < 0.4


# Severity tests
def test_severity_critical_class():
    from ai_ml.detect import compute_severity
    assert compute_severity("open_manhole",0.30,(0,0,10,10),640,480) == "critical"

def test_severity_large_bbox():
    from ai_ml.detect import compute_severity
    assert compute_severity("pothole",0.50,(0,0,320,240),640,480) == "critical"

def test_severity_low():
    from ai_ml.detect import compute_severity
    assert compute_severity("pothole",0.42,(0,0,10,10),640,480) == "low"


# Tracker tests
def test_tracker_groups_same_box():
    from ai_ml.detect import IssueTracker
    t = IssueTracker(0.40,30,2)
    b = (100,100,200,200)
    t.update(1,"pothole",0.70,b,640,480,0.1,None)
    t.update(2,"pothole",0.75,b,640,480,0.2,None)
    assert len(t.confirmed_issues()) == 1

def test_tracker_different_class_separate():
    from ai_ml.detect import IssueTracker
    t = IssueTracker(0.40,30,1)
    b = (100,100,200,200)
    t.update(1,"pothole",0.70,b,640,480,0.1,None)
    t.update(2,"road_crack",0.70,b,640,480,0.2,None)
    assert len(t.all_issues()) == 2

def test_tracker_frame_gap_new_issue():
    from ai_ml.detect import IssueTracker
    t = IssueTracker(0.40,5,1)
    b = (100,100,200,200)
    t.update(1,"pothole",0.70,b,640,480,0.1,None)
    t.update(20,"pothole",0.70,b,640,480,2.0,None)
    assert len(t.all_issues()) == 2

def test_tracker_min_frames_filters():
    from ai_ml.detect import IssueTracker
    t = IssueTracker(0.40,30,2)
    t.update(1,"pothole",0.70,(0,0,50,50),640,480,0.1,None)
    assert len(t.confirmed_issues()) == 0


# GPS parser tests
def test_gps_csv(tmp_path):
    from services.gps_parser import parse_gps_file
    f = tmp_path/"t.csv"
    f.write_text("timestamp,latitude,longitude\n0,18.99,72.87\n1,18.991,72.871\n")
    pts = parse_gps_file(str(f))
    assert len(pts) == 2
    assert pts[0]["lat"] == pytest.approx(18.99)

def test_gps_bad_ext(tmp_path):
    from services.gps_parser import parse_gps_file
    f = tmp_path/"t.xyz"
    f.write_text("x")
    assert parse_gps_file(str(f)) == []


# Evidence annotation test
def test_annotate_saves(tmp_path):
    from ai_ml.detect import _annotate_and_save
    frame = np.zeros((480,640,3),dtype=np.uint8)
    out = _annotate_and_save(frame,(50,50,200,200),"pothole",0.87,tmp_path,42)
    assert out is not None and Path(out).exists()


# Schema tests
def test_upload_response_schema():
    from schemas import VideoUploadResponse
    r = VideoUploadResponse(video_id=1,status="queued",message="ok")
    assert r.video_id == 1

def test_status_response_schema():
    from schemas import VideoStatusResponse
    r = VideoStatusResponse(
        video_id=1,status="processing",progress=45.0,
        frames_processed=200,total_frames=500,detections_found=3
    )
    assert r.progress == 45.0


# DB tests
@pytest.fixture
def db():
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from database import Base
    engine = create_engine("sqlite:///:memory:",connect_args={"check_same_thread":False})
    Base.metadata.create_all(engine)
    S = sessionmaker(bind=engine)
    s = S()
    yield s
    s.close()

def test_create_video(db):
    from models import Video, VideoStatus
    v = Video(filename="t.mp4",original_name="t.mp4",status=VideoStatus.queued)
    db.add(v); db.commit(); db.refresh(v)
    assert v.id is not None

def test_create_detection(db):
    from models import Video,VideoStatus,Detection,IssueStatus,Severity,LocationSource
    v = Video(filename="t.mp4",original_name="t.mp4",status=VideoStatus.completed)
    db.add(v); db.commit()
    d = Detection(video_id=v.id,defect_type="pothole",confidence=0.87,
                  severity=Severity.high,status=IssueStatus.detected,
                  location_source=LocationSource.route_label)
    db.add(d); db.commit(); db.refresh(d)
    assert d.id is not None and d.confidence == pytest.approx(0.87)

def test_work_order_linked(db):
    from models import Video,VideoStatus,Detection,IssueStatus,Severity,LocationSource
    from models import WorkOrder,WorkOrderStatus,Contractor
    from datetime import datetime,timedelta
    c = Contractor(name="Test Co",is_active=True)
    v = Video(filename="t.mp4",original_name="t.mp4",status=VideoStatus.completed)
    db.add(c); db.add(v); db.commit()
    d = Detection(video_id=v.id,defect_type="pothole",confidence=0.87,
                  severity=Severity.high,status=IssueStatus.verified,
                  location_source=LocationSource.route_label)
    db.add(d); db.commit()
    now=datetime.utcnow()
    wo = WorkOrder(detection_id=d.id,contractor_id=c.id,
                   status=WorkOrderStatus.sent,priority=Severity.high,
                   assigned_date=now,deadline_date=now+timedelta(days=7))
    db.add(wo); db.commit(); db.refresh(wo)
    assert wo.id is not None and wo.detection_id == d.id


if __name__ == "__main__":
    pytest.main([__file__,"-v"])
