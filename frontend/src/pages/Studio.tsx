import React, { useState, useEffect } from 'react';
import { 
  Video, UploadCloud, Sparkles, Sliders, Download, Film, 
  Layers, CheckCircle2, AlertCircle, RefreshCw, Link as LinkIcon,
  FolderOpen, ShieldAlert, Check, PlayCircle
} from 'lucide-react';
import { apiService } from '../api/client';
import { Campaign, SourceVideo, Clip, RenderOptions } from '../types';
import { VideoPlayer916 } from '../components/VideoPlayer916';
import { TranscriptEditor } from '../components/TranscriptEditor';
import { SubmissionCard } from '../components/SubmissionCard';
import { message, Spin, Modal } from 'antd';

export const Studio: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  
  // Real-time Konten.com URL import
  const [showImportModal, setShowImportModal] = useState(false);
  const [kontenUrlInput, setKontenUrlInput] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Ingestion inputs
  const [urlInput, setUrlInput] = useState('');
  const [isProcessingIngest, setIsProcessingIngest] = useState(false);
  
  // Downloaded videos history
  const [downloadedVideos, setDownloadedVideos] = useState<SourceVideo[]>([]);

  // Current active data
  const [sourceVideo, setSourceVideo] = useState<SourceVideo | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [selectedClip, setSelectedClip] = useState<Clip | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  // Render options
  const [layoutMode, setLayoutMode] = useState<'BLUR_BG' | 'CENTER_CROP' | 'SPLIT'>('BLUR_BG');
  const [outroEnabled, setOutroEnabled] = useState(true);
  const [isRendering, setIsRendering] = useState(false);
  const [isCurating, setIsCurating] = useState(false);

  // Load campaigns on mount
  useEffect(() => {
    loadCampaigns();
    loadDownloadedVideos();
  }, []);

  // When campaign changes, load downloaded videos for that campaign
  useEffect(() => {
    if (selectedCampaignId) {
      loadDownloadedVideos(selectedCampaignId);
    }
  }, [selectedCampaignId]);

  const loadCampaigns = async () => {
    try {
      const data = await apiService.getCampaigns();
      setCampaigns(data);
      if (data.length > 0 && !selectedCampaignId) {
        setSelectedCampaignId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadDownloadedVideos = async (campaignId?: string) => {
    try {
      const videos = await apiService.getSourceVideos(campaignId);
      setDownloadedVideos(videos);
      // Auto-select latest video if none active
      if (videos.length > 0 && !sourceVideo) {
        handleSelectVideo(videos[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const activeCampaign = campaigns.find((c) => c.id === selectedCampaignId);

  const handleSelectVideo = async (video: SourceVideo) => {
    setSourceVideo(video);
    // Fetch existing clips for this video
    try {
      const existingClips = await apiService.getClipsForVideo(video.id);
      if (existingClips.length > 0) {
        setClips(existingClips);
        setSelectedClip(existingClips[0]);
      } else {
        setClips([]);
        // Default initial clip so player shows immediately
        setSelectedClip({
          id: `default-${video.id}`,
          source_video_id: video.id,
          title: video.title,
          start_time: 0,
          end_time: Math.min(45, video.duration_seconds || 45),
          hook_text: 'Preview Video Mentah',
          virality_score: 85,
          layout_mode: 'BLUR_BG',
          outro_enabled: true,
          status: 'DRAFT',
          verified_views: 0,
          created_at: new Date().toISOString(),
        });

        // If transcript already exists, trigger curation
        if (video.transcript && video.transcript.segments && video.transcript.segments.length > 0) {
          handleCurateClips(video.id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Import Campaign directly from Konten.com URL
  const handleImportCampaign = async () => {
    if (!kontenUrlInput.trim()) {
      message.warning('Masukkan link campaign Konten.com!');
      return;
    }

    setIsImporting(true);
    try {
      const imported = await apiService.importCampaignByUrl(kontenUrlInput);
      message.success(`Berhasil mengimpor campaign: ${imported.name}`);
      await loadCampaigns();
      setSelectedCampaignId(imported.id);
      setShowImportModal(false);
      setKontenUrlInput('');
      
      // Auto-fill first material if available
      if (imported.materials && imported.materials.length > 0) {
        setUrlInput(imported.materials[0].url);
      }
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Gagal mengimpor campaign dari Konten.com');
    } finally {
      setIsImporting(false);
    }
  };

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
      
      // Immediately set source video & initial default clip so player renders right away!
      setSourceVideo(video);
      setSelectedClip({
        id: `default-${video.id}`,
        source_video_id: video.id,
        title: video.title,
        start_time: 0,
        end_time: Math.min(45, video.duration_seconds || 45),
        hook_text: 'Video berhasil diunduh. Sedang mentranskripsi audio...',
        virality_score: 85,
        layout_mode: 'BLUR_BG',
        outro_enabled: true,
        status: 'DRAFT',
        verified_views: 0,
        created_at: new Date().toISOString(),
      });

      message.success('Video berhasil diunduh! Player aktif. Sedang memproses transkrip otomatis...');
      loadDownloadedVideos(selectedCampaignId);

      // Polling for transcription completion
      const pollInterval = setInterval(async () => {
        const updated = await apiService.getSourceVideo(video.id);
        if (updated.transcript && updated.transcript.segments && updated.transcript.segments.length > 0) {
          clearInterval(pollInterval);
          setSourceVideo(updated);
          message.success('Transkrip selesai! Menjalankan kurasi klip AI...');
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
    setIsCurating(true);
    try {
      const curatedClips = await apiService.curateClips(videoId);
      setClips(curatedClips);
      if (curatedClips.length > 0) {
        setSelectedClip(curatedClips[0]);
      }
      message.success(`Ditemukan ${curatedClips.length} klip berpotensi tinggi!`);
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Gagal kurasi klip');
    } finally {
      setIsCurating(false);
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

      const interval = setInterval(async () => {
        const updated = await apiService.getClip(selectedClip.id);
        if (updated.status === 'COMPLETED') {
          clearInterval(interval);
          setIsRendering(false);
          setSelectedClip(updated);
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

  // Calculate clean video URL
  const rawFilename = sourceVideo?.local_path ? sourceVideo.local_path.split('\\').pop()?.split('/').pop() : '';
  const currentVideoUrl = selectedClip?.output_video_path || (rawFilename ? `/storage/raw/${rawFilename}` : '');

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Top Banner: Ingestion & Campaign Presets */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg backdrop-blur-md">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            {/* Campaign Selector */}
            <div className="md:col-span-5">
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-400">
                  Pilih Campaign Konten.com:
                </label>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  <LinkIcon size={12} /> + Import Link Baru
                </button>
              </div>
              <select
                value={selectedCampaignId}
                onChange={(e) => {
                  setSelectedCampaignId(e.target.value);
                  const found = campaigns.find((c) => c.id === e.target.value);
                  if (found && found.materials && found.materials.length > 0) {
                    setUrlInput(found.materials[0].url);
                  }
                }}
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
            <div className="md:col-span-7">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Input URL YouTube / Google Drive Materi:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="https://www.youtube.com/watch?v=... atau https://drive.google.com/..."
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-indigo-500 font-mono text-[11px]"
                />
                <button
                  onClick={handleFetchUrl}
                  disabled={isProcessingIngest}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20 whitespace-nowrap"
                >
                  {isProcessingIngest ? <Spin size="small" /> : <Sparkles size={14} />}
                  {isProcessingIngest ? 'Mengunduh...' : 'Analyze & Curate'}
                </button>
              </div>
            </div>
          </div>

          {/* Materi Quick-Picker */}
          {activeCampaign?.materials && activeCampaign.materials.length > 0 && (
            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                <FolderOpen size={12} className="text-indigo-400" /> Materi Resmi Campaign:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {activeCampaign.materials.map((m, idx) => (
                  <button
                    key={idx}
                    onClick={() => setUrlInput(m.url)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] border transition-all ${
                      urlInput === m.url
                        ? 'bg-indigo-950/80 border-indigo-500 text-indigo-300 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {m.title || `Materi #${idx + 1}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Riwayat Video yang Sudah Diunduh */}
          {downloadedVideos.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                <PlayCircle size={13} className="text-emerald-400" /> Video Tersedia ({downloadedVideos.length}):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {downloadedVideos.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => handleSelectVideo(v)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] border flex items-center gap-1.5 transition-all ${
                      sourceVideo?.id === v.id
                        ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="truncate max-w-[200px]">{v.title}</span>
                    <span className="font-mono text-[10px] opacity-75">
                      {Math.floor(v.duration_seconds / 60)}m
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Campaign Info Bar */}
          {activeCampaign && (
            <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
              <div className="flex flex-wrap items-center gap-2">
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
      </div>

      {/* Modal Import Campaign Konten.com */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-white">
            <LinkIcon size={16} className="text-indigo-400" />
            <span>Import Campaign dari Link Konten.com</span>
          </div>
        }
        open={showImportModal}
        onCancel={() => setShowImportModal(false)}
        footer={null}
      >
        <div className="space-y-4 py-2">
          <p className="text-xs text-slate-400">
            Tempelkan link campaign dari browser Anda (contoh: <code>https://konten.com/campaigns/growlab-beyond-the-podcast-1</code>).
            Sistem akan secara instan mengekstrak seluruh materi, CPM, durasi, tagar wajib, dan Do's & Don'ts brand!
          </p>
          <input
            type="text"
            placeholder="https://konten.com/campaigns/..."
            value={kontenUrlInput}
            onChange={(e) => setKontenUrlInput(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-indigo-500 font-mono"
          />
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowImportModal(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-300"
            >
              Batal
            </button>
            <button
              onClick={handleImportCampaign}
              disabled={isImporting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shadow-md shadow-indigo-600/30"
            >
              {isImporting ? <Spin size="small" /> : <Sparkles size={14} />}
              {isImporting ? 'Mengimpor...' : 'Scrape & Import Sekarang'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Transcription & Curation Live Status Alert */}
      {sourceVideo && !sourceVideo.transcript && (
        <div className="bg-amber-950/40 border border-amber-800/80 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Spin size="small" />
            <div>
              <div className="text-xs font-bold text-amber-300">
                Audio Sedang Ditranskripsi Menggunakan faster-whisper...
              </div>
              <div className="text-[11px] text-amber-400/80">
                Video sudah bisa diputar langsung di preview bawah. AI akan otomatis menampilkan klip terbaik setelah transkripsi selesai.
              </div>
            </div>
          </div>
          <button
            onClick={() => handleCurateClips(sourceVideo.id)}
            disabled={isCurating}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 rounded-xl text-xs font-bold text-white flex items-center gap-1.5"
          >
            {isCurating ? <Spin size="small" /> : <Sparkles size={13} />}
            Trigger Kurasi AI
          </button>
        </div>
      )}

      {/* Curated Clips Selector Pills */}
      {clips.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 whitespace-nowrap">
            <Film size={14} className="text-indigo-400" /> Hasil Kurasi AI:
          </span>
          {clips.map((clip, index) => (
            <button
              key={clip.id}
              onClick={() => setSelectedClip(clip)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-2 transition-all whitespace-nowrap ${
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

      {/* Main 3-Column Studio Editor (Shows whenever sourceVideo is loaded!) */}
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
              videoUrl={currentVideoUrl}
              startTime={selectedClip.start_time}
              endTime={selectedClip.end_time}
              layoutMode={layoutMode}
              transcriptSegments={sourceVideo.transcript?.segments || []}
              onTimeUpdate={(t) => setCurrentTime(t)}
            />
            <div className="mt-2 text-center text-[11px] text-slate-400 truncate max-w-[320px]">
              {sourceVideo.title}
            </div>
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
            Pilih campaign di atas atau import link campaign Konten.com, pilih materi resmi, lalu klik <strong>Analyze & Curate</strong>.
          </p>
        </div>
      )}
    </div>
  );
};
