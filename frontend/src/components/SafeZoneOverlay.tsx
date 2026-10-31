import React from 'react';
import { Heart, MessageCircle, Share2, Disc, Music2 } from 'lucide-react';

interface SafeZoneOverlayProps {
  platform?: 'tiktok' | 'reels';
  showBorders?: boolean;
}

export const SafeZoneOverlay: React.FC<SafeZoneOverlayProps> = ({
  platform = 'tiktok',
  showBorders = true,
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none select-none z-20 flex flex-col justify-between overflow-hidden">
      {/* Top Header Mockup */}
      <div className="pt-4 px-4 flex justify-between items-center opacity-75">
        <div className="flex gap-4 text-xs font-semibold text-white/90 drop-shadow">
          <span>LIVE</span>
          <span className="border-b-2 border-white pb-0.5">Untuk Anda</span>
          <span>Mengikuti</span>
        </div>
        <div className="text-xs text-white/90 drop-shadow">🔍</div>
      </div>

      {/* Safe Area Warning Box */}
      {showBorders && (
        <div 
          className="absolute border border-dashed border-emerald-400/40 rounded-lg pointer-events-none"
          style={{
            top: '12%',
            bottom: '24%',
            left: '6%',
            right: '22%',
          }}
        >
          <div className="absolute top-1 left-2 text-[10px] text-emerald-400 bg-black/60 px-1.5 py-0.5 rounded font-mono">
            SAFE ZONE (Subtitle & Hook)
          </div>
        </div>
      )}

      {/* Right Action Bar (TikTok/Reels UI) */}
      <div className="absolute right-3 bottom-24 flex flex-col items-center gap-4 text-white/90 drop-shadow">
        <div className="w-10 h-10 rounded-full border-2 border-white bg-slate-700 flex items-center justify-center text-xs font-bold">
          👤
        </div>
        <div className="flex flex-col items-center">
          <div className="w-9 h-9 rounded-full bg-black/40 flex items-center justify-center">
            <Heart size={20} className="fill-white/90 text-white" />
          </div>
          <span className="text-[11px] font-semibold mt-0.5">84.2K</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-9 h-9 rounded-full bg-black/40 flex items-center justify-center">
            <MessageCircle size={20} />
          </div>
          <span className="text-[11px] font-semibold mt-0.5">1.2K</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-9 h-9 rounded-full bg-black/40 flex items-center justify-center">
            <Share2 size={20} />
          </div>
          <span className="text-[11px] font-semibold mt-0.5">9.5K</span>
        </div>
        <div className="w-9 h-9 rounded-full bg-black/40 flex items-center justify-center animate-spin" style={{ animationDuration: '4s' }}>
          <Disc size={20} />
        </div>
      </div>

      {/* Bottom Profile & Caption Mockup (Area yang sering menutupi subtitle jika terlalu bawah) */}
      <div className="p-4 pb-6 bg-gradient-to-t from-black/80 via-black/30 to-transparent text-white drop-shadow">
        <div className="font-bold text-sm">@clipper_official</div>
        <p className="text-xs text-white/90 mt-1 line-clamp-2 max-w-[75%]">
          Momen berharga yang wajib kamu tonton sampai habis! 🔥 #kontencom #fyp
        </p>
        <div className="flex items-center gap-2 mt-2 text-xs text-white/80">
          <Music2 size={13} />
          <span className="truncate max-w-[65%] text-[11px]">Audio Asli - Materi Resmi Campaign</span>
        </div>
      </div>
    </div>
  );
};
