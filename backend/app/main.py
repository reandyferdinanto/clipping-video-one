from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.core.database import init_db
from app.api.endpoints import campaigns, ingest, clips, render

# Initialize SQLite database and tables
init_db()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="Smart Auto-Clipper Studio API for Konten.com video workflows"
)

# CORS Middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for videos, audio, and posters
app.mount("/storage", StaticFiles(directory=str(settings.STORAGE_DIR)), name="storage")

# Include Routers
app.include_router(campaigns.router, prefix="/api/v1/campaigns", tags=["Campaigns"])
app.include_router(ingest.router, prefix="/api/v1/ingest", tags=["Ingest"])
app.include_router(clips.router, prefix="/api/v1/clips", tags=["Clips"])
app.include_router(render.router, prefix="/api/v1/render", tags=["Render"])

@app.get("/")
def root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "docs_url": "/docs"
    }

@app.get("/health")
def health_check():
    return {"status": "ok"}
