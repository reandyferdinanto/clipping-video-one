import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Eye, EyeOff } from 'lucide-react';
import { SafeZoneOverlay } from './SafeZoneOverlay';
import { TranscriptSegment } from '../types';

interface VideoPlayer916Props {
  videoUrl: string;
  startTime: number;
  endTime: number;
  layoutMode?: 'BLUR_BG' | 'CENTER_CROP' | 'SPLIT';
  transcriptSegments?: TranscriptSegment[];
  onTimeUpdate?: (currentTime: number) => void;
  showOverlayDefault?: boolean;
}

export const VideoPlayer916: React.FC<VideoPlayer916Props> = ({
  videoUrl,
  startTime,
  endTime,
  layoutMode = 'BLUR_BG',
  transcriptSegments = [],
  onTimeUpdate,
  showOverlayDefault = true,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(startTime);
  const [showSafeZone, setShowSafeZone] = useState(showOverlayDefault);
  const [activeWords, setActiveWords] = useState<{ word: string; isHighlighted: boolean }[]>([]);

  // Seek to startTime when clip changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = startTime;
      setCurrentTime(startTime);
      setIsPlaying(false);
    }
  }, [startTime, endTime, videoUrl]);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);
    if (onTimeUpdate) onTimeUpdate(time);

    // Loop clip within bounds
    if (time >= endTime) {
      videoRef.current.currentTime = startTime;
      videoRef.current.play();
      return;
    }

    // Find active subtitle words
    const currentSegment = transcriptSegments.find(
      (s) => time >= s.start && time <= s.end
    );

    if (currentSegment) {
      if (currentSegment.words && currentSegment.words.length > 0) {
        const words = currentSegment.words.map((w) => ({
          word: w.word,
          isHighlighted: time >= w.start && time <= w.end,
        }));
        setActiveWords(words);
      } else {
        setActiveWords([{ word: currentSegment.text, isHighlighted: true }]);
      }
    } else {
      setActiveWords([]);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleRestart = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = startTime;
    videoRef.current.play();
    setIsPlaying(true);
  };

  const clipDuration = Math.max(0.1, endTime - startTime);
  const currentProgress = Math.min(100, Math.max(0, ((currentTime - startTime) / clipDuration) * 100));

  return (
    <div className="flex flex-col items-center">
      {/* 9:16 Aspect Ratio Container */}
      <div 
        className="relative overflow-hidden rounded-2xl bg-black shadow-2xl border border-slate-800"
        style={{
          width: '320px',
          height: '568px', // Exact 9:16
        }}
      >
        {/* Background Video Layer for BLUR_BG mode */}
        {layoutMode === 'BLUR_BG' && (
          <video
            src={videoUrl}
            className="absolute inset-0 w-full h-full object-cover filter blur-xl scale-125 opacity-70"
            muted
          />
        )}

        {/* Foreground Main Video */}
        <video
          ref={videoRef}
          src={videoUrl}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleRestart}
          playsInline
          className={`relative z-10 w-full h-full ${
            layoutMode === 'CENTER_CROP' ? 'object-cover' : 'object-contain'
          }`}
        />

        {/* Safe Zone Overlay */}
        {showSafeZone && <SafeZoneOverlay />}

        {/* Subtitle Karaoke Display (Positioned in Safe Zone, ~35% from bottom) */}
        {activeWords.length > 0 && (
          <div 
            className="absolute left-0 right-0 z-30 px-6 text-center pointer-events-none"
            style={{ bottom: '34%' }}
          >
            <div className="inline-block bg-black/40 px-3 py-1.5 rounded-xl backdrop-blur-xs">
              <span className="font-extrabold text-xl tracking-wide uppercase leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                {activeWords.map((item, idx) => (
                  <span
                    key={idx}
                    className={`mx-1 transition-colors duration-100 ${
                      item.isHighlighted
                        ? 'text-yellow-400 scale-110 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]'
                        : 'text-white'
                    }`}
                  >
                    {item.word}
                  </span>
                ))}
              </span>
            </div>
          </div>
        )}

        {/* Play/Pause Center Overlay on click */}
        <button
          onClick={togglePlay}
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity"
        >
          <div className="w-14 h-14 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white">
            {isPlaying ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
          </div>
        </button>
      </div>

      {/* Media Player Controls */}
      <div className="w-[320px] mt-3 flex flex-col gap-2 bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl text-xs text-slate-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="p-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white"
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <button
              onClick={handleRestart}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300"
              title="Reset ke awal klip"
            >
              <RotateCcw size={14} />
            </button>
            <span className="font-mono">
              {(currentTime - startTime).toFixed(1)}s / {clipDuration.toFixed(1)}s
            </span>
          </div>

          {/* Toggle Safe Zone Mockup */}
          <button
            onClick={() => setShowSafeZone(!showSafeZone)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium border ${
              showSafeZone
                ? 'bg-emerald-950/60 border-emerald-600 text-emerald-400'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            {showSafeZone ? <Eye size={12} /> : <EyeOff size={12} />}
            Safe Zone
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-indigo-500 h-full rounded-full transition-all duration-75"
            style={{ width: `${currentProgress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
