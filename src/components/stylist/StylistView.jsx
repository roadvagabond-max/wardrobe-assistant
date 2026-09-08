import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Sparkles, MessageSquare, SlidersHorizontal as Sliders, Plus, X, Bookmark, Check, 
  Loader2, Compass, Feather, CloudSun, Maximize2, RefreshCw, AlertCircle, ChevronUp,
  Layers, Trash2, ShieldAlert, Info, FolderHeart
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { auditManualOutfit } from '../../services/gemini';
import { createGarmentSvgPlaceholder } from '../../services/imageOptimizer';
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

function cleanSartorialText(text) {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/\bsartorial\s+szempontb[oó]l\b/gi, 'stílusszempontból')
    .replace(/\bsartorial\s+eleganci[aá][t]?\b/gi, 'klasszikus eleganciát')
    .replace(/\bsartorialis\b/gi, 'stílusos')
    .replace(/\bsartoriális\b/gi, 'stílusos')
    .replace(/\bsartorial\b/gi, 'stílusos')
    .replace(/\bSartorial\b/gi, 'Stílus');
}

export default function StylistView({ weather, setWeather, initialAnchorItem = null }) {
  const { wardrobe, profile, saveOutfit, savedOutfits = [], deleteOutfit } = useAuth();

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
  const [showGuide, setShowGuide] = useState(false);
  const [isSavedOutfitsOpen, setIsSavedOutfitsOpen] = useState(false);
  const [saveToastMessage, setSaveToastMessage] = useState('');

  // Validation Toast State
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
      } else if (type === 'belt') {
        const existingBeltIndex = next.accessories.findIndex(a => a.subCategory === 'belt' || (a.name || '').toLowerCase().includes('öv') || (a.name || '').toLowerCase().includes('belt'));
        if (existingBeltIndex >= 0) {
          const updated = [...next.accessories];
          updated[existingBeltIndex] = item;
          next.accessories = updated;
        } else {
          next.accessories = [...next.accessories, item];
        }
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

      // Quiet luxury: zero confetti, subtle feedback
    } catch (err) {
      console.error('AI Elemzési hiba:', err);
      showToast(`Hiba történt az elemzés során: ${err.message}`);
    } finally {
      setIsAuditing(false);
    }
  };

  // Save outfit directly or from audit (100% no confetti, elegant feedback)
  const handleDirectSaveOutfit = () => {
    if (selectedItems.length === 0) return;

    const occasionTitle = manualEvent.trim() || 'Saját Mix & Match Szett';
    const topItem = ensemble.upperLayers[0] || ensemble.dress;
    const lowerItem = ensemble.lower;
    const defaultTitle = topItem && lowerItem 
      ? `${topItem.name} + ${lowerItem.name}`
      : topItem 
        ? `${topItem.name} összeállítás`
        : occasionTitle;

    const newOutfit = {
      id: `manual-outfit-${Date.now()}`,
      title: manualAuditResult?.verdict ? cleanSartorialText(manualAuditResult.verdict) : defaultTitle,
      styleArchetype: profile?.preferredStyles?.[0] || 'Egyéni Stílus',
      occasion: occasionTitle,
      matchScore: manualAuditResult?.score || 92,
      stylingNotes: manualAuditResult?.colorHarmony || `${selectedItems.length} darabból összeállított egyéni kapszula szett.`,
      layeringAdvice: manualAuditResult?.layeringEvaluation || '',
      culturalFitReasoning: manualAuditResult?.eventAlignment || '',
      items: selectedItems,
      ensembleSnapshot: ensemble,
      isManual: true,
      savedAt: new Date().toISOString()
    };

    saveOutfit(newOutfit);
    setIsManualSaved(true);
    setSaveToastMessage('✨ Szett sikeresen elmentve a Kedvencekhez!');
    setTimeout(() => setSaveToastMessage(''), 3500);
  };

  const handleSaveManualAuditedOutfit = () => {
    handleDirectSaveOutfit();
  };

  // Load a saved outfit back onto the Mix & Match canvas
  const handleLoadSavedOutfit = (savedOutfit) => {
    if (!savedOutfit) return;
    if (savedOutfit.ensembleSnapshot) {
      setEnsemble(savedOutfit.ensembleSnapshot);
    } else if (savedOutfit.items && Array.isArray(savedOutfit.items)) {
      const newEnsemble = {
        upperLayers: [],
        dress: null,
        lower: null,
        shoes: null,
        socks: null,
        accessories: []
      };
      savedOutfit.items.forEach(item => {
        const cat = item.category?.toLowerCase() || '';
        if (cat === 'dresses') {
          newEnsemble.dress = item;
        } else if (cat === 'tops' || cat === 'knitwear' || cat === 'outerwear') {
          newEnsemble.upperLayers.push(item);
        } else if (cat === 'bottoms' || cat === 'skirts') {
          newEnsemble.lower = item;
        } else if (cat === 'shoes') {
          newEnsemble.shoes = item;
        } else if (cat === 'accessories') {
          newEnsemble.accessories.push(item);
        } else {
          newEnsemble.upperLayers.push(item);
        }
      });
      setEnsemble(newEnsemble);
    }
    if (savedOutfit.occasion) {
      setManualEvent(savedOutfit.occasion);
    }
    setIsManualSaved(true);
    setIsSavedOutfitsOpen(false);
    setSaveToastMessage('✨ Mentett szett betöltve a vászonra!');
    setTimeout(() => setSaveToastMessage(''), 3000);
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

      if (type === 'belt') {
        return cat === 'accessories' && (sub === 'belt' || name.includes('öv') || name.includes('belt'));
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
    <div className="space-y-4 pb-32">

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

      {/* Save Toast Notification */}
      {saveToastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] max-w-md w-[calc(100%-2rem)] px-4 py-3 rounded-xl bg-[#0f1420]/95 border border-emerald-500/40 shadow-2xl backdrop-blur-md flex items-center gap-3 text-slate-100 text-xs font-medium animate-slide-down">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="flex-1 leading-snug">{saveToastMessage}</span>
          <button 
            type="button"
            onClick={() => setSaveToastMessage('')}
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CLEAN TOP HEADER: STABLE TOGGLE (LEFT) & SAVED OUTFITS + HELP (RIGHT) */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between gap-2 sm:gap-3 pt-1 pb-1">
        {/* Stable 2-Segmented Toggle: Left Mix & Match (🧩), Right AI Stylist (💬) */}
        <div className="flex items-center bg-[#0d121c] p-1 rounded-xl border border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setActiveMode('manual-builder')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 sm:gap-1.5 transition-all ${
              activeMode === 'manual-builder'
                ? 'bg-slate-200 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>🧩 Mix & Match</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('chat')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 sm:gap-1.5 transition-all ${
              activeMode === 'chat'
                ? 'bg-slate-200 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>💬 AI Stylist</span>
          </button>
        </div>

        {/* Right: Saved Outfits & Help info toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsSavedOutfitsOpen(true)}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#0d121c] hover:bg-slate-800 border border-slate-800 text-xs flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors shrink-0"
            title="Mentett szettek megtekintése"
          >
            <Bookmark className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-semibold hidden sm:inline">Mentett szettek</span>
            {savedOutfits.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-slate-700 text-[10px] text-slate-200 font-mono shrink-0">
                {savedOutfits.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowGuide(prev => !prev)}
            className={`p-2 rounded-xl border transition-colors shrink-0 ${
              showGuide 
                ? 'bg-slate-200 text-slate-900 border-white' 
                : 'bg-[#0d121c] text-slate-400 hover:text-white border-slate-800'
            }`}
            title="Súgó ki/bekapcsolása"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Collapsible First-time Guidance (Only visible on toggle or first view) */}
      {showGuide && (
        <ModuleFirstTimeGuide 
          moduleId="stylist"
          title="Hogyan működik a Stylist Modul?"
          subtitle="Személyes mester stylist konzultáció és anatómiai szettépítő"
          description="A Stylist közvetlen kapcsolatban áll veled, és teljes mélységében ismeri a ruhatáradat, stílusodat és szabályaidat."
          points={[
            "A Szettépítő felületén anatómiai sorrendben válogathatod össze a darabokat.",
            "Az AI az esztétikai összhangot, a színeket, textúrákat és a helyi időjárást értékeli.",
            "Az esemény megadása opcionális: ha üres, a szett önálló stílusát vizsgálja."
          ]}
          actionLabel="Irány a Gardrób"
          onAction={() => { window.location.hash = '#wardrobe'; }}
          wardrobeCount={wardrobe?.length || 0}
        />
      )}

      {/* ========================================================================= */}
      {/* MODE 1: MASTER STYLIST CHAT */}
      {/* ========================================================================= */}
      {activeMode === 'chat' && (
        <StylistChatView weather={weather} />
      )}

      {/* ========================================================================= */}
      {/* MODE 2: PURE LOOKBOOK FLATLAY CANVAS */}
      {/* ========================================================================= */}
      {activeMode === 'manual-builder' && (
        <div className="space-y-3">

          {/* Slim Event Bar with Quick Chips & Reset */}
          <div className="p-3 rounded-2xl bg-[#0f1420]/70 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="flex-1 relative min-w-0">
                <input
                  type="text"
                  placeholder="Esemény megadása (opcionális, pl. Toszkánai esküvő, Laza péntek)..."
                  value={manualEvent}
                  onChange={(e) => setManualEvent(e.target.value)}
                  className="w-full bg-[#0a0e17] border border-slate-700/70 rounded-xl px-3.5 py-2 pr-8 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-slate-400 transition-colors"
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

              {selectedItems.length > 0 && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleDirectSaveOutfit}
                    className={`text-xs flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg border transition-all shrink-0 ${
                      isManualSaved
                        ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-200 hover:bg-white text-slate-950 font-bold border-transparent shadow-sm'
                    }`}
                    title="Szett mentése a kedvencekhez"
                  >
                    {isManualSaved ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Elmentve</span>
                      </>
                    ) : (
                      <>
                        <Bookmark className="w-3.5 h-3.5" />
                        <span>Mentés</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleResetEnsemble}
                    className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg hover:bg-rose-500/10 transition-colors shrink-0"
                    title="Szett ürítése"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Kiürítés</span>
                  </button>
                </div>
              )}
            </div>

            {/* Quick Event Preset Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
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

          {/* ========================================================================= */}
          {/* THE SEAMLESS VISUAL LOOKBOOK FLATLAY (TEXTLESS, TIGHTLY SPACED) */}
          {/* ========================================================================= */}
          <div className="p-3 sm:p-4 rounded-3xl bg-[#0a0e17] border border-slate-800 space-y-2.5 shadow-2xl">

            {/* 1. FELSŐTEST ZÓNA (Upper Body: Single large initial card OR horizontal flow + compact [+]) */}
            {ensemble.dress ? (
              /* Dress active: One large lookbook card */
              <div className="relative w-full aspect-[4/3] max-h-72 rounded-2xl overflow-hidden bg-[#070a12] border border-slate-700 group">
                <img 
                  src={ensemble.dress.imageUrl || createGarmentSvgPlaceholder('dresses', ensemble.dress.name, ensemble.dress.color)} 
                  alt={ensemble.dress.name}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = createGarmentSvgPlaceholder('dresses', ensemble.dress.name, ensemble.dress.color);
                  }}
                  onClick={() => openLightbox([ensemble.dress], 0, ensemble.dress.name)}
                  className="w-full h-full object-contain p-2 cursor-pointer group-hover:scale-105 transition-transform duration-300" 
                />
                {/* Floating Corner Actions directly on the photo */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleRemoveDress(); }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/75 hover:bg-rose-600 text-slate-200 hover:text-white flex items-center justify-center backdrop-blur-sm transition-colors z-10 shadow"
                  title="Ruha levétele"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleOpenPicker('dress'); }}
                  className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-black/75 hover:bg-slate-700 text-slate-200 hover:text-white flex items-center justify-center backdrop-blur-sm transition-colors z-10 shadow"
                  title="Ruha cseréje"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : ensemble.upperLayers.length === 0 ? (
              /* Empty initial state: Exactly ONE large button */
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenPicker('upper')}
                  className="flex-1 py-12 border border-dashed border-slate-700 hover:border-slate-400 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-slate-200 transition-all bg-[#090d15]/50 group"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-800/80 group-hover:bg-slate-700 flex items-center justify-center text-slate-300">
                    <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </div>
                  <span className="text-xs font-semibold">+ Válassz felsőt (Ing, Póló, Pulóver, Zakó)</span>
                </button>

                {isFemale && (
                  <button
                    type="button"
                    onClick={() => handleOpenPicker('dress')}
                    className="w-24 py-12 border border-dashed border-slate-800 hover:border-slate-600 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-slate-400 hover:text-slate-200 transition-all bg-[#090d15]/30 shrink-0"
                    title="Egyberuha választása"
                  >
                    <span className="text-xl">👗</span>
                    <span className="text-[11px] font-medium">Ruha</span>
                  </button>
                )}
              </div>
            ) : (
              /* Loaded Upper Layers: Horizontal flow + ONE single compact [+] button */
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
                {ensemble.upperLayers.map((layer, idx) => (
                  <div 
                    key={layer.id || idx}
                    className="relative w-36 h-44 sm:w-44 sm:h-52 rounded-2xl overflow-hidden bg-[#070a12] border border-slate-700 shrink-0 group"
                  >
                    <img 
                      src={layer.imageUrl || createGarmentSvgPlaceholder(layer.category, layer.name, layer.color)} 
                      alt={layer.name}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = createGarmentSvgPlaceholder(layer.category, layer.name, layer.color);
                      }}
                      onClick={() => openLightbox([layer], 0, layer.name)}
                      className="w-full h-full object-contain p-2 cursor-pointer group-hover:scale-105 transition-transform duration-300" 
                    />

                    {/* Floating Corner Actions directly on the photo */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleRemoveUpperLayer(idx); }}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/75 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center backdrop-blur-sm transition-colors z-10 shadow"
                      title="Réteg törlése"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleOpenPicker('upper', idx); }}
                      className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-black/75 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center backdrop-blur-sm transition-colors z-10 shadow"
                      title="Réteg cseréje"
                    >
                      <RefreshCw className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {/* Exactly 1 small compact [+] button for additional layers (up to 4) */}
                {ensemble.upperLayers.length < 4 && (
                  <button
                    type="button"
                    onClick={() => handleOpenPicker('upper')}
                    className="w-16 h-44 sm:h-52 rounded-2xl border border-dashed border-slate-700 hover:border-slate-400 bg-[#090d15]/40 hover:bg-[#090d15] flex flex-col items-center justify-center text-slate-400 hover:text-slate-200 shrink-0 transition-all group"
                    title="További réteg hozzáadása"
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-800/80 group-hover:bg-slate-700 flex items-center justify-center text-slate-300 mb-1">
                      <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    </div>
                    <span className="text-[10px] font-mono opacity-80">+ Réteg</span>
                  </button>
                )}
              </div>
            )}

            {/* 2. ALSÓTEST ZÓNA (Lower Body: Trousers/Skirt + Belt tightly beside it) */}
            {!ensemble.dress && (
              <div className="flex items-center gap-2">
                {/* Pants / Skirt Card */}
                {ensemble.lower ? (
                  <div className="relative flex-1 h-44 sm:h-52 rounded-2xl overflow-hidden bg-[#070a12] border border-slate-700 group">
                    <img 
                      src={ensemble.lower.imageUrl || createGarmentSvgPlaceholder(ensemble.lower.category, ensemble.lower.name, ensemble.lower.color)} 
                      alt={ensemble.lower.name}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = createGarmentSvgPlaceholder(ensemble.lower.category, ensemble.lower.name, ensemble.lower.color);
                      }}
                      onClick={() => openLightbox([ensemble.lower], 0, ensemble.lower.name)}
                      className="w-full h-full object-contain p-2 cursor-pointer group-hover:scale-105 transition-transform duration-300" 
                    />
                    {/* Floating Corner Actions directly on the photo */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleRemoveLower(); }}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/75 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center backdrop-blur-sm transition-colors z-10 shadow"
                      title="Nadrág törlése"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleOpenPicker('lower'); }}
                      className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-black/75 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center backdrop-blur-sm transition-colors z-10 shadow"
                      title="Nadrág cseréje"
                    >
                      <RefreshCw className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleOpenPicker('lower')}
                    className="flex-1 h-44 sm:h-52 border border-dashed border-slate-700 hover:border-slate-400 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-slate-200 transition-all bg-[#090d15]/50 group"
                  >
                    <div className="w-9 h-9 rounded-full bg-slate-800/80 group-hover:bg-slate-700 flex items-center justify-center text-slate-300">
                      <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    </div>
                    <span className="text-xs font-semibold">+ Nadrág vagy Szoknya</span>
                  </button>
                )}

                {/* Waist / Belt Slot */}
                {ensemble.accessories.some(a => (a.subCategory === 'belt' || (a.name || '').toLowerCase().includes('öv'))) ? (
                  (() => {
                    const belt = ensemble.accessories.find(a => a.subCategory === 'belt' || (a.name || '').toLowerCase().includes('öv'));
                    const beltIdx = ensemble.accessories.indexOf(belt);
                    return (
                      <div className="relative w-24 sm:w-32 h-44 sm:h-52 rounded-2xl overflow-hidden bg-[#070a12] border border-slate-700 shrink-0 group">
                        <img 
                          src={belt.imageUrl || createGarmentSvgPlaceholder('accessories', belt.name, belt.color)} 
                          alt={belt.name}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = createGarmentSvgPlaceholder('accessories', belt.name, belt.color);
                          }}
                          onClick={() => openLightbox([belt], 0, belt.name)}
                          className="w-full h-full object-contain p-2 cursor-pointer group-hover:scale-105 transition-transform duration-300" 
                        />
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleRemoveAccessory(beltIdx); }}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/75 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center backdrop-blur-sm transition-colors z-10 shadow"
                          title="Öv törlése"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleOpenPicker('belt', beltIdx); }}
                          className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-black/75 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center backdrop-blur-sm transition-colors z-10 shadow"
                          title="Öv cseréje"
                        >
                          <RefreshCw className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })()
                ) : (
                  <button
                    type="button"
                    onClick={() => handleOpenPicker('belt')}
                    className="w-20 sm:w-24 h-44 sm:h-52 border border-dashed border-slate-800 hover:border-slate-600 bg-[#090d15]/30 hover:bg-[#090d15] rounded-2xl flex flex-col items-center justify-center text-slate-500 hover:text-slate-300 shrink-0 transition-colors group"
                    title="Öv hozzáadása"
                  >
                    <Plus className="w-4 h-4 mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-medium">+ Öv</span>
                  </button>
                )}
              </div>
            )}

            {/* 3. LÁBBELI & ZOKNI ZÓNA (Footwear & Socks tightly beside it) */}
            <div className="flex items-center gap-2">
              {/* Shoes Card */}
              {ensemble.shoes ? (
                <div className="relative flex-1 h-36 sm:h-44 rounded-2xl overflow-hidden bg-[#070a12] border border-slate-700 group">
                  <img 
                    src={ensemble.shoes.imageUrl || createGarmentSvgPlaceholder('shoes', ensemble.shoes.name, ensemble.shoes.color)} 
                    alt={ensemble.shoes.name}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = createGarmentSvgPlaceholder('shoes', ensemble.shoes.name, ensemble.shoes.color);
                    }}
                    onClick={() => openLightbox([ensemble.shoes], 0, ensemble.shoes.name)}
                    className="w-full h-full object-contain p-2 cursor-pointer group-hover:scale-105 transition-transform duration-300" 
                  />
                  {/* Floating Corner Actions directly on the photo */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleRemoveShoes(); }}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/75 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center backdrop-blur-sm transition-colors z-10 shadow"
                    title="Cipő törlése"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleOpenPicker('shoes'); }}
                    className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-black/75 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center backdrop-blur-sm transition-colors z-10 shadow"
                    title="Cipő cseréje"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleOpenPicker('shoes')}
                  className="flex-1 h-36 sm:h-44 border border-dashed border-slate-700 hover:border-slate-400 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-slate-200 transition-all bg-[#090d15]/50 group"
                >
                  <div className="w-9 h-9 rounded-full bg-slate-800/80 group-hover:bg-slate-700 flex items-center justify-center text-slate-300">
                    <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  </div>
                  <span className="text-xs font-semibold">+ Cipő vagy Csizma</span>
                </button>
              )}

              {/* Socks / Tights Slot */}
              {ensemble.socks ? (
                <div className="relative w-24 sm:w-32 h-36 sm:h-44 rounded-2xl overflow-hidden bg-[#070a12] border border-slate-700 shrink-0 group">
                  <img 
                    src={ensemble.socks.imageUrl || createGarmentSvgPlaceholder('accessories', ensemble.socks.name, ensemble.socks.color)} 
                    alt={ensemble.socks.name}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = createGarmentSvgPlaceholder('accessories', ensemble.socks.name, ensemble.socks.color);
                    }}
                    onClick={() => openLightbox([ensemble.socks], 0, ensemble.socks.name)}
                    className="w-full h-full object-contain p-2 cursor-pointer group-hover:scale-105 transition-transform duration-300" 
                  />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleRemoveSocks(); }}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/75 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center backdrop-blur-sm transition-colors z-10 shadow"
                    title="Zokni törlése"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleOpenPicker('socks'); }}
                    className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-black/75 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center backdrop-blur-sm transition-colors z-10 shadow"
                    title="Zokni cseréje"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleOpenPicker('socks')}
                  className="w-20 sm:w-24 h-36 sm:h-44 border border-dashed border-slate-800 hover:border-slate-600 bg-[#090d15]/30 hover:bg-[#090d15] rounded-2xl flex flex-col items-center justify-center text-slate-500 hover:text-slate-300 shrink-0 transition-colors group"
                  title="Zokni vagy harisnya hozzáadása"
                >
                  <Plus className="w-4 h-4 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-medium">+ Zokni</span>
                </button>
              )}
            </div>

            {/* 4. KIEGÉSZÍTŐK ZÓNA (Accessories: Watch, Bag, etc.) */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pt-1">
              {ensemble.accessories
                .filter(a => !(a.subCategory === 'belt' || (a.name || '').toLowerCase().includes('öv')))
                .map((acc, idx) => {
                  const originalIdx = ensemble.accessories.indexOf(acc);
                  return (
                    <div 
                      key={acc.id || idx}
                      className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-[#070a12] border border-slate-700 shrink-0 group"
                    >
                      <img 
                        src={acc.imageUrl || createGarmentSvgPlaceholder('accessories', acc.name, acc.color)} 
                        alt={acc.name}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = createGarmentSvgPlaceholder('accessories', acc.name, acc.color);
                        }}
                        onClick={() => openLightbox([acc], 0, acc.name)}
                        className="w-full h-full object-contain p-1.5 cursor-pointer group-hover:scale-105 transition-transform duration-300" 
                      />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleRemoveAccessory(originalIdx); }}
                        className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/75 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center backdrop-blur-sm transition-colors z-10 shadow"
                        title="Törlés"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleOpenPicker('accessory', originalIdx); }}
                        className="absolute bottom-1.5 right-1.5 w-5 h-5 rounded-full bg-black/75 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center backdrop-blur-sm transition-colors z-10 shadow"
                        title="Kiegészítő cseréje"
                      >
                        <RefreshCw className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  );
                })}

              {/* 1 single compact [+] button for accessories */}
              {ensemble.accessories.length < 4 && (
                <button
                  type="button"
                  onClick={() => handleOpenPicker('accessory')}
                  className="w-16 h-20 sm:h-24 rounded-2xl border border-dashed border-slate-800 hover:border-slate-600 bg-[#090d15]/30 hover:bg-[#090d15] flex flex-col items-center justify-center text-slate-500 hover:text-slate-300 shrink-0 transition-colors group"
                  title="Kiegészítő hozzáadása (óra, táska, sál)"
                >
                  <Plus className="w-4 h-4 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-mono opacity-80">+ Ékszer</span>
                </button>
              )}
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* FLOATING STATUS SCORE PILL (Bottom Fixed) */}
      {/* ========================================================================= */}
      {activeMode === 'manual-builder' && (
        <div className="fixed bottom-24 sm:bottom-6 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-full sm:max-w-lg z-40">
          
          {/* STATE A: Loading / Auditing */}
          {isAuditing && (
            <div className="w-full px-5 py-3.5 rounded-2xl bg-[#0d121c]/95 border border-slate-500 shadow-2xl backdrop-blur-md flex items-center justify-center gap-3 text-slate-100 text-xs font-semibold score-glow-titanium">
              <Loader2 className="w-4 h-4 animate-spin text-slate-300 shrink-0" />
              <span className="truncate">Az AI elemzi a szettet és az összhangot...</span>
            </div>
          )}

          {/* STATE B: Already Audited (Click opens Details Drawer - Direct Save on right) */}
          {!isAuditing && manualAuditResult && scoreBadgeConfig && (
            <div className="flex items-center gap-2 w-full min-w-0">
              <div 
                onClick={() => setIsDrawerOpen(true)}
                className={`flex-1 min-w-0 px-3.5 sm:px-5 py-2.5 sm:py-3 rounded-2xl border backdrop-blur-md flex items-center justify-between gap-2 sm:gap-3 cursor-pointer transition-all hover:brightness-110 shadow-2xl ${scoreBadgeConfig.glowClass}`}
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <span className="text-base sm:text-xl shrink-0">{scoreBadgeConfig.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                      <span className="text-sm sm:text-base font-bold font-serif shrink-0">{manualAuditResult.score}%</span>
                      <span className="text-xs font-medium opacity-90 truncate min-w-0">{scoreBadgeConfig.title}</span>
                    </div>
                    <span className="text-[10px] opacity-75 block truncate">
                      {cleanSartorialText(manualAuditResult.verdict)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[11px] sm:text-xs font-semibold shrink-0 whitespace-nowrap pl-1.5 sm:pl-2 border-l border-white/10">
                  <span className="hidden xs:inline sm:inline">Részletek</span>
                  <ChevronUp className="w-3.5 h-3.5" />
                </div>
              </div>

              <button
                type="button"
                onClick={handleDirectSaveOutfit}
                className={`px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl border backdrop-blur-md flex items-center justify-center gap-1.5 text-xs font-bold transition-all shadow-2xl shrink-0 ${
                  isManualSaved
                    ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50'
                    : 'bg-slate-200 hover:bg-white text-slate-950 border-white'
                }`}
                title="Szett mentése a kedvencekhez"
              >
                {isManualSaved ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="hidden sm:inline">Elmentve</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="w-4 h-4" />
                    <span>Mentés</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* STATE C: Ready to Audit (Minimum is met) */}
          {!isAuditing && !manualAuditResult && validationState.isComplete && (
            <div className="flex items-center gap-2 w-full min-w-0">
              <button
                type="button"
                onClick={handleRunManualAudit}
                className="flex-1 min-w-0 px-3.5 sm:px-5 py-3.5 rounded-2xl bg-slate-200 hover:bg-white text-slate-900 font-serif font-bold text-xs sm:text-sm shadow-2xl transition-all flex items-center justify-center gap-2 score-glow-titanium truncate"
              >
                <Sparkles className="w-4 h-4 text-slate-900 shrink-0" />
                <span className="truncate">🎯 Összhang Elemzése ({selectedItems.length})</span>
              </button>

              <button
                type="button"
                onClick={handleDirectSaveOutfit}
                className={`px-3.5 sm:px-4 py-3.5 rounded-2xl border backdrop-blur-md flex items-center justify-center gap-1.5 text-xs font-bold transition-all shadow-2xl shrink-0 ${
                  isManualSaved
                    ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50'
                    : 'bg-[#0f1420]/90 hover:bg-slate-800 text-slate-200 border-slate-700'
                }`}
                title="Szett mentése azonnal"
              >
                {isManualSaved ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="hidden sm:inline">Elmentve</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="w-4 h-4 text-slate-400" />
                    <span>Mentés</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* STATE D: Incomplete (Minimum NOT met - Guides the user) */}
          {!isAuditing && !manualAuditResult && !validationState.isComplete && (
            <div 
              onClick={handleRunManualAudit}
              className="w-full px-4 sm:px-5 py-3 rounded-2xl bg-[#090d15]/90 border border-slate-700/80 backdrop-blur-md shadow-xl flex items-center justify-between cursor-pointer text-slate-400 hover:text-slate-200 text-xs transition-colors gap-2"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="w-2 h-2 rounded-full bg-slate-600 animate-pulse shrink-0" />
                <span className="truncate">
                  {validationState.missing === 'upper' && 'Válassz legalább egy felsőt a kezdéshez'}
                  {validationState.missing === 'lower' && 'Válassz egy nadrágot vagy szoknyát'}
                  {validationState.missing === 'shoes' && 'Válassz egy cipőt a befejezéshez'}
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-500 shrink-0">
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
                  {pickerConfig.type === 'belt' && 'Öv Kiválasztása'}
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
                  className="group relative rounded-xl overflow-hidden bg-[#070a12] border border-slate-800 hover:border-slate-400 cursor-pointer transition-all flex flex-col h-56 sm:h-64"
                >
                  <div className="w-full h-36 sm:h-44 shrink-0 p-2 bg-[#05070c] flex items-center justify-center overflow-hidden">
                    <img 
                      src={item.imageUrl || createGarmentSvgPlaceholder(item.category, item.name, item.color)} 
                      alt={item.name} 
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = createGarmentSvgPlaceholder(item.category, item.name, item.color);
                      }}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" 
                    />
                  </div>

                  <div className="p-2.5 bg-[#090d15] flex flex-col justify-between flex-1 border-t border-slate-800/50 min-w-0">
                    <h4 className="text-xs font-semibold text-slate-200 truncate group-hover:text-white" title={item.name}>
                      {item.name}
                    </h4>
                    <span className="text-[10px] text-slate-400 truncate mt-0.5">
                      {item.brand ? `${item.brand} • ` : ''}{item.color || item.category || ''}
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
                  <h3 className="text-base font-serif font-bold text-slate-100">{cleanSartorialText(manualAuditResult.verdict)}</h3>
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
                    {cleanSartorialText(manualAuditResult.eventAlignment)}
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
                    {cleanSartorialText(manualAuditResult.colorHarmony)}
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
                    {cleanSartorialText(manualAuditResult.fabricSynergy)}
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
                    {cleanSartorialText(manualAuditResult.layeringEvaluation)}
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
                    {cleanSartorialText(manualAuditResult.bodyFitVerdict)}
                  </p>
                </div>
              )}

              {/* Fit Mismatch Warning */}
              {manualAuditResult.fitMismatchWarning && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-1">
                  <span className="font-bold block">Figyelmeztetés:</span>
                  <p>{cleanSartorialText(manualAuditResult.fitMismatchWarning)}</p>
                </div>
              )}

              {/* Strengths */}
              {manualAuditResult.strengths && manualAuditResult.strengths.length > 0 && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1.5">
                  <span className="font-bold text-emerald-300 block">✨ Erősségek:</span>
                  <ul className="list-disc list-inside space-y-1 text-emerald-200/90">
                    {manualAuditResult.strengths.map((st, sIdx) => (
                      <li key={sIdx}>{cleanSartorialText(st)}</li>
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
                      <li key={sgIdx}>{cleanSartorialText(sg)}</li>
                    ))}
                  </ul>
                </div>
              )}

            </div>

            {/* Drawer Footer Actions */}
            <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-[#090d15] flex items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsDrawerOpen(false);
                  openLightbox(selectedItems, 0, manualAuditResult.verdict);
                }}
                className="px-2.5 sm:px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Lookbook</span>
                <span className="hidden sm:inline">Nézet</span>
              </button>

              <button
                type="button"
                onClick={handleSaveManualAuditedOutfit}
                disabled={isManualSaved}
                className={`px-3 sm:px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shrink-0 ${
                  isManualSaved
                    ? 'bg-emerald-600 text-white cursor-default'
                    : 'bg-slate-200 hover:bg-white text-slate-950'
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
                    <span>Mentés</span>
                    <span className="hidden sm:inline">a Kedvencekhez</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* SAVED OUTFITS DRAWER / MODAL (PORTAL BASED) */}
      {/* ========================================================================= */}
      {isSavedOutfitsOpen && createPortal(
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsSavedOutfitsOpen(false); }}
          className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-2xl max-h-[90dvh] sm:max-h-[85vh] bg-[#0c101a] border-t sm:border border-slate-700/80 rounded-t-3xl sm:rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-slide-up"
          >
            {/* Drawer Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-[#090d15]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-200">
                  <Bookmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-serif font-bold text-slate-100">Mentett Szettek</h3>
                  <p className="text-xs text-slate-400">
                    {savedOutfits.length} összeállítás a gardróbodból
                  </p>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => setIsSavedOutfitsOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                title="Bezárás"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 overscroll-contain">
              {savedOutfits.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-slate-800/50 border border-slate-700 mx-auto flex items-center justify-center text-2xl">
                    👔
                  </div>
                  <p className="text-sm text-slate-300 font-semibold">Még nincs elmentett szetted</p>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Válogass össze ruhadarabokat a vásznon, majd kattints a „Mentés” gombra az elmentésükhöz!
                  </p>
                </div>
              ) : (
                savedOutfits.map((saved) => (
                  <div 
                    key={saved.id}
                    className="p-4 rounded-2xl bg-[#090d15] border border-slate-800 hover:border-slate-700 transition-all space-y-3 group"
                  >
                    <div className="flex items-start justify-between gap-3 min-w-0">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <h4 className="text-sm font-semibold text-slate-200 group-hover:text-white truncate">
                            {saved.title || saved.occasion || 'Mentett Szett'}
                          </h4>
                          {saved.matchScore && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 border border-slate-700 text-slate-300">
                              {saved.matchScore}%
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {saved.occasion && saved.occasion !== saved.title ? `${saved.occasion} • ` : ''}
                          {saved.savedAt ? new Date(saved.savedAt).toLocaleDateString('hu-HU') : 'Mentve'}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleLoadSavedOutfit(saved)}
                          className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-white text-slate-950 text-xs font-bold transition-colors flex items-center gap-1 shadow-sm"
                          title="Betöltés a szettépítő vászonra"
                        >
                          <span>Betöltés</span>
                        </button>
                        {deleteOutfit && (
                          <button
                            type="button"
                            onClick={() => deleteOutfit(saved.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Szett törlése"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Thumbnail strip of items */}
                    {saved.items && saved.items.length > 0 && (
                      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
                        {saved.items.map((it, idx) => (
                          <div 
                            key={it.id || idx}
                            className="w-12 h-14 rounded-lg bg-[#05070c] border border-slate-800 shrink-0 p-1 flex items-center justify-center overflow-hidden"
                            title={it.name}
                          >
                            <img 
                              src={it.imageUrl || createGarmentSvgPlaceholder(it.category, it.name, it.color)}
                              alt={it.name}
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = createGarmentSvgPlaceholder(it.category, it.name, it.color);
                              }}
                              className="w-full h-full object-contain"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
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
