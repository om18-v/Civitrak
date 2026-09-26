"""
SIHPS124 — FastAPI Application Entry Point
"""

import logging
import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import engine, Base, SessionLocal, ensure_member4_schema
from routes import videos, detections, work_orders, analytics, auth
from models import Contractor

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("sihps")

# ---------------------------------------------------------------------------
# Create tables on startup (safe for development; use Alembic for production)
# ---------------------------------------------------------------------------

Base.metadata.create_all(bind=engine)
ensure_member4_schema()
logger.info("[DB] Database tables created/verified and schema additions applied.")

# Seed a small, deterministic contractor directory for a fresh demo database.
def _seed_demo_contractors() -> None:
    demo_contractors = [
        ("Raj Infrastructure Services", "rajinfra@example.com", "MG Road", 4.8),
        ("Urban Road Works", "urbanworks@example.com", "Airport Road", 4.6),
        ("City Maintenance Solutions", "citymaint@example.com", "Station Road", 4.7),
        ("Metro Infrastructure Group", "metroinfra@example.com", "Ring Road", 4.5),
        ("National Road Contractors", "nationalroad@example.com", "Main Highway", 4.9),
        ("Panvel Civic Road Services", "panvelroads@example.com", "Panvel", 4.7),
    ]
    db = SessionLocal()
    try:
        existing_names = {c.name for c in db.query(Contractor).all()}
        added = 0
        for name, email, area, rating in demo_contractors:
            if name not in existing_names:
                db.add(Contractor(name=name, email=email, assigned_area=area, rating=rating, is_active=True))
                added += 1
        if added:
            db.commit()
            logger.info("[DB] Demo contractor directory synchronized: %s added.", added)
    finally:
        db.close()

_seed_demo_contractors()

# Seed local portal accounts for evaluation; passwords are intentionally simple for
# the offline SIH demo and should be replaced by deployment-managed credentials.
def _seed_demo_users() -> None:
    from models import User
    import hashlib
    db = SessionLocal()
    try:
        contractors = {c.name: c for c in db.query(Contractor).all()}
        accounts = [
            ("sharma.chief@transport.gov.in", "Chief Engineer Sharma", "authority", None),
            ("dispatch@apexhighway.com", "Apex Highway Works", "contractor", next(iter(contractors.values())).id if contractors else None),
        ]
        for email, name, role, contractor_id in accounts:
            if not db.query(User).filter(User.email == email).first():
                db.add(User(email=email, name=name, role=role, contractor_id=contractor_id, hashed_password=hashlib.sha256("civitrak123".encode()).hexdigest(), is_active=True))
        db.commit()
    finally:
        db.close()

_seed_demo_users()

# ---------------------------------------------------------------------------
# Startup sanity check for the AI pipeline
#
# Every video upload silently fails with status=failed if these aren't in
# place. Checking here means you see the problem the moment the server
# starts, instead of after uploading a video and waiting for it to fail.
# ---------------------------------------------------------------------------

def _check_ai_pipeline_ready() -> None:
    try:
        import yaml
        cfg_path = Path(__file__).parent / "ai_ml" / "config" / "config.yaml"
        with open(cfg_path, encoding="utf-8") as f: cfg = yaml.safe_load(f)
        mode = cfg.get("model", {}).get("model_mode", "auto")
        candidates = [
            Path(__file__).parent / cfg["model"]["weights"],
            Path(__file__).parent / cfg["model"].get("pothole_weights", "models/pothole_best.pt"),
        ]
        installed = [str(p) for p in candidates if p.exists()]
        if installed: logger.info("[STARTUP] Road-defect weights available: %s", ", ".join(installed))
        else: logger.warning("[STARTUP] No road-defect weights installed. The OpenCV road-surface screening fallback will run. For stronger pothole recall, run Backend/scripts/download_pothole_model.py.")
    except Exception as exc: logger.warning("[STARTUP] Could not validate AI config: %s", exc)
    try:
        import ultralytics  # noqa: F401
        logger.info("[STARTUP] ultralytics package is installed.")
    except ImportError:
        logger.warning("[STARTUP] ultralytics is not installed. Model inference is unavailable until pip install -r requirements.txt; OpenCV fallback remains available.")
    try:
        import cv2
        logger.info("[STARTUP] OpenCV %s available.", cv2.__version__)
    except ImportError:
        logger.error("[STARTUP] OpenCV is not installed. Video processing cannot run.")


_check_ai_pipeline_ready()

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="SIHPS124 — Smart Road & Traffic Intelligence Platform",
    description="Real-world AI/CV pipeline: video → detection → issue → work order → resolution.",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---------------------------------------------------------------------------
# CORS (allow local frontend dev server)
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(videos.router)
app.include_router(detections.router)
app.include_router(work_orders.router)
app.include_router(analytics.router)
app.include_router(auth.router)

# ---------------------------------------------------------------------------
# Static file serving
# ---------------------------------------------------------------------------

BACKEND_DIR = Path(__file__).parent

# Serve uploaded videos (for playback)
uploads_dir = BACKEND_DIR / "uploads"
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

# Serve AI output (annotated evidence frames, repair proofs)
ai_output_dir = BACKEND_DIR / "ai_ml" / "outputs"
ai_output_dir.mkdir(parents=True, exist_ok=True)
app.mount("/ai-output", StaticFiles(directory=str(ai_output_dir)), name="ai-output")

# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {
        "status": "ok",
        "version": "2.1.0",
        "note": "CiviTrak — live AI pipeline and civic case lifecycle.",
    }


@app.get("/api/system/health")
def system_health():
    """Operational health snapshot for authority/admin dashboards."""
    import shutil
    from sqlalchemy import text
    db_ok = True
    db_detail = "Database connection healthy"
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        db_ok = False; db_detail = str(exc)[:180]
    model_paths = [Path(__file__).parent / "models" / "pothole_best.pt", Path(__file__).parent / "models" / "best.pt"]
    ai_ok = any(p.exists() for p in model_paths)
    gps_ok = (Path(__file__).parent / "uploads" / "gps").exists()
    storage_ok = shutil.disk_usage(Path(__file__).parent).free > 250 * 1024 * 1024
    checks = {
        "api": {"status":"healthy", "details":"FastAPI service responding", "healthy":True},
        "database": {"status":"healthy" if db_ok else "degraded", "details":db_detail, "healthy":db_ok},
        "ai_model": {"status":"ready" if ai_ok else "fallback", "details":"Road-defect model available" if ai_ok else "OpenCV screening fallback available", "healthy":ai_ok},
        "gps_engine": {"status":"ready" if gps_ok else "degraded", "details":"GPS upload directory ready" if gps_ok else "GPS upload directory missing", "healthy":gps_ok},
        "storage": {"status":"healthy" if storage_ok else "low", "details":"Sufficient free storage" if storage_ok else "Less than 250 MB free", "healthy":storage_ok},
    }
    return {"overall": "healthy" if all(v["healthy"] for v in checks.values()) else "degraded", "version":"2.1.0", **checks}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
