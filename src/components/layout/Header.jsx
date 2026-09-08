import React from 'react';
import { Bookmark, Info } from 'lucide-react';

export default function Header({ 
  activeTab, 
  stylistMode, 
  setStylistMode, 
  onOpenSavedOutfits, 
  savedOutfitsCount = 0, 
  showStylistGuide, 
  onToggleStylistGuide 
}) {
  // Only render for modules that have a dedicated contextual top bar (Mix & Match)
  if (activeTab !== 'stylist') {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-[var(--border-subtle)] px-3 sm:px-6 py-2 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 min-w-0">
        
        {/* Left: 2-Segmented Mode Switcher: Mix & Match (🧩) | AI Stylist (💬) */}
        <div className="flex items-center bg-[#0d121c] p-1 rounded-xl border border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setStylistMode?.('manual-builder')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
              stylistMode === 'manual-builder'
                ? 'bg-slate-200 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>🧩 Mix & Match</span>
          </button>
          <button
            type="button"
            onClick={() => setStylistMode?.('chat')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
              stylistMode === 'chat'
                ? 'bg-slate-200 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>💬 AI Stylist</span>
          </button>
        </div>

        {/* Right: Saved Outfits & Info Guide Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenSavedOutfits}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#0d121c] hover:bg-slate-800 border border-slate-800 text-xs flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
            title="Mentett szettek megtekintése"
          >
            <Bookmark className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-semibold hidden sm:inline">Mentett szettek</span>
            {savedOutfitsCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-slate-700 text-[10px] text-slate-200 font-mono shrink-0">
                {savedOutfitsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onToggleStylistGuide}
            className={`p-2 rounded-xl border transition-colors cursor-pointer shrink-0 ${
              showStylistGuide 
                ? 'bg-slate-200 text-slate-900 border-white' 
                : 'bg-[#0d121c] text-slate-400 hover:text-white border-slate-800'
            }`}
            title="Súgó / Info ki- és bekapcsolása"
            aria-label="Info"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>

      </div>
    </header>
  );
}
