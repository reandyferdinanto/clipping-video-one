from pathlib import Path
from typing import List, Dict, Any
from app.core.config import settings

class SubtitleGenerator:
    @staticmethod
    def generate_ass_karaoke(
        segments: List[Dict[str, Any]], 
        clip_start: float, 
        clip_end: float,
        output_path: str,
        style: str = "TIKTOK_KARAOKE"
    ) -> str:
        """
        Generate Advanced SubStation Alpha (.ass) file with precise karaoke highlighting
        and strict safe-zone vertical margin (MarginV=520) for 1080x1920 mobile viewport.
        """
        ass_lines = [
            "[Script Info]",
            "Title: Smart Auto-Clipper Subtitles",
            "ScriptType: v4.00+",
            "WrapStyle: 0",
            "ScaledBorderAndShadow: yes",
            "YCbCr Matrix: TV.709",
            "PlayResX: 1080",
            "PlayResY: 1920",
            "",
            "[V4+ Styles]",
            "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
            # TikTok Style: Montserrat / Arial Bold, Yellow highlight (&H0000FFFF), White primary (&H00FFFFFF), Black outline (&H00000000)
            # Alignment 2 = Bottom-Center. MarginV 520 keeps it safely above TikTok UI (profile, caption, music) and below face
            "Style: TikTokKaraoke,Arial,68,&H00FFFFFF,&H0000FFFF,&H00000000,&H80000000,-1,0,0,0,100,100,1,0,1,5,2,2,60,60,520,1",
            "Style: MinimalWhite,Arial,62,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,-1,0,0,0,100,100,1,0,1,4,2,2,60,60,520,1",
            "",
            "[Events]",
            "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"
        ]

        active_style = "TikTokKaraoke" if style == "TIKTOK_KARAOKE" else "MinimalWhite"

        for seg in segments:
            seg_start = seg.get("start", 0)
            seg_end = seg.get("end", 0)

            # Only include segments that intersect with clip timeframe
            if seg_end <= clip_start or seg_start >= clip_end:
                continue

            # Offset time relative to clip start
            rel_start = max(0.0, seg_start - clip_start)
            rel_end = max(rel_start + 0.1, seg_end - clip_start)

            words = seg.get("words", [])
            if words and style == "TIKTOK_KARAOKE":
                # Build karaoke tag string: {\k<centiseconds>}Word
                karaoke_text_parts = []
                for w in words:
                    w_start = max(clip_start, w.get("start", seg_start))
                    w_end = min(clip_end, w.get("end", seg_end))
                    duration_cs = max(10, int((w_end - w_start) * 100))
                    clean_word = w.get("word", "").strip().upper()
                    if clean_word:
                        karaoke_text_parts.append(f"{{\\k{duration_cs}}}{clean_word}")
                line_text = " ".join(karaoke_text_parts)
            else:
                line_text = seg.get("text", "").strip().upper()

            start_str = SubtitleGenerator._format_ass_time(rel_start)
            end_str = SubtitleGenerator._format_ass_time(rel_end)
            
            ass_lines.append(f"Dialogue: 0,{start_str},{end_str},{active_style},,0,0,0,,{line_text}")

        # Write to file
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write("\n".join(ass_lines))

        return output_path

    @staticmethod
    def _format_ass_time(seconds: float) -> str:
        """Format seconds into H:MM:SS.cc for ASS."""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = seconds % 60
        return f"{hours}:{minutes:02d}:{secs:05.2f}"
