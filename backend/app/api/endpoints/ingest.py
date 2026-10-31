from fastapi import APIRouter, UploadFile, File, Form, BackgroundTasks, HTTPException
from typing import Optional
import uuid
import shutil
from pathlib import Path
from datetime import datetime
from app.models.schemas import SourceVideo, IngestRequest
from app.services.ingestion_service import IngestionService
from app.services.transcription_service import TranscriptionService
from app.core.database import Database
from app.core.config import settings

router = APIRouter()

def process_transcription_background(video_id: str, video_path: str, srt_path: Optional[str] = None):
    """Background task to extract audio and transcribe."""
    try:
        transcript_data = TranscriptionService.transcribe(video_path, srt_path)
        video = Database.get_source_video(video_id)
        if video:
            video["transcript"] = transcript_data
            Database.save_source_video(video)
            print(f"Transcription finished for video {video_id}")
    except Exception as e:
        print(f"Background transcription failed for {video_id}: {e}")

@router.post("/url", response_model=SourceVideo)
def ingest_url(request: IngestRequest, background_tasks: BackgroundTasks):
    """Ingest YouTube or Google Drive URL and trigger transcription."""
    if not request.source_url:
        raise HTTPException(status_code=400, detail="source_url wajib diisi")

    try:
        if "drive.google.com" in request.source_url or "gdrive" in request.source_type.lower():
            info = IngestionService.fetch_gdrive_file_or_folder(request.source_url)
        else:
            info = IngestionService.fetch_youtube(request.source_url)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Gagal mengunduh materi: {str(e)}")

    video_dict = {
        "id": info["id"],
        "campaign_id": request.campaign_id,
        "title": info["title"],
        "source_type": info["source_type"],
        "source_url": request.source_url,
        "local_path": info["local_path"],
        "duration_seconds": info.get("duration_seconds", 0),
        "transcript": None,
        "created_at": datetime.utcnow().isoformat()
    }

    Database.save_source_video(video_dict)

    # Trigger transcription in background
    background_tasks.add_task(
        process_transcription_background, 
        info["id"], 
        info["local_path"], 
        info.get("srt_path")
    )

    return video_dict

@router.post("/upload", response_model=SourceVideo)
async def upload_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    campaign_id: Optional[str] = Form(None)
):
    """Upload local MP4 video directly."""
    video_id = str(uuid.uuid4())[:8]
    ext = Path(file.filename).suffix or ".mp4"
    dest_path = settings.RAW_DIR / f"{video_id}_{file.filename}"

    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    video_dict = {
        "id": video_id,
        "campaign_id": campaign_id,
        "title": Path(file.filename).stem,
        "source_type": "UPLOAD",
        "source_url": None,
        "local_path": str(dest_path),
        "duration_seconds": 0,
        "transcript": None,
        "created_at": datetime.utcnow().isoformat()
    }

    Database.save_source_video(video_dict)
    background_tasks.add_task(process_transcription_background, video_id, str(dest_path))

    return video_dict

@router.get("/{video_id}", response_model=SourceVideo)
def get_source_video(video_id: str):
    video = Database.get_source_video(video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video tidak ditemukan")
    return video
