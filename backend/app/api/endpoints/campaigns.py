from fastapi import APIRouter, HTTPException
from typing import List
from app.models.schemas import Campaign, CampaignCreate
from app.core.database import Database
import uuid

router = APIRouter()

@router.get("/", response_model=List[Campaign])
def list_campaigns():
    """List all available Konten.com campaigns with rules and CPM rates."""
    return Database.get_campaigns()

@router.get("/{campaign_id}", response_model=Campaign)
def get_campaign(campaign_id: str):
    campaign = Database.get_campaign(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign tidak ditemukan")
    return campaign

@router.post("/", response_model=Campaign)
def create_campaign(camp_in: CampaignCreate):
    camp_dict = camp_in.model_dump()
    camp_dict["id"] = f"camp-{str(uuid.uuid4())[:8]}"
    camp_dict["created_at"] = "2026-10-31T00:00:00"
    
    conn = Database.get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO campaigns (
        id, name, brand_name, cpm_rate, min_views_threshold, min_clip_duration,
        max_clip_duration, required_tags, caption_template, mandatory_outro_required,
        mandatory_outro_file, dos_and_donts_rules, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        camp_dict["id"], camp_dict["name"], camp_dict["brand_name"], camp_dict["cpm_rate"],
        camp_dict["min_views_threshold"], camp_dict["min_clip_duration"], camp_dict["max_clip_duration"],
        camp_dict["required_tags"], camp_dict.get("caption_template"), 1 if camp_dict["mandatory_outro_required"] else 0,
        camp_dict.get("mandatory_outro_file"), camp_dict.get("dos_and_donts_rules"), camp_dict["created_at"]
    ))
    conn.commit()
    conn.close()
    return camp_dict
