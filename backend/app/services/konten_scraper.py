import re
import requests
from typing import Dict, Any, List, Optional
from datetime import datetime

class KontenScraperService:
    BASE_API = "https://gateway.konten.com/api"
    HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Referer": "https://konten.com/"
    }

    @staticmethod
    def extract_slug(url_or_slug: str) -> str:
        """Extract clean campaign slug from full URL or bare slug."""
        clean = url_or_slug.strip().rstrip("/")
        # Matches https://konten.com/campaigns/<slug> or https://konten.com/campaigns/<slug>/brief
        m = re.search(r"konten\.com/campaigns/([^/]+)", clean)
        if m:
            return m.group(1)
        # Or remove any remaining path segments
        return clean.split("/")[-1]

    @classmethod
    def fetch_campaign_detail(cls, url_or_slug: str) -> Dict[str, Any]:
        """Fetch real-time structured campaign and brief data from Konten.com API."""
        slug = cls.extract_slug(url_or_slug)
        api_url = f"{cls.BASE_API}/campaigns/{slug}"
        
        resp = requests.get(api_url, headers=cls.HEADERS, timeout=12)
        if resp.status_code != 200:
            raise ValueError(f"Gagal mengambil campaign '{slug}' dari Konten.com (Status: {resp.status_code})")

        data = resp.json()
        camp = data.get("campaign", {})
        brief = camp.get("brief_detail", {})

        # Parse Hashtags
        raw_hashtags = brief.get("hashtags") or camp.get("hashtags") or []
        formatted_tags = " ".join([f"#{t.lstrip('#')}" for t in raw_hashtags if t])
        if not formatted_tags:
            formatted_tags = "#kontencom #clipper"

        # Parse CPM Rate (Priority: TikTok -> Instagram -> Base)
        cpm = camp.get("cpm_tiktok") or camp.get("cpm_instagram") or camp.get("rate_per_million") or 2000

        # Parse Durations
        dur_min = int(brief.get("durasiMin") or camp.get("min_video_duration") or 20)
        dur_max = int(brief.get("durasiMax") or 60)

        # Parse Materials (Drive links, YouTube links, Posters, etc.)
        materials_raw = brief.get("materi", [])
        clean_materials = []
        poster_candidate = None

        for m in materials_raw:
            m_title = m.get("title", "")
            m_url = m.get("url", "")
            if not m_url:
                continue

            clean_materials.append({
                "title": m_title,
                "url": m_url
            })

            # Detect mandatory poster
            if any(k in m_title.lower() for k in ["poster", "banner", "flyer", "outro"]):
                poster_candidate = m_url

        # Combine Do's and Don'ts into rules text
        dilarang = brief.get("dilarangDilakukan", [])
        boleh = brief.get("bolehDilakukan", [])
        elemen = brief.get("elemenWajib", "")
        cta = brief.get("cta", "")
        
        rules_parts = []
        if elemen:
            rules_parts.append(f"ELEMEN WAJIB: {elemen.strip()}")
        if cta:
            rules_parts.append(f"CTA WAJIB DI AKHIR: {cta.strip()}")
        if dilarang:
            clean_dilarang = "\n".join([f"- {d.lstrip('- ')}" for d in dilarang if d.strip()])
            rules_parts.append(f"DILARANG:\n{clean_dilarang}")
        if boleh:
            clean_boleh = "\n".join([f"- {b.lstrip('- ')}" for b in boleh if b.strip()])
            rules_parts.append(f"DIPERBOLEHKAN:\n{clean_boleh}")

        full_rules = "\n\n".join(rules_parts) or "Patuhi brief brand dan aturan komunitas Konten.com."

        return {
            "id": f"camp-{slug}",
            "slug": slug,
            "name": camp.get("title", slug),
            "brand_name": camp.get("brand", "Official Brand"),
            "category": camp.get("category", "General"),
            "cpm_rate": int(cpm),
            "min_views_threshold": int(camp.get("min_views") or 1000),
            "min_clip_duration": dur_min,
            "max_clip_duration": dur_max,
            "required_tags": formatted_tags,
            "caption_template": brief.get("captionWajib") or brief.get("caption") or f"Tonton sampai habis! {formatted_tags}",
            "mandatory_outro_required": bool(poster_candidate or cta),
            "mandatory_outro_file": poster_candidate,
            "dos_and_donts_rules": full_rules,
            "cta_text": cta,
            "materials": clean_materials,
            "thumbnail_url": camp.get("thumbnail_url"),
            "created_at": camp.get("created_at") or datetime.utcnow().isoformat()
        }

    @classmethod
    def list_active_campaigns(cls, limit: int = 40) -> List[Dict[str, Any]]:
        """Fetch list of active campaigns from Konten.com API."""
        api_url = f"{cls.BASE_API}/campaigns"
        resp = requests.get(api_url, headers=cls.HEADERS, timeout=12)
        if resp.status_code != 200:
            return []

        data = resp.json()
        campaigns = data.get("campaigns", [])
        
        active_list = []
        for c in campaigns:
            if c.get("status") == "active":
                cpm = c.get("cpm_tiktok") or c.get("cpm_instagram") or c.get("rate_per_million") or 2000
                active_list.append({
                    "id": f"camp-{c.get('slug')}",
                    "slug": c.get("slug"),
                    "name": c.get("title"),
                    "brand_name": c.get("brand"),
                    "cpm_rate": int(cpm),
                    "min_views_threshold": int(c.get("min_views") or 1000),
                    "category": c.get("category", "General"),
                    "platforms": c.get("platform", []),
                    "thumbnail_url": c.get("thumbnail_url"),
                    "budget_left_percent": c.get("budget_bar_percent_override", 100)
                })
                if len(active_list) >= limit:
                    break

        return active_list
