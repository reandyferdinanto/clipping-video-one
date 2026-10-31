from typing import List, Optional, Literal
from pydantic import BaseModel, Field
from datetime import datetime

# ==================== CAMPAIGN MODELS ====================
class CampaignBase(BaseModel):
    name: str = Field(..., description="Nama campaign, contoh: Awal Mula Hamka Vol. 3")
    brand_name: str = Field(..., description="Nama brand/penerbit, contoh: Falcon Pictures")
    cpm_rate: int = Field(2000, description="Tarif CPM per 1.000 views")
    min_views_threshold: int = Field(1000, description="Batas minimum views agar mulai dibayar")
    min_clip_duration: int = Field(30, description="Durasi minimal video klip (detik)")
    max_clip_duration: int = Field(60, description="Durasi maksimal video klip (detik)")
    required_tags: str = Field(..., description="Hashtag wajib, contoh: #awalmulahamka #buyahamka #kontenfchamka")
    caption_template: Optional[str] = Field(None, description="Template caption rekomendasi")
    mandatory_outro_required: bool = Field(True, description="Apakah wajib menyertakan poster/CTA di akhir video")
    mandatory_outro_file: Optional[str] = Field(None, description="Path atau filename poster wajib")
    dos_and_donts_rules: Optional[str] = Field(
        "Dilarang menggunakan hook kontroversial, SARA, hoaks, atau politik. Wajib poster di akhir.",
        description="Aturan brief untuk panduan AI"
    )

class CampaignCreate(CampaignBase):
    pass

class Campaign(CampaignBase):
    id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

# ==================== TRANSCRIPT MODELS ====================
class WordTimestamp(BaseModel):
    word: str
    start: float
    end: float
    probability: Optional[float] = 1.0

class TranscriptSegment(BaseModel):
    id: int
    start: float
    end: float
    text: str
    words: List[WordTimestamp] = []

class TranscriptData(BaseModel):
    segments: List[TranscriptSegment] = []
    full_text: str = ""

# ==================== INGESTION & SOURCE VIDEO ====================
class IngestRequest(BaseModel):
    source_type: Literal["YOUTUBE", "GDRIVE", "FILE"]
    source_url: Optional[str] = None
    campaign_id: Optional[str] = None

class SourceVideo(BaseModel):
    id: str
    campaign_id: Optional[str] = None
    title: str
    source_type: str
    source_url: Optional[str] = None
    local_path: str
    duration_seconds: float = 0
    transcript: Optional[TranscriptData] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

# ==================== CLIP CURATION & EDITING ====================
class ClipCurationSuggestion(BaseModel):
    start_time: float = Field(..., description="Detik mulai segmen")
    end_time: float = Field(..., description="Detik selesai segmen")
    hook_text: str = Field(..., description="Teks hook di 0-3 detik awal")
    virality_score: int = Field(..., description="Estimasi skor viralitas 1-100")
    compliance_reason: str = Field(..., description="Alasan klip patuh brief brand")

class ClipCreate(BaseModel):
    source_video_id: str
    title: str
    start_time: float
    end_time: float
    hook_text: str
    layout_mode: Literal["BLUR_BG", "CENTER_CROP", "SPLIT"] = "BLUR_BG"
    outro_enabled: bool = True
    custom_outro_file: Optional[str] = None
    custom_transcript: Optional[List[TranscriptSegment]] = None

class Clip(BaseModel):
    id: str
    source_video_id: str
    title: str
    start_time: float
    end_time: float
    hook_text: str
    virality_score: int = 85
    layout_mode: Literal["BLUR_BG", "CENTER_CROP", "SPLIT"] = "BLUR_BG"
    outro_enabled: bool = True
    custom_outro_file: Optional[str] = None
    output_video_path: Optional[str] = None
    preview_video_path: Optional[str] = None
    status: Literal["DRAFT", "PROCESSING", "COMPLETED", "FAILED"] = "DRAFT"
    submission_url: Optional[str] = None
    verified_views: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)

# ==================== RENDER & EXPORT ====================
class RenderOptions(BaseModel):
    layout_mode: Literal["BLUR_BG", "CENTER_CROP", "SPLIT"] = "BLUR_BG"
    burn_subtitles: bool = True
    subtitle_style: Literal["TIKTOK_KARAOKE", "MINIMAL_WHITE", "BOXED"] = "TIKTOK_KARAOKE"
    outro_enabled: bool = True
    outro_duration_seconds: float = 3.0
    remove_silence: bool = False
