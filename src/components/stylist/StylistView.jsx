import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Sparkles, MessageSquare, SlidersHorizontal as Sliders, Plus, X, Bookmark, Check, 
  Loader2, Compass, Feather, CloudSun, Maximize2, RefreshCw, AlertCircle, ChevronUp,
  Layers, Trash2, ShieldAlert
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { auditManualOutfit } from '../../services/gemini';
import confetti from 'canvas-confetti';
import StylistChatView from './StylistChatView';
import GarmentLightboxModal from '../common/GarmentLightboxModal';
import ModuleFirstTimeGuide from '../common/ModuleFirstTimeGuide';

const EVENT_PRESETS = [
  'Üzleti Tárgyalás',
  'Smart Casual Iroda',
  'Randi / Esti Program',
  'Hétvégi Kiruccanás',
  'Elegáns Rendezvény'
];

export default function StylistView({ weather, setWeather, initialAnchorItem = null }) {
  const { wardrobe, profile, saveOutfit } = useAuth();

  // Mode: 'manual-builder' (Default Mix & Match) | 'chat' (Master Stylist Chat)
  const [activeMode, setActiveMode] = useState(() => {
    return localStorage.getItem('sartorial_stylist_mode') || 'manual-builder';
  });

  // Ensemble State: Structured anatomical layers
  const [ensemble, setEnsemble] = useState({
    upperLayers: [], // Array of garments (max 4)
    lower: null,     // Single garment (trousers / skirt)
    dress: null,     // Single garment (if chosen, integrates upper & lower)
    shoes: null,     // Footwear
    socks: null,     // Socks / titokzokni / tights
    accessories: []  // Max 4 accessories (belt, watch, bag, neckwear/jewelry)
  });

  // Target slot modal picker: { type: 'upper'|'lower'|'dress'|'shoes'|'socks'|'accessory', replaceIndex?: number }
  const [pickerConfig, setPickerConfig] = useState(null);
  const [pickerCategoryFilter, setPickerCategoryFilter] = useState('all');

  // Event Context
  const [manualEvent, setManualEvent] = useState('');
  
  // Auditing & Evaluation State
  const [isAuditing, setIsAuditing] = useState(false);
  const [manualAuditResult, setManualAuditResult] = useState(null);
  const [isManualSaved, setIsManualSaved] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Validation Toast State: { visible: boolean, message: string }
  const [toastMessage, setToastMessage] = useState(null);

  // Lightbox Modal State
  const [lightboxData, setLightboxData] = useState({
    isOpen: false,
    items: [],
    initialIndex: 0,
    outfitTitle: ''
  });

  const isFemale = useMemo(() => {
    const g = String(profile?.gender || '').toLowerCase();
    return g === 'nő' || g === 'female' || g === 'woman';
  }, [profile?.gender]);

  useEffect(() => {
    try {
      localStorage.setItem('sartorial_stylist_mode', activeMode);
    } catch (_) {}
  }, [activeMode]);

  // Handle initial anchor item if passed from other views
  useEffect(() => {
    if (initialAnchorItem) {
      const cat = initialAnchorItem.category;
      if (cat === 'dresses') {
        setEnsemble(prev => ({ ...prev, dress: initialAnchorItem, lower: null, upperLayers: [] }));
      } else if (cat === 'bottoms' || cat === 'skirts') {
        setEnsemble(prev => ({ ...prev, lower: initialAnchorItem, dress: null }));
      } else if (cat === 'shoes') {
        setEnsemble(prev => ({ ...prev, shoes: initialAnchorItem }));
      } else if (cat === 'accessories') {
        setEnsemble(prev => ({
          ...prev,
          accessories: prev.accessories.some(a => a.id === initialAnchorItem.id)
            ? prev.accessories
            : [...prev.accessories, initialAnchorItem].slice(0, 4)
        }));
      } else {
        // Upper layers (tops, knitwear, outerwear)
        setEnsemble(prev => ({
          ...prev,
          dress: null,
          upperLayers: prev.upperLayers.some(u => u.id === initialAnchorItem.id)
            ? prev.upperLayers
            : [...prev.upperLayers, initialAnchorItem].slice(0, 4)
        }));
      }
      setActiveMode('manual-builder');
    }
  }, [initialAnchorItem]);

  // Flatten all active selected items in ensemble
  const selectedItems = useMemo(() => {
    const list = [];
    if (ensemble.dress) {
      list.push(ensemble.dress);
    }
    ensemble.upperLayers.forEach(i => { if (i) list.push(i); });
    if (ensemble.lower && !ensemble.dress) list.push(ensemble.lower);
    if (ensemble.shoes) list.push(ensemble.shoes);
    if (ensemble.socks) list.push(ensemble.socks);
    ensemble.accessories.forEach(a => { if (a) list.push(a); });
    return list;
  }, [ensemble]);

  // Check minimum outfit validation requirements
  const validationState = useMemo(() => {
    const hasFootwear = Boolean(ensemble.shoes);
    
    if (ensemble.dress) {
      const isComplete = hasFootwear;
      return {
        isComplete,
        readyCount: (ensemble.dress ? 1 : 0) + (hasFootwear ? 1 : 0),
        totalNeeded: 2,
        missing: !hasFootwear ? 'shoes' : null
      };
    }

    const hasUpper = ensemble.upperLayers.length > 0;
    const hasLower = Boolean(ensemble.lower);
    let count = 0;
    if (hasUpper) count++;
    if (hasLower) count++;
    if (hasFootwear) count++;

    let missing = null;
    if (!hasUpper) missing = 'upper';
    else if (!hasLower) missing = 'lower';
    else if (!hasFootwear) missing = 'shoes';

    return {
      isComplete: hasUpper && hasLower && hasFootwear,
      readyCount: count,
      totalNeeded: 3,
      missing
    };
  }, [ensemble]);

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(prev => prev === message ? null : prev);
    }, 3600);
  };

  // Open candidate picker modal
  const handleOpenPicker = (type, replaceIndex = null) => {
    setPickerCategoryFilter('all');
    setPickerConfig({ type, replaceIndex });
  };

  // Select item from picker modal
  const handleSelectItem = (item) => {
    if (!pickerConfig) return;
    const { type, replaceIndex } = pickerConfig;

    setEnsemble(prev => {
      const next = { ...prev };

      if (type === 'dress') {
        next.dress = item;
        next.lower = null; // Clear separate bottoms
      } else if (type === 'upper') {
        next.dress = null; // Clear dress if adding standard upper
        if (replaceIndex !== null && replaceIndex >= 0 && replaceIndex < next.upperLayers.length) {
          const updated = [...next.upperLayers];
          updated[replaceIndex] = item;
          next.upperLayers = updated;
        } else {
          if (next.upperLayers.length < 4 && !next.upperLayers.some(u => u.id === item.id)) {
            next.upperLayers = [...next.upperLayers, item];
          }
        }
      } else if (type === 'lower') {
        next.dress = null; // Clear dress if adding separate lower
        next.lower = item;
      } else if (type === 'shoes') {
        next.shoes = item;
      } else if (type === 'socks') {
        next.socks = item;
      } else if (type === 'accessory') {
        if (replaceIndex !== null && replaceIndex >= 0 && replaceIndex < next.accessories.length) {
          const updated = [...next.accessories];
          updated[replaceIndex] = item;
          next.accessories = updated;
        } else {
          if (next.accessories.length < 4 && !next.accessories.some(a => a.id === item.id)) {
            next.accessories = [...next.accessories, item];
          }
        }
      }

      return next;
    });

    setPickerConfig(null);
    setManualAuditResult(null);
    setIsManualSaved(false);
  };

  // Slot removal functions
  const handleRemoveUpperLayer = (index) => {
    setEnsemble(prev => ({
      ...prev,
      upperLayers: prev.upperLayers.filter((_, idx) => idx !== index)
    }));
    setManualAuditResult(null);
    setIsManualSaved(false);
  };

  const handleRemoveDress = () => {
    setEnsemble(prev => ({ ...prev, dress: null }));
    setManualAuditResult(null);
    setIsManualSaved(false);
  };

  const handleRemoveLower = () => {
    setEnsemble(prev => ({ ...prev, lower: null }));
    setManualAuditResult(null);
    setIsManualSaved(false);
  };

  const handleRemoveShoes = () => {
    setEnsemble(prev => ({ ...prev, shoes: null }));
    setManualAuditResult(null);
    setIsManualSaved(false);
  };

  const handleRemoveSocks = () => {
    setEnsemble(prev => ({ ...prev, socks: null }));
    setManualAuditResult(null);
    setIsManualSaved(false);
  };

  const handleRemoveAccessory = (index) => {
    setEnsemble(prev => ({
      ...prev,
      accessories: prev.accessories.filter((_, idx) => idx !== index)
    }));
    setManualAuditResult(null);
    setIsManualSaved(false);
  };

  const handleResetEnsemble = () => {
    setEnsemble({
      upperLayers: [],
      lower: null,
      dress: null,
      shoes: null,
      socks: null,
      accessories: []
    });
    setManualEvent('');
    setManualAuditResult(null);
    setIsManualSaved(false);
    setIsDrawerOpen(false);
  };

  // Run Gemini Sartorial Audit
  const handleRunManualAudit = async () => {
    if (!validationState.isComplete) {
      if (validationState.missing === 'upper') {
        showToast('Válassz legalább egy inget, pólót vagy pulóvert az elemzéshez!');
      } else if (validationState.missing === 'lower') {
        showToast('Válassz egy nadrágot vagy szoknyát az összeállításhoz!');
      } else if (validationState.missing === 'shoes') {
        showToast('Válassz egy cipőt a lábbeli harmóniájának és formalitásának auditálásához!');
      } else {
        showToast('A kiegészítők önmagukban nem alkotnak szettet: válassz ruhadarabokat is!');
      }
      return;
    }

    setIsAuditing(true);
    setManualAuditResult(null);
    setIsManualSaved(false);

    try {
      const auditRes = await auditManualOutfit({
        items: selectedItems,
        eventName: manualEvent.trim(),
        weather: weather || { temperature: 21, condition: 'Kellemes' },
        styleProfile: profile
      });

      setManualAuditResult(auditRes);

      if (auditRes?.score >= 85) {
        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.7 },
            colors: ['#e2e8f0', '#10b981', '#38bdf8']
          });
        } catch (_) {}
      }
    } catch (err) {
      console.error('AI Elemzési hiba:', err);
      showToast(`Hiba történt az elemzés során: ${err.message}`);
    } finally {
      setIsAuditing(false);
    }
  };

  // Save outfit to Firestore savedOutfits
  const handleSaveManualAuditedOutfit = () => {
    if (!manualAuditResult || selectedItems.length === 0) return;

    const newOutfit = {
      id: `manual-outfit-${Date.now()}`,
      title: manualAuditResult.verdict || 'Saját Összeállítás',
      styleArchetype: profile?.preferredStyles?.[0] || 'Egyéni Stílus',
      occasion: manualEvent.trim() || 'Mindennapi Megjelenés',
      matchScore: manualAuditResult.score || 90,
      stylingNotes: manualAuditResult.colorHarmony || 'Harmonikus saját szett.',
      layeringAdvice: manualAuditResult.layeringEvaluation || '',
      culturalFitReasoning: manualAuditResult.eventAlignment || '',
      weatherSuitability: `Kiértékelve a(z) ${weather?.city || 'Budapest'} (${weather?.temperature ?? 21}°C) időjárásra.`,
      items: selectedItems,
      isManual: true
    };

    saveOutfit(newOutfit);
    setIsManualSaved(true);
  };

  const openLightbox = (items, initialIndex = 0, outfitTitle = '') => {
    setLightboxData({
      isOpen: true,
      items: items || [],
      initialIndex: initialIndex >= 0 ? initialIndex : 0,
      outfitTitle: outfitTitle || 'Részletek'
    });
  };

  // Filter candidates for the open modal picker
  const pickerCandidates = useMemo(() => {
    if (!pickerConfig || !wardrobe) return [];
    const { type } = pickerConfig;

    return wardrobe.filter(item => {
      if (item.condition === 'Lecserélendő' || item.condition === 'Javításra vár') return false;

      // Don't show items already in the ensemble
      if (selectedItems.some(s => s.id === item.id)) return false;

      const cat = item.category;
      const sub = (item.subCategory || '').toLowerCase();
      const name = (item.name || '').toLowerCase();

      if (type === 'dress') {
        return cat === 'dresses' || sub === 'dress' || name.includes('ruha');
      }

      if (type === 'upper') {
        const isUpper = cat === 'tops' || cat === 'knitwear' || cat === 'outerwear' ||
          name.includes('ing') || name.includes('póló') || name.includes('pulóver') ||
          name.includes('zakó') || name.includes('kabát') || name.includes('mellény');
        
        if (!isUpper) return false;

        if (pickerCategoryFilter === 'tops') return cat === 'tops' || name.includes('ing') || name.includes('póló');
        if (pickerCategoryFilter === 'knitwear') return cat === 'knitwear' || name.includes('pulóver') || name.includes('kardigán');
        if (pickerCategoryFilter === 'outerwear') return cat === 'outerwear' || name.includes('zakó') || name.includes('kabát');
        return true;
      }

      if (type === 'lower') {
        return cat === 'bottoms' || cat === 'skirts' || name.includes('nadrág') || name.includes('farmer') || name.includes('szoknya');
      }

      if (type === 'shoes') {
        return cat === 'shoes' || name.includes('cipő') || name.includes('loafer') || name.includes('csizma') || name.includes('sneaker');
      }

      if (type === 'socks') {
        return cat === 'accessories' && (sub === 'socks' || sub === 'tights' || name.includes('zokni') || name.includes('harisnya'));
      }

      if (type === 'accessory') {
        return cat === 'accessories' || name.includes('öv') || name.includes('óra') || name.includes('táska') || name.includes('sál') || name.includes('nyakkendő');
      }

      return false;
    });
  }, [pickerConfig, wardrobe, selectedItems, pickerCategoryFilter]);

  // Lock body scroll when picker modal or details drawer is open
  useEffect(() => {
    if (pickerConfig || isDrawerOpen) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [pickerConfig, isDrawerOpen]);

  // Score bar styling classes & labels
  const scoreBadgeConfig = useMemo(() => {
    if (!manualAuditResult) return null;
    const s = manualAuditResult.score;
    if (s >= 85) {
      return {
        glowClass: 'score-glow-emerald border-emerald-500/50 bg-[#061810]/95 text-emerald-300',
        badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        icon: '✨',
        title: 'Kiemelkedő Összhang'
      };
    }
    if (s >= 70) {
      return {
        glowClass: 'score-glow-amber border-amber-500/50 bg-[#1a1408]/95 text-amber-300',
        badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        icon: '🟡',
        title: 'Harmonikus Szett'
      };
    }
    return {
      glowClass: 'score-glow-rose border-rose-500/50 bg-[#1a080c]/95 text-rose-300',
      badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      icon: '⚠️',
      title: 'Ütköző Darabok'
    };
  }, [manualAuditResult]);

  return (
    <div className="space-y-6 pb-32">

      {/* Floating Minimalist Validation Toast */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] max-w-md w-[calc(100%-2rem)] px-4 py-3 rounded-xl bg-[#0f1420]/95 border border-slate-400/40 shadow-2xl backdrop-blur-md flex items-center gap-3 text-slate-100 text-xs font-medium animate-slide-down">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="flex-1 leading-snug">{toastMessage}</span>
          <button 
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Header with Mode Toggle (Quiet Luxury: Obsidian & Titanium) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 text-slate-200 border border-white/15">
              {activeMode === 'manual-builder' ? '🧩 Mix & Match' : '💬 AI Stylist'}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
              {activeMode === 'manual-builder' ? 'Anatómiai Sziluett' : 'Master Stylist Csevegés'}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold font-serif text-slate-100 tracking-tight mt-1">
            {activeMode === 'manual-builder' ? 'Mix & Match Szettépítő' : 'AI Stylist Csevegés'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            {activeMode === 'manual-builder' 
              ? 'Állítsd össze a rétegeket a fejtetőtől a lábbeliig, és kérj rá mélyreható szakértői auditot.' 
              : 'Konzultálj a ruhatárad darabjairól, a dress code-okról és a stílusirányzatokról.'}
          </p>
        </div>

        {/* Mode Selector Toggle */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          {activeMode === 'manual-builder' ? (
            <button
              type="button"
              onClick={() => setActiveMode('chat')}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 transition-all shadow-md"
              title="Váltás a csevegéshez"
            >
              <MessageSquare className="w-3.5 h-3.5 text-slate-300" />
              <span>💬 Stylist Csevegés</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setActiveMode('manual-builder')}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 bg-slate-200 text-slate-900 font-bold shadow-md hover:bg-white transition-all"
              title="Vissza a szettépítőhöz"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-900" />
              <span>🧩 Szettépítő</span>
            </button>
          )}

          <div className="flex items-center bg-[#0d121c] p-1 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => setActiveMode('manual-builder')}
              className={`p-1.5 rounded-lg text-xs transition-all ${
                activeMode === 'manual-builder'
                  ? 'bg-slate-200 text-slate-900 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Mix & Match Szettépítő"
            >
              <Sliders className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('chat')}
              className={`p-1.5 rounded-lg text-xs transition-all ${
                activeMode === 'chat'
                  ? 'bg-slate-200 text-slate-900 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Master Stylist Csevegés"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Guidance */}
      <ModuleFirstTimeGuide 
        moduleId="stylist"
        title="Hogyan működik a Stylist Modul?"
        subtitle="Személyes mester stylist konzultáció és anatómiai szettépítő"
        description="A Stylist közvetlen beszélgetésben áll veled, és teljes mélységében ismeri a testalkatodat, színtípusodat és egyéni szabályaidat."
        points={[
          "A Szettépítő felületén anatómiai sorrendben válogathatod össze a rétegeket.",
          "Az AI a belső stílusharmóniát, színeket, textúrákat és a helyi időjárást auditálja.",
          "Az esemény megadása opcionális: ha üres, a szett önálló esztétikáját értékeli."
        ]}
        actionLabel="Irány a Gardrób"
        onAction={() => { window.location.hash = '#wardrobe'; }}
        wardrobeCount={wardrobe?.length || 0}
      />

      {/* ========================================================================= */}
      {/* MODE 1: MASTER STYLIST CHAT */}
      {/* ========================================================================= */}
      {activeMode === 'chat' && (
        <StylistChatView weather={weather} />
      )}

      {/* ========================================================================= */}
      {/* MODE 2: ANATOMICAL SILHOUETTE CANVAS (OBSIDIAN & TITANIUM) */}
      {/* ========================================================================= */}
      {activeMode === 'manual-builder' && (
        <div className="space-y-6">

          {/* Compact Optional Event & Weather Bar */}
          <div className="p-4 rounded-2xl bg-[#0f1420]/80 border border-slate-700/60 backdrop-blur-md shadow-lg space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Esemény megadása (opcionális, pl. Toszkán esküvő, Laza péntek)..."
                  value={manualEvent}
                  onChange={(e) => setManualEvent(e.target.value)}
                  className="w-full bg-[#0a0e17] border border-slate-700/70 rounded-xl px-3.5 py-2.5 pr-8 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-slate-400 transition-colors"
                />
                {manualEvent && (
                  <button
                    type="button"
                    onClick={() => setManualEvent('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 transition-colors"
                    title="Esemény törlése"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Weather Chip */}
              <div className="px-3 py-2 rounded-xl bg-[#0a0e17] border border-slate-700/70 text-xs flex items-center gap-2 shrink-0 text-slate-300">
                <CloudSun className="w-4 h-4 text-slate-300" />
                <span className="font-semibold text-slate-200">{weather?.city || 'Budapest'}, {weather?.temperature ?? 21}°C</span>
                <span className="text-[11px] text-slate-500">({weather?.condition || 'Kellemes'})</span>
              </div>
            </div>

            {/* Quick Event Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mr-1 shrink-0">Gyors alkalom:</span>
              {EVENT_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setManualEvent(preset)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all shrink-0 ${
                    manualEvent === preset
                      ? 'bg-slate-200 text-slate-950 font-bold'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/50'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Reset Action */}
          {selectedItems.length > 0 && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleResetEnsemble}
                className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-rose-500/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Szett kiürítése</span>
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* THE ANATOMICAL SILHOUETTE CANVAS */}
          {/* ========================================================================= */}
          <div className="space-y-4">

            {/* 1. FELSŐTEST ZÓNA (Upper Body Zone) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#0d121c] border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <span>👔</span>
                  <span>Felsőtest Rétegek</span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    {ensemble.dress ? '(Egyberuhával átfogva)' : `(${ensemble.upperLayers.length}/4 réteg)`}
                  </span>
                </span>

                {/* Female Dress Switch Shortcut */}
                {isFemale && !ensemble.dress && (
                  <button
                    type="button"
                    onClick={() => handleOpenPicker('dress')}
                    className="text-[11px] text-slate-300 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 flex items-center gap-1.5 transition-colors"
                  >
                    <span>👗</span>
                    <span>Egyberuha választása</span>
                  </button>
                )}
              </div>

              {/* If a Dress is active */}
              {ensemble.dress ? (
                <div className="p-3.5 rounded-xl bg-[#090d15] border border-slate-700 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div 
                      onClick={() => openLightbox([ensemble.dress], 0, ensemble.dress.name)}
                      className="w-16 h-20 rounded-lg overflow-hidden bg-[#05070c] p-1 shrink-0 border border-slate-800 cursor-pointer group"
                    >
                      <img src={ensemble.dress.imageUrl} alt={ensemble.dress.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">👗 Egyberuha</span>
                      <h4 className="text-sm font-semibold text-slate-100 truncate">{ensemble.dress.name}</h4>
                      <span className="text-xs text-slate-400 truncate block">
                        {ensemble.dress.brand ? `${ensemble.dress.brand} • ` : ''}{ensemble.dress.color || ''} {ensemble.dress.material ? `(${ensemble.dress.material})` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenPicker('dress')}
                      className="text-xs text-slate-300 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700"
                    >
                      Csere
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveDress}
                      className="text-xs text-rose-400 hover:text-rose-300 p-1"
                      title="Ruha levétele"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Standard Upper Body Horizontal Layers Grid */
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {ensemble.upperLayers.map((layer, idx) => (
                    <div 
                      key={layer.id || idx}
                      className="p-3 rounded-xl bg-[#090d15] border border-slate-700 flex flex-col justify-between relative group"
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                        <span className="font-mono">Réteg {idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveUpperLayer(idx)}
                          className="text-slate-500 hover:text-rose-400 p-0.5"
                          title="Réteg törlése"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div 
                        onClick={() => openLightbox([layer], 0, layer.name)}
                        className="w-full aspect-square rounded-lg bg-[#05070c] p-1.5 overflow-hidden border border-slate-800 flex items-center justify-center cursor-pointer mb-2 group-hover:border-slate-600 transition-colors"
                      >
                        <img src={layer.imageUrl} alt={layer.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform" />
                      </div>

                      <div className="min-w-0">
                        <h5 className="text-xs font-semibold text-slate-200 truncate">{layer.name}</h5>
                        <span className="text-[10px] text-slate-500 truncate block">
                          {layer.brand ? `${layer.brand} • ` : ''}{layer.color}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenPicker('upper', idx)}
                        className="mt-2 w-full py-1 text-[11px] text-slate-400 hover:text-slate-100 bg-slate-800/60 hover:bg-slate-800 rounded-lg text-center transition-colors"
                      >
                        Csere
                      </button>
                    </div>
                  ))}

                  {/* Add Layer Button (if < 4 layers) */}
                  {ensemble.upperLayers.length < 4 && (
                    <button
                      type="button"
                      onClick={() => handleOpenPicker('upper')}
                      className="p-4 border border-dashed border-slate-700 hover:border-slate-400 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-slate-100 transition-all aspect-square group"
                    >
                      <div className="w-9 h-9 rounded-full bg-slate-800/80 group-hover:bg-slate-700 flex items-center justify-center text-slate-300">
                        <Plus className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-medium">
                        {ensemble.upperLayers.length === 0 ? '+ Bázis felső' : '+ Új réteg'}
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 2. ALSÓTEST & DERÉKVONAL ZÓNA (Lower Body Zone) */}
            {!ensemble.dress && (
              <div className="p-4 sm:p-5 rounded-2xl bg-[#0d121c] border border-slate-800 space-y-3">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <span>👖</span>
                  <span>Alsótest (Nadrág / Szoknya)</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Bottoms Slot */}
                  {ensemble.lower ? (
                    <div className="p-3.5 rounded-xl bg-[#090d15] border border-slate-700 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div 
                          onClick={() => openLightbox([ensemble.lower], 0, ensemble.lower.name)}
                          className="w-14 h-16 rounded-lg bg-[#05070c] p-1 overflow-hidden shrink-0 border border-slate-800 cursor-pointer group"
                        >
                          <img src={ensemble.lower.imageUrl} alt={ensemble.lower.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform" />
                        </div>
                        <div className="min-w-0">
                          <h5 className="text-xs font-semibold text-slate-100 truncate">{ensemble.lower.name}</h5>
                          <span className="text-[10px] text-slate-400 block truncate">
                            {ensemble.lower.brand ? `${ensemble.lower.brand} • ` : ''}{ensemble.lower.color}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenPicker('lower')}
                          className="text-xs text-slate-300 hover:text-white px-2 py-1 rounded bg-slate-800"
                        >
                          Csere
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveLower}
                          className="text-slate-500 hover:text-rose-400 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenPicker('lower')}
                      className="p-4 border border-dashed border-slate-700 hover:border-slate-400 rounded-xl flex items-center justify-center gap-2 text-slate-400 hover:text-slate-100 transition-all group"
                    >
                      <Plus className="w-4 h-4 text-slate-400 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-medium">Válassz nadrágot vagy szoknyát</span>
                    </button>
                  )}

                  {/* Anatomical Waist / Belt Slot */}
                  {ensemble.accessories.some(a => (a.subCategory === 'belt' || (a.name || '').toLowerCase().includes('öv'))) ? (
                    (() => {
                      const belt = ensemble.accessories.find(a => a.subCategory === 'belt' || (a.name || '').toLowerCase().includes('öv'));
                      const beltIdx = ensemble.accessories.indexOf(belt);
                      return (
                        <div className="p-3.5 rounded-xl bg-[#090d15] border border-slate-700 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div 
                              onClick={() => openLightbox([belt], 0, belt.name)}
                              className="w-12 h-12 rounded-lg bg-[#05070c] p-1 overflow-hidden shrink-0 border border-slate-800 cursor-pointer group"
                            >
                              <img src={belt.imageUrl} alt={belt.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-[9px] uppercase font-mono text-slate-500">🎗️ Deréköv</span>
                              <h5 className="text-xs font-semibold text-slate-200 truncate">{belt.name}</h5>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveAccessory(beltIdx)}
                            className="text-slate-500 hover:text-rose-400 p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })()
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenPicker('accessory')}
                      className="p-3.5 border border-dashed border-slate-800 hover:border-slate-600 rounded-xl flex items-center justify-center gap-2 text-slate-500 hover:text-slate-300 text-xs transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Opcionális Bőröv</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 3. LÁBBELI & ZOKNI ZÓNA (Footwear Zone) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#0d121c] border border-slate-800 space-y-3">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <span>👞</span>
                <span>Lábbelik & Zokni</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Shoes Slot */}
                {ensemble.shoes ? (
                  <div className="p-3.5 rounded-xl bg-[#090d15] border border-slate-700 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div 
                        onClick={() => openLightbox([ensemble.shoes], 0, ensemble.shoes.name)}
                        className="w-14 h-16 rounded-lg bg-[#05070c] p-1 overflow-hidden shrink-0 border border-slate-800 cursor-pointer group"
                      >
                        <img src={ensemble.shoes.imageUrl} alt={ensemble.shoes.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform" />
                      </div>
                      <div className="min-w-0">
                        <h5 className="text-xs font-semibold text-slate-100 truncate">{ensemble.shoes.name}</h5>
                        <span className="text-[10px] text-slate-400 block truncate">
                          {ensemble.shoes.brand ? `${ensemble.shoes.brand} • ` : ''}{ensemble.shoes.color}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenPicker('shoes')}
                        className="text-xs text-slate-300 hover:text-white px-2 py-1 rounded bg-slate-800"
                      >
                        Csere
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveShoes}
                        className="text-slate-500 hover:text-rose-400 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleOpenPicker('shoes')}
                    className="p-4 border border-dashed border-slate-700 hover:border-slate-400 rounded-xl flex items-center justify-center gap-2 text-slate-400 hover:text-slate-100 transition-all group"
                  >
                    <Plus className="w-4 h-4 text-slate-400 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-medium">Válassz cipőt vagy csizmát</span>
                  </button>
                )}

                {/* Socks / Tights Slot */}
                {ensemble.socks ? (
                  <div className="p-3.5 rounded-xl bg-[#090d15] border border-slate-700 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div 
                        onClick={() => openLightbox([ensemble.socks], 0, ensemble.socks.name)}
                        className="w-12 h-12 rounded-lg bg-[#05070c] p-1 overflow-hidden shrink-0 border border-slate-800 cursor-pointer group"
                      >
                        <img src={ensemble.socks.imageUrl} alt={ensemble.socks.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[9px] uppercase font-mono text-slate-500">🧦 Zokni / Harisnya</span>
                        <h5 className="text-xs font-semibold text-slate-200 truncate">{ensemble.socks.name}</h5>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveSocks}
                      className="text-slate-500 hover:text-rose-400 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleOpenPicker('socks')}
                    className="p-3.5 border border-dashed border-slate-800 hover:border-slate-600 rounded-xl flex items-center justify-center gap-2 text-slate-500 hover:text-slate-300 text-xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Zokni vagy Harisnya</span>
                  </button>
                )}
              </div>
            </div>

            {/* 4. EGYÉB KIEGÉSZÍTŐK ZÓNA (Accessories Zone: Watch, Bag, Scarf, Jewelry) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#0d121c] border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <span>⌚</span>
                  <span>Kiegészítők & Ékszerek</span>
                  <span className="text-[10px] text-slate-500 font-normal">({ensemble.accessories.length}/4 db)</span>
                </span>

                {ensemble.accessories.length < 4 && (
                  <button
                    type="button"
                    onClick={() => handleOpenPicker('accessory')}
                    className="text-xs text-slate-300 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Hozzáadás</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {ensemble.accessories.map((acc, idx) => (
                  <div 
                    key={acc.id || idx}
                    className="p-2.5 rounded-xl bg-[#090d15] border border-slate-700 flex items-center justify-between gap-2"
                  >
                    <div 
                      onClick={() => openLightbox([acc], 0, acc.name)}
                      className="w-10 h-10 rounded-lg bg-[#05070c] p-1 overflow-hidden shrink-0 border border-slate-800 cursor-pointer"
                    >
                      <img src={acc.imageUrl} alt={acc.name} className="w-full h-full object-contain" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h6 className="text-[11px] font-medium text-slate-200 truncate">{acc.name}</h6>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAccessory(idx)}
                      className="text-slate-500 hover:text-rose-400 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {ensemble.accessories.length === 0 && (
                  <div className="col-span-2 sm:col-span-4 p-4 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                    Nincs hozzáadott kiegészítő (karóra, táska, sál).
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* FLOATING STATUS SCORE PILL (Bottom Fixed) */}
      {/* ========================================================================= */}
      {activeMode === 'manual-builder' && (
        <div className="fixed bottom-24 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-lg w-[calc(100%-2rem)]">
          
          {/* STATE A: Loading / Auditing */}
          {isAuditing && (
            <div className="px-5 py-3.5 rounded-2xl bg-[#0d121c]/95 border border-slate-500 shadow-2xl backdrop-blur-md flex items-center justify-center gap-3 text-slate-100 text-xs font-semibold score-glow-titanium">
              <Loader2 className="w-4 h-4 animate-spin text-slate-300" />
              <span>Az AI elemzi a szettet és a sartorial harmóniát...</span>
            </div>
          )}

          {/* STATE B: Already Audited (Click opens Details Drawer) */}
          {!isAuditing && manualAuditResult && scoreBadgeConfig && (
            <div 
              onClick={() => setIsDrawerOpen(true)}
              className={`px-5 py-3.5 rounded-2xl border backdrop-blur-md flex items-center justify-between cursor-pointer transition-all hover:brightness-110 ${scoreBadgeConfig.glowClass}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{scoreBadgeConfig.icon}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold font-serif">{manualAuditResult.score}%</span>
                    <span className="text-xs font-medium opacity-90">{scoreBadgeConfig.title}</span>
                  </div>
                  <span className="text-[10px] opacity-75 block truncate max-w-[220px] sm:max-w-xs">
                    {manualAuditResult.verdict}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-semibold pl-2">
                <span>Részletek</span>
                <ChevronUp className="w-4 h-4" />
              </div>
            </div>
          )}

          {/* STATE C: Ready to Audit (Minimum is met) */}
          {!isAuditing && !manualAuditResult && validationState.isComplete && (
            <button
              type="button"
              onClick={handleRunManualAudit}
              className="w-full px-5 py-3.5 rounded-2xl bg-slate-200 hover:bg-white text-slate-900 font-serif font-bold text-sm shadow-2xl transition-all flex items-center justify-center gap-2 score-glow-titanium"
            >
              <Sparkles className="w-4 h-4 text-slate-900" />
              <span>🎯 Összhang Auditálása ({selectedItems.length} darab kiválasztva)</span>
            </button>
          )}

          {/* STATE D: Incomplete (Minimum NOT met - Guides the user) */}
          {!isAuditing && !manualAuditResult && !validationState.isComplete && (
            <div 
              onClick={handleRunManualAudit}
              className="px-5 py-3 rounded-2xl bg-[#090d15]/90 border border-slate-700/80 backdrop-blur-md shadow-xl flex items-center justify-between cursor-pointer text-slate-400 hover:text-slate-200 text-xs transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-600 animate-pulse" />
                <span>
                  {validationState.missing === 'upper' && 'Válassz legalább egy felsőt a kezdéshez'}
                  {validationState.missing === 'lower' && 'Válassz egy nadrágot vagy szoknyát'}
                  {validationState.missing === 'shoes' && 'Válassz egy cipőt a befejezéshez'}
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                {validationState.readyCount}/{validationState.totalNeeded} kész
              </span>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* 2-COLUMN PHOTO-FIRST GARMENT PICKER (PORTAL BASED - ZERO SCROLL/TOP BUG) */}
      {/* ========================================================================= */}
      {pickerConfig && createPortal(
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setPickerConfig(null); }}
          className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[calc(100dvh-2rem)] sm:max-h-[88vh] bg-[#0c101a] border border-slate-700/80 rounded-2xl flex flex-col shadow-2xl overflow-hidden"
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-[#090d15]">
              <div>
                <h3 className="text-base font-serif font-bold text-slate-100">
                  {pickerConfig.type === 'upper' && 'Felsőtest Réteg Kiválasztása'}
                  {pickerConfig.type === 'dress' && 'Egyberuha Kiválasztása'}
                  {pickerConfig.type === 'lower' && 'Alsótest (Nadrág / Szoknya) Kiválasztása'}
                  {pickerConfig.type === 'shoes' && 'Lábbeli Kiválasztása'}
                  {pickerConfig.type === 'socks' && 'Zokni vagy Harisnya Kiválasztása'}
                  {pickerConfig.type === 'accessory' && 'Kiegészítő Kiválasztása'}
                </h3>
                <span className="text-xs text-slate-400">
                  {pickerCandidates.length} darab elérhető a gardróbodban
                </span>
              </div>

              <button 
                type="button"
                onClick={() => setPickerConfig(null)}
                className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                title="Bezárás"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Optional Subcategory Filter for Upper Layers */}
            {pickerConfig.type === 'upper' && (
              <div className="px-5 py-2.5 border-b border-slate-800/60 bg-[#070b12] flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0">
                {[
                  { id: 'all', label: 'Összes felső' },
                  { id: 'tops', label: '👔 Ingek & Pólók' },
                  { id: 'knitwear', label: '🧶 Pulóverek' },
                  { id: 'outerwear', label: '🧥 Zakók & Kabátok' }
                ].map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setPickerCategoryFilter(f.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                      pickerCategoryFilter === f.id
                        ? 'bg-slate-200 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}

            {/* 2-Column Pure Photo Grid (Zero Text Noise) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 grid grid-cols-2 gap-3 sm:gap-4 overscroll-contain">
              {pickerCandidates.map(item => (
                <div
                  key={item.id}
                  onClick={() => handleSelectItem(item)}
                  className="group relative rounded-xl overflow-hidden bg-[#070a12] border border-slate-800 hover:border-slate-400 cursor-pointer transition-all flex flex-col"
                >
                  <div className="w-full aspect-square p-2 bg-[#05070c] flex items-center justify-center overflow-hidden">
                    <img 
                      src={item.imageUrl} 
                      alt={item.name} 
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" 
                    />
                  </div>

                  <div className="p-2.5 bg-[#090d15] flex flex-col justify-between flex-1 border-t border-slate-800/50">
                    <h4 className="text-xs font-semibold text-slate-200 truncate group-hover:text-white">
                      {item.name}
                    </h4>
                    <span className="text-[10px] text-slate-500 truncate mt-0.5">
                      {item.brand ? `${item.brand} • ` : ''}{item.color || ''}
                    </span>
                  </div>
                </div>
              ))}

              {pickerCandidates.length === 0 && (
                <div className="col-span-2 py-16 text-center space-y-2">
                  <p className="text-sm text-slate-400 font-medium">Nincs elérhető darab ebben a kategóriában.</p>
                  <p className="text-xs text-slate-600">Adj hozzá új ruhákat a Gardrób menüpontban!</p>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* EXPANDABLE DETAILS DRAWER (PORTAL BASED - OBSIDIAN & TITANIUM) */}
      {/* ========================================================================= */}
      {isDrawerOpen && manualAuditResult && createPortal(
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsDrawerOpen(false); }}
          className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-2xl max-h-[90dvh] sm:max-h-[85vh] bg-[#0c101a] border-t sm:border border-slate-700/80 rounded-t-3xl sm:rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-slide-up"
          >
            {/* Drawer Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-[#090d15]">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-bold ${
                  manualAuditResult.score >= 85
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : manualAuditResult.score >= 70
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                }`}>
                  <span className="text-lg leading-none">{manualAuditResult.score}%</span>
                  <span className="text-[8px] uppercase font-mono tracking-wider opacity-80 mt-0.5">Pont</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Szakértői Elemzés</span>
                  <h3 className="text-base font-serif font-bold text-slate-100">{manualAuditResult.verdict}</h3>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs overscroll-contain">
              
              {/* Event / Context Alignment */}
              {manualAuditResult.eventAlignment && (
                <div className="p-4 rounded-xl bg-[#070a12] border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-slate-200">
                    <Compass className="w-4 h-4 text-slate-300" />
                    <span>🎯 {manualEvent.trim() ? 'Esemény & Dress Code Összhang:' : 'Stílusösszhang & Önazonosság:'}</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    {manualAuditResult.eventAlignment}
                  </p>
                </div>
              )}

              {/* Color Harmony */}
              {manualAuditResult.colorHarmony && (
                <div className="p-4 rounded-xl bg-[#070a12] border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-slate-200">
                    <Sparkles className="w-4 h-4 text-slate-300" />
                    <span>🎨 Színharmónia & Kontraszt:</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    {manualAuditResult.colorHarmony}
                  </p>
                </div>
              )}

              {/* Fabric Synergy */}
              {manualAuditResult.fabricSynergy && (
                <div className="p-4 rounded-xl bg-[#070a12] border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-slate-200">
                    <Feather className="w-4 h-4 text-slate-300" />
                    <span>🧵 Anyagok & Textúrák Találkozása:</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    {manualAuditResult.fabricSynergy}
                  </p>
                </div>
              )}

              {/* Layering & Weather Comfort */}
              {manualAuditResult.layeringEvaluation && (
                <div className="p-4 rounded-xl bg-[#070a12] border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-slate-200">
                    <CloudSun className="w-4 h-4 text-slate-300" />
                    <span>🧥 Rétegezés & Időjárási Komfort ({weather?.temperature ?? 21}°C):</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    {manualAuditResult.layeringEvaluation}
                  </p>
                </div>
              )}

              {/* Body Fit Verdict */}
              {manualAuditResult.bodyFitVerdict && (
                <div className="p-4 rounded-xl bg-[#070a12] border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-slate-200">
                    <Layers className="w-4 h-4 text-slate-300" />
                    <span>⚖️ Testalkati Arányok & Sziluett:</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    {manualAuditResult.bodyFitVerdict}
                  </p>
                </div>
              )}

              {/* Fit Mismatch Warning */}
              {manualAuditResult.fitMismatchWarning && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-1">
                  <span className="font-bold block">Figyelmeztetés:</span>
                  <p>{manualAuditResult.fitMismatchWarning}</p>
                </div>
              )}

              {/* Strengths */}
              {manualAuditResult.strengths && manualAuditResult.strengths.length > 0 && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1.5">
                  <span className="font-bold text-emerald-300 block">✨ Erősségek:</span>
                  <ul className="list-disc list-inside space-y-1 text-emerald-200/90">
                    {manualAuditResult.strengths.map((st, sIdx) => (
                      <li key={sIdx}>{st}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Suggestions */}
              {manualAuditResult.suggestions && manualAuditResult.suggestions.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1.5">
                  <span className="font-bold text-amber-300 block">💡 Javasolt Finomítások:</span>
                  <ul className="list-disc list-inside space-y-1 text-amber-200/90">
                    {manualAuditResult.suggestions.map((sg, sgIdx) => (
                      <li key={sgIdx}>{sg}</li>
                    ))}
                  </ul>
                </div>
              )}

            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-slate-800 bg-[#090d15] flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsDrawerOpen(false);
                  openLightbox(selectedItems, 0, manualAuditResult.verdict);
                }}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Lookbook Nézet</span>
              </button>

              <button
                type="button"
                onClick={handleSaveManualAuditedOutfit}
                disabled={isManualSaved}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md ${
                  isManualSaved
                    ? 'bg-emerald-600 text-white cursor-default'
                    : 'bg-slate-200 hover:bg-white text-slate-950'
                }`}
              >
                {isManualSaved ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Elmentve a Kedvencekhez</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="w-4 h-4" />
                    <span>Szett Mentése a Kedvencekhez</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>,
        document.body
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
