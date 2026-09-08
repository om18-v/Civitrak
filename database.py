import os

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/sihps124"
)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def ensure_member4_schema():
    """
    Apply the two small Member 4 schema additions when using PostgreSQL.

    The project has no migration framework, and create_all() does not alter
    existing tables, so these idempotent statements keep existing databases
    compatible with the work-order implementation.
    """
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
    """
    Provides a database session to FastAPI routes.

    The session is automatically closed after
    the request is finished.
    """
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()