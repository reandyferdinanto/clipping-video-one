import axios from 'axios';
import { Campaign, SourceVideo, Clip, RenderOptions } from '../types';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiService = {
  // Campaigns
  getCampaigns: async (): Promise<Campaign[]> => {
    const res = await api.get('/campaigns/');
    return res.data;
  },
  getCampaign: async (id: string): Promise<Campaign> => {
    const res = await api.get(`/campaigns/${id}`);
    return res.data;
  },
  importCampaignByUrl: async (url: string): Promise<Campaign> => {
    const res = await api.post('/campaigns/fetch-by-url', { url });
    return res.data;
  },
  syncKontenCampaigns: async (): Promise<{ status: string; message: string; synced_campaigns: string[] }> => {
    const res = await api.post('/campaigns/sync-konten');
    return res.data;
  },

  // Ingestion
  ingestUrl: async (url: string, sourceType: 'YOUTUBE' | 'GDRIVE', campaignId?: string): Promise<SourceVideo> => {
    const res = await api.post('/ingest/url', {
      source_type: sourceType,
      source_url: url,
      campaign_id: campaignId,
    });
    return res.data;
  },
  uploadVideo: async (file: File, campaignId?: string): Promise<SourceVideo> => {
    const formData = new FormData();
    formData.append('file', file);
    if (campaignId) formData.append('campaign_id', campaignId);
    const res = await api.post('/ingest/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  getSourceVideo: async (id: string): Promise<SourceVideo> => {
    const res = await api.get(`/ingest/${id}`);
    return res.data;
  },

  // Clips
  curateClips: async (videoId: string): Promise<Clip[]> => {
    const res = await api.post(`/clips/curate/${videoId}`);
    return res.data;
  },
  getClipsForVideo: async (videoId: string): Promise<Clip[]> => {
    const res = await api.get(`/clips/by-video/${videoId}`);
    return res.data;
  },
  getClip: async (clipId: string): Promise<Clip> => {
    const res = await api.get(`/clips/${clipId}`);
    return res.data;
  },
  updateClip: async (clipId: string, data: Partial<Clip>): Promise<Clip> => {
    const res = await api.put(`/clips/${clipId}`, data);
    return res.data;
  },

  // Render
  renderClip: async (clipId: string, options: RenderOptions): Promise<Clip> => {
    const res = await api.post(`/render/${clipId}`, options);
    return res.data;
  },
};
