# CiviTrak: Civic Road Intelligence & Resolution Platform

**Smart India Hackathon 2026 | PS SIH26124 | Team TechVertex (ID 143146)**
*AI-Powered Mobile Urban Intelligence Platform Using Public Transport Fleet*

CiviTrak turns road video into actionable infrastructure intelligence and then follows every detected issue through the real municipal repair lifecycle, so detection always ends in a verified repair.

**Citizen → Road Video → AI Detection → GIS Evidence → Authority Review → Contractor Assignment → SLA Tracking → Repair Proof → Authority Verification → Citizen Rating**

> **Prototype scope:** the current build ingests uploaded road footage, which stands in for video from bus-mounted cameras. On-bus edge inference is on the roadmap (see below).

---

## Screenshots

<!-- Add 4-6 images to /docs and link them here. Suggested: login, upload, results/evidence, GIS map, authority hub, contractor hub -->
| Login | Results & Evidence | GIS Map |
|---|---|---|
| `docs/login.png` | `docs/results.png` | `docs/map.png` |

## Demo

- Live demo / video: `<add link>`
- Project documentation (PDF): `<add Drive link>`

---

## Features

**AI & evidence**
- Video upload with frame extraction and AI processing monitor
- Detection of infrastructure issues with confidence, location and severity
- Evidence images, downloadable PDF report, GIS and 3D city visualisation

**Lifecycle & accountability**
- Result bundle: issue counts, evidence, location and the responsible area contractor
- Explicit submission that creates real database work orders (shared by all portals)
- SLA-bound work orders; contractor acknowledges, starts work and submits repair proof
- Authority approves the repair or requests rework
- Citizens see completed work and give one 0-5 rating per completed work order
- Public contractor accountability leaderboard

**Portals**
| Route | Purpose |
|---|---|
| `/login` | Role-based access |
| `/citizen` | Citizen case tracker |
| `/home` | Overview / intelligence dashboard |
| `/upload` | Road video upload |
| `/processing` | AI processing monitor |
| `/results` | Detection evidence |
| `/map` | GIS spatial intelligence |
| `/authority` | Municipal command hub |
| `/contractor` | Contractor field hub |
| `/leaderboard` | Public contractor accountability |

---

## Lifecycle

1. Citizen uploads road footage.
2. AI pipeline extracts frames and detects infrastructure issues.
3. Evidence is shown with confidence, location and GIS context.
4. The citizen submits the issue; work orders are created in the database.
5. Contractor receives an SLA-bound work order.
6. Contractor acknowledges and starts work.
7. Contractor submits completion / repair evidence.
8. Authority approves the repair or requests rework.
9. Completed work becomes visible to the citizen.
10. Citizen submits one 0-5 rating per completed work order; ratings appear in the leaderboard.

---

## Architecture

```
React (Vite) frontend  ──REST──►  FastAPI backend  ──►  PostgreSQL
                                       │
                                       ├─ Video ingestion + frame extraction (OpenCV)
                                       ├─ Detection: YOLO model (Backend/models/best.pt)
                                       │     fallback: pothole_best.pt → OpenCV road-surface screening
                                       ├─ Evidence storage + report generation (PDF)
                                       └─ Work-order, SLA, rating services
```

**Stack:** React, Vite, Tailwind CSS, Leaflet · Python, FastAPI, SQLAlchemy · PostgreSQL · OpenCV, YOLO · ReportLab

**AI model selection order:** `Backend/models/best.pt` → `Backend/models/pothole_best.pt` → OpenCV road-surface screening fallback.

---

## Getting started

### Prerequisites
Node.js 18+, Python 3.10+, PostgreSQL 14+

### Backend
```powershell
cd Backend
pip install -r requirements.txt
# create Backend/.env and set DATABASE_URL, e.g.
# DATABASE_URL=postgresql://<user>:<password>@localhost:5432/civitrak
uvicorn main:app --reload --port 8000
```

Optional prototype pothole model:
```powershell
cd Backend
python scripts/download_pothole_model.py
```

### Frontend
```powershell
cd Frontend
npm install
npm run dev
```
Open the Vite URL shown in the terminal (configured for port 3000).

---

## PS SIH26124 coverage

| PS requirement | Status |
|---|---|
| Road defect detection with GPS, timestamp, confidence | Implemented (prototype model) |
| GIS map of events, evidence and reports | Implemented |
| Central dashboard for authorities | Implemented |
| Actionable workflow: assignment, SLA, verification | Implemented |
| Edge-AI onboard processing to minimise bandwidth | Planned |
| Vehicle counting, congestion heat maps, bottlenecks | Planned |
| Pedestrian / school-zone safety alerts | Planned |
| Hit-and-run detection with number-plate extraction | Planned |
| Origin-destination analysis and route delay estimation | Planned |

## Model performance

<!-- Fill with real numbers from your training run before submission -->
| Metric | Value |
|---|---|
| Dataset | `<name, size>` |
| mAP@0.5 | `<value>` |
| Precision / Recall | `<value>` |
| Inference speed | `<FPS, hardware>` |

## Roadmap

- Edge inference on a bus-mounted device (TensorRT-optimised YOLO), uploading event packets only
- Vehicle detection, tracking and counting; congestion heat maps
- Pedestrian and school-zone alerts
- Number-plate detection and OCR with confidence score for incident alerts
- O-D analysis and route delay estimation from fleet GPS traces
- Face / plate blurring in public views, encrypted device-to-cloud transport

## Known limitations

Severe blur, darkness, rain, occlusion and unusual camera angles can still defeat computer vision, and no model can guarantee every pothole is detected. Detections are treated as evidence for authority review, not final judgement.

---

## Team TechVertex

`<names and roles>`
