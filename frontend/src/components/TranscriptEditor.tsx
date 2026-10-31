import React, { useState } from 'react';
import { TranscriptSegment } from '../types';
import { Edit3, Check, Clock } from 'lucide-react';

interface TranscriptEditorProps {
  segments: TranscriptSegment[];
  clipStart: number;
  clipEnd: number;
  currentTime?: number;
  onSeek?: (time: number) => void;
  onUpdateSegmentText?: (segmentId: number, newText: string) => void;
}

export const TranscriptEditor: React.FC<TranscriptEditorProps> = ({
  segments,
  clipStart,
  clipEnd,
  currentTime = 0,
  onSeek,
  onUpdateSegmentText,
}) => {
  const [editingSegmentId, setEditingSegmentId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');

  const relevantSegments = segments.filter(
    (s) => s.end >= clipStart && s.start <= clipEnd
  );

  const startEditing = (seg: TranscriptSegment) => {
    setEditingSegmentId(seg.id);
    setEditText(seg.text);
  };

  const saveEditing = (segId: number) => {
    if (onUpdateSegmentText) {
      onUpdateSegmentText(segId, editText);
    }
    setEditingSegmentId(null);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-800 bg-slate-900/90 flex justify-between items-center">
        <div>
          <h3 className="text-sm font-bold text-slate-200">Interactive Transcript</h3>
          <p className="text-[11px] text-slate-400">Klik kata untuk dengarkan / perbaiki typo nama tokoh</p>
        </div>
        <span className="text-xs font-mono bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded-full">
          {relevantSegments.length} Segmen Klip
        </span>
      </div>

      {/* Segments List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 max-h-[480px]">
        {relevantSegments.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs">
            Belum ada segmen transkrip pada rentang waktu ini.
          </div>
        ) : (
          relevantSegments.map((seg) => {
            const isActive = currentTime >= seg.start && currentTime <= seg.end;
            const isEditing = editingSegmentId === seg.id;

            return (
              <div
                key={seg.id}
                className={`p-2.5 rounded-xl border text-xs transition-all ${
                  isActive
                    ? 'bg-indigo-950/40 border-indigo-500/60 shadow-sm'
                    : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5 text-[10px] text-slate-400">
                  <button
                    onClick={() => onSeek && onSeek(seg.start)}
                    className="flex items-center gap-1 font-mono text-indigo-400 hover:text-indigo-300"
                  >
                    <Clock size={11} />
                    {seg.start.toFixed(1)}s - {seg.end.toFixed(1)}s
                  </button>
                  <button
                    onClick={() => (isEditing ? saveEditing(seg.id) : startEditing(seg))}
                    className="text-slate-400 hover:text-slate-200 p-1"
                  >
                    {isEditing ? <Check size={13} className="text-emerald-400" /> : <Edit3 size={13} />}
                  </button>
                </div>

                {isEditing ? (
                  <div className="flex flex-col gap-1.5">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full bg-slate-950 border border-indigo-500/80 rounded-lg p-2 text-xs text-white focus:outline-hidden"
                      rows={2}
                    />
                    <button
                      onClick={() => saveEditing(seg.id)}
                      className="self-end px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 rounded text-[11px] font-semibold text-white"
                    >
                      Simpan Teks
                    </button>
                  </div>
                ) : (
                  <div className="text-slate-200 leading-relaxed">
                    {seg.words && seg.words.length > 0 ? (
                      seg.words.map((w, wIdx) => {
                        const isWordActive = currentTime >= w.start && currentTime <= w.end;
                        return (
                          <span
                            key={wIdx}
                            onClick={() => onSeek && onSeek(w.start)}
                            className={`cursor-pointer px-0.5 rounded transition-colors ${
                              isWordActive
                                ? 'bg-yellow-400/20 text-yellow-300 font-bold'
                                : 'hover:bg-slate-800'
                            }`}
                          >
                            {w.word}{' '}
                          </span>
                        );
                      })
                    ) : (
                      <span>{seg.text}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
