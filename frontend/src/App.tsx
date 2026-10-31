import React, { useState } from 'react';
import { ConfigProvider, theme } from 'antd';
import { Scissors, Megaphone, BarChart3, ExternalLink } from 'lucide-react';
import { Studio } from './pages/Studio';
import { CampaignsPage } from './pages/Campaigns';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'studio' | 'campaigns' | 'analytics'>('studio');

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#6366f1',
          borderRadius: 12,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        },
      }}
    >
      <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col font-sans">
        {/* Navigation Bar */}
        <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-600/30">
                <Scissors className="text-white transform -rotate-45" size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-extrabold text-base tracking-tight text-white">
                    Auto-Clipper Studio
                  </h1>
                  <span className="bg-indigo-950 text-indigo-400 border border-indigo-800 text-[10px] font-bold px-1.5 py-0.2 rounded">
                    KONTEN.COM
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">Assisted Video Editor & Compliance Engine</p>
              </div>
            </div>

            {/* Nav Tabs */}
            <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveTab('studio')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'studio'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Scissors size={14} /> Studio Editor
              </button>
              <button
                onClick={() => setActiveTab('campaigns')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'campaigns'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Megaphone size={14} /> Brief Campaign
              </button>
            </div>

            {/* Konten.com External Link */}
            <a
              href="https://konten.com/campaigns"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1 text-xs text-slate-400 hover:text-white bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl transition-all"
            >
              <span>Buka Konten.com</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1">
          {activeTab === 'studio' && <Studio />}
          {activeTab === 'campaigns' && (
            <CampaignsPage
              onSelectCampaign={() => {
                setActiveTab('studio');
              }}
            />
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-900 bg-slate-950/60 py-4 text-center text-[11px] text-slate-500">
          Smart Auto-Clipper Studio • Dirancang khusus untuk ekosistem kreator & clipper Konten.com
        </footer>
      </div>
    </ConfigProvider>
  );
};
