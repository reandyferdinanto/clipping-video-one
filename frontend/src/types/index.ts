export interface CampaignMaterial {
  title: string;
  url: string;
}

export interface Campaign {
  id: string;
  name: string;
  brand_name: string;
  cpm_rate: number;
  min_views_threshold: number;
  min_clip_duration: number;
  max_clip_duration: number;
  required_tags: string;
  caption_template?: string;
  mandatory_outro_required: boolean;
  mandatory_outro_file?: string;
  dos_and_donts_rules?: string;
  cta_text?: string;
  slug?: string;
  thumbnail_url?: string;
  materials?: CampaignMaterial[];
  created_at: string;
}

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
  probability?: number;
}

export interface TranscriptSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  words: WordTimestamp[];
}

export interface TranscriptData {
  segments: TranscriptSegment[];
  full_text: string;
  summary_transcript?: string;
}

export interface SourceVideo {
  id: string;
  campaign_id?: string;
  title: string;
  source_type: 'YOUTUBE' | 'GDRIVE' | 'UPLOAD';
  source_url?: string;
  local_path: string;
  duration_seconds: number;
  transcript?: TranscriptData;
  created_at: string;
}

export interface Clip {
  id: string;
  source_video_id: string;
  title: string;
  start_time: number;
  end_time: number;
  hook_text: string;
  virality_score: number;
  layout_mode: 'BLUR_BG' | 'CENTER_CROP' | 'SPLIT';
  outro_enabled: boolean;
  custom_outro_file?: string;
  output_video_path?: string;
  preview_video_path?: string;
  status: 'DRAFT' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  submission_url?: string;
  verified_views: number;
  created_at: string;
}

export interface RenderOptions {
  layout_mode: 'BLUR_BG' | 'CENTER_CROP' | 'SPLIT';
  burn_subtitles: boolean;
  subtitle_style: 'TIKTOK_KARAOKE' | 'MINIMAL_WHITE' | 'BOXED';
  outro_enabled: boolean;
  outro_duration_seconds: number;
  remove_silence: boolean;
}
