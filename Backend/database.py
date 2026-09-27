import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

# PostgreSQL remains supported when DATABASE_URL is provided.
# For a clean demo/local checkout, fall back to a file-backed SQLite database
# so the API can start without requiring a separately installed database server.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./civitrak.db")
# Render (and some other providers) issue postgres:// URLs; SQLAlchemy
# requires postgresql:// so normalise here before creating the engine.
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
if DATABASE_URL.startswith("postgresql://") and "+psycopg" not in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

engine_kwargs: dict = {"pool_pre_ping": True}
if DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    # Keep cloud connections alive and avoid stale socket errors on Render
    engine_kwargs["pool_recycle"] = 300

engine = create_engine(DATABASE_URL, **engine_kwargs)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()

# Import model declarations after Base exists so Base.metadata is populated even
# when a test imports database.Base before importing models.
try:
    import models  # noqa: F401,E402
except Exception:
    # Production startup imports models explicitly; keep database import resilient.
    pass


def ensure_member4_schema():
    """Apply idempotent PostgreSQL / SQLite schema additions."""
    cols_to_add = [
        ("detections", "gps_quality", "VARCHAR(50) DEFAULT 'ROUTE_GEOCODED'"),
        ("detections", "gps_status", "VARCHAR(50) DEFAULT 'APPROXIMATE'"),
        ("detections", "is_false_positive", "BOOLEAN DEFAULT 0"),
        ("detections", "false_positive_reason", "VARCHAR(255)"),
        ("work_orders", "completed_at", "TIMESTAMP"),
        ("work_orders", "assignment_reason", "VARCHAR(255) DEFAULT 'Area Jurisdiction Match'"),
        ("work_orders", "rework_notes", "TEXT"),
        ("work_orders", "rework_requested_at", "TIMESTAMP"),
    ]
    with engine.begin() as connection:
        for table, col, col_type in cols_to_add:
            try:
                connection.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}"))
            except Exception:
                pass  # Column already exists or dialect variant


def get_db():
    """Provide a database session to FastAPI routes."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
