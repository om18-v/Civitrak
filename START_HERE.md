# CiviTrak — Complete Project

This package keeps the existing CiviTrak application and adds a new premium entry layer in front of it.

## New entry experience

When the site opens, the first screen is a CiviTrak role-selection/login experience with a local moving road/dashcam background.

Choose:
- **User / Citizen** → existing CiviTrak overview/user-facing flow at `/home`
- **Authority** → existing Authority interface at `/authority`
- **Operator** → existing Contractor/Operator interface at `/contractor`

The existing application pages, backend APIs, AI/video pipeline, map, work-order flow and database code are preserved.

## Windows setup

### 1. Frontend

```powershell
cd Frontend
npm install
npm run dev
```

Open: `http://localhost:3000`

### 2. Backend

Open a second PowerShell window:

```powershell
cd Backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

The frontend uses `http://127.0.0.1:8000` by default. If your backend runs elsewhere, create `Frontend/.env`:

```env
VITE_API_URL=http://127.0.0.1:8000
```

## Important

The road video at `Frontend/public/civitrak-road.mp4` is a **visual landing-page background**, not a claim of live telemetry. Actual inspection data remains controlled by the existing backend.

The original backend `.env` is intentionally not included in the distributable package. Add your own environment values locally if required.
