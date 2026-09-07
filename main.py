from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import Base, engine
from routes import detections, videos



Base.metadata.create_all(bind=engine)



app = FastAPI(
    title="Smart Road & Traffic Intelligence Platform",
    description=(
        "Backend API for road defect detection, "
        "traffic intelligence, mapping, and work-order management."
    ),
    version="1.0.0",
)



app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"

UPLOAD_DIR.mkdir(
    parents=True,
    exist_ok=True,
)



app.mount(
    "/uploads",
    StaticFiles(directory=str(UPLOAD_DIR)),
    name="uploads",
)



app.include_router(
    videos.router,
)

app.include_router(
    detections.router,
)



@app.get("/")
def root():
    """
    Basic API health endpoint.
    """

    return {
        "message": "Smart Road & Traffic Intelligence Platform API",
        "status": "running",
        "version": "1.0.0",
    }



@app.get("/health")
def health_check():
    """
    Simple health-check endpoint used to verify that
    the backend server is running.
    """

    return {
        "status": "healthy",
    }