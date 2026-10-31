import json
import sqlite3
from pathlib import Path
from typing import List, Optional, Dict, Any
from app.core.config import settings

DB_PATH = settings.STORAGE_DIR / "app.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 1. Campaigns table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS campaigns (
        id TEXT PRIMARY KEY,
        slug TEXT,
        name TEXT NOT NULL,
        brand_name TEXT NOT NULL,
        cpm_rate INTEGER NOT NULL,
        min_views_threshold INTEGER DEFAULT 1000,
        min_clip_duration INTEGER DEFAULT 30,
        max_clip_duration INTEGER DEFAULT 60,
        required_tags TEXT NOT NULL,
        caption_template TEXT,
        mandatory_outro_required INTEGER DEFAULT 1,
        mandatory_outro_file TEXT,
        dos_and_donts_rules TEXT,
        cta_text TEXT,
        thumbnail_url TEXT,
        materials_json TEXT,
        created_at TEXT NOT NULL
    );
    """)

    # Check and add any missing columns in existing db table
    cursor.execute("PRAGMA table_info(campaigns)")
    existing_cols = [c[1] for c in cursor.fetchall()]
    for col_name, col_type in [
        ("slug", "TEXT"),
        ("cta_text", "TEXT"),
        ("thumbnail_url", "TEXT"),
        ("materials_json", "TEXT")
    ]:
        if col_name not in existing_cols:
            try:
                cursor.execute(f"ALTER TABLE campaigns ADD COLUMN {col_name} {col_type}")
            except Exception:
                pass
    
    # 2. Source Videos table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS source_videos (
        id TEXT PRIMARY KEY,
        campaign_id TEXT,
        title TEXT NOT NULL,
        source_type TEXT NOT NULL,
        source_url TEXT,
        local_path TEXT NOT NULL,
        duration_seconds REAL DEFAULT 0,
        transcript_json TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (campaign_id) REFERENCES campaigns (id)
    );
    """)
    
    # 3. Clips table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS clips (
        id TEXT PRIMARY KEY,
        source_video_id TEXT NOT NULL,
        title TEXT NOT NULL,
        start_time REAL NOT NULL,
        end_time REAL NOT NULL,
        hook_text TEXT,
        virality_score INTEGER DEFAULT 85,
        layout_mode TEXT DEFAULT 'BLUR_BG',
        outro_enabled INTEGER DEFAULT 1,
        custom_outro_file TEXT,
        output_video_path TEXT,
        preview_video_path TEXT,
        status TEXT DEFAULT 'DRAFT',
        submission_url TEXT,
        verified_views INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (source_video_id) REFERENCES source_videos (id)
    );
    """)
    
    conn.commit()
    conn.close()

class Database:
    @staticmethod
    def get_connection():
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn

    # Campaigns
    @staticmethod
    def get_campaigns() -> List[Dict[str, Any]]:
        conn = Database.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM campaigns ORDER BY created_at DESC")
        rows = []
        for r in cursor.fetchall():
            d = dict(r)
            if d.get("materials_json"):
                d["materials"] = json.loads(d["materials_json"])
            else:
                d["materials"] = []
            rows.append(d)
        conn.close()
        return rows

    @staticmethod
    def get_campaign(campaign_id: str) -> Optional[Dict[str, Any]]:
        conn = Database.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM campaigns WHERE id = ? OR slug = ?", (campaign_id, campaign_id))
        row = cursor.fetchone()
        conn.close()
        if not row:
            return None
        d = dict(row)
        if d.get("materials_json"):
            d["materials"] = json.loads(d["materials_json"])
        else:
            d["materials"] = []
        return d

    @staticmethod
    def save_campaign(camp_dict: Dict[str, Any]):
        conn = Database.get_connection()
        cursor = conn.cursor()
        cursor.execute("""
        INSERT OR REPLACE INTO campaigns (
            id, slug, name, brand_name, cpm_rate, min_views_threshold, min_clip_duration,
            max_clip_duration, required_tags, caption_template, mandatory_outro_required,
            mandatory_outro_file, dos_and_donts_rules, cta_text, thumbnail_url,
            materials_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            camp_dict["id"],
            camp_dict.get("slug"),
            camp_dict["name"],
            camp_dict["brand_name"],
            camp_dict.get("cpm_rate", 2000),
            camp_dict.get("min_views_threshold", 1000),
            camp_dict.get("min_clip_duration", 30),
            camp_dict.get("max_clip_duration", 60),
            camp_dict.get("required_tags", "#kontencom"),
            camp_dict.get("caption_template"),
            1 if camp_dict.get("mandatory_outro_required", True) else 0,
            camp_dict.get("mandatory_outro_file"),
            camp_dict.get("dos_and_donts_rules"),
            camp_dict.get("cta_text"),
            camp_dict.get("thumbnail_url"),
            json.dumps(camp_dict.get("materials", [])),
            camp_dict.get("created_at")
        ))
        conn.commit()
        conn.close()

    # Source Videos
    @staticmethod
    def save_source_video(video_dict: Dict[str, Any]):
        conn = Database.get_connection()
        cursor = conn.cursor()
        cursor.execute("""
        INSERT OR REPLACE INTO source_videos (
            id, campaign_id, title, source_type, source_url, local_path,
            duration_seconds, transcript_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            video_dict["id"],
            video_dict.get("campaign_id"),
            video_dict["title"],
            video_dict["source_type"],
            video_dict.get("source_url"),
            video_dict["local_path"],
            video_dict.get("duration_seconds", 0),
            json.dumps(video_dict.get("transcript")) if video_dict.get("transcript") else None,
            video_dict.get("created_at")
        ))
        conn.commit()
        conn.close()

    @staticmethod
    def get_source_video(video_id: str) -> Optional[Dict[str, Any]]:
        conn = Database.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM source_videos WHERE id = ?", (video_id,))
        row = cursor.fetchone()
        conn.close()
        if not row:
            return None
        res = dict(row)
        if res.get("transcript_json"):
            res["transcript"] = json.loads(res["transcript_json"])
        return res

    @staticmethod
    def get_source_videos(campaign_id: Optional[str] = None) -> List[Dict[str, Any]]:
        conn = Database.get_connection()
        cursor = conn.cursor()
        if campaign_id:
            cursor.execute("SELECT * FROM source_videos WHERE campaign_id = ? ORDER BY created_at DESC", (campaign_id,))
        else:
            cursor.execute("SELECT * FROM source_videos ORDER BY created_at DESC")
        rows = []
        for r in cursor.fetchall():
            res = dict(r)
            if res.get("transcript_json"):
                res["transcript"] = json.loads(res["transcript_json"])
            rows.append(res)
        conn.close()
        return rows

    # Clips
    @staticmethod
    def save_clip(clip_dict: Dict[str, Any]):
        conn = Database.get_connection()
        cursor = conn.cursor()
        cursor.execute("""
        INSERT OR REPLACE INTO clips (
            id, source_video_id, title, start_time, end_time, hook_text,
            virality_score, layout_mode, outro_enabled, custom_outro_file,
            output_video_path, preview_video_path, status, submission_url,
            verified_views, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            clip_dict["id"],
            clip_dict["source_video_id"],
            clip_dict["title"],
            clip_dict["start_time"],
            clip_dict["end_time"],
            clip_dict.get("hook_text", ""),
            clip_dict.get("virality_score", 85),
            clip_dict.get("layout_mode", "BLUR_BG"),
            1 if clip_dict.get("outro_enabled", True) else 0,
            clip_dict.get("custom_outro_file"),
            clip_dict.get("output_video_path"),
            clip_dict.get("preview_video_path"),
            clip_dict.get("status", "DRAFT"),
            clip_dict.get("submission_url"),
            clip_dict.get("verified_views", 0),
            clip_dict.get("created_at")
        ))
        conn.commit()
        conn.close()

    @staticmethod
    def get_clips_for_video(video_id: str) -> List[Dict[str, Any]]:
        conn = Database.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM clips WHERE source_video_id = ? ORDER BY start_time ASC", (video_id,))
        rows = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return rows

    @staticmethod
    def get_clip(clip_id: str) -> Optional[Dict[str, Any]]:
        conn = Database.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM clips WHERE id = ?", (clip_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None
