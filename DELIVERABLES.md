# SIHPS124 — Implementation Deliverables

> Generated: 2026-09-12

---

## 1. Files Changed

| File | Change |
|------|--------|
| `Backend/models.py` | Completely rewritten: enums, Video/Detection/Evidence/WorkOrder/IssueStatusHistory/Contractor models |
| `Backend/schemas.py` | Completely rewritten: all Pydantic response schemas |
| `Backend/main.py` | Updated: added new routers, static file mounts, CORS, health endpoint |
| `Backend/ai_ml/config/config.yaml` | Completely rewritten: model_mode, confidence thresholds, deduplication, severity rules |
| `Backend/ai_ml/detect.py` | Completely rewritten: real pipeline, deduplication, GPS interpolation, severity scoring |
| `Backend/services/video_processor.py` | Completely rewritten: progress tracking, real DB persistence, error handling |
| `Backend/routes/videos.py` | Completely rewritten: upload + status with real DB |
| `Backend/routes/detections.py` | Completely rewritten: real issue CRUD, verify, create-work-order, stats |
| `Backend/routes/work_orders.py` | Completely rewritten: lifecycle transitions, repair proof, resolve, PDF report |
| `Frontend/src/api/client.ts` | Completely rewritten: all functions call real API, zero mock returns |
| `Frontend/src/context/AppContext.tsx` | Completely rewritten: starts empty, loads from API, no mock init |
| `Frontend/src/mocks/mockData.ts` | Cleared of production usage; clearly marked DEMO ONLY |

## 2. Files Created

| File | Purpose |
|------|---------|
| `Backend/services/gps_parser.py` | Parse .gpx / .csv / .nmea GPS files into waypoints |
| `Backend/services/work_orders.py` | Work order matching + auto-creation helpers |
| `Backend/models/README.md` | Documents `best.pt` placement and training instructions |
| `Backend/dataset/data.yaml` | YOLO dataset config (template — update path before training) |
| `Backend/training/train.py` | Reproducible YOLO training script |
| `Backend/training/evaluate.py` | Model evaluation: mAP50, mAP50-95, precision, recall, per-class metrics |
| `Backend/training/infer_test.py` | Single-image/frame inference test with real annotated output |
| `Backend/training/README.md` | Complete training guide: dataset download, placement, commands |
| `Backend/ai_ml/tests/test_pipeline.py` | Automated test suite (15 test cases) |

---

## 3. New AI Pipeline Explanation

```
Video upload (POST /api/videos/upload)
  ↓
Video validated (type, size) → saved with UUID filename
  ↓
DB record created (status=queued)
  ↓
BackgroundTask started (FastAPI)
  ↓
[services/video_processor.py]
  ├─ Optional GPS file parsed (gps_parser.py)
  ├─ Video opened with OpenCV
  ├─ Frames extracted at target_fps (configurable; default 2 FPS)
  ├─ Each frame sent to YOLO inference (ai_ml/detect.py)
  ├─ Detections filtered by confidence_threshold (0.40)
  ├─ IssueTracker: IoU-based deduplication + frame-gap tracking
  ├─ Evidence frames annotated and saved (ai_ml/outputs/thumbs/)
  ├─ GPS interpolation: each detection → real lat/lng (if GPS available)
  └─ Severity scored by transparent rules (class + conf + bbox area)
  ↓
Confirmed issues (>= min_frames_to_confirm) saved to DB
  ↓
High/critical verified issues → work orders auto-created
  ↓
Video.status = completed | failed
```

**Honest behaviour:**
- Zero detections → zero issues in DB → frontend shows "No issues detected"
- Model absent in production mode → clear error, no fallback, no fake detections
- GPS absent → `location_source = route_label`, `latitude = null`, `longitude = null`

---

## 4. Training Pipeline Explanation

```
Dataset download (RDD2022 from Zenodo + Roboflow pothole dataset)
  ↓
Place in Backend/dataset/{images,labels}/{train,val,test}/
  ↓
Update Backend/dataset/data.yaml (set correct path)
  ↓
python training/train.py [options]
  ↓ (Ultralytics YOLO fine-tuning from yolov8n/s/m.pt)
  ↓
runs/detect/sihps_YYYYMMDD_HHMM/weights/best.pt  ← auto-copied to:
Backend/models/best.pt
  ↓
python training/evaluate.py  ← run on val or test split
  ↓
Update config.yaml: model_mode: production
  ↓
Restart backend → real road-defect AI pipeline live
```

---

## 5. Required Datasets

### Primary: RDD2022 (Road Damage Dataset 2022)
- **URL:** https://zenodo.org/record/7999875
- **License:** CC BY 4.0 (suitable for hackathon/academic/commercial use)
- **Size:** ~6 GB, ~47,000 images from 6 countries
- **Classes used:** D40 (Pothole → `pothole`), D00/D10/D20 (Cracks → `road_crack`)

### Supplementary: Roboflow Pothole Dataset
- **URL:** https://universe.roboflow.com/joseph-nelson/pothole
- **License:** CC BY 4.0
- **Download format:** YOLOv8

### Open Manhole Coverage
- Search Roboflow Universe: https://universe.roboflow.com (search "manhole cover")
- Multiple community datasets available under CC BY 4.0

### Not included (reason):
- Headlight defect: requires specialized vehicle-level dataset; no suitable public dataset found with sufficient coverage
- Zebra crossing fading: requires high-resolution aerial or dash-cam datasets with specific labelling
- Traffic signal state: requires separate two-stage classifier architecture

---

## 6. Required Model Weights

```
Backend/models/best.pt   ← custom road-defect model (NOT included; train or download)
```

The file `Backend/yolov8n.pt` is the stock COCO model:
- **80 COCO classes** (person, car, dog, etc.)
- **Zero road-defect classes**
- Cannot detect potholes, open manholes, road cracks, or any SIHPS124 classes
- Will always produce zero detections when `model_mode: production` + class filter active

---

## 7. Install Dependencies

```bash
cd Backend
pip install -r requirements.txt

# Ensure these are present:
pip install fastapi uvicorn sqlalchemy psycopg2-binary
pip install ultralytics opencv-python-headless pyyaml
pip install python-multipart reportlab
```

---

## 8. Train the Model

```bash
cd Backend

# Step 1: Download dataset (see training/README.md)

# Step 2: Update dataset/data.yaml path

# Step 3: Train (GPU recommended)
python training/train.py --base yolov8s.pt --epochs 100 --batch 16 --device 0

# CPU (slower but works)
python training/train.py --epochs 50 --batch 4 --device cpu
```

---

## 9. Run Inference Test

```bash
cd Backend
python training/infer_test.py --image path/to/road_frame.jpg
# or
python training/infer_test.py --video uploads/your_video.mp4 --frame 120
```

---

## 10. Start Backend

```bash
cd Backend

# Development (auto-reload)
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Production
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2

# Verify:
curl http://localhost:8000/health
```

---

## 11. Start Frontend

```bash
cd Frontend
npm install
npm run dev
# Defaults to http://localhost:5173
# Set VITE_API_URL=http://127.0.0.1:8000 if needed
```

---

## 12. Database Setup

```bash
# Ensure PostgreSQL is running
# Create database:
psql -U postgres -c "CREATE DATABASE sihps124;"

# Set connection string in Backend/.env:
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/sihps124

# Tables are created automatically on first startup via:
# Base.metadata.create_all(bind=engine)
# For production migrations, use Alembic.

# To add test contractors:
psql -U postgres sihps124 -c "
INSERT INTO contractors (name, contact_person, phone, email, assigned_area, is_active)
VALUES
  ('Panvel Roads Pvt Ltd', 'Rahul Sharma', '+91-9876543210', 'rahul@panvelroads.com', 'Panvel', true),
  ('New Panvel Infrastructure', 'Priya Verma', '+91-9876543211', 'priya@npi.com', 'New Panvel', true);
"
```

---

## 13. API Endpoint List

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | `/health` | Health check |
| POST | `/api/videos/upload` | Upload video + optional GPS file |
| GET  | `/api/videos/{id}/status` | Real processing status + progress |
| GET  | `/api/videos/{id}/detections` | Real detections for video |
| GET  | `/api/issues/{id}` | Full issue detail |
| GET  | `/api/issues/{id}/timeline` | Status history |
| POST | `/api/issues/{id}/verify` | Authority verifies issue |
| POST | `/api/issues/{id}/work-order` | Create work order |
| GET  | `/api/work-orders` | List work orders (filterable) |
| GET  | `/api/work-orders/escalated` | Overdue/escalated work orders |
| GET  | `/api/work-orders/{id}` | Single work order |
| PATCH| `/api/work-orders/{id}/status` | Update work order status |
| POST | `/api/work-orders/{id}/repair-proof` | Submit repair evidence |
| POST | `/api/work-orders/{id}/resolve` | Authority resolves issue |
| GET  | `/api/contractors` | List active contractors |
| GET  | `/api/public/stats` | Real dashboard statistics |
| GET  | `/api/reports/{video_id}/pdf` | PDF inspection report |

---

## 14. Example Real API Responses

### POST /api/videos/upload
```json
{"video_id": 42, "status": "queued", "route_label": "Panvel-New Panvel Road", "message": "Video uploaded and queued for AI processing."}
```

### GET /api/videos/42/status
```json
{
  "video_id": 42,
  "status": "processing",
  "progress": 65.3,
  "frames_processed": 522,
  "total_frames": 800,
  "detections_found": 3,
  "error_message": null,
  "route_label": "Panvel-New Panvel Road"
}
```

### GET /api/videos/42/detections (if model detected something)
```json
{
  "video_id": 42,
  "route_label": "Panvel-New Panvel Road",
  "total_detections": 1,
  "detections": [{
    "id": 7,
    "video_id": 42,
    "defect_type": "pothole",
    "confidence": 0.87,
    "severity": "high",
    "timestamp_in_video": 138.4,
    "frame_number": 277,
    "route_label": "Panvel-New Panvel Road",
    "latitude": null,
    "longitude": null,
    "location_source": "route_label",
    "annotated_image_url": "/ai-output/thumbs/frame_000277_pothole.jpg",
    "status": "detected",
    "evidence": []
  }]
}
```

### GET /api/videos/42/detections (if model found nothing)
```json
{
  "video_id": 42,
  "route_label": "Test Route",
  "total_detections": 0,
  "detections": []
}
```
This is the honest result when the model is not yet trained or the video contains no defects.

---

## 15. Testing Commands

```bash
cd Backend
pip install pytest httpx

# Run full test suite
pytest ai_ml/tests/test_pipeline.py -v

# Run specific tests
pytest ai_ml/tests/test_pipeline.py::test_iou_identical_boxes -v
pytest ai_ml/tests/test_pipeline.py::test_tracker_same_box_same_class_grouped -v
pytest ai_ml/tests/test_pipeline.py::test_severity_critical_class -v
pytest ai_ml/tests/test_pipeline.py::test_gps_parser_csv -v
pytest ai_ml/tests/test_pipeline.py::test_create_detection_record -v
```

---

## 16. End-to-End Testing Procedure

```bash
# 1. Start backend
cd Backend && uvicorn main:app --reload

# 2. Upload a real road video
curl -X POST http://localhost:8000/api/videos/upload \
  -F "file=@/path/to/road_video.mp4" \
  -F "route_label=Panvel-New Panvel Road"
# Returns: {"video_id": 1, "status": "queued"}

# 3. Poll status until completed
curl http://localhost:8000/api/videos/1/status

# 4. Get detections (may be [] if model not trained or no defects found)
curl http://localhost:8000/api/videos/1/detections

# 5. If detections exist, verify one:
curl -X POST http://localhost:8000/api/issues/1/verify \
  -H 'Content-Type: application/json' \
  -d '{"comment": "Verified on site"}'

# 6. Create work order
curl -X POST http://localhost:8000/api/issues/1/work-order \
  -H 'Content-Type: application/json' \
  -d '{"deadline_days": 7}'

# 7. Submit repair proof
curl -X POST http://localhost:8000/api/work-orders/1/repair-proof \
  -F "image=@/path/to/repair_photo.jpg" \
  -F "note=Pothole filled with bitumen mix"

# 8. Resolve
curl -X POST http://localhost:8000/api/work-orders/1/resolve \
  -H 'Content-Type: application/json' \
  -d '{"note": "Repair verified and approved"}'

# 9. Confirm issue is resolved
curl http://localhost:8000/api/issues/1
# status should be "resolved"
```

---

## 17. Known Limitations

1. **No trained model yet.** `models/best.pt` is absent. The pipeline correctly fails with a clear error and produces zero detections. Training or downloading a custom model is the next required step.

2. **GPS requires external file or embedded metadata.** The system cannot fabricate GPS. If a video has no embedded GPS and no .gpx file is provided, all detections show `location_source: route_label` and `latitude: null`.

3. **No contractor GPS tracking.** Contractor locations are not tracked in real time. The UI should show "Live contractor location unavailable".

4. **No real auth system.** The current `/api/auth/login` route stub is included but a full JWT auth system needs to be wired to the User model.

5. **`ultralytics` must be installed separately.** It is not bundled. Install with `pip install ultralytics`.

6. **Single-process background tasks.** FastAPI BackgroundTasks run in the same process. For production with multiple concurrent videos, switch to Celery + Redis or RQ.

7. **No headlight defect detection.** Architecture stub documented. Requires a specialised vehicle-level dataset.

---

## 18. What Still Requires Real External Data / Integration

| Feature | What's needed |
|---------|---------------|
| Road defect AI | Train `best.pt` on RDD2022 + pothole datasets |
| GPS location per frame | Embedded GPS in video OR user-supplied .gpx file |
| Contractor GPS tracking | Real GPS devices on contractor vehicles |
| Municipal system integration | REST API integration with local authority CMMS |
| Live traffic feeds | Requires RTSPs or city traffic APIs |
| Headlight defect detection | Specialized vehicle + headlight dataset + classifier |
| Automated SLA escalation | Cron job or Celery beat task (not included) |
| Email/SMS notifications | Requires SMTP or Twilio integration |
