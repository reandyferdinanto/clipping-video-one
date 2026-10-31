import os
import uuid
import yt_dlp
import gdown
from pathlib import Path
from typing import Dict, Any, Optional
from app.core.config import settings

class IngestionService:
    @staticmethod
    def fetch_youtube(url: str) -> Dict[str, Any]:
        """Download YouTube video in up to 1080p and extract subtitles if available."""
        video_uuid = str(uuid.uuid4())[:8]
        output_template = str(settings.RAW_DIR / f"{video_uuid}_%(id)s.%(ext)s")
        
        ydl_opts = {
            'format': 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            'outtmpl': output_template,
            'writeautomaticsub': True,
            'writesubtitles': True,
            'subtitleslangs': ['id', 'en'],
            'subtitlesformat': 'srt',
            'quiet': False,
            'no_warnings': True
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            video_id = info['id']
            video_title = info.get('title', f"YouTube Video {video_id}")
            duration = info.get('duration', 0)
            
            # Find the actual downloaded MP4
            expected_video_path = settings.RAW_DIR / f"{video_uuid}_{video_id}.mp4"
            if not expected_video_path.exists():
                # Check if it was saved with another extension
                candidates = list(settings.RAW_DIR.glob(f"{video_uuid}_{video_id}.*"))
                video_file = next((c for c in candidates if c.suffix.lower() in ['.mp4', '.mkv', '.webm']), None)
                if video_file:
                    expected_video_path = video_file
            
            # Check for downloaded SRT
            srt_candidates = list(settings.RAW_DIR.glob(f"{video_uuid}_{video_id}*.srt"))
            srt_path = str(srt_candidates[0]) if srt_candidates else None
            
            return {
                "id": video_uuid,
                "title": video_title,
                "source_type": "YOUTUBE",
                "source_url": url,
                "local_path": str(expected_video_path),
                "srt_path": srt_path,
                "duration_seconds": float(duration)
            }

    @staticmethod
    def fetch_gdrive_file_or_folder(url: str) -> Dict[str, Any]:
        """Download Google Drive file or folder."""
        video_uuid = str(uuid.uuid4())[:8]
        output_dir = settings.RAW_DIR / video_uuid
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Download using gdown
        output_file_or_folder = gdown.download(url=url, output=str(output_dir / "material"), quiet=False, fuzzy=True)
        
        # Check if downloaded single file or folder
        target_path = Path(output_file_or_folder)
        if target_path.is_file():
            final_path = target_path
            title = target_path.stem
        else:
            # Pick first video in directory
            videos = list(target_path.glob("*.mp4")) + list(target_path.glob("*.mov"))
            final_path = videos[0] if videos else target_path
            title = target_path.name
            
        return {
            "id": video_uuid,
            "title": f"GDrive: {title}",
            "source_type": "GDRIVE",
            "source_url": url,
            "local_path": str(final_path),
            "srt_path": None,
            "duration_seconds": 0
        }
