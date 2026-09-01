import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Sparkles, Tag, ShieldCheck, Layers, Grid, Maximize2, Feather, Calendar } from 'lucide-react';

export default function GarmentLightboxModal({ 
  items = [], 
  initialIndex = 0, 
  isOpen, 
  onClose, 
  outfitTitle = '' 
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [viewMode, setViewMode] = useState('single'); // 'single' | 'lookbook'

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.max(0, Math.min(initialIndex, items.length - 1)));
      setViewMode('single');
    }
  }, [isOpen, initialIndex, items.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, items.length]);

  if (!isOpen || !items || items.length === 0) return null;

  const currentItem = items[currentIndex] || items[0];

  const handlePrev = (e) => {
    e?.stopPropagation();
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : items.length - 1));
  };

  const handleNext = (e) => {
    e?.stopPropagation();
    setCurrentIndex(prev => (prev < items.length - 1 ? prev + 1 : 0));
  };

  const getRoleLabel = (item) => {
    if (!item) return '✦ Ruhadarab';
    const nameLower = (item.name || '').toLowerCase();
    const subLower = (item.subCategory || '').toLowerCase();

    if (item.category === 'accessories' || subLower === 'belt' || nameLower.includes('öv')) return '🎗️ Bőröv / Kiegészítő';
    if (item.category === 'tops') return '👔 Bázisréteg (Felső)';
    if (item.category === 'knitwear') return '🧶 Köztes réteg (Pulóver)';
    if (subLower === 'overcoat' || subLower === 'coat' || nameLower.includes('kabát')) return '🧥 Külső réteg (Nagykabát)';
    if (item.category === 'outerwear') return '🧥 Külső réteg (Zakó / Dzseki)';
    if (item.category === 'bottoms') return '👖 Nadrág (Alsó)';
    if (item.category === 'shoes') return '👞 Lábbeli (Cipő)';
    return '✦ Stílusdarab';
  };

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/90 backdrop-blur-lg animate-fade-in"
    >
      <div className="relative w-full max-w-4xl bg-[#090c12] border border-[var(--border-gold)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scale-up">
        
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/10 bg-black/40">
          <div className="flex items-center gap-3">
            <span className="badge badge-gold text-xs">
              {outfitTitle ? outfitTitle : 'Ruhadarab & Szett Betekintő'}
            </span>
            {items.length > 1 && (
              <span className="text-xs text-[var(--text-muted)] font-mono">
                {currentIndex + 1} / {items.length}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            {items.length > 1 && (
              <div className="flex items-center bg-black/60 rounded-lg p-0.5 border border-white/10">
                <button
                  onClick={() => setViewMode('single')}
                  className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-all ${
                    viewMode === 'single'
                      ? 'bg-[var(--accent-gold)] text-black font-semibold shadow'
                      : 'text-[var(--text-secondary)] hover:text-white'
                  }`}
                  title="Egyedi nagyított nézet"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Kiemelt</span>
                </button>
                <button
                  onClick={() => setViewMode('lookbook')}
                  className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-all ${
                    viewMode === 'lookbook'
                      ? 'bg-[var(--accent-gold)] text-black font-semibold shadow'
                      : 'text-[var(--text-secondary)] hover:text-white'
                  }`}
                  title="Teljes szett Lookbook nézet"
                >
                  <Grid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Lookbook ({items.length})</span>
                </button>
              </div>
            )}

            <button 
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-full text-[var(--text-muted)] hover:text-white hover:bg-white/10 transition-colors"
              title="Bezárás (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {viewMode === 'single' ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
            
            {/* Left/Main: Enlarged Photo Showcase with Navigation Controls */}
            <div className="md:col-span-7 flex flex-col items-center justify-center relative">
              <div className="w-full aspect-square max-h-[55vh] md:max-h-[60vh] rounded-xl overflow-hidden bg-[#04060a] border border-white/10 p-3 sm:p-4 flex items-center justify-center relative shadow-inner group">
                <img 
                  src={currentItem.imageUrl} 
                  alt={currentItem.name}
                  className="max-h-full max-w-full object-contain rounded-lg drop-shadow-2xl transition-transform duration-300 group-hover:scale-105"
                />

                {/* Layer Badge on image */}
                <div className="absolute top-3 left-3 bg-black/85 backdrop-blur-md px-2.5 py-1 rounded-md text-xs text-white font-medium border border-white/15 flex items-center gap-1.5 shadow-lg">
                  <span>{getRoleLabel(currentItem)}</span>
                </div>

                {/* Brand watermark if available */}
                {currentItem.brand && (
                  <div className="absolute bottom-3 right-3 bg-black/85 backdrop-blur-md px-2 py-0.5 rounded text-[11px] text-[var(--accent-gold)] font-serif font-bold border border-white/10">
                    {currentItem.brand}
                  </div>
                )}
              </div>

              {/* Prev / Next Controls for Carousel */}
              {items.length > 1 && (
                <div className="flex items-center justify-between w-full mt-3 px-2">
                  <button
                    onClick={handlePrev}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white text-xs font-medium border border-white/10 transition-all active:scale-95"
                  >
                    <ChevronLeft className="w-4 h-4 text-[var(--accent-gold)]" />
                    <span>Előző darab</span>
                  </button>

                  {/* Thumbnail Strip */}
                  <div className="flex items-center gap-1.5 overflow-x-auto max-w-[200px] sm:max-w-[260px] py-1 px-1">
                    {items.map((itm, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentIndex(idx)}
                        className={`w-9 h-9 shrink-0 rounded-lg overflow-hidden border p-0.5 transition-all ${
                          idx === currentIndex
                            ? 'border-[var(--accent-gold)] ring-2 ring-[var(--accent-gold-glow)] scale-105'
                            : 'border-white/10 opacity-50 hover:opacity-100'
                        }`}
                      >
                        <img src={itm.imageUrl} alt={itm.name} className="w-full h-full object-contain bg-[#06080e] rounded" />
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleNext}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white text-xs font-medium border border-white/10 transition-all active:scale-95"
                  >
                    <span>Következő darab</span>
                    <ChevronRight className="w-4 h-4 text-[var(--accent-gold)]" />
                  </button>
                </div>
              )}
            </div>

            {/* Right: Rich Metadata & Sartorial Attributes */}
            <div className="md:col-span-5 space-y-4 self-start">
              
              <div>
                <span className="text-[11px] text-[var(--accent-gold)] font-mono uppercase tracking-wider block mb-1">
                  {currentItem.category?.toUpperCase() || 'RUHATÁR ELEM'}
                </span>
                <h3 className="text-xl sm:text-2xl font-serif font-bold text-white leading-tight">
                  {currentItem.name}
                </h3>
              </div>

              {/* Attribute Grid */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                {currentItem.brand && (
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                    <span className="text-[10px] text-[var(--text-muted)] block">Márka</span>
                    <span className="font-semibold text-white">{currentItem.brand}</span>
                  </div>
                )}

                {currentItem.size && (
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                    <span className="text-[10px] text-[var(--text-muted)] block">Méret</span>
                    <span className="font-mono font-bold text-[var(--accent-gold)]">{currentItem.size}</span>
                  </div>
                )}

                {currentItem.color && (
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                    <span className="text-[10px] text-[var(--text-muted)] block">Szín</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {currentItem.colorHex && (
                        <span className="w-3 h-3 rounded-full border border-white/30" style={{ backgroundColor: currentItem.colorHex }} />
                      )}
                      <span className="font-medium text-white truncate">{currentItem.color}</span>
                    </div>
                  </div>
                )}

                {currentItem.material && (
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                    <span className="text-[10px] text-[var(--text-muted)] block flex items-center gap-1">
                      <Feather className="w-3 h-3 text-[var(--accent-gold)]" />
                      <span>Anyag</span>
                    </span>
                    <span className="font-medium text-white line-clamp-1">{currentItem.material}</span>
                  </div>
                )}

                {currentItem.condition && (
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                    <span className="text-[10px] text-[var(--text-muted)] block">Állapot</span>
                    <span className="font-medium text-emerald-400">{currentItem.condition}</span>
                  </div>
                )}

                {currentItem.formality && (
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                    <span className="text-[10px] text-[var(--text-muted)] block">Formális szint</span>
                    <span className="font-medium text-white">{currentItem.formality}</span>
                  </div>
                )}
              </div>

              {/* Styling Tips & Advice */}
              {(currentItem.stylingTip || currentItem.stylingAdvice) && (
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-[var(--accent-gold-glow)] to-black/40 border border-[var(--border-gold)] text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-[var(--accent-gold-light)]">
                    <Sparkles className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                    <span>Stylist Tanács & Hordhatóság:</span>
                  </div>
                  <p className="text-[var(--text-secondary)] leading-relaxed">
                    {currentItem.stylingTip || currentItem.stylingAdvice}
                  </p>
                </div>
              )}

              {/* Tags */}
              {Array.isArray(currentItem.tags) && currentItem.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {currentItem.tags.map((tag, tIdx) => (
                    <span key={tIdx} className="px-2 py-0.5 rounded-full text-[10px] bg-white/5 text-[var(--text-secondary)] border border-white/10">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

            </div>
          </div>
        ) : (
          /* Lookbook Flat-lay View of the entire outfit */
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <div className="text-center space-y-1 pb-2 border-b border-white/10">
              <h4 className="text-lg font-serif font-bold text-white">
                {outfitTitle || 'Teljes Szett Összeállítás'}
              </h4>
              <p className="text-xs text-[var(--text-muted)]">
                Kattints bármelyik darabra a részletes kiemelt megtekintéshez!
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
              {items.map((itm, idx) => (
                <div 
                  key={idx}
                  onClick={() => {
                    setCurrentIndex(idx);
                    setViewMode('single');
                  }}
                  className="cursor-pointer group p-2.5 rounded-xl bg-black/40 border border-white/10 hover:border-[var(--accent-gold)] hover:bg-black/60 transition-all text-left flex flex-col justify-between"
                >
                  <div className="aspect-[4/3] rounded-lg overflow-hidden bg-[#05070c] border border-white/5 p-1.5 flex items-center justify-center relative mb-2">
                    <img 
                      src={itm.imageUrl} 
                      alt={itm.name} 
                      className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform" 
                    />
                    <span className="absolute bottom-1 left-1 text-[8px] bg-black/85 backdrop-blur-sm px-1.5 py-0.5 rounded text-white/90 font-medium border border-white/10">
                      {getRoleLabel(itm).split(' ')[0]} {getRoleLabel(itm).split(' ')[1] || ''}
                    </span>
                  </div>

                  <div>
                    <h5 className="text-xs font-semibold text-white line-clamp-1 group-hover:text-[var(--accent-gold)] transition-colors">
                      {itm.name}
                    </h5>
                    <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] mt-0.5">
                      <span>{itm.brand || itm.category}</span>
                      {itm.size && <span className="font-mono text-[var(--accent-gold)]">{itm.size}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
