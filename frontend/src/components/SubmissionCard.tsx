import React, { useState } from 'react';
import { Copy, Check, ExternalLink, Hash, Award } from 'lucide-react';
import { Campaign, Clip } from '../types';
import { message } from 'antd';

interface SubmissionCardProps {
  clip: Clip;
  campaign?: Campaign;
  onUpdateSubmissionUrl: (url: string) => void;
}

export const SubmissionCard: React.FC<SubmissionCardProps> = ({
  clip,
  campaign,
  onUpdateSubmissionUrl,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [submitLink, setSubmitLink] = useState(clip.submission_url || '');

  const copyToClipboard = (text: string, key: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    message.success(`${label} berhasil disalin!`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const hashtags = campaign?.required_tags || '#kontencom #clipper';
  const fullCaption = `${clip.title} 🔥\n\n${hashtags}`;

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="text-yellow-400" size={18} />
          <h4 className="text-sm font-bold text-slate-200">Konten.com Submission Kit</h4>
        </div>
        {campaign && (
          <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded-full">
            Rp {campaign.cpm_rate.toLocaleString('id-ID')} / 1K views
          </span>
        )}
      </div>

      {/* Copy Hashtag Box */}
      <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1 font-semibold text-slate-300">
            <Hash size={13} className="text-indigo-400" /> Hashtag Wajib Brand
          </span>
          <button
            onClick={() => copyToClipboard(hashtags, 'tags', 'Hashtag')}
            className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-semibold"
          >
            {copiedKey === 'tags' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            {copiedKey === 'tags' ? 'Tersalin' : 'Salin Tagar'}
          </button>
        </div>
        <p className="text-xs text-indigo-300/90 font-mono break-all">{hashtags}</p>
      </div>

      {/* Copy Full Caption */}
      <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span className="font-semibold text-slate-300">Caption Siap Upload</span>
          <button
            onClick={() => copyToClipboard(fullCaption, 'caption', 'Caption')}
            className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-semibold"
          >
            {copiedKey === 'caption' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            {copiedKey === 'caption' ? 'Tersalin' : 'Salin Semua'}
          </button>
        </div>
        <p className="text-xs text-slate-300 line-clamp-2">{fullCaption}</p>
      </div>

      {/* Input Link Postingan TikTok / Reels */}
      <div className="flex flex-col gap-1.5 pt-1">
        <label className="text-[11px] font-semibold text-slate-300">
          Link Postingan Medsos (Setelah Upload):
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="https://vt.tiktok.com/... atau https://instagram.com/reel/..."
            value={submitLink}
            onChange={(e) => setSubmitLink(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500"
          />
          <button
            onClick={() => onUpdateSubmissionUrl(submitLink)}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-semibold text-white flex items-center gap-1"
          >
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
};
