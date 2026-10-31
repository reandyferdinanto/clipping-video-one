import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent.parent
STORAGE_DIR = BASE_DIR / "storage"

class Settings(BaseSettings):
    PROJECT_NAME: str = "Smart Auto-Clipper Studio - Konten.com"
    API_V1_STR: str = "/api/v1"
    
    # Storage directories
    STORAGE_DIR: Path = STORAGE_DIR
    RAW_DIR: Path = STORAGE_DIR / "raw"
    PROCESSED_DIR: Path = STORAGE_DIR / "processed"
    SUBTITLES_DIR: Path = STORAGE_DIR / "subtitles"
    POSTERS_DIR: Path = STORAGE_DIR / "posters"
    
    # AI Credentials
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    
    # FFmpeg executable (default to PATH)
    FFMPEG_PATH: str = os.getenv("FFMPEG_PATH", "ffmpeg")
    
    # Whisper Model (default 'base' or 'small' for speed)
    WHISPER_MODEL_SIZE: str = os.getenv("WHISPER_MODEL_SIZE", "base")
    
    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()

# Ensure directories exist
for folder in [settings.RAW_DIR, settings.PROCESSED_DIR, settings.SUBTITLES_DIR, settings.POSTERS_DIR]:
    folder.mkdir(parents=True, exist_ok=True)
