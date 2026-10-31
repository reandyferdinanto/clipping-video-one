from fastapi import APIRouter, HTTPException, BackgroundTasks
from pathlib import Path
from typing import Optional
from app.models.schemas import Clip, RenderOptions
from app.core.database import Database
from app.core.config import settings
from app.services.subtitle_generator import SubtitleGenerator
from app.services.video_processor import VideoProcessor

router = APIRouter()

def execute_render_job(clip_id: str, options: RenderOptions):
    clip = Database.get_clip(clip_id)
    if not clip:
        return
    
    video = Database.get_source_video(clip["source_video_id"])
    if not video:
        return

    clip["status"] = "PROCESSING"
    Database.save_clip(clip)

    try:
        source_path = video["local_path"]
        start_time = float(clip["start_time"])
        end_time = float(clip["end_time"])
        
        # 1. Subtitle Generation
        ass_path = None
        if options.burn_subtitles and video.get("transcript"):
            transcript_segments = video["transcript"].get("segments", [])
            ass_filename = f"sub_{clip_id}.ass"
            ass_dest = str(settings.SUBTITLES_DIR / ass_filename)
            ass_path = SubtitleGenerator.generate_ass_karaoke(
                segments=transcript_segments,
                clip_start=start_time,
                clip_end=end_time,
                output_path=ass_dest,
                style=options.subtitle_style
            )

        # 2. Check Outro Poster/Video
        outro_file = None
        if options.outro_enabled and clip.get("custom_outro_file"):
            candidate = settings.POSTERS_DIR / clip["custom_outro_file"]
            if candidate.exists():
                outro_file = str(candidate)

        # 3. Execute FFmpeg Rendering Pipeline
        output_filename = f"final_{clip_id}.mp4"
        final_mp4 = VideoProcessor.process_clip(
            source_video_path=source_path,
            start_time=start_time,
            end_time=end_time,
            layout_mode=options.layout_mode,
            ass_subtitle_path=ass_path,
            outro_image_or_video=outro_file,
            outro_duration=options.outro_duration_seconds,
            output_filename=output_filename
        )

        clip["output_video_path"] = f"/storage/processed/{output_filename}"
        clip["status"] = "COMPLETED"
        Database.save_clip(clip)
        print(f"Render completed successfully: {output_filename}")
    except Exception as e:
        print(f"Render error for clip {clip_id}: {e}")
        clip["status"] = "FAILED"
        Database.save_clip(clip)

@router.post("/{clip_id}", response_model=Clip)
def trigger_render(clip_id: str, options: RenderOptions, background_tasks: BackgroundTasks):
    """Trigger background FFmpeg render for a 9:16 clip with subtitles and outro."""
    clip = Database.get_clip(clip_id)
    if not clip:
        raise HTTPException(status_code=404, detail="Klip tidak ditemukan")

    background_tasks.add_task(execute_render_job, clip_id, options)
    clip["status"] = "PROCESSING"
    return clip
