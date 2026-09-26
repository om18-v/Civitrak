# CiviTrak — Civic Road Intelligence & Resolution Platform

CiviTrak connects road-video intelligence to the real municipal repair lifecycle:

**Citizen → Road Video → AI Detection → GIS Evidence → Authority Review → Contractor Assignment → SLA Tracking → Repair Proof → Authority Verification → Citizen Rating**

## What is included

- Premium CiviTrak light + operational-dark visual system
- Cinematic road-inspection login with live scanning HUD overlays
- Citizen Case Tracker / civic control room
- Existing video upload + AI processing + results flow
- Existing GIS map and 3D city visualization
- Municipal Authority command hub
- Contractor field dispatch hub
- Contractor repair submission → authority verification lifecycle
- Public 0–5 citizen contractor ratings
- Contractor accountability leaderboard
- Existing report/PDF, detection evidence and API integrations
- FastAPI + PostgreSQL backend

## Frontend

```powershell
cd Frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal (the project is configured for port 3000).

## Backend

```powershell
cd Backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Configure `Backend/.env` with a valid PostgreSQL `DATABASE_URL` before starting the API.

## Main routes

- `/login` — role access
- `/citizen` — citizen case tracker
- `/home` — CiviTrak overview / intelligence dashboard
- `/upload` — road video upload
- `/processing` — AI processing monitor
- `/results` — detection evidence
- `/map` — GIS spatial intelligence
- `/authority` — municipal command hub
- `/contractor` — contractor field hub
- `/leaderboard` — public contractor accountability

## Lifecycle

1. Citizen uploads road footage.
2. Existing AI pipeline extracts frames and detects infrastructure issues.
3. Evidence is shown with confidence, location and GIS context.
4. The issue enters the authority/work-order lifecycle.
5. Contractor receives an SLA-bound work order.
6. Contractor acknowledges and starts work.
7. Contractor submits completion/repair evidence.
8. Authority approves the repair or requests rework.
9. Completed work becomes visible to the citizen.
10. Citizen can submit one 0–5 rating per completed work order; ratings are surfaced in the contractor accountability view.

## Design direction

The interface uses CiviTrak's own identity and official supplied logo assets. The visual language is inspired by premium AI/product interfaces: dimensional surfaces, atmospheric gradients, strong typography, restrained glass effects, civic/infrastructure colors, and live telemetry — without copying another site's branding or layout.

### Core palette

- Ink / official navy: `#1F3A5F`
- Asphalt: `#23262B`
- Concrete / paper: `#EDEAE3`
- Teal / cyan: `#0B91AA` / `#16C7D9`
- Road yellow: `#F2B705`
- Safety orange: `#E8541E`
- Signal green: `#2F7A4D`


## CiviTrak inspection workflow upgrade
- Citizen upload now leads to real backend processing and a complete result bundle.
- Result page shows issue counts, evidence, location, area contractor, report download, and explicit contractor submission.
- Submission creates real database work orders; contractor/authority portals consume those same records.
- Evidence image URLs are API-relative and the frontend now prefixes the backend origin, fixing broken evidence cards.
- AI mode automatically prefers `Backend/models/best.pt`, then `Backend/models/pothole_best.pt`, then an OpenCV road-surface screening fallback.
- For the prototype pothole model, run from `Backend`: `python scripts/download_pothole_model.py`.
- Severe blur, darkness, rain, occlusion and unusual camera angles can still defeat computer vision; no model can honestly guarantee every pothole.
