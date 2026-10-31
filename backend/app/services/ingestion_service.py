import os
import re
import uuid
import shutil
import yt_dlp
import gdown
from pathlib import Path
from typing import Dict, Any, Optional
from app.core.config import settings

class IngestionService:
    @staticmethod
    def fetch_youtube(url: str) -> Dict[str, Any]:
        """
        Download YouTube video in up to 1080p.
        We deliberately disable remote subtitle download to prevent YouTube's HTTP 429 (Too Many Requests)
        rate limiting on the timedtext API. Faster-Whisper will transcribe audio locally with word-level precision.
        """
        video_uuid = str(uuid.uuid4())[:8]
        output_template = str(settings.RAW_DIR / f"{video_uuid}_%(id)s.%(ext)s")
        
        # Clean timestamp parameters like &t=10s
        clean_url = re.sub(r"&t=\d+s?", "", url.strip())

        # Locate ffmpeg directory for yt-dlp
        ffmpeg_dir = None
        if settings.FFMPEG_PATH != "ffmpeg":
            ffmpeg_dir = str(Path(settings.FFMPEG_PATH).parent)
        elif shutil.which("ffmpeg"):
            ffmpeg_dir = str(Path(shutil.which("ffmpeg")).parent)

        ydl_opts = {
            'format': 'bestvideo[height<=1080]+bestaudio/best[height<=1080]/best',
            'merge_output_format': 'mp4',
            'outtmpl': output_template,
            'writesubtitles': False,
            'writeautomaticsub': False,
            'quiet': False,
            'no_warnings': True,
            'ignoreerrors': False
        }
        if ffmpeg_dir:
            ydl_opts['ffmpeg_location'] = ffmpeg_dir
        
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(clean_url, download=True)
        except Exception as e:
            # Fallback to general best format if specific mux fails
            print(f"1080p format download failed ({e}), retrying with generic best...")
            ydl_opts['format'] = 'best'
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(clean_url, download=True)

        video_id = info['id']
        video_title = info.get('title', f"YouTube Video {video_id}")
        duration = info.get('duration', 0)
        
        # Locate the actual downloaded video file
        expected_video_path = settings.RAW_DIR / f"{video_uuid}_{video_id}.mp4"
        if not expected_video_path.exists():
            candidates = list(settings.RAW_DIR.glob(f"{video_uuid}_{video_id}.*"))
            video_file = next((c for c in candidates if c.suffix.lower() in ['.mp4', '.mkv', '.webm', '.ts']), None)
            if video_file:
                expected_video_path = video_file
        
        return {
            "id": video_uuid,
            "title": video_title,
            "source_type": "YOUTUBE",
            "source_url": clean_url,
            "local_path": str(expected_video_path),
            "srt_path": None,
            "duration_seconds": float(duration)
        }

    @staticmethod
    def fetch_gdrive_file_or_folder(url: str) -> Dict[str, Any]:
        """Download Google Drive file or folder with graceful quota limit handling."""
        video_uuid = str(uuid.uuid4())[:8]
        output_dir = settings.RAW_DIR / video_uuid
        output_dir.mkdir(parents=True, exist_ok=True)
        
        is_folder = "/folders/" in url
        
        try:
            if is_folder:
                downloaded_files = gdown.download_folder(
                    url=url, 
                    output=str(output_dir), 
                    quiet=False
                )
                if not downloaded_files:
                    raise ValueError("Folder Google Drive kosong atau tidak dapat diunduh.")
                
                # Find all video files in directory
                videos = list(output_dir.rglob("*.mp4")) + list(output_dir.rglob("*.MP4")) + list(output_dir.rglob("*.mov"))
                if not videos:
                    raise ValueError("Tidak ditemukan file video (.mp4/.mov) di dalam folder Google Drive ini.")
                
                final_path = videos[0]
                title = final_path.stem
            else:
                out_target = str(output_dir / "material.mp4")
                downloaded_file = gdown.download(
                    url=url, 
                    output=out_target, 
                    quiet=False
                )
                if not downloaded_file or not Path(downloaded_file).exists():
                    raise ValueError("Gagal mengunduh file Google Drive.")
                
                final_path = Path(downloaded_file)
                title = final_path.stem
        except Exception as e:
            err_str = str(e)
            if "Too many users" in err_str or "quota" in err_str.lower() or "retrieval" in err_str.lower():
                raise ValueError(
                    "Kuota download publik Google Drive ini sedang penuh dari server Google ('Too many users downloaded'). "
                    "Solusi: Download file video langsung di browser Anda, lalu drag-and-drop file MP4 tersebut ke Studio."
                )
            raise ValueError(f"Google Drive download error: {err_str}")

        return {
            "id": video_uuid,
            "title": f"GDrive: {title}",
            "source_type": "GDRIVE",
            "source_url": url,
            "local_path": str(final_path),
            "srt_path": None,
            "duration_seconds": 0
        }
