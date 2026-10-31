from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import List, Dict, Any
from app.models.schemas import Campaign, CampaignCreate, CampaignImportRequest
from app.core.database import Database
from app.services.konten_scraper import KontenScraperService
import uuid

router = APIRouter()

@router.get("/", response_model=List[Campaign])
def list_campaigns():
    """List all available Konten.com campaigns with rules, materials, and CPM rates."""
    return Database.get_campaigns()

@router.get("/{campaign_id}", response_model=Campaign)
def get_campaign(campaign_id: str):
    campaign = Database.get_campaign(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign tidak ditemukan")
    return campaign

@router.post("/fetch-by-url", response_model=Campaign)
def import_campaign_by_url(req: CampaignImportRequest):
    """
    Import and scrape full campaign brief, materials, and rules in real-time
    directly from Konten.com URL or slug.
    """
    try:
        camp_dict = KontenScraperService.fetch_campaign_detail(req.url)
        Database.save_campaign(camp_dict)
        return camp_dict
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Gagal import campaign: {str(e)}")

@router.post("/sync-konten")
def sync_konten_campaigns():
    """
    1-Click Sync: Fetch all active campaigns from Konten.com API and save them locally.
    """
    try:
        active_list = KontenScraperService.list_active_campaigns(limit=25)
        synced = []
        for item in active_list:
            slug = item.get("slug")
            if not slug:
                continue
            try:
                detail = KontenScraperService.fetch_campaign_detail(slug)
                Database.save_campaign(detail)
                synced.append(detail["name"])
            except Exception as e:
                print(f"Skipping campaign {slug}: {e}")

        return {
            "status": "success",
            "message": f"Berhasil mensinkronkan {len(synced)} campaign aktif dari Konten.com",
            "synced_campaigns": synced
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal sinkronisasi: {str(e)}")

@router.post("/", response_model=Campaign)
def create_campaign(camp_in: CampaignCreate):
    camp_dict = camp_in.model_dump()
    camp_dict["id"] = f"camp-{str(uuid.uuid4())[:8]}"
    camp_dict["created_at"] = "2026-10-31T00:00:00"
    Database.save_campaign(camp_dict)
    return camp_dict
