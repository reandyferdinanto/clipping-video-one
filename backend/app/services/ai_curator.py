import json
import os
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from app.core.config import settings

class ClipSuggestion(BaseModel):
    start_time: float = Field(..., description="Waktu mulai dalam detik")
    end_time: float = Field(..., description="Waktu selesai dalam detik")
    hook_text: str = Field(..., description="Kalimat pembuka 0-3 detik")
    virality_score: int = Field(..., description="Skor viralitas 1-100")
    compliance_reason: str = Field(..., description="Alasan klip patuh terhadap brief brand")

class AICuratorService:
    @staticmethod
    def curate_segments(
        summary_transcript: str, 
        campaign_info: Optional[Dict[str, Any]] = None,
        min_duration: int = 25,
        max_duration: int = 55
    ) -> List[Dict[str, Any]]:
        """Curate top 3-5 clips using Gemini Flash, strictly adhering to Konten.com rules."""
        api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")
        
        # Fallback heuristic if API key is not yet set
        if not api_key:
            return AICuratorService._heuristic_fallback(summary_transcript, min_duration, max_duration)

        campaign_name = campaign_info.get("name", "Campaign Umum") if campaign_info else "Campaign Umum"
        brand_name = campaign_info.get("brand_name", "") if campaign_info else ""
        rules = campaign_info.get("dos_and_donts_rules", "Dilarang hook kontroversial, SARA, hoaks, politik.") if campaign_info else ""
        
        system_instruction = f"""
        Kamu adalah AI Video Editor & Producer khusus platform Konten.com untuk brand '{brand_name}' ({campaign_name}).
        Tugasmu adalah menganalisis transkrip dan memilih 3 hingga 5 segmen klip terbaik berdurasi pendek untuk TikTok/Reels/Shorts.

        SYARAT WAJIB KONTEN.COM & BRIEF BRAND:
        1. Durasi tiap segmen klip HARUS antara {min_duration} hingga {max_duration} detik.
        2. Detik 0 hingga 3 WAJIB memiliki 'Hook' kuat (curiosity gap, fakta menarik, atau kutipan inspiratif).
        3. DILARANG KERAS: Memilih hook berbau kontroversi SARA, hoaks, politik, atau clickbait palsu.
        4. Brief Khusus Brand: {rules}
        5. Segmen harus memiliki alur cerita yang tuntas (tidak terpotong di tengah kalimat).
        """

        prompt = f"""
        Analisis transkrip berikut dan berikan rekomendasi 3-5 klip terbaik dalam format JSON:

        TRANSKRIP LENGKAP:
        {summary_transcript}
        """

        try:
            from google import genai
            client = genai.Client(api_key=api_key)
            response = client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=prompt,
                config={
                    "system_instruction": system_instruction,
                    "response_mime_type": "application/json",
                    "response_schema": list[ClipSuggestion],
                    "temperature": 0.25,
                }
            )
            
            # Parse output
            if response.parsed:
                return [item.model_dump() for item in response.parsed]
            elif response.text:
                return json.loads(response.text)
        except Exception as e:
            print(f"Gemini Curation error: {e}, falling back to heuristic curation.")
            return AICuratorService._heuristic_fallback(summary_transcript, min_duration, max_duration)

        return AICuratorService._heuristic_fallback(summary_transcript, min_duration, max_duration)

    @staticmethod
    def _heuristic_fallback(summary_transcript: str, min_duration: int, max_duration: int) -> List[Dict[str, Any]]:
        """Fallback segment generator when Gemini API key is not configured."""
        lines = summary_transcript.strip().splitlines()
        if not lines:
            return [{
                "start_time": 0.0,
                "end_time": float(min_duration + 5),
                "hook_text": "Poin menarik yang harus kamu ketahui!",
                "virality_score": 85,
                "compliance_reason": "Klip awal pembuka (Heuristic default)"
            }]
            
        suggestions = []
        # Create 3 default clips from available transcript
        step = max(1, len(lines) // 4)
        for i in range(min(3, len(lines))):
            target_idx = i * step
            line = lines[target_idx]
            # Try parsing timestamp [mm:ss - mm:ss]
            import re
            m = re.match(r"\[(\d+):(\d+)\s*-\s*(\d+):(\d+)\]\s*(.*)", line)
            if m:
                s_min, s_sec, e_min, e_sec, text = m.groups()
                start_sec = float(int(s_min)*60 + int(s_sec))
                end_sec = start_sec + float(min_duration + 10)
                hook = (text[:60] + "...") if len(text) > 60 else text
            else:
                start_sec = float(i * (min_duration + 5))
                end_sec = start_sec + float(min_duration + 10)
                hook = "Momen penting dalam video ini..."

            suggestions.append({
                "start_time": start_sec,
                "end_time": end_sec,
                "hook_text": hook or "Momen penting dalam video ini",
                "virality_score": 88 - (i * 3),
                "compliance_reason": f"Segmen berdurasi {int(end_sec - start_sec)}s dengan kalimat pembuka relevan"
            })
            
        return suggestions
