import React, { useState, useEffect } from 'react';
import { 
  Sparkles, MessageSquare, SlidersHorizontal as Sliders, Plus, X, Bookmark, Check, 
  Loader2, Compass, Feather, CloudSun, Maximize2, RefreshCw, AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { auditManualOutfit } from '../../services/gemini';
import { fetchCurrentWeather } from '../../services/weather';
import confetti from 'canvas-confetti';
import StylistChatView from './StylistChatView';
import GarmentLightboxModal from '../common/GarmentLightboxModal';

const SLOT_DEFINITIONS = [
  { key: 'tops', label: 'Bázis Felső (Ing / Póló)', icon: '👔', category: 'tops', required: true },
  { key: 'knitwear', label: 'Köztes Réteg (Pulóver)', icon: '🧶', category: 'knitwear', required: false },
  { key: 'outerwear', label: 'Külső Réteg (Zakó / Kabát)', icon: '🧥', category: 'outerwear', required: false },
  { key: 'bottoms', label: 'Nadrág (Alsó)', icon: '👖', category: 'bottoms', required: true },
  { key: 'shoes', label: 'Lábbeli (Cipő)', icon: '👞', category: 'shoes', required: true },
  { key: 'accessories', label: 'Öv / Kiegészítő', icon: '🎗️', category: 'accessories', required: false }
];

export default function StylistView({ weather, setWeather, initialAnchorItem = null }) {
  const { wardrobe, profile, saveOutfit } = useAuth();

  // Mode: 'chat' (Default Master Stylist Chat) | 'manual-builder' (6-slot manual builder)
  const [activeMode, setActiveMode] = useState(() => {
    return localStorage.getItem('sartorial_stylist_mode') || 'chat';
  });

  // Manual Outfit Builder & Audit States
  const [manualSlots, setManualSlots] = useState({
    tops: null,
    knitwear: null,
    outerwear: null,
    bottoms: null,
    shoes: null,
    accessories: null
  });
  const [slotPickerModal, setSlotPickerModal] = useState(null); // slot key like 'tops', 'outerwear', etc.
  const [manualEvent, setManualEvent] = useState('Üzleti Tárgyalás & Ebéd');
  const [isAuditing, setIsAuditing] = useState(false);
  const [manualAuditResult, setManualAuditResult] = useState(null);
  const [isManualSaved, setIsManualSaved] = useState(false);

  // Lightbox Modal State
  const [lightboxData, setLightboxData] = useState({
    isOpen: false,
    items: [],
    initialIndex: 0,
    outfitTitle: ''
  });

  const openLightbox = (items, initialIndex = 0, outfitTitle = '') => {
    setLightboxData({
      isOpen: true,
      items: items || [],
      initialIndex: initialIndex >= 0 ? initialIndex : 0,
      outfitTitle: outfitTitle || 'Részletek'
    });
  };

  useEffect(() => {
    try {
      localStorage.setItem('sartorial_stylist_mode', activeMode);
    } catch (_) {}
  }, [activeMode]);

  // Set initial anchor item into appropriate slot if provided
  useEffect(() => {
    if (initialAnchorItem) {
      const cat = initialAnchorItem.category;
      if (cat && manualSlots.hasOwnProperty(cat)) {
        setManualSlots(prev => ({ ...prev, [cat]: initialAnchorItem }));
        setActiveMode('manual-builder');
      }
    }
  }, [initialAnchorItem]);

  const handleSetSlotItem = (slotKey, item) => {
    setManualSlots(prev => ({
      ...prev,
      [slotKey]: item
    }));
    setSlotPickerModal(null);
    setManualAuditResult(null);
    setIsManualSaved(false);
  };

  const handleClearSlot = (slotKey) => {
    setManualSlots(prev => ({
      ...prev,
      [slotKey]: null
    }));
    setManualAuditResult(null);
    setIsManualSaved(false);
  };

  const getSelectedManualItems = () => {
    return Object.values(manualSlots).filter(Boolean);
  };

  const handleRunManualAudit = async () => {
    const selectedItems = getSelectedManualItems();
    if (selectedItems.length < 2) {
      alert('Kérlek válassz legalább 2 darabot (pl. egy felsőt és egy nadrágot) az összeállításhoz!');
      return;
    }

    setIsAuditing(true);
    setManualAuditResult(null);
    setIsManualSaved(false);

    try {
      const auditRes = await auditManualOutfit({
        items: selectedItems,
        eventName: manualEvent.trim() || 'Smart Casual Esemény',
        weather: weather || { temperature: 21, condition: 'Kellemes' },
        styleProfile: profile
      });

      setManualAuditResult(auditRes);

      if (auditRes?.score >= 80) {
        try {
          confetti({
            particleCount: 45,
            spread: 60,
            origin: { y: 0.65 },
            colors: ['#d4af37', '#10b981', '#f3e5ab']
          });
        } catch (_) {}
      }
    } catch (err) {
      console.error('AI Audit hiba:', err);
      alert(`Hiba történt az auditálás során: ${err.message}`);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleSaveManualAuditedOutfit = () => {
    const selectedItems = getSelectedManualItems();
    if (!manualAuditResult || selectedItems.length === 0) return;

    const newOutfit = {
      id: `manual-outfit-${Date.now()}`,
      title: manualAuditResult.verdict || 'Saját Összeállítás',
      styleArchetype: profile.preferredStyles?.[0] || 'Egyéni Stílus',
      occasion: manualEvent.trim(),
      matchScore: manualAuditResult.score || 90,
      stylingNotes: manualAuditResult.colorHarmony || 'Harmonikus saját szett.',
      layeringAdvice: manualAuditResult.layeringEvaluation || '',
      culturalFitReasoning: manualAuditResult.eventAlignment || '',
      weatherSuitability: `Auditálva a(z) ${weather?.city || 'Budapest'} (${weather?.temperature || 21}°C) időjárásra.`,
      items: selectedItems,
      isManual: true
    };

    saveOutfit(newOutfit);
    setIsManualSaved(true);
  };

  const getSlotCandidates = (slotKey) => {
    if (!wardrobe) return [];
    return wardrobe.filter(w => {
      if (w.condition === 'Lecserélendő' || w.condition === 'Javításra vár') return false;
      if (slotKey === 'tops') return w.category === 'tops' || (w.name || '').toLowerCase().includes('ing') || (w.name || '').toLowerCase().includes('póló');
      if (slotKey === 'knitwear') return w.category === 'knitwear' || (w.name || '').toLowerCase().includes('pulóver');
      if (slotKey === 'outerwear') return w.category === 'outerwear' || (w.name || '').toLowerCase().includes('zakó') || (w.name || '').toLowerCase().includes('kabát');
      if (slotKey === 'bottoms') return w.category === 'bottoms' || w.category === 'skirts' || (w.name || '').toLowerCase().includes('nadrág');
      if (slotKey === 'shoes') return w.category === 'shoes' || (w.name || '').toLowerCase().includes('cipő') || (w.name || '').toLowerCase().includes('loafer');
      if (slotKey === 'accessories') return w.category === 'accessories' || (w.name || '').toLowerCase().includes('öv');
      return w.category === slotKey;
    });
  };

  return (
    <div className="space-y-6 animate-slide-up">
      
      {/* Top Header with Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="badge badge-gold">Gemini 3.7 Flash</span>
            <span className="badge badge-emerald">Master Stylist</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold font-serif gold-gradient-text mt-1">
            Sartorial Stylist Hub
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
            Interaktív stíluskonzultáció csevegésben és 6-slotos manuális szettépítő audit.
          </p>
        </div>

        {/* Mode Selector Toggle */}
        <div className="flex items-center bg-black/60 p-1 rounded-xl border border-white/10 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveMode('chat')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeMode === 'chat'
                ? 'bg-[var(--accent-gold)] text-black shadow-md font-bold'
                : 'text-[var(--text-secondary)] hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Master Stylist Chat</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('manual-builder')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeMode === 'manual-builder'
                ? 'bg-[var(--accent-gold)] text-black shadow-md font-bold'
                : 'text-[var(--text-secondary)] hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>6-Slotos Szettépítő</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: MASTER STYLIST CHAT */}
      {/* ========================================================================= */}
      {activeMode === 'chat' && (
        <StylistChatView weather={weather} />
      )}

      {/* ========================================================================= */}
      {/* MODE 2: 6-SLOT MANUAL OUTFIT BUILDER & SARTORIAL AUDIT */}
      {/* ========================================================================= */}
      {activeMode === 'manual-builder' && (
        <div className="space-y-6">
          
          <div className="glass-card p-5 sm:p-6 space-y-5 border-[var(--border-gold)]/40 shadow-xl">
            
            <div className="space-y-1">
              <h3 className="text-lg font-serif font-bold text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-[var(--accent-gold)]" />
                <span>Saját Szett Összeállítása & AI Audit</span>
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Válogasd össze a szetted darabjait kategóriánként, és kérj azonnali szakmai stílusauditot a Gemini 3.7 modelltől.
              </p>
            </div>

            {/* Event Name & Weather Input */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/5">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                  Esemény / Alkalom Megnevezése:
                </label>
                <input
                  type="text"
                  placeholder="pl. Üzleti Tárgyalás, Randi, Színház, Laza Péntek..."
                  value={manualEvent}
                  onChange={(e) => setManualEvent(e.target.value)}
                  className="custom-input text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                  Időjárási Kontextus:
                </label>
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-xs flex items-center justify-between">
                  <span className="text-white font-medium flex items-center gap-1.5">
                    <CloudSun className="w-4 h-4 text-[var(--accent-gold)]" />
                    <span>{weather?.city || 'Budapest'}, {weather?.temperature || 21}°C</span>
                  </span>
                  <span className="text-[var(--text-muted)]">{weather?.condition || 'Kellemes'}</span>
                </div>
              </div>
            </div>

            {/* 6 Category Slots Grid */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider block">
                Szett Elemek ({getSelectedManualItems().length} darab kiválasztva):
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {SLOT_DEFINITIONS.map(slot => {
                  const selected = manualSlots[slot.key];

                  return (
                    <div 
                      key={slot.key}
                      className={`p-3 rounded-2xl border transition-all relative flex flex-col justify-between ${
                        selected
                          ? 'bg-gradient-to-br from-amber-500/15 via-black/50 to-black/80 border-[var(--accent-gold)] shadow-md shadow-[var(--accent-gold)]/10'
                          : 'bg-black/30 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-white/90 flex items-center gap-1.5">
                          <span>{slot.icon}</span>
                          <span>{slot.label}</span>
                        </span>
                        {slot.required && !selected && (
                          <span className="text-[9px] text-amber-400/80 font-mono">Ajánlott</span>
                        )}
                      </div>

                      {selected ? (
                        <div className="flex items-center gap-3">
                          <div 
                            onClick={() => openLightbox([selected], 0, selected.name)}
                            className="w-14 h-14 rounded-xl overflow-hidden bg-[#06080e] p-1 shrink-0 border border-white/10 flex items-center justify-center cursor-pointer group"
                            title="Nagyítás"
                          >
                            <img src={selected.imageUrl} alt={selected.name} className="w-full h-full object-contain group-hover:scale-110 transition-transform" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="text-xs font-bold text-white truncate">{selected.name}</h5>
                            <span className="text-[10px] text-[var(--text-muted)] block truncate">
                              {selected.brand || selected.material || selected.color}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              <button
                                type="button"
                                onClick={() => setSlotPickerModal(slot.key)}
                                className="text-[10px] text-[var(--accent-gold)] hover:underline"
                              >
                                Csere
                              </button>
                              <span className="text-white/20">•</span>
                              <button
                                type="button"
                                onClick={() => handleClearSlot(slot.key)}
                                className="text-[10px] text-rose-400 hover:underline"
                              >
                                Törlés
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSlotPickerModal(slot.key)}
                          className="w-full py-4 border border-dashed border-white/15 hover:border-[var(--accent-gold)] rounded-xl flex flex-col items-center justify-center gap-1 text-[var(--text-muted)] hover:text-white transition-all group"
                        >
                          <Plus className="w-4 h-4 text-[var(--accent-gold)] group-hover:scale-110 transition-transform" />
                          <span className="text-xs">Válassz darabot</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Run Audit Button */}
            <button
              type="button"
              onClick={handleRunManualAudit}
              disabled={isAuditing || getSelectedManualItems().length < 2}
              className="btn-gold w-full py-3.5 text-sm sm:text-base font-serif font-bold shadow-xl flex items-center justify-center gap-2"
            >
              {isAuditing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Gemini 3.7 Flash auditálja a szettedet...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-black" />
                  <span>🎯 AI Stílus- és Összhang Ellenőrzés Futtatása</span>
                </>
              )}
            </button>

          </div>

          {/* Audit Results Presentation Card */}
          {manualAuditResult && (
            <div className="glass-card p-6 sm:p-7 border-[var(--border-gold)] space-y-6 animate-scale-up">
              
              {/* Header & Verdict */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/10">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-bold shadow-xl ${
                    manualAuditResult.score >= 85
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : manualAuditResult.score >= 70
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  }`}>
                    <span className="text-2xl leading-none">{manualAuditResult.score}%</span>
                    <span className="text-[9px] uppercase font-mono tracking-wider opacity-80 mt-0.5">Összhang</span>
                  </div>

                  <div>
                    <span className="badge badge-gold text-[10px]">
                      Sartorial Szakvélemény
                    </span>
                    <h3 className="text-xl font-serif font-bold text-white mt-1">
                      {manualAuditResult.verdict}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openLightbox(getSelectedManualItems(), 0, manualAuditResult.verdict)}
                    className="btn-secondary text-xs"
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                    <span>Lookbook Nézet</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveManualAuditedOutfit}
                    disabled={isManualSaved}
                    className={`btn-gold text-xs py-2 px-3.5 flex items-center gap-1.5 ${
                      isManualSaved ? 'opacity-80 bg-emerald-600 text-white' : ''
                    }`}
                  >
                    {isManualSaved ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Elmentve</span>
                      </>
                    ) : (
                      <>
                        <Bookmark className="w-4 h-4" />
                        <span>Szett Mentése</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Detailed Evaluation Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {manualAuditResult.eventAlignment && (
                  <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-white">
                      <Compass className="w-4 h-4 text-[var(--accent-gold)]" />
                      <span>🎯 Esemény & Dress Code Összhang:</span>
                    </div>
                    <p className="text-[var(--text-secondary)] leading-relaxed">
                      {manualAuditResult.eventAlignment}
                    </p>
                  </div>
                )}

                {manualAuditResult.colorHarmony && (
                  <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-white">
                      <Sparkles className="w-4 h-4 text-[var(--accent-gold)]" />
                      <span>🎨 Színharmónia & Kontraszt:</span>
                    </div>
                    <p className="text-[var(--text-secondary)] leading-relaxed">
                      {manualAuditResult.colorHarmony}
                    </p>
                  </div>
                )}

                {manualAuditResult.fabricSynergy && (
                  <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-white">
                      <Feather className="w-4 h-4 text-emerald-400" />
                      <span>🧵 Anyagok & Textúrák Találkozása:</span>
                    </div>
                    <p className="text-[var(--text-secondary)] leading-relaxed">
                      {manualAuditResult.fabricSynergy}
                    </p>
                  </div>
                )}

                {manualAuditResult.layeringEvaluation && (
                  <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-white">
                      <CloudSun className="w-4 h-4 text-amber-400" />
                      <span>🧥 Rétegezés & Időjárási Komfort:</span>
                    </div>
                    <p className="text-[var(--text-secondary)] leading-relaxed">
                      {manualAuditResult.layeringEvaluation}
                    </p>
                  </div>
                )}
              </div>

              {/* Strengths & Suggestions */}
              {manualAuditResult.suggestions && manualAuditResult.suggestions.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2 text-xs">
                  <span className="font-bold text-amber-200 block">💡 Javasolt Stílustuning & Finomítások:</span>
                  <ul className="list-disc list-inside space-y-1 text-amber-200/90">
                    {manualAuditResult.suggestions.map((sug, sIdx) => (
                      <li key={sIdx}>{sug}</li>
                    ))}
                  </ul>
                </div>
              )}

            </div>
          )}

        </div>
      )}

      {/* Slot Garment Picker Modal */}
      {slotPickerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="glass-card max-w-xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col border-[var(--border-gold)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-[var(--accent-gold)]" />
                <h3 className="font-serif font-bold text-white text-base">
                  Darab Kiválasztása ({SLOT_DEFINITIONS.find(s => s.key === slotPickerModal)?.label})
                </h3>
              </div>
              <button onClick={() => setSlotPickerModal(null)} className="text-[var(--text-muted)] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              {getSlotCandidates(slotPickerModal).map(item => (
                <div
                  key={item.id}
                  onClick={() => handleSetSlotItem(slotPickerModal, item)}
                  className="p-2.5 rounded-xl bg-black/30 border border-white/5 hover:border-[var(--accent-gold)] cursor-pointer flex items-center justify-between gap-3 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-lg bg-[#07090e] p-1 shrink-0 overflow-hidden">
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-white truncate">{item.name}</h4>
                      <span className="text-[10px] text-[var(--text-muted)] block truncate">
                        {item.brand ? `${item.brand} • ` : ''}{item.color || ''} {item.material ? `(${item.material})` : ''}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-[var(--accent-gold)] font-bold shrink-0">Kiválasztás ➔</span>
                </div>
              ))}

              {getSlotCandidates(slotPickerModal).length === 0 && (
                <div className="p-8 text-center text-xs text-[var(--text-muted)]">
                  Nincs elérhető ruha ebben a kategóriában a gardróbodban.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Universal Lightbox Modal */}
      {lightboxData.isOpen && (
        <GarmentLightboxModal
          isOpen={lightboxData.isOpen}
          items={lightboxData.items}
          initialIndex={lightboxData.initialIndex}
          outfitTitle={lightboxData.outfitTitle}
          onClose={() => setLightboxData(prev => ({ ...prev, isOpen: false }))}
        />
      )}

    </div>
  );
}
