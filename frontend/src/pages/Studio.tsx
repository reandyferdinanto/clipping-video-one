import React, { useState, useEffect } from 'react';
import { 
  Video, UploadCloud, Sparkles, Sliders, Download, Film, 
  Layers, CheckCircle2, AlertCircle, RefreshCw 
} from 'lucide-react';
import { apiService } from '../api/client';
import { Campaign, SourceVideo, Clip, RenderOptions } from '../types';
import { VideoPlayer916 } from '../components/VideoPlayer916';
import { TranscriptEditor } from '../components/TranscriptEditor';
import { SubmissionCard } from '../components/SubmissionCard';
import { message, Spin } from 'antd';

export const Studio: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  
  // Ingestion inputs
  const [urlInput, setUrlInput] = useState('');
  const [isProcessingIngest, setIsProcessingIngest] = useState(false);
  
  // Current active data
  const [sourceVideo, setSourceVideo] = useState<SourceVideo | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [selectedClip, setSelectedClip] = useState<Clip | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  // Render options
  const [layoutMode, setLayoutMode] = useState<'BLUR_BG' | 'CENTER_CROP' | 'SPLIT'>('BLUR_BG');
  const [outroEnabled, setOutroEnabled] = useState(true);
  const [isRendering, setIsRendering] = useState(false);

  // Load campaigns on mount
  useEffect(() => {
    apiService.getCampaigns().then((data) => {
      setCampaigns(data);
      if (data.length > 0) setSelectedCampaignId(data[0].id);
    });
  }, []);

  const activeCampaign = campaigns.find((c) => c.id === selectedCampaignId);

  // Handle URL fetch
  const handleFetchUrl = async () => {
    if (!urlInput.trim()) {
      message.warning('Masukkan URL YouTube atau Google Drive terlebih dahulu!');
      return;
    }

    setIsProcessingIngest(true);
    try {
      const type = urlInput.includes('drive.google.com') ? 'GDRIVE' : 'YOUTUBE';
      const video = await apiService.ingestUrl(urlInput, type, selectedCampaignId);
      setSourceVideo(video);
      message.success('Materi berhasil diunduh! Sedang memproses transkrip otomatis...');

      // Polling for transcription completion
      const pollInterval = setInterval(async () => {
        const updated = await apiService.getSourceVideo(video.id);
        if (updated.transcript && updated.transcript.segments.length > 0) {
          clearInterval(pollInterval);
          setSourceVideo(updated);
          message.success('Transkrip selesai! Menjalankan AI Curation...');
          handleCurateClips(updated.id);
        }
      }, 3000);
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Gagal memproses URL');
    } finally {
      setIsProcessingIngest(false);
    }
  };

  // Handle AI Curate Clips
  const handleCurateClips = async (videoId: string) => {
    try {
      const curatedClips = await apiService.curateClips(videoId);
      setClips(curatedClips);
      if (curatedClips.length > 0) {
        setSelectedClip(curatedClips[0]);
      }
      message.success(`Ditemukan ${curatedClips.length} klip berpotensi tinggi!`);
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Gagal kurasi klip');
    }
  };

  // Handle Render
  const handleTriggerRender = async () => {
    if (!selectedClip) return;
    setIsRendering(true);
    
    const options: RenderOptions = {
      layout_mode: layoutMode,
      burn_subtitles: true,
      subtitle_style: 'TIKTOK_KARAOKE',
      outro_enabled: outroEnabled,
      outro_duration_seconds: 3.0,
      remove_silence: false,
    };

    try {
      await apiService.renderClip(selectedClip.id, options);
      message.loading('Sedang merender video 9:16 + Subtitle Safe Zone...', 3);

      // Poll for render status
      const interval = setInterval(async () => {
        const updated = await apiService.getClip(selectedClip.id);
        if (updated.status === 'COMPLETED') {
          clearInterval(interval);
          setIsRendering(false);
          setSelectedClip(updated);
          // Update in clips list
          setClips((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
          message.success('Video selesai dirender! Siap diunduh.');
        } else if (updated.status === 'FAILED') {
          clearInterval(interval);
          setIsRendering(false);
          message.error('Proses render gagal');
        }
      }, 3000);
    } catch (err: any) {
      setIsRendering(false);
      message.error(err.response?.data?.detail || 'Gagal memulai render');
    }
  };

  const handleUpdateSubmissionUrl = async (url: string) => {
    if (!selectedClip) return;
    try {
      const updated = await apiService.updateClip(selectedClip.id, { submission_url: url });
      setSelectedClip(updated);
      message.success('Link submission berhasil disimpan ke database!');
    } catch (err: any) {
      message.error('Gagal menyimpan link submission');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Top Banner: Ingestion & Campaign Presets */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg backdrop-blur-md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Campaign Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Pilih Campaign Konten.com:
            </label>
            <select
              value={selectedCampaignId}
              onChange={(e) => setSelectedCampaignId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-indigo-500"
            >
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.brand_name} - {c.name} (Rp {c.cpm_rate.toLocaleString('id-ID')}/1K)
                </option>
              ))}
            </select>
          </div>

          {/* URL Input */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Input URL YouTube / Google Drive Materi Brand:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="https://www.youtube.com/watch?v=... atau https://drive.google.com/..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-indigo-500"
              />
              <button
                onClick={handleFetchUrl}
                disabled={isProcessingIngest}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20"
              >
                {isProcessingIngest ? <Spin size="small" /> : <Sparkles size={14} />}
                {isProcessingIngest ? 'Mengunduh...' : 'Analyze & Curate'}
              </button>
            </div>
          </div>
        </div>

        {/* Campaign Info Bar */}
        {activeCampaign && (
          <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <div className="flex items-center gap-3">
              <span className="text-slate-300 font-semibold">{activeCampaign.name}</span>
              <span className="bg-indigo-950/60 border border-indigo-800 text-indigo-400 px-2 py-0.5 rounded-full font-mono text-[11px]">
                Target: {activeCampaign.min_clip_duration}s - {activeCampaign.max_clip_duration}s
              </span>
              {activeCampaign.mandatory_outro_required && (
                <span className="bg-yellow-950/60 border border-yellow-800 text-yellow-400 px-2 py-0.5 rounded-full text-[11px]">
                  Wajib Poster Outro
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400">
              CPM: <strong className="text-emerald-400">Rp {activeCampaign.cpm_rate.toLocaleString('id-ID')}</strong> | Min Views: {activeCampaign.min_views_threshold.toLocaleString('id-ID')}
            </div>
          </div>
        )}
      </div>

      {/* Curated Clips Selector Pills */}
      {clips.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
            <Film size={14} className="text-indigo-400" /> Hasil Kurasi AI:
          </span>
          {clips.map((clip, index) => (
            <button
              key={clip.id}
              onClick={() => setSelectedClip(clip)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-2 transition-all ${
                selectedClip?.id === clip.id
                  ? 'bg-indigo-600 border-indigo-400 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <span>Klip #{index + 1}</span>
              <span className="font-mono text-[10px] opacity-80">
                {(clip.end_time - clip.start_time).toFixed(0)}s
              </span>
              <span className="bg-black/30 px-1.5 py-0.2 rounded text-[10px] text-yellow-300 font-bold">
                ★ {clip.virality_score}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Main 3-Column Studio Editor */}
      {sourceVideo && selectedClip ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Column 1: Transcript & Fine-tune Trimming (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Sliders size={13} className="text-indigo-400" /> Pengaturan Waktu Klip
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-slate-400">Detik Mulai:</label>
                  <input
                    type="number"
                    step="0.5"
                    value={selectedClip.start_time}
                    onChange={(e) =>
                      setSelectedClip({ ...selectedClip, start_time: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-1.5 font-mono text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400">Detik Selesai:</label>
                  <input
                    type="number"
                    step="0.5"
                    value={selectedClip.end_time}
                    onChange={(e) =>
                      setSelectedClip({ ...selectedClip, end_time: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-1.5 font-mono text-white"
                  />
                </div>
              </div>
              <div className="mt-2 text-right text-[11px] font-mono text-indigo-400">
                Total: {(selectedClip.end_time - selectedClip.start_time).toFixed(1)} Detik
              </div>
            </div>

            <TranscriptEditor
              segments={sourceVideo.transcript?.segments || []}
              clipStart={selectedClip.start_time}
              clipEnd={selectedClip.end_time}
              currentTime={currentTime}
            />
          </div>

          {/* Column 2: 9:16 Video Preview Canvas (4 cols) */}
          <div className="lg:col-span-4 flex flex-col items-center">
            <VideoPlayer916
              videoUrl={
                selectedClip.output_video_path ||
                `/storage/raw/${sourceVideo.local_path.split('\\').pop()?.split('/').pop()}`
              }
              startTime={selectedClip.start_time}
              endTime={selectedClip.end_time}
              layoutMode={layoutMode}
              transcriptSegments={sourceVideo.transcript?.segments || []}
              onTimeUpdate={(t) => setCurrentTime(t)}
            />
          </div>

          {/* Column 3: Brand Compliance, Layout & Render (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {/* Layout & Style Controls */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Layers size={13} className="text-indigo-400" /> Format & Layout 9:16
              </h4>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setLayoutMode('BLUR_BG')}
                  className={`p-2.5 rounded-xl text-xs font-medium border flex flex-col items-center gap-1 text-center ${
                    layoutMode === 'BLUR_BG'
                      ? 'bg-indigo-950/80 border-indigo-500 text-indigo-300 font-semibold'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <span>Box-Blur Background</span>
                  <span className="text-[10px] text-slate-500">Latar blur 9:16</span>
                </button>
                <button
                  onClick={() => setLayoutMode('CENTER_CROP')}
                  className={`p-2.5 rounded-xl text-xs font-medium border flex flex-col items-center gap-1 text-center ${
                    layoutMode === 'CENTER_CROP'
                      ? 'bg-indigo-950/80 border-indigo-500 text-indigo-300 font-semibold'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <span>Center-Crop 9:16</span>
                  <span className="text-[10px] text-slate-500">Full frame terpusat</span>
                </button>
              </div>

              {/* Outro Checkbox */}
              <label className="flex items-center gap-2 mt-2 cursor-pointer select-none text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={outroEnabled}
                  onChange={(e) => setOutroEnabled(e.target.checked)}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                />
                <span>Tempel Poster Wajib Brand di Akhir Video (3s)</span>
              </label>

              {/* Action Button: Render */}
              <button
                onClick={handleTriggerRender}
                disabled={isRendering}
                className="w-full mt-2 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 rounded-xl font-bold text-xs text-white flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all"
              >
                {isRendering ? <Spin size="small" /> : <Film size={15} />}
                {isRendering ? 'Sedang Merender Video (FFmpeg)...' : 'Render Final Video 9:16'}
              </button>

              {/* Download Ready Video */}
              {selectedClip.output_video_path && (
                <a
                  href={selectedClip.output_video_path}
                  download
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold text-xs text-white flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20"
                >
                  <Download size={14} /> Download MP4 Siap Submit
                </a>
              )}
            </div>

            {/* Submission Helper */}
            <SubmissionCard
              clip={selectedClip}
              campaign={activeCampaign}
              onUpdateSubmissionUrl={handleUpdateSubmissionUrl}
            />
          </div>
        </div>
      ) : (
        /* Empty State / Welcome Guidance */
        <div className="text-center py-20 border border-dashed border-slate-800 rounded-3xl bg-slate-900/30">
          <Film className="mx-auto text-slate-600 mb-3" size={40} />
          <h3 className="text-base font-bold text-slate-300">Mulai Produksi Klip Konten.com</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            Pilih campaign di atas, tempelkan link materi YouTube atau Google Drive resmi brand, lalu klik Analyze & Curate.
          </p>
        </div>
      )}
    </div>
  );
};
