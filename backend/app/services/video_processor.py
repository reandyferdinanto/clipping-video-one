import subprocess
import os
import uuid
from pathlib import Path
from typing import Optional
from app.core.config import settings

class VideoProcessor:
    @staticmethod
    def process_clip(
        source_video_path: str,
        start_time: float,
        end_time: float,
        layout_mode: str = "BLUR_BG",
        ass_subtitle_path: Optional[str] = None,
        outro_image_or_video: Optional[str] = None,
        outro_duration: float = 3.0,
        output_filename: Optional[str] = None
    ) -> str:
        """
        Execute full FFmpeg video pipeline:
        1. Trim segment (start_time to end_time)
        2. Convert to 9:16 (1080x1920) with selected layout
        3. Burn ASS karaoke subtitle in safe zone
        4. Stitch mandatory outro poster / CTA
        """
        job_id = str(uuid.uuid4())[:8]
        if not output_filename:
            output_filename = f"clip_{job_id}.mp4"
            
        final_output_path = settings.PROCESSED_DIR / output_filename
        temp_main_clip = settings.PROCESSED_DIR / f"temp_{job_id}_main.mp4"
        
        duration = end_time - start_time
        
        # 1. Filter Graph for 9:16 Reframe & Subtitle Burn
        # Escape backslashes for FFmpeg libass filter on Windows
        sub_filter = ""
        if ass_subtitle_path and Path(ass_subtitle_path).exists():
            clean_ass_path = str(Path(ass_subtitle_path).resolve()).replace("\\", "/").replace(":", "\\:")
            sub_filter = f",ass='{clean_ass_path}'"

        if layout_mode == "CENTER_CROP":
            filter_complex = (
                f"scale=ih*9/16:ih:force_original_aspect_ratio=increase,"
                f"crop=ih*9/16:ih,scale=1080:1920,setsar=1{sub_filter}"
            )
            filter_args = ["-vf", filter_complex]
        else:
            # BLUR_BG default
            filter_complex = (
                f"[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=25:10[bg];"
                f"[0:v]scale=1080:-2[fg];"
                f"[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1{sub_filter}"
            )
            filter_args = ["-lavfi", filter_complex]

        cmd_main = [
            settings.FFMPEG_PATH,
            "-y",
            "-ss", str(start_time),
            "-t", str(duration),
            "-i", str(source_video_path),
            *filter_args,
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "22",
            "-c:a", "aac",
            "-b:a", "128k",
            "-ar", "44100",
            "-ac", "2",
            str(temp_main_clip)
        ]

        subprocess.run(cmd_main, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)

        # 2. Check if outro stitching is requested & file exists
        if outro_image_or_video and Path(outro_image_or_video).exists():
            outro_path = Path(outro_image_or_video)
            temp_outro_clip = settings.PROCESSED_DIR / f"temp_{job_id}_outro.mp4"
            
            # If outro is an image (poster), render 3-second clip with silent audio
            if outro_path.suffix.lower() in [".jpg", ".jpeg", ".png", ".webp"]:
                cmd_poster = [
                    settings.FFMPEG_PATH,
                    "-y",
                    "-loop", "1",
                    "-i", str(outro_path),
                    "-f", "lavfi",
                    "-i", "anullsrc=r=44100:cl=stereo",
                    "-c:v", "libx264",
                    "-preset", "veryfast",
                    "-t", str(outro_duration),
                    "-pix_fmt", "yuv420p",
                    "-vf", "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1",
                    "-c:a", "aac",
                    "-shortest",
                    str(temp_outro_clip)
                ]
                subprocess.run(cmd_poster, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
            else:
                # Video outro
                temp_outro_clip = outro_path

            # Concat main clip + outro
            concat_list_file = settings.PROCESSED_DIR / f"concat_{job_id}.txt"
            with open(concat_list_file, "w") as f:
                f.write(f"file '{temp_main_clip.resolve().as_posix()}'\n")
                f.write(f"file '{Path(temp_outro_clip).resolve().as_posix()}'\n")

            cmd_concat = [
                settings.FFMPEG_PATH,
                "-y",
                "-f", "concat",
                "-safe", "0",
                "-i", str(concat_list_file),
                "-c", "copy",
                str(final_output_path)
            ]
            subprocess.run(cmd_concat, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)

            # Cleanup temp files
            try:
                temp_main_clip.unlink(missing_ok=True)
                concat_list_file.unlink(missing_ok=True)
                if str(temp_outro_clip).startswith(str(settings.PROCESSED_DIR)):
                    Path(temp_outro_clip).unlink(missing_ok=True)
            except Exception:
                pass
        else:
            # No outro: rename main clip to final output
            if temp_main_clip.exists():
                temp_main_clip.replace(final_output_path)

        return str(final_output_path)
