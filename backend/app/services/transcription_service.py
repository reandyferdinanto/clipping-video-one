import subprocess
import re
from pathlib import Path
from typing import Dict, Any, List, Optional
from app.core.config import settings

class TranscriptionService:
    _whisper_model = None

    @classmethod
    def get_whisper_model(cls):
        if cls._whisper_model is None:
            try:
                from faster_whisper import WhisperModel
                # Run on CPU with int8 quantization for high compatibility & speed
                cls._whisper_model = WhisperModel(
                    settings.WHISPER_MODEL_SIZE, 
                    device="cpu", 
                    compute_type="int8"
                )
            except Exception as e:
                print(f"Faster-whisper init warning: {e}")
                cls._whisper_model = None
        return cls._whisper_model

    @staticmethod
    def extract_audio(video_path: str) -> str:
        """Extract 16kHz mono WAV audio from video using FFmpeg."""
        video_p = Path(video_path)
        audio_path = video_p.with_suffix(".wav")
        
        cmd = [
            settings.FFMPEG_PATH,
            "-y",
            "-i", str(video_p),
            "-vn",
            "-acodec", "pcm_s16le",
            "-ar", "16000",
            "-ac", "1",
            str(audio_path)
        ]
        
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        return str(audio_path)

    @classmethod
    def transcribe(cls, video_path: str, srt_fallback_path: Optional[str] = None) -> Dict[str, Any]:
        """Transcribe video using faster-whisper or parse existing SRT."""
        # Check if SRT already exists and is non-empty
        if srt_fallback_path and Path(srt_fallback_path).exists():
            srt_data = cls._parse_srt(srt_fallback_path)
            if srt_data["segments"]:
                return srt_data

        # Fallback to faster-whisper
        audio_path = cls.extract_audio(video_path)
        model = cls.get_whisper_model()
        
        segments_data: List[Dict[str, Any]] = []
        full_text_list = []
        
        if model:
            segments, info = model.transcribe(
                audio_path, 
                beam_size=5, 
                word_timestamps=True,
                language="id" # Defaults to Indonesian, auto-detects if mixed
            )
            
            seg_idx = 0
            for segment in segments:
                words = []
                if segment.words:
                    for w in segment.words:
                        words.append({
                            "word": w.word.strip(),
                            "start": round(w.start, 2),
                            "end": round(w.end, 2),
                            "probability": round(w.probability, 2)
                        })
                
                seg_dict = {
                    "id": seg_idx,
                    "start": round(segment.start, 2),
                    "end": round(segment.end, 2),
                    "text": segment.text.strip(),
                    "words": words
                }
                segments_data.append(seg_dict)
                full_text_list.append(segment.text.strip())
                seg_idx += 1
                
        # Clean up temporary WAV
        try:
            Path(audio_path).unlink(missing_ok=True)
        except Exception:
            pass

        return {
            "segments": segments_data,
            "full_text": " ".join(full_text_list),
            "summary_transcript": cls.format_for_llm(segments_data)
        }

    @staticmethod
    def format_for_llm(segments: List[Dict[str, Any]]) -> str:
        """Format transcript into compact timestamped lines to optimize LLM token usage."""
        formatted_lines = []
        for s in segments:
            # e.g. [01:23 - 01:30] Text here
            start_m, start_s = divmod(int(s["start"]), 60)
            end_m, end_s = divmod(int(s["end"]), 60)
            formatted_lines.append(f"[{start_m:02d}:{start_s:02d} - {end_m:02d}:{end_s:02d}] {s['text']}")
        return "\n".join(formatted_lines)

    @staticmethod
    def _parse_srt(srt_path: str) -> Dict[str, Any]:
        """Simple SRT parser to extract segments."""
        with open(srt_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()

        blocks = content.strip().split("\n\n")
        segments = []
        full_text_list = []
        
        for idx, block in enumerate(blocks):
            lines = block.splitlines()
            if len(lines) >= 3:
                # 00:01:20,000 --> 00:01:24,500
                time_match = re.match(r"(\d+):(\d+):(\d+)[,\.](\d+)\s*-->\s*(\d+):(\d+):(\d+)[,\.](\d+)", lines[1])
                if time_match:
                    g = [int(x) for x in time_match.groups()]
                    start_sec = g[0]*3600 + g[1]*60 + g[2] + g[3]/1000.0
                    end_sec = g[4]*3600 + g[5]*60 + g[6] + g[7]/1000.0
                    text = " ".join(lines[2:]).strip()
                    
                    # Estimate word timestamps evenly
                    words = text.split()
                    word_list = []
                    if words:
                        step = (end_sec - start_sec) / len(words)
                        for w_i, w in enumerate(words):
                            word_list.append({
                                "word": w,
                                "start": round(start_sec + (w_i * step), 2),
                                "end": round(start_sec + ((w_i + 1) * step), 2),
                                "probability": 1.0
                            })
                            
                    segments.append({
                        "id": idx,
                        "start": round(start_sec, 2),
                        "end": round(end_sec, 2),
                        "text": text,
                        "words": word_list
                    })
                    full_text_list.append(text)

        return {
            "segments": segments,
            "full_text": " ".join(full_text_list),
            "summary_transcript": TranscriptionService.format_for_llm(segments)
        }
