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
raw_db_url = os.getenv("DATABASE_URL")
if not raw_db_url:
    raw_db_url = f"sqlite:///{(BASE_DIR / 'civitrak.db').as_posix()}"
elif raw_db_url.startswith("postgres://"):
    raw_db_url = raw_db_url.replace("postgres://", "postgresql://", 1)

DATABASE_URL = raw_db_url

engine_kwargs = {"pool_pre_ping": True}
if DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, **engine_kwargs)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


def ensure_member4_schema():
    """Apply idempotent PostgreSQL schema additions used by work orders."""
    if engine.dialect.name != "postgresql":
        return

    with engine.begin() as connection:
        connection.execute(
            text(
                "ALTER TABLE work_orders "
                "ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP"
            )
        )
        connection.execute(
            text(
                "CREATE UNIQUE INDEX IF NOT EXISTS "
                "uq_work_orders_detection_id "
                "ON work_orders (detection_id)"
            )
        )


def get_db():
    """Provide a database session to FastAPI routes."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
