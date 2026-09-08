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

export function isCoatGarment(item) {
  if (!item) return false;
  const name = (item.name || '').toLowerCase();
  const sub = (item.subCategory || '').toLowerCase();
  const cat = (item.category || '').toLowerCase();
  return (
    name.includes('kabát') ||
    name.includes('dzseki') ||
    name.includes('overshirt') ||
    name.includes('ingdzseki') ||
    name.includes('shacket') ||
    name.includes('trench') ||
    name.includes('overcoat') ||
    name.includes('parka') ||
    name.includes('anorak') ||
    name.includes('télikabát') ||
    name.includes('szövetkabát') ||
    name.includes('bőrdzseki') ||
    name.includes('mellény') ||
    sub === 'coat' ||
    sub === 'overcoat' ||
    sub === 'jacket' ||
    sub === 'parka' ||
    sub === 'trench' ||
    sub === 'shacket' ||
    sub === 'overshirt' ||
    cat === 'outerwear'
  );
}

export default function StylistView({ 
  weather, 
  setWeather, 
  initialAnchorItem = null,
  activeMode: propActiveMode,
  setActiveMode: propSetActiveMode,
  isSavedOutfitsOpen: propIsSavedOutfitsOpen,
  setIsSavedOutfitsOpen: propSetIsSavedOutfitsOpen,
  showGuide: propShowGuide,
  setShowGuide: propSetShowGuide
}) {
  const { wardrobe, profile, saveOutfit, savedOutfits = [], deleteOutfit } = useAuth();

  // Mode: 'manual-builder' (Default Mix & Match) | 'chat' (Master Stylist Chat)
  const [internalActiveMode, setInternalActiveMode] = useState(() => {
    return localStorage.getItem('sartorial_stylist_mode') || 'manual-builder';
  });
  const activeMode = propActiveMode !== undefined ? propActiveMode : internalActiveMode;
  const setActiveMode = propSetActiveMode || setInternalActiveMode;

  // Ensemble State: Structured anatomical layers
  const [ensemble, setEnsemble] = useState({
    coats: [],       // Array of outer garments (max 2: overshirt/blazer/jacket + coat)
    upperLayers: [], // Array of inner/mid garments (max 2: shirt/t-shirt + sweater/cardigan)
    lower: null,     // Single garment (trousers / skirt)
    dress: null,     // Single garment (if chosen, integrates upper & lower)
    belt: null,      // Waist belt (embedded directly in lower row or dress row)
    shoes: null,     // Footwear
    socks: null,     // Socks / titokzokni / tights (embedded directly in shoes row)
    accessories: []  // Other accessories (watch, bag, jewelry, scarf, etc.)
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
  
  const [internalShowGuide, setInternalShowGuide] = useState(false);
  const showGuide = propShowGuide !== undefined ? propShowGuide : internalShowGuide;
  const setShowGuide = propSetShowGuide || setInternalShowGuide;

  const [internalIsSavedOutfitsOpen, setInternalIsSavedOutfitsOpen] = useState(false);
  const isSavedOutfitsOpen = propIsSavedOutfitsOpen !== undefined ? propIsSavedOutfitsOpen : internalIsSavedOutfitsOpen;
  const setIsSavedOutfitsOpen = propSetIsSavedOutfitsOpen || setInternalIsSavedOutfitsOpen;

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
      const sub = (initialAnchorItem.subCategory || '').toLowerCase();
      const name = (initialAnchorItem.name || '').toLowerCase();
      if (cat === 'dresses') {
        setEnsemble(prev => ({ ...prev, dress: initialAnchorItem, lower: null, upperLayers: [], coats: [] }));
      } else if (cat === 'bottoms' || cat === 'skirts') {
        setEnsemble(prev => ({ ...prev, lower: initialAnchorItem, dress: null }));
      } else if (cat === 'shoes') {
        setEnsemble(prev => ({ ...prev, shoes: initialAnchorItem }));
      } else if (cat === 'accessories') {
        if (sub === 'belt' || name.includes('öv')) {
          setEnsemble(prev => ({ ...prev, belt: initialAnchorItem }));
        } else if (sub === 'socks' || sub === 'tights' || name.includes('zokni') || name.includes('harisnya')) {
          setEnsemble(prev => ({ ...prev, socks: initialAnchorItem }));
        } else {
          setEnsemble(prev => ({
            ...prev,
            accessories: prev.accessories.some(a => a.id === initialAnchorItem.id)
              ? prev.accessories
              : [...prev.accessories, initialAnchorItem].slice(0, 4)
          }));
        }
      } else if (isCoatGarment(initialAnchorItem)) {
        setEnsemble(prev => ({ ...prev, coats: [initialAnchorItem] }));
      } else {
        // Upper layers (tops, knitwear, outerwear)
        setEnsemble(prev => ({
          ...prev,
          dress: null,
          upperLayers: prev.upperLayers.some(u => u.id === initialAnchorItem.id)
            ? prev.upperLayers
            : [...prev.upperLayers, initialAnchorItem].slice(0, 2)
        }));
      }
      setActiveMode('manual-builder');
    }
  }, [initialAnchorItem]);

  // Flatten all active selected items in ensemble
  const selectedItems = useMemo(() => {
    const list = [];
    ensemble.coats.forEach(c => { if (c) list.push(c); });
    if (ensemble.dress) {
      list.push(ensemble.dress);
    }
    ensemble.upperLayers.forEach(i => { if (i) list.push(i); });
    if (ensemble.lower && !ensemble.dress) list.push(ensemble.lower);
    if (ensemble.belt) list.push(ensemble.belt);
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

    const hasUpper = ensemble.upperLayers.length > 0 || ensemble.coats.length > 0;
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
      } else if (type === 'coat') {
        if (replaceIndex !== null && replaceIndex >= 0 && replaceIndex < next.coats.length) {
          const updated = [...next.coats];
          updated[replaceIndex] = item;
          next.coats = updated;
        } else if (next.coats.length < 2 && !next.coats.some(c => c.id === item.id)) {
          next.coats = [...next.coats, item];
        }
      } else if (type === 'upper') {
        next.dress = null; // Clear dress if adding standard upper
        if (isCoatGarment(item)) {
          // Automatic routing: coats and overshirts go into dedicated coat slot!
          if (next.coats.length < 2 && !next.coats.some(c => c.id === item.id)) {
            next.coats = [...next.coats, item];
          } else if (replaceIndex !== null && replaceIndex >= 0 && replaceIndex < next.upperLayers.length) {
            const updated = [...next.upperLayers];
            updated[replaceIndex] = item;
            next.upperLayers = updated;
          } else if (next.upperLayers.length < 2 && !next.upperLayers.some(u => u.id === item.id)) {
            next.upperLayers = [...next.upperLayers, item];
          }
        } else if (replaceIndex !== null && replaceIndex >= 0 && replaceIndex < next.upperLayers.length) {
          const updated = [...next.upperLayers];
          updated[replaceIndex] = item;
          next.upperLayers = updated;
        } else {
          if (next.upperLayers.length < 2 && !next.upperLayers.some(u => u.id === item.id)) {
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
        next.belt = item;
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

  const handleRemoveCoat = (index = null) => {
    setEnsemble(prev => ({
      ...prev,
      coats: index !== null ? prev.coats.filter((_, idx) => idx !== index) : []
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

  const handleRemoveBelt = () => {
    setEnsemble(prev => ({ ...prev, belt: null }));
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
      coats: [],
      upperLayers: [],
      lower: null,
      dress: null,
      belt: null,
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
  const handleDirectSaveOutfit = async () => {
    if (selectedItems.length === 0) return;

    const occasionTitle = manualEvent.trim() || 'Saját Mix & Match Szett';
    const topItem = ensemble.upperLayers[0] || ensemble.coats[0] || ensemble.dress;
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

    const result = await saveOutfit(newOutfit);
    setIsManualSaved(true);
    if (result?.isDuplicate) {
      setSaveToastMessage('ℹ️ Ez a szett már szerepel a mentett szettjeid között (frissítve)!');
    } else {
      setSaveToastMessage('✨ Szett sikeresen elmentve a Mentett szettekhez!');
    }
    setTimeout(() => setSaveToastMessage(''), 3500);
  };

  const handleSaveManualAuditedOutfit = () => {
    handleDirectSaveOutfit();
  };

  // Load a saved outfit back onto the Mix & Match canvas
  const handleLoadSavedOutfit = (savedOutfit) => {
    if (!savedOutfit) return;
    if (savedOutfit.ensembleSnapshot) {
      const snap = savedOutfit.ensembleSnapshot;
      const loadedCoats = Array.isArray(snap.coats)
        ? snap.coats
        : snap.coat
          ? [snap.coat]
          : [];
      const loadedBelt = snap.belt || (Array.isArray(snap.accessories) ? snap.accessories.find(a => a.subCategory === 'belt' || (a.name || '').toLowerCase().includes('öv')) : null) || null;
      const otherAccs = (snap.accessories || []).filter(a => a !== loadedBelt && !(a.subCategory === 'belt' || (a.name || '').toLowerCase().includes('öv')));
      setEnsemble({
        coats: loadedCoats.slice(0, 2),
        upperLayers: (snap.upperLayers || []).slice(0, 2),
        dress: snap.dress || null,
        lower: snap.lower || null,
        belt: loadedBelt,
        shoes: snap.shoes || null,
        socks: snap.socks || null,
        accessories: otherAccs
      });
    } else if (savedOutfit.items && Array.isArray(savedOutfit.items)) {
      const newEnsemble = {
        coats: [],
        upperLayers: [],
        dress: null,
        lower: null,
        belt: null,
        shoes: null,
        socks: null,
        accessories: []
      };
      savedOutfit.items.forEach(item => {
        const cat = (item.category || '').toLowerCase();
        const sub = (item.subCategory || '').toLowerCase();
        const name = (item.name || '').toLowerCase();

        if (cat === 'dresses') {
          newEnsemble.dress = item;
        } else if (isCoatGarment(item)) {
          if (newEnsemble.coats.length < 2) newEnsemble.coats.push(item);
          else if (newEnsemble.upperLayers.length < 2) newEnsemble.upperLayers.push(item);
        } else if (cat === 'tops' || cat === 'knitwear' || cat === 'outerwear') {
          if (newEnsemble.upperLayers.length < 2) newEnsemble.upperLayers.push(item);
          else if (newEnsemble.coats.length < 2) newEnsemble.coats.push(item);
        } else if (cat === 'bottoms' || cat === 'skirts') {
          newEnsemble.lower = item;
        } else if (cat === 'shoes') {
          newEnsemble.shoes = item;
        } else if (cat === 'accessories') {
          if (sub === 'socks' || sub === 'tights' || name.includes('zokni') || name.includes('harisnya')) {
            newEnsemble.socks = item;
          } else if (sub === 'belt' || name.includes('öv')) {
            newEnsemble.belt = item;
          } else {
            newEnsemble.accessories.push(item);
          }
        } else {
          if (newEnsemble.upperLayers.length < 2) newEnsemble.upperLayers.push(item);
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

      if (type === 'coat') {
        return cat === 'outerwear' || isCoatGarment(item);
      }

      if (type === 'upper') {
        // Ha már van 2 felső réteg, a + gomb automatikusan kabátot / külső réteget keres
        if (ensemble.upperLayers.length >= 2 && pickerConfig.replaceIndex === null && ensemble.coats.length < 2) {
          return cat === 'outerwear' || isCoatGarment(item);
        }

        const isUpper = cat === 'tops' || cat === 'knitwear' || cat === 'outerwear' ||
          name.includes('ing') || name.includes('póló') || name.includes('pulóver') ||
          name.includes('zakó') || name.includes('kabát') || name.includes('mellény') ||
          name.includes('overshirt') || name.includes('blúz') || name.includes('top');
        
        if (!isUpper) return false;

        if (pickerCategoryFilter === 'tops') return cat === 'tops' || name.includes('ing') || name.includes('póló') || name.includes('blúz') || name.includes('top');
        if (pickerCategoryFilter === 'knitwear') return cat === 'knitwear' || name.includes('pulóver') || name.includes('kardigán');
        if (pickerCategoryFilter === 'outerwear') return cat === 'outerwear' || name.includes('zakó') || name.includes('kabát') || name.includes('dzseki') || name.includes('overshirt');
        return true;
      }

      if (type === 'lower') {
        return cat === 'bottoms' || cat === 'skirts' || name.includes('nadrág') || name.includes('farmer') || name.includes('szoknya');
      }

      if (type === 'shoes') {
        return cat === 'shoes' || name.includes('cipő') || name.includes('loafer') || name.includes('csizma') || name.includes('sneaker') || name.includes('magassarkú') || name.includes('sarkú');
      }

      if (type === 'socks') {
        return cat === 'accessories' && (sub === 'socks' || sub === 'tights' || name.includes('zokni') || name.includes('harisnya'));
      }

      if (type === 'belt') {
        return cat === 'accessories' && (sub === 'belt' || name.includes('öv') || name.includes('belt'));
      }

      if (type === 'accessory') {
        const isBelt = sub === 'belt' || name.includes('öv') || name.includes('belt');
        const isSock = sub === 'socks' || sub === 'tights' || name.includes('zokni') || name.includes('harisnya');
        return cat === 'accessories' && !isBelt && !isSock;
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



      {/* Collapsible Guidance (Context-aware based on active tab) */}
      {showGuide && (
        <ModuleFirstTimeGuide 
          moduleId={activeMode === 'manual-builder' ? 'mix_match' : 'ai_stylist'}
          title={activeMode === 'manual-builder' ? 'Hogyan működik a Mix & Match?' : 'Hogyan működik az AI Stylist?'}
          subtitle={activeMode === 'manual-builder' ? 'Interaktív szettépítő és azonnali AI stíluselemzés' : 'Személyes AI Stylist konzultáció'}
          description={
            activeMode === 'manual-builder'
              ? 'Válogasd össze saját szettjeidet a ruhatáradból rétegenként, és kérj azonnali szakértői elemzést az esztétikai harmóniáról és az alkalomhoz való illeszkedésről.'
              : 'Közvetlen beszélgetés a mesterséges intelligenciával, aki teljes mélységében ismeri a ruhatárad minden darabját, a stílusprofilodat, kedvenc színeidet és egyéni szabályaidat.'
          }
          points={
            activeMode === 'manual-builder'
              ? [
                  "Kattints a ruhahelyekre (felső, nadrág, lábbeli, zakó/kabát, öv) a darabok kiválasztásához vagy cseréjéhez.",
                  "Az alkalom beírása opcionális: ha üresen hagyod, az AI a szett önálló stilisztikai harmóniáját értékeli.",
                  "Az „AI Elemzés Futtatása” gombbal azonnali értékelést kapsz a színharmóniáról, anyagokról, textúrákról és rétegezésről.",
                  "A kész összeállítást a „Mentés” gombra kattintva elmentheted a Mentett szettek közé."
                ]
              : [
                  "Kérdezz bármit: eseményre komplett szettjavaslatot, rétegezési tanácsot vagy színpárosításokat.",
                  "Az AI kifejezetten a meglévő ruháidból építkezik, és interaktív kártyákkal hivatkozik rájuk.",
                  "A ruhák fotóira kattintva azonnal megnyílik a nagyfelbontású kép és ruhaadatlap.",
                  "A javasolt szetteket közvetlenül elmentheted a kedvenceid közé."
                ]
          }
          forceOpen={true}
          onClose={() => setShowGuide(false)}
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
          {/* THE SEAMLESS VISUAL LOOKBOOK FLATLAY (CENTERED & 2-COLUMN STRUCTURE) */}
          {/* ========================================================================= */}
          <div className="p-3 sm:p-4 rounded-3xl bg-[#0a0e17] border border-slate-800 space-y-3 shadow-2xl">

            {/* 0. KABÁT / KÜLSŐ RÉTEG ZÓNA (Outerwear: Up to 2 items e.g. overshirt/blazer/jacket + coat) */}
            {ensemble.coats.length > 0 && (
              <div className="flex items-center gap-3">
                {/* Left area: Centered 1 or 2 outer cards */}
                <div className="flex-1 min-w-0 flex justify-center items-center gap-2.5">
                  {ensemble.coats.map((coat, idx) => (
                    <div 
                      key={coat.id || idx}
                      className="relative w-32 h-44 sm:w-40 sm:h-52 rounded-2xl overflow-hidden bg-[#070a12] border border-slate-700 group shrink-0 shadow-lg"
                    >
                      <img 
                        src={coat.imageUrl || createGarmentSvgPlaceholder('outerwear', coat.name, coat.color)} 
                        alt={coat.name}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = createGarmentSvgPlaceholder('outerwear', coat.name, coat.color);
                        }}
                        onClick={() => openLightbox([coat], 0, coat.name)}
                        className="w-full h-full object-contain p-2 cursor-pointer group-hover:scale-105 transition-transform duration-300" 
                      />
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-sm text-[10px] font-medium text-slate-300 pointer-events-none truncate max-w-[70%]">
                        {(coat.name || '').toLowerCase().includes('overshirt') || (coat.name || '').toLowerCase().includes('ingdzseki')
                          ? 'Overshirt'
                          : (coat.name || '').toLowerCase().includes('dzseki')
                            ? 'Dzseki'
                            : (coat.name || '').toLowerCase().includes('zakó') || (coat.name || '').toLowerCase().includes('blézer')
                              ? 'Zakó'
                              : 'Kabát'}
                      </span>
                      {/* Floating Corner Actions */}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleRemoveCoat(idx); }}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/75 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center backdrop-blur-sm transition-colors z-10 shadow cursor-pointer"
                        title="Réteg törlése"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleOpenPicker('coat', idx); }}
                        className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-black/75 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center backdrop-blur-sm transition-colors z-10 shadow cursor-pointer"
                        title="Réteg cseréje"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Right rail: Borderless (+) Kabát button if < 2 */}
                <div className="w-14 sm:w-16 shrink-0 flex flex-col items-center justify-center">
                  {ensemble.coats.length < 2 && (
                    <button
                      type="button"
                      onClick={() => handleOpenPicker('coat')}
                      className="w-10 h-10 rounded-full bg-slate-800/90 hover:bg-slate-700 text-sky-400 hover:text-sky-300 border border-slate-700 shadow-md flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer"
                      title="További külső réteg (kabát / overshirt) hozzáadása"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                  <span className="text-[10px] text-slate-400 mt-1 font-medium text-center leading-tight">+ Kabát</span>
                </div>
              </div>
            )}

            {/* 1. FELSŐTEST ZÓNA (Upper Body: Max 2 items e.g. Shirt + Sweater OR Dress) */}
            <div className="flex items-center gap-3">
              {/* Left area: Centered Upper layers cards or Dress */}
              <div className="flex-1 min-w-0 flex justify-center items-center gap-2.5">
                {ensemble.dress ? (
                  /* Dress active: Lookbook card (+ opciós öv mellette ha van) */
                  <div className="flex items-center justify-center gap-2">
                    <div className="relative w-36 h-52 sm:w-44 sm:h-60 rounded-2xl overflow-hidden bg-[#070a12] border border-slate-700 group shrink-0 shadow-lg">
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
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleRemoveDress(); }}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/75 hover:bg-rose-600 text-slate-200 hover:text-white flex items-center justify-center backdrop-blur-sm transition-colors z-10 shadow cursor-pointer"
                        title="Ruha levétele"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleOpenPicker('dress'); }}
                        className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-black/75 hover:bg-slate-700 text-slate-200 hover:text-white flex items-center justify-center backdrop-blur-sm transition-colors z-10 shadow cursor-pointer"
                        title="Ruha cseréje"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Női deréköv közvetlenül a ruha mellett ha van */}
                    {ensemble.belt && (
                      <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-[#070a12] border border-slate-700 group shrink-0 shadow">
                        <img 
                          src={ensemble.belt.imageUrl || createGarmentSvgPlaceholder('accessories', ensemble.belt.name, ensemble.belt.color)} 
                          alt={ensemble.belt.name}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = createGarmentSvgPlaceholder('accessories', ensemble.belt.name, ensemble.belt.color);
                          }}
                          onClick={() => openLightbox([ensemble.belt], 0, ensemble.belt.name)}
                          className="w-full h-full object-contain p-1 cursor-pointer group-hover:scale-105 transition-transform duration-300" 
                        />
                        <span className="absolute bottom-0.5 left-1 px-1 py-0.2 rounded bg-black/75 text-[8px] sm:text-[9px] text-slate-300 pointer-events-none truncate max-w-[85%]">
                          Deréköv
                        </span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleRemoveBelt(); }}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/75 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center backdrop-blur-sm transition-colors z-10 shadow cursor-pointer"
                          title="Öv törlése"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleOpenPicker('belt'); }}
                          className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/75 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center backdrop-blur-sm transition-colors z-10 shadow cursor-pointer"
                          title="Öv cseréje"
                        >
                          <RefreshCw className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ) : ensemble.upperLayers.length === 0 ? (
                  /* Empty state: Centered initial placeholder button */
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenPicker('upper')}
                      className="w-32 h-44 sm:w-40 sm:h-52 rounded-2xl border border-dashed border-slate-700 hover:border-slate-400 bg-[#090d15]/50 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-slate-200 transition-all group cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-800/80 group-hover:bg-slate-700 flex items-center justify-center text-slate-300">
                        <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      </div>
                      <span className="text-xs font-semibold text-center px-2">+ Válassz felsőt</span>
                    </button>

                    {isFemale && (
                      <button
                        type="button"
                        onClick={() => handleOpenPicker('dress')}
                        className="w-24 h-44 sm:h-52 border border-dashed border-slate-800 hover:border-slate-600 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-slate-400 hover:text-slate-200 transition-all bg-[#090d15]/30 shrink-0 cursor-pointer"
                        title="Egyberuha választása"
                      >
                        <span className="text-xl">👗</span>
                        <span className="text-[11px] font-medium">Ruha</span>
                      </button>
                    )}
                  </div>
                ) : (
                  /* Loaded Upper Layers: Exactly max 2 items, centered, NEVER overflows on mobile! */
                  ensemble.upperLayers.map((layer, idx) => (
                    <div 
                      key={layer.id || idx}
                      className="relative w-32 h-44 sm:w-40 sm:h-52 rounded-2xl overflow-hidden bg-[#070a12] border border-slate-700 shrink-0 group shadow-md"
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
                      {/* Floating Corner Actions */}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleRemoveUpperLayer(idx); }}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/75 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center backdrop-blur-sm transition-colors z-10 shadow cursor-pointer"
                        title="Réteg törlése"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleOpenPicker('upper', idx); }}
                        className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-black/75 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center backdrop-blur-sm transition-colors z-10 shadow cursor-pointer"
                        title="Réteg cseréje"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Right rail: Borderless (+) Réteg vagy (+) Öv ha egyberuha van */}
              <div className="w-14 sm:w-16 shrink-0 flex flex-col items-center justify-center">
                {ensemble.dress ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleOpenPicker('belt')}
                      className="w-10 h-10 rounded-full bg-slate-800/90 hover:bg-slate-700 text-sky-400 hover:text-sky-300 border border-slate-700 shadow-md flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer"
                      title="Deréköv hozzáadása vagy cseréje"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <span className="text-[10px] text-slate-400 mt-1 font-medium text-center leading-tight">+ Öv</span>
                  </>
                ) : (
                  <>
                    {(ensemble.upperLayers.length < 2 || ensemble.coats.length < 2) && (
                      <button
                        type="button"
                        onClick={() => handleOpenPicker('upper')}
                        className="w-10 h-10 rounded-full bg-slate-800/90 hover:bg-slate-700 text-sky-400 hover:text-sky-300 border border-slate-700 shadow-md flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer"
                        title={ensemble.upperLayers.length >= 2 ? "Kabát / külső réteg hozzáadása" : "További belső/köztes réteg (ing/pulóver) vagy kabát hozzáadása"}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                    <span className="text-[10px] text-slate-400 mt-1 font-medium text-center leading-tight">
                      {ensemble.upperLayers.length >= 2 ? '+ Kabát' : '+ Réteg'}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* 2. ALSÓTEST ZÓNA (Lower Body: Trousers / Skirt + ÖV KICSIN MELLETTTE) */}
            {!ensemble.dress && (
              <div className="flex items-center gap-3">
                {/* Left area: Centered Trousers Card + ÖV KICSIN MELLETTTE */}
                <div className="flex-1 min-w-0 flex justify-center items-center gap-2.5">
                  {ensemble.lower ? (
                    <div className="relative w-32 h-44 sm:w-40 sm:h-52 rounded-2xl overflow-hidden bg-[#070a12] border border-slate-700 group shrink-0 shadow-md">
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
                      {/* Floating Corner Actions */}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleRemoveLower(); }}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/75 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center backdrop-blur-sm transition-colors z-10 shadow cursor-pointer"
                        title="Nadrág törlése"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleOpenPicker('lower'); }}
                        className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-black/75 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center backdrop-blur-sm transition-colors z-10 shadow cursor-pointer"
                        title="Nadrág cseréje"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenPicker('lower')}
                      className="w-32 h-44 sm:w-40 sm:h-52 rounded-2xl border border-dashed border-slate-700 hover:border-slate-400 bg-[#090d15]/50 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-slate-200 transition-all group cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-full bg-slate-800/80 group-hover:bg-slate-700 flex items-center justify-center text-slate-300">
                        <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      </div>
                      <span className="text-xs font-semibold text-center px-2">+ Nadrág / Szoknya</span>
                    </button>
                  )}

                  {/* ÖV KÁRTYA KÖZVETLENÜL A NADRÁG MELLETT KICSIBEN */}
                  {ensemble.belt && (
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-[#070a12] border border-slate-700 group shrink-0 shadow">
                      <img 
                        src={ensemble.belt.imageUrl || createGarmentSvgPlaceholder('accessories', ensemble.belt.name, ensemble.belt.color)} 
                        alt={ensemble.belt.name}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = createGarmentSvgPlaceholder('accessories', ensemble.belt.name, ensemble.belt.color);
                        }}
                        onClick={() => openLightbox([ensemble.belt], 0, ensemble.belt.name)}
                        className="w-full h-full object-contain p-1 cursor-pointer group-hover:scale-105 transition-transform duration-300" 
                      />
                      <span className="absolute bottom-0.5 left-1 px-1 py-0.2 rounded bg-black/75 text-[8px] sm:text-[9px] text-slate-300 pointer-events-none truncate max-w-[85%]">
                        Öv
                      </span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleRemoveBelt(); }}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/75 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center backdrop-blur-sm transition-colors z-10 shadow cursor-pointer"
                        title="Öv törlése"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleOpenPicker('belt'); }}
                        className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/75 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center backdrop-blur-sm transition-colors z-10 shadow cursor-pointer"
                        title="Öv cseréje"
                      >
                        <RefreshCw className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Right rail: Borderless (+) Öv button */}
                <div className="w-14 sm:w-16 shrink-0 flex flex-col items-center justify-center">
                  <button
                    type="button"
                    onClick={() => handleOpenPicker('belt')}
                    className="w-10 h-10 rounded-full bg-slate-800/90 hover:bg-slate-700 text-sky-400 hover:text-sky-300 border border-slate-700 shadow-md flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer"
                    title="Öv hozzáadása vagy cseréje"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <span className="text-[10px] text-slate-400 mt-1 font-medium text-center leading-tight">+ Öv</span>
                </div>
              </div>
            )}

            {/* 3. LÁBBELI ZÓNA (Footwear: Shoes / Boots + ZOKNI / HARISNYA KICSIN MELLETTTE) */}
            <div className="flex items-center gap-3">
              {/* Left area: Centered Shoes Card + ZOKNI/HARISNYA KICSIN MELLETTTE */}
              <div className="flex-1 min-w-0 flex justify-center items-center gap-2.5">
                {ensemble.shoes ? (
                  <div className="relative w-32 h-40 sm:w-40 sm:h-48 rounded-2xl overflow-hidden bg-[#070a12] border border-slate-700 group shrink-0 shadow-md">
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
                    {/* Floating Corner Actions */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleRemoveShoes(); }}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/75 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center backdrop-blur-sm transition-colors z-10 shadow cursor-pointer"
                      title="Cipő törlése"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleOpenPicker('shoes'); }}
                      className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-black/75 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center backdrop-blur-sm transition-colors z-10 shadow cursor-pointer"
                      title="Cipő cseréje"
                    >
                      <RefreshCw className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleOpenPicker('shoes')}
                    className="w-32 h-40 sm:w-40 sm:h-48 border border-dashed border-slate-700 hover:border-slate-400 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-slate-200 transition-all bg-[#090d15]/50 group cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-full bg-slate-800/80 group-hover:bg-slate-700 flex items-center justify-center text-slate-300">
                      <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    </div>
                    <span className="text-xs font-semibold text-center px-2">+ Cipő / Csizma</span>
                  </button>
                )}

                {/* ZOKNI / HARISNYA KÁRTYA KÖZVETLENÜL A CIPŐ MELLETT KICSIBEN */}
                {ensemble.socks && (
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-[#070a12] border border-slate-700 group shrink-0 shadow">
                    <img 
                      src={ensemble.socks.imageUrl || createGarmentSvgPlaceholder('accessories', ensemble.socks.name, ensemble.socks.color)} 
                      alt={ensemble.socks.name}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = createGarmentSvgPlaceholder('accessories', ensemble.socks.name, ensemble.socks.color);
                      }}
                      onClick={() => openLightbox([ensemble.socks], 0, ensemble.socks.name)}
                      className="w-full h-full object-contain p-1 cursor-pointer group-hover:scale-105 transition-transform duration-300" 
                    />
                    <span className="absolute bottom-0.5 left-1 px-1 py-0.2 rounded bg-black/75 text-[8px] sm:text-[9px] text-slate-300 pointer-events-none truncate max-w-[85%]">
                      {isFemale ? 'Harisnya' : 'Zokni'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleRemoveSocks(); }}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/75 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center backdrop-blur-sm transition-colors z-10 shadow cursor-pointer"
                      title="Törlés"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleOpenPicker('socks'); }}
                      className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/75 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center backdrop-blur-sm transition-colors z-10 shadow cursor-pointer"
                      title="Csere"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Right rail: Borderless (+) Zokni / Harisnya button */}
              <div className="w-14 sm:w-16 shrink-0 flex flex-col items-center justify-center">
                <button
                  type="button"
                  onClick={() => handleOpenPicker('socks')}
                  className="w-10 h-10 rounded-full bg-slate-800/90 hover:bg-slate-700 text-sky-400 hover:text-sky-300 border border-slate-700 shadow-md flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer"
                  title={isFemale ? "Harisnya vagy zokni hozzáadása vagy cseréje" : "Zokni hozzáadása vagy cseréje"}
                >
                  <Plus className="w-4 h-4" />
                </button>
                <span className="text-[10px] text-slate-400 mt-1 font-medium text-center leading-tight">
                  {isFemale ? '+ Harisnya' : '+ Zokni'}
                </span>
              </div>
            </div>

            {/* 4. EGYÉB KIEGÉSZÍTŐK ZÓNA (Accessories: Óra, Ékszer, Táska, Sál) */}
            <div className="flex items-center gap-3 pt-1">
              {/* Left area: Centered compact accessory cards */}
              <div className="flex-1 min-w-0 flex justify-center items-center gap-2 flex-wrap">
                {ensemble.accessories.map((acc, idx) => (
                  <div 
                    key={acc.id || idx}
                    className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-[#070a12] border border-slate-700 group shrink-0 shadow"
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
                      className="w-full h-full object-contain p-1 cursor-pointer group-hover:scale-105 transition-transform duration-300" 
                    />
                    <span className="absolute bottom-0.5 left-1 px-1 py-0.2 rounded bg-black/75 text-[8px] sm:text-[9px] text-slate-300 pointer-events-none truncate max-w-[85%]">
                      Kieg
                    </span>
                    {/* Floating Actions */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleRemoveAccessory(idx); }}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/75 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center backdrop-blur-sm transition-colors z-10 shadow cursor-pointer"
                      title="Törlés"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleOpenPicker('accessory', idx); }}
                      className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/75 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center backdrop-blur-sm transition-colors z-10 shadow cursor-pointer"
                      title="Csere"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}

                {ensemble.accessories.length === 0 && (
                  <span className="text-[11px] text-slate-500 italic py-1">
                    Egyéb kiegészítők (óra, táska, sál, ékszer) a jobb oldali gombbal adhatók hozzá
                  </span>
                )}
              </div>

              {/* Right rail: Borderless (+) Kiegészítő button */}
              <div className="w-14 sm:w-16 shrink-0 flex flex-col items-center justify-center">
                {ensemble.accessories.length < 4 && (
                  <button
                    type="button"
                    onClick={() => handleOpenPicker('accessory')}
                    className="w-10 h-10 rounded-full bg-slate-800/90 hover:bg-slate-700 text-sky-400 hover:text-sky-300 border border-slate-700 shadow-md flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer"
                    title="Egyéb kiegészítő hozzáadása (óra, táska, sál, ékszer)"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
                <span className="text-[10px] text-slate-400 mt-1 font-medium text-center leading-tight">+ Kieg</span>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* IN-FLOW CANVAS STATUS & ACTION BAR (Bottom of Canvas) */}
            {/* ========================================================================= */}
            <div className="pt-3 pb-8 w-full max-w-lg mx-auto">
              
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
                    className={`px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl border backdrop-blur-md flex items-center justify-center gap-1.5 text-xs font-bold transition-all shadow-2xl shrink-0 cursor-pointer ${
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
                    className="flex-1 min-w-0 px-3.5 sm:px-5 py-3.5 rounded-2xl bg-slate-200 hover:bg-white text-slate-900 font-serif font-bold text-xs sm:text-sm shadow-2xl transition-all flex items-center justify-center gap-2 score-glow-titanium truncate cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-slate-900 shrink-0" />
                    <span className="truncate">🎯 Összhang Elemzése ({selectedItems.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDirectSaveOutfit}
                    className={`px-3.5 sm:px-4 py-3.5 rounded-2xl border backdrop-blur-md flex items-center justify-center gap-1.5 text-xs font-bold transition-all shadow-2xl shrink-0 cursor-pointer ${
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

          </div>

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
                  {pickerConfig.type === 'upper' && (ensemble.upperLayers.length >= 2 && pickerConfig.replaceIndex === null ? 'Kabát / Külső Réteg Kiválasztása' : 'Felsőtest Réteg Kiválasztása')}
                  {pickerConfig.type === 'coat' && 'Kabát / Külső Réteg Kiválasztása'}
                  {pickerConfig.type === 'dress' && 'Egyberuha Kiválasztása'}
                  {pickerConfig.type === 'lower' && 'Alsótest (Nadrág / Szoknya) Kiválasztása'}
                  {pickerConfig.type === 'shoes' && 'Lábbeli Kiválasztása'}
                  {pickerConfig.type === 'belt' && 'Öv Kiválasztása'}
                  {pickerConfig.type === 'socks' && (isFemale ? 'Harisnya vagy Zokni Kiválasztása' : 'Zokni Kiválasztása')}
                  {pickerConfig.type === 'accessory' && 'Egyéb Kiegészítő Kiválasztása'}
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
            <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-[#090d15] flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={handleSaveManualAuditedOutfit}
                disabled={isManualSaved}
                className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shrink-0 cursor-pointer ${
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
                    <span>Szett Mentése a Kedvencekhez</span>
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
