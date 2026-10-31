from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
import uuid
from datetime import datetime
from app.models.schemas import Clip, ClipCreate
from app.core.database import Database
from app.services.ai_curator import AICuratorService

router = APIRouter()

@router.post("/curate/{video_id}", response_model=List[Clip])
def curate_clips_endpoint(video_id: str):
    """Run AI hook detection and clipping curation on a transcribed video."""
    video = Database.get_source_video(video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video tidak ditemukan")
    
    transcript = video.get("transcript")
    if not transcript or not transcript.get("segments"):
        raise HTTPException(status_code=400, detail="Video belum selesai ditranskripsi atau transkrip kosong")

    # Get campaign rules if bound
    campaign_info = None
    if video.get("campaign_id"):
        campaign_info = Database.get_campaign(video["campaign_id"])

    min_dur = campaign_info.get("min_clip_duration", 30) if campaign_info else 30
    max_dur = campaign_info.get("max_clip_duration", 55) if campaign_info else 55

    summary = transcript.get("summary_transcript", "")
    suggestions = AICuratorService.curate_segments(
        summary_transcript=summary,
        campaign_info=campaign_info,
        min_duration=min_dur,
        max_duration=max_dur
    )

    created_clips = []
    for s in suggestions:
        clip_id = f"clip-{str(uuid.uuid4())[:8]}"
        clip_dict = {
            "id": clip_id,
            "source_video_id": video_id,
            "title": s.get("hook_text", f"Klip {s['start_time']}s")[:80],
            "start_time": s["start_time"],
            "end_time": s["end_time"],
            "hook_text": s.get("hook_text", ""),
            "virality_score": s.get("virality_score", 85),
            "layout_mode": "BLUR_BG",
            "outro_enabled": True if (campaign_info and campaign_info.get("mandatory_outro_required")) else False,
            "custom_outro_file": campaign_info.get("mandatory_outro_file") if campaign_info else None,
            "output_video_path": None,
            "preview_video_path": None,
            "status": "DRAFT",
            "submission_url": None,
            "verified_views": 0,
            "created_at": datetime.utcnow().isoformat()
        }
        Database.save_clip(clip_dict)
        created_clips.append(clip_dict)

    return created_clips

@router.get("/by-video/{video_id}", response_model=List[Clip])
def get_clips_for_video(video_id: str):
    return Database.get_clips_for_video(video_id)

@router.get("/{clip_id}", response_model=Clip)
def get_clip(clip_id: str):
    clip = Database.get_clip(clip_id)
    if not clip:
        raise HTTPException(status_code=404, detail="Klip tidak ditemukan")
    return clip

@router.put("/{clip_id}", response_model=Clip)
def update_clip(clip_id: str, clip_update: Dict[str, Any]):
    clip = Database.get_clip(clip_id)
    if not clip:
        raise HTTPException(status_code=404, detail="Klip tidak ditemukan")

    for k, v in clip_update.items():
        if k in clip:
            clip[k] = v

    Database.save_clip(clip)
    return clip
