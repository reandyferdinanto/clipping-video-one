import React, { useEffect, useState } from 'react';
import { apiService } from '../api/client';
import { Campaign } from '../types';
import { Award, Hash, Clock, AlertTriangle, ArrowRight } from 'lucide-react';

interface CampaignsPageProps {
  onSelectCampaign: (campaignId: string) => void;
}

export const CampaignsPage: React.FC<CampaignsPageProps> = ({ onSelectCampaign }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService.getCampaigns().then((data) => {
      setCampaigns(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Daftar Campaign Aktif Konten.com</h2>
        <p className="text-xs text-slate-400 mt-1">
          Pilih campaign untuk melihat brief resmi, pantangan brand, dan mulai kliping video.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {campaigns.map((camp) => (
          <div
            key={camp.id}
            className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition-all shadow-md"
          >
            <div>
              <div className="flex justify-between items-start mb-2">
                <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">
                  {camp.brand_name}
                </span>
                <span className="bg-emerald-950/80 border border-emerald-800 text-emerald-400 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono">
                  Rp {camp.cpm_rate.toLocaleString('id-ID')} / 1K
                </span>
              </div>

              <h3 className="text-sm font-bold text-slate-100 leading-snug mb-3">
                {camp.name}
              </h3>

              <div className="space-y-2 text-xs text-slate-400 mb-4">
                <div className="flex items-center gap-1.5">
                  <Clock size={13} className="text-slate-500" />
                  <span>Durasi: {camp.min_clip_duration}s - {camp.max_clip_duration}s</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Hash size={13} className="text-slate-500" />
                  <span className="truncate font-mono text-indigo-300/80">{camp.required_tags}</span>
                </div>
                {camp.dos_and_donts_rules && (
                  <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 text-[11px] text-slate-300 mt-2">
                    <strong className="text-yellow-400 flex items-center gap-1 mb-1">
                      <AlertTriangle size={11} /> Brief & Do's/Don'ts:
                    </strong>
                    <p className="line-clamp-3 text-slate-400">{camp.dos_and_donts_rules}</p>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => onSelectCampaign(camp.id)}
              className="w-full mt-2 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-600/20"
            >
              Mulai Kliping Campaign <ArrowRight size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
