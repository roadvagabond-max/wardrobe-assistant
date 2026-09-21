import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Sparkles, CloudSun, Calendar, Compass, ArrowRight, Bookmark, Check, RefreshCw, 
  Loader2, Plus, X, Layers, Lock, Unlock, CheckCircle2, ShieldAlert,
  Maximize2, Grid, ChevronRight, Feather, SlidersHorizontal as Sliders, Shirt,
  Info
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { generateEventOutfits, swapOutfitItem, enforceAnatomicalOutfitLayers } from '../../services/gemini';
import { fetchCurrentWeather, CITIES } from '../../services/weather';
import { getDynamicEventPresets } from '../../services/demographics';
import { createGarmentSvgPlaceholder } from '../../services/imageOptimizer';
import confetti from 'canvas-confetti';
import GarmentLightboxModal from '../common/GarmentLightboxModal';
import ModuleFirstTimeGuide from '../common/ModuleFirstTimeGuide';

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

export function categorizeOutfitItems(items = []) {
  const outer = [];
  const upper = [];
  let lower = null;
  let dress = null;
  let belt = null;
  let shoes = null;
  let socks = null;
  const accessories = [];

  items.forEach(item => {
    if (!item) return;
    const cat = (item.category || '').toLowerCase();
    const sub = (item.subCategory || '').toLowerCase();
    const name = (item.name || '').toLowerCase();

    if (cat === 'dresses') {
      dress = item;
    } else if (sub === 'belt' || /\böv\b|\bbőröv\b|\bderéköv\b/i.test(name)) {
      belt = item;
    } else if (sub === 'socks' || sub === 'tights' || name.includes('zokni') || name.includes('harisnya')) {
      socks = item;
    } else if (cat === 'shoes' || sub === 'loafers' || sub === 'boots' || sub === 'sneakers' || name.includes('cipő') || name.includes('loafer') || name.includes('csizma') || name.includes('bakancs')) {
      shoes = item;
    } else if (cat === 'bottoms' || cat === 'skirts' || name.includes('nadrág') || name.includes('farmer') || name.includes('szoknya') || name.includes('chino')) {
      lower = item;
    } else if (isCoatGarment(item) || cat === 'outerwear') {
      outer.push(item);
    } else if (cat === 'tops' || cat === 'knitwear' || name.includes('ing') || name.includes('póló') || name.includes('pulóver') || name.includes('blúz')) {
      upper.push(item);
    } else if (cat === 'accessories') {
      accessories.push(item);
    } else {
      upper.push(item);
    }
  });

  return { outer, upper, lower, dress, belt, shoes, socks, accessories };
}

export default function OutfitsView({ weather, setWeather, initialAnchorItem = null }) {
  const { wardrobe, profile, currentUser, saveOutfit, savedOutfits } = useAuth();
  const eventPresets = getDynamicEventPresets(profile, weather);

  // Generator States (Preserved until next explicit request)
  const [selectedEvent, setSelectedEvent] = useState(() => {
    return localStorage.getItem('sartorial_last_selected_event') || eventPresets[0] || '☕ Kávérandi & Séta';
  });
  const [customEvent, setCustomEvent] = useState(() => {
    return localStorage.getItem('sartorial_last_custom_event') || '';
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefreshingIndex, setIsRefreshingIndex] = useState(null);
  const [showGuide, setShowGuide] = useState(false);
  const [activeOutfitTab, setActiveOutfitTab] = useState(0); // 0, 1, 2, or 'all'

  const [generatedOutfits, setGeneratedOutfits] = useState(() => {
    try {
      const saved = localStorage.getItem('sartorial_last_generated_outfits');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      const isLegacy = Array.isArray(parsed) && parsed.some(outfit => 
        (outfit.items || []).some(item => 
          item.brand === 'Sartorial Selection' || 
          item.brand === 'Tailored Woolens' ||
          item.brand === 'Smart Casual Collection' ||
          item.brand === 'Formal Leathercraft' ||
          (item.imageUrl && item.imageUrl.includes('photo-1594633312681')) ||
          (item.imageUrl && item.imageUrl.includes('photo-1553062407')) ||
          (item.imageUrl && item.imageUrl.includes('photo-1544923246')) ||
          (item.imageUrl && item.imageUrl.includes('photo-1551028719'))
        )
      );
      if (isLegacy) {
        localStorage.removeItem('sartorial_last_generated_outfits');
        return [];
      }
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  });
  const [savedIds, setSavedIds] = useState(new Set());
  const [generationError, setGenerationError] = useState(null);

  // Individual Garment Swap States
  const [swappingItemKey, setSwappingItemKey] = useState(null);
  const [itemSwapModal, setItemSwapModal] = useState(null);
  const [isAiSwapping, setIsAiSwapping] = useState(false);
  const [swapError, setSwapError] = useState(null);

  // Anchor / Key Items (Strictly guaranteed in all 3 outfits)
  const [anchorItems, setAnchorItems] = useState(() => {
    if (initialAnchorItem) return [initialAnchorItem];
    try {
      const saved = localStorage.getItem('sartorial_last_anchor_items');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [showAnchorModal, setShowAnchorModal] = useState(false);

  // Lightbox Modal State
  const [lightboxData, setLightboxData] = useState({
    isOpen: false,
    items: [],
    initialIndex: 0,
    outfitTitle: '',
    defaultView: 'lookbook',
    outfitContext: null
  });

  const openLightbox = (items, initialIndex = 0, outfitTitle = '', defaultView = 'lookbook', outfitContext = null) => {
    setLightboxData({
      isOpen: true,
      items: items || [],
      initialIndex: initialIndex >= 0 ? initialIndex : 0,
      outfitTitle: outfitTitle || '',
      defaultView: items && items.length > 1 ? defaultView : 'single',
      outfitContext: outfitContext || null
    });
  };

  // Recent Events History
  const [recentEvents, setRecentEvents] = useState(() => {
    const saved = localStorage.getItem('user_event_history');
    return saved ? JSON.parse(saved) : eventPresets;
  });

  // Re-sync outfits and event presets on user change / logout
  useEffect(() => {
    const saved = localStorage.getItem('sartorial_last_generated_outfits');
    setGeneratedOutfits(saved ? JSON.parse(saved) : []);
    const savedAnchor = localStorage.getItem('sartorial_last_anchor_items');
    setAnchorItems(initialAnchorItem ? [initialAnchorItem] : (savedAnchor ? JSON.parse(savedAnchor) : []));
    const presets = getDynamicEventPresets(profile, weather);
    setSelectedEvent(presets[0] || '☕ Kávérandi & Séta');
    setCustomEvent('');
    setRecentEvents(presets);
  }, [currentUser?.uid]);

  // Lock body scroll when any modal is open
  useEffect(() => {
    if (showAnchorModal || itemSwapModal) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [showAnchorModal, itemSwapModal]);

  // Sync event presets when demographics change
  useEffect(() => {
    const presets = getDynamicEventPresets(profile, weather);
    setRecentEvents(prev => {
      const isCustom = prev && prev.some(p => !presets.includes(p));
      return isCustom ? prev : presets;
    });
  }, [profile?.birthYear, profile?.gender, weather?.temperature]);

  // Persist outfits to localStorage
  useEffect(() => {
    try {
      if (generatedOutfits && generatedOutfits.length > 0) {
        localStorage.setItem('sartorial_last_generated_outfits', JSON.stringify(generatedOutfits));
      }
    } catch (e) {}
  }, [generatedOutfits]);

  useEffect(() => {
    try {
      if (selectedEvent) localStorage.setItem('sartorial_last_selected_event', selectedEvent);
    } catch (e) {}
  }, [selectedEvent]);

  useEffect(() => {
    try {
      localStorage.setItem('sartorial_last_custom_event', customEvent || '');
    } catch (e) {}
  }, [customEvent]);

  useEffect(() => {
    try {
      localStorage.setItem('sartorial_last_anchor_items', JSON.stringify(anchorItems || []));
    } catch (e) {}
  }, [anchorItems]);

  // Sync anchor item if provided externally
  useEffect(() => {
    if (initialAnchorItem && !anchorItems.some(a => a.id === initialAnchorItem.id)) {
      setAnchorItems(prev => [...prev, initialAnchorItem]);
    }
  }, [initialAnchorItem]);

  const saveEventToHistory = (evt) => {
    if (!evt || eventPresets.includes(evt)) return;
    setRecentEvents(prev => {
      const filtered = prev.filter(e => e !== evt);
      const updated = [evt, ...filtered].slice(0, 8);
      localStorage.setItem('user_event_history', JSON.stringify(updated));
      return updated;
    });
  };

  // Category Readiness Check (Base Anatomical Blueprint: Min 1 top/dress, 1 bottom/dress, 1 shoes)
  const topsCount = (wardrobe || []).filter(w => w.category === 'tops' || (w.name || '').toLowerCase().includes('ing') || (w.name || '').toLowerCase().includes('póló')).length;
  const bottomsCount = (wardrobe || []).filter(w => w.category === 'bottoms' || (w.name || '').toLowerCase().includes('nadrág') || (w.name || '').toLowerCase().includes('szoknya') || (w.name || '').toLowerCase().includes('farmer')).length;
  const shoesCount = (wardrobe || []).filter(w => w.category === 'shoes' || (w.name || '').toLowerCase().includes('cipő') || (w.name || '').toLowerCase().includes('loafer')).length;
  const dressesCount = (wardrobe || []).filter(w => w.category === 'dresses' || (w.name || '').toLowerCase().includes('ruha')).length;

  const isOutfitReady = (dressesCount > 0 && shoesCount > 0) || (topsCount > 0 && bottomsCount > 0 && shoesCount > 0);

  // Main Generation Action
  const handleGenerate = async () => {
    const eventName = customEvent.trim() || selectedEvent;
    if (!eventName) return;

    setIsGenerating(true);
    setGenerationError(null);
    saveEventToHistory(eventName);

    try {
      const outfits = await generateEventOutfits({
        eventName,
        weather: weather || { temperature: 21, condition: 'Kellemes' },
        wardrobe,
        styleProfile: profile,
        anchorItemIds: anchorItems.map(a => a.id)
      });
      setGeneratedOutfits(outfits);
      setActiveOutfitTab(0);

      try {
        confetti({
          particleCount: 40,
          spread: 50,
          origin: { y: 0.7 },
          colors: ['#d4af37', '#f3e5ab']
        });
      } catch (_) {}
    } catch (e) {
      console.error('Hiba az outfitek generálásakor:', e);
      setGenerationError(e.message || 'Hiba történt a szettek generálása során. Kérlek próbáld újra!');
    } finally {
      setIsGenerating(false);
    }
  };

  // Single Outfit Card Shuffle
  const handleRefreshSingleOutfit = async (indexToRefresh) => {
    setIsRefreshingIndex(indexToRefresh);
    const eventName = customEvent.trim() || selectedEvent;

    try {
      const newOutfits = await generateEventOutfits({
        eventName,
        weather: weather || { temperature: 21, condition: 'Kellemes' },
        wardrobe,
        styleProfile: profile,
        anchorItemIds: anchorItems.map(a => a.id),
        count: 1
      });

      if (newOutfits && newOutfits.length > 0) {
        setGeneratedOutfits(prev => {
          const updated = [...prev];
          const replacement = newOutfits[indexToRefresh] || newOutfits[0];
          updated[indexToRefresh] = {
            ...replacement,
            id: `outfit-${Date.now()}-${indexToRefresh}`
          };
          return updated;
        });
      }
    } catch (e) {
      console.error('Hiba az egyedi szett frissítésekor:', e);
    } finally {
      setIsRefreshingIndex(null);
    }
  };

  // Helper to find swap candidates from wardrobe
  const getSwapCandidates = (itemToReplace, outfit) => {
    if (!itemToReplace || !wardrobe) return [];
    const currentOutfitItemIds = new Set((outfit?.items || []).map(i => i.id));
    const cat = itemToReplace.category || '';
    const isShoes = cat === 'shoes' || (itemToReplace.name || '').toLowerCase().includes('cipő') || (itemToReplace.name || '').toLowerCase().includes('loafer');
    const isBottoms = cat === 'bottoms' || cat === 'skirts' || (itemToReplace.name || '').toLowerCase().includes('nadrág');
    const isOuterwear = cat === 'outerwear' || isCoatGarment(itemToReplace);
    const isTops = cat === 'tops' || (itemToReplace.name || '').toLowerCase().includes('ing') || (itemToReplace.name || '').toLowerCase().includes('póló');
    const isKnitwear = cat === 'knitwear' || (itemToReplace.name || '').toLowerCase().includes('pulóver');
    const isAccessory = cat === 'accessories' || (itemToReplace.name || '').toLowerCase().includes('öv');

    return wardrobe.filter(w => {
      if (w.id === itemToReplace.id) return false;
      if (currentOutfitItemIds.has(w.id)) return false;
      if (w.condition === 'Lecserélendő' || w.condition === 'Javításra vár') return false;

      if (isShoes) {
        return w.category === 'shoes' || (w.name || '').toLowerCase().includes('cipő') || (w.name || '').toLowerCase().includes('loafer') || (w.name || '').toLowerCase().includes('sneaker') || (w.name || '').toLowerCase().includes('csizma') || (w.name || '').toLowerCase().includes('bakancs');
      }
      if (isBottoms) {
        return w.category === 'bottoms' || w.category === 'skirts' || (w.name || '').toLowerCase().includes('nadrág') || (w.name || '').toLowerCase().includes('chino') || (w.name || '').toLowerCase().includes('farmer');
      }
      if (isOuterwear) {
        return w.category === 'outerwear' || isCoatGarment(w);
      }
      if (isTops) {
        return w.category === 'tops' || (w.name || '').toLowerCase().includes('ing') || (w.name || '').toLowerCase().includes('póló') || (w.name || '').toLowerCase().includes('felső');
      }
      if (isKnitwear) {
        return w.category === 'knitwear' || (w.name || '').toLowerCase().includes('pulóver') || (w.name || '').toLowerCase().includes('kardigán');
      }
      if (isAccessory) {
        return w.category === 'accessories' || (w.name || '').toLowerCase().includes('öv');
      }
      return w.category === cat;
    });
  };

  // AI Individual Garment Swap Handler
  const handleAiSwapGarment = async (outfitIndex, itemToReplace) => {
    if (!itemToReplace || outfitIndex === null || outfitIndex === undefined) return;
    const currentOutfit = generatedOutfits[outfitIndex];
    if (!currentOutfit) return;

    const key = `${outfitIndex}-${itemToReplace.id}`;
    setSwappingItemKey(key);
    setIsAiSwapping(true);
    setSwapError(null);

    try {
      const eventName = customEvent.trim() || selectedEvent;
      const result = await swapOutfitItem({
        outfit: currentOutfit,
        itemToReplace,
        eventName,
        weather: weather || { temperature: 21, condition: 'Kellemes' },
        wardrobe,
        styleProfile: profile
      });

      if (result && result.success && result.replacementItem) {
        const replacement = result.replacementItem;
        setGeneratedOutfits(prev => {
          const next = [...prev];
          const target = { ...next[outfitIndex] };
          target.items = target.items.map(it => it.id === itemToReplace.id ? replacement : it);
          if (result.updatedReasoning) {
            target.culturalFitReasoning = result.updatedReasoning;
          }
          next[outfitIndex] = target;
          return next;
        });
        setItemSwapModal(null);
      } else {
        setSwapError(result?.reason || 'Nem található a ruhatárban stílusban és időjárásban illeszkedő alternatíva.');
      }
    } catch (err) {
      console.error('AI ruha csere hiba:', err);
      setSwapError('Hiba történt a csere során. Kérlek próbáld újra!');
    } finally {
      setIsAiSwapping(false);
      setSwappingItemKey(null);
    }
  };

  // Manual Garment Swap Selection
  const handleManualSwapGarment = (outfitIndex, itemToReplace, newItem) => {
    if (!newItem || outfitIndex === null || outfitIndex === undefined) return;
    setGeneratedOutfits(prev => {
      const next = [...prev];
      const target = { ...next[outfitIndex] };
      target.items = target.items.map(it => it.id === itemToReplace.id ? newItem : it);
      next[outfitIndex] = target;
      return next;
    });
    setItemSwapModal(null);
  };

  const handleSaveOutfit = async (outfit, idx) => {
    const success = await saveOutfit({
      ...outfit,
      eventContext: customEvent.trim() || selectedEvent,
      cityName: weather?.city || 'Budapest',
      temperature: weather?.temperature
    });

    if (success) {
      setSavedIds(prev => new Set(prev).add(idx));
      try {
        confetti({
          particleCount: 30,
          spread: 45,
          origin: { y: 0.8 },
          colors: ['#10b981', '#d4af37']
        });
      } catch (_) {}
    }
  };

  const toggleAnchorItem = (item) => {
    setAnchorItems(prev => {
      const exists = prev.some(a => a.id === item.id);
      if (exists) {
        return prev.filter(a => a.id !== item.id);
      } else {
        return [...prev, item];
      }
    });
  };

  // Subcomponent: Render a Single Garment Card in the Lookbook Flatlay
  const renderGarmentCard = (item, outfitIdx, outfit, extraBadge = null) => {
    if (!item) return null;
    const isAnchor = anchorItems.some(a => a.id === item.id);

    return (
      <div 
        key={item.id}
        className="relative group rounded-2xl overflow-hidden bg-[#070a12] border border-slate-700/80 hover:border-slate-500 transition-all flex flex-col justify-between shadow-lg"
      >
        {/* Uncropped Image Container in Proportional Well */}
        <div 
          onClick={() => openLightbox(outfit.items, outfit.items.findIndex(it => it.id === item.id), outfit.title, 'single', { outfitIndex: outfitIdx, outfit })}
          className="relative aspect-[4/3] w-full p-2 bg-[#05070c] flex items-center justify-center overflow-hidden cursor-pointer"
        >
          <img 
            src={item.imageUrl} 
            alt={item.name} 
            loading="lazy"
            decoding="async"
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" 
          />

          {/* Category Badge */}
          <span className="absolute top-1.5 left-1.5 bg-black/75 backdrop-blur-md border border-white/10 text-white uppercase font-bold tracking-wider text-[8.5px] px-1.5 py-0.5 rounded pointer-events-none">
            {item.category === 'outerwear' ? 'Zakó / Kabát' : item.category === 'knitwear' ? 'Kötött' : item.category === 'tops' ? 'Felső' : item.category === 'bottoms' ? 'Nadrág' : item.category === 'shoes' ? 'Cipő' : item.category === 'dresses' ? 'Ruha' : item.category}
          </span>

          {/* Anchor Key Piece Badge */}
          {isAnchor && (
            <span className="absolute top-1.5 right-1.5 bg-amber-500/90 text-slate-950 font-bold tracking-wider text-[8.5px] px-1.5 py-0.5 rounded shadow flex items-center gap-0.5 pointer-events-none">
              <Lock className="w-2.5 h-2.5" />
              <span>Fixált</span>
            </span>
          )}

          {/* Extra Badge (e.g. Öv) */}
          {extraBadge && !isAnchor && (
            <span className="absolute top-1.5 right-1.5 bg-slate-800/90 text-slate-200 font-medium text-[8px] px-1.5 py-0.5 rounded pointer-events-none">
              {extraBadge}
            </span>
          )}

          {/* Quick Swap Overlay Button on Desktop Hover / Mobile Tap */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setItemSwapModal({ outfitIndex: outfitIdx, item, outfit });
            }}
            className="absolute bottom-1.5 right-1.5 opacity-80 group-hover:opacity-100 px-2 py-1 rounded-lg bg-[#0d121c]/90 hover:bg-slate-200 text-slate-300 hover:text-slate-950 border border-slate-700 text-[10px] font-bold flex items-center gap-1 transition-all shadow cursor-pointer"
            title="Darab cseréje"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Csere</span>
          </button>
        </div>

        {/* Card Info */}
        <div className="p-2.5 bg-[#090d15] flex flex-col justify-between flex-1 border-t border-slate-800/60 min-w-0">
          <h5 
            onClick={() => openLightbox(outfit.items, outfit.items.findIndex(it => it.id === item.id), outfit.title, 'single', { outfitIndex: outfitIdx, outfit })}
            className="text-xs font-semibold text-slate-100 group-hover:text-white truncate cursor-pointer" 
            title={item.name}
          >
            {item.name}
          </h5>
          <div className="flex items-center justify-between text-[10px] text-slate-400 truncate mt-0.5">
            <span className="truncate">{item.brand ? `${item.brand} • ` : ''}{item.color || ''}</span>
            {item.material && <span className="truncate max-w-[45%] text-[9.5px] text-slate-500">({item.material})</span>}
          </div>
        </div>
      </div>
    );
  };

  // Subcomponent: Render a visual mini-card for accessories, belt or socks
  const renderMiniAccessoryCard = (item, label, outfitIdx, outfit) => {
    if (!item) return null;
    return (
      <div 
        key={item.id}
        className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-[#070a12] border border-slate-700/80 group shrink-0 shadow flex flex-col justify-between"
      >
        <img 
          src={item.imageUrl || createGarmentSvgPlaceholder(item.category || 'accessories', item.name, item.color)} 
          alt={item.name}
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = createGarmentSvgPlaceholder(item.category || 'accessories', item.name, item.color);
          }}
          onClick={() => openLightbox(outfit.items, outfit.items.findIndex(it => it.id === item.id), item.name, 'single', { outfitIndex: outfitIdx, outfit })}
          className="w-full h-full object-contain p-1.5 cursor-pointer group-hover:scale-105 transition-transform duration-300" 
        />
        <span className="absolute bottom-0.5 left-1 px-1 py-0.2 rounded bg-black/75 text-[8px] sm:text-[9px] text-slate-300 pointer-events-none truncate max-w-[85%]">
          {label}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setItemSwapModal({ outfitIndex: outfitIdx, item, outfit });
          }}
          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/75 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center backdrop-blur-sm transition-colors z-10 shadow cursor-pointer"
          title="Darab cseréje"
        >
          <RefreshCw className="w-2.5 h-2.5" />
        </button>
      </div>
    );
  };

  // Subcomponent: Render an Outfit Flatlay Canvas
  const renderOutfitFlatlay = (outfit, outfitIdx) => {
    const isSaved = savedIds.has(outfitIdx);
    const isFemale = profile?.gender === 'Női';
    const enforcedItems = enforceAnatomicalOutfitLayers(outfit.items || [], wardrobe, anchorItems[0] || null, weather);
    const { outer, upper, lower, dress, belt, shoes, socks, accessories } = categorizeOutfitItems(enforcedItems);

    return (
      <div 
        key={outfit.id || outfitIdx}
        className="p-3 sm:p-5 rounded-3xl bg-[#0a0e17] border border-slate-800 hover:border-slate-700 transition-all space-y-4 shadow-2xl flex flex-col justify-between"
      >
        <div className="space-y-3.5">
          
          {/* Card Header: Outfit number, formality, title & actions */}
          <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-200 font-bold text-[11px] font-mono">
                  #{outfitIdx + 1} Szett
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 text-[10px] font-semibold">
                  {outfit.formality || outfit.styleArchetype || 'Smart Casual'}
                </span>
                {outfit.matchScore && (
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono font-bold text-[10px]">
                    {outfit.matchScore}%
                  </span>
                )}
              </div>
              <h4 className="font-serif font-bold text-white text-base sm:text-lg mt-1 truncate">
                {outfit.title || `Összeállítás #${outfitIdx + 1}`}
              </h4>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => openLightbox(enforcedItems, 0, outfit.title || `Szett #${outfitIdx + 1}`, 'lookbook', { outfitIndex: outfitIdx, outfit })}
                className="p-1.5 rounded-xl bg-[#0d121c] hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Lookbook Magazin Nézet"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleRefreshSingleOutfit(outfitIdx)}
                disabled={isRefreshingIndex === outfitIdx}
                className="p-1.5 rounded-xl bg-[#0d121c] hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Szett újragenerálása"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingIndex === outfitIdx ? 'animate-spin text-amber-400' : ''}`} />
              </button>
            </div>
          </div>

          {/* Concise Decision Badge */}
          {outfit.decisionBadge && (
            <div className="px-3 py-1.5 rounded-xl bg-[#0d121c] border border-slate-800 text-slate-200 text-xs font-medium flex items-center gap-2 shadow-sm">
              <span className="shrink-0 text-amber-400">✨</span>
              <span className="truncate">{cleanSartorialText(outfit.decisionBadge)}</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* THE SEAMLESS VISUAL LOOKBOOK FLATLAY CANVAS */}
          {/* ========================================================================= */}
          <div className="space-y-3 pt-1">
            
            {/* 1. Dress or Upper Zone */}
            {dress ? (
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-500 block">
                  👗 Egyberuha (Bázisdarab):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {renderGarmentCard(dress, outfitIdx, outfit)}
                  {outer.length > 0 && renderGarmentCard(outer[0], outfitIdx, outfit)}
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-500 block">
                  🧥 Felső & Külső Rétegek:
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Outer layer if present */}
                  {outer.length > 0 ? renderGarmentCard(outer[0], outfitIdx, outfit) : null}
                  {/* Base top / Knitwear */}
                  {upper.length > 0 ? renderGarmentCard(upper[0], outfitIdx, outfit) : null}
                  {/* Secondary upper or outer if layered */}
                  {outer.length > 1 && renderGarmentCard(outer[1], outfitIdx, outfit)}
                  {upper.length > 1 && renderGarmentCard(upper[1], outfitIdx, outfit)}
                </div>
              </div>
            )}

            {/* 2. Lower Zone & Belt */}
            {lower && (
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-500 block">
                  👖 Alsótest {belt ? '& Öv' : ''}:
                </span>
                <div className="flex items-center gap-2.5">
                  <div className="flex-1 min-w-0">
                    {renderGarmentCard(lower, outfitIdx, outfit)}
                  </div>
                  {belt && renderMiniAccessoryCard(belt, 'Öv', outfitIdx, outfit)}
                </div>
              </div>
            )}

            {/* 3. Footwear & Socks Zone */}
            {shoes && (
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-500 block">
                  👞 Lábbeli {socks ? (isFemale ? '& Harisnya' : '& Zokni') : ''}:
                </span>
                <div className="flex items-center gap-2.5">
                  <div className="flex-1 min-w-0">
                    {renderGarmentCard(shoes, outfitIdx, outfit)}
                  </div>
                  {socks && renderMiniAccessoryCard(socks, isFemale ? 'Harisnya' : 'Zokni', outfitIdx, outfit)}
                </div>
              </div>
            )}

            {/* 4. Accessories Zone (Watches, Bags, Scarves, Jewelry) */}
            {accessories.length > 0 && (
              <div className="space-y-1 pt-1">
                <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-500 block">
                  ⌚ Kiegészítők:
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {accessories.map((acc, accIdx) => {
                    const sub = (acc.subCategory || '').toLowerCase();
                    const name = (acc.name || '').toLowerCase();
                    const label = (sub.includes('watch') || name.includes('óra')) ? 'Óra' 
                      : (sub.includes('bag') || name.includes('táska')) ? 'Táska'
                      : (sub.includes('scarf') || name.includes('sál')) ? 'Sál'
                      : (sub.includes('tie') || name.includes('nyakkendő')) ? 'Nyakkendő'
                      : 'Kieg';
                    return renderMiniAccessoryCard(acc, label, outfitIdx, outfit);
                  })}
                </div>
              </div>
            )}

          </div>

          {/* Collapsible Reasoning & Layering Notes */}
          {(outfit.culturalFitReasoning || outfit.layeringAdvice) && (
            <details className="group/details text-xs rounded-xl bg-[#090d15] border border-slate-800 overflow-hidden transition-all">
              <summary className="cursor-pointer select-none px-3 py-2 text-[11px] font-medium text-slate-400 hover:text-white flex items-center justify-between transition-colors">
                <div className="flex items-center gap-1.5 min-w-0">
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 transition-transform duration-200 group-open/details:rotate-90 shrink-0" />
                  <span className="font-semibold text-slate-200">Szakértői indoklás & rétegezés</span>
                </div>
                <span className="text-[10px] text-slate-500 shrink-0 ml-1 group-open/details:hidden">részletek ▾</span>
              </summary>
              <div className="px-3 pb-3 pt-1 space-y-2 border-t border-slate-800/80 animate-fade-in">
                {outfit.culturalFitReasoning && (
                  <div className="text-[11px] text-slate-300 leading-relaxed">
                    <span className="text-[10px] font-bold uppercase font-mono tracking-wider text-slate-400 block mb-0.5">
                      Stílusharmónia & Esemény-összhang:
                    </span>
                    {cleanSartorialText(outfit.culturalFitReasoning)}
                  </div>
                )}
                {outfit.layeringAdvice && (
                  <div className="p-2 rounded-lg bg-[#0d121c] border border-slate-700/60 text-[10.5px] text-slate-200 leading-snug">
                    <strong className="text-amber-300">Rétegezés:</strong> {cleanSartorialText(outfit.layerAdvice || outfit.layeringAdvice)}
                  </div>
                )}
              </div>
            </details>
          )}

        </div>

        {/* Card Footer: Save Button */}
        <div className="pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={() => handleSaveOutfit(outfit, outfitIdx)}
            disabled={isSaved}
            className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm ${
              isSaved
                ? 'bg-emerald-600 text-white cursor-default'
                : 'bg-slate-200 hover:bg-white text-slate-950 font-bold'
            }`}
          >
            {isSaved ? (
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
    );
  };

  return (
    <div className="space-y-4 animate-slide-up pb-28">
      
      {/* ========================================================================= */}
      {/* 1. TOP HEADER BAR: EXACT 1-ROW MIX & MATCH / BUY OR SKIP DESIGN (STICKY) */}
      {/* ========================================================================= */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-3 sm:px-4 py-2.5 rounded-2xl bg-[#090d15]/95 border border-slate-800 shadow-xl backdrop-blur-md">
        
        {/* Left: Outfit badge, count & Weather pill */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="px-3 py-1.5 rounded-xl bg-slate-200 text-slate-950 font-bold text-xs shadow-sm flex items-center gap-1.5 shrink-0">
            <span>👔</span>
            <span>Outfit</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-200 font-mono ml-1">
              {generatedOutfits.length > 0 ? `${generatedOutfits.length} szett` : `${wardrobe.length} pcs`}
            </span>
          </span>

          {weather && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#0d121c] border border-slate-800 text-xs text-slate-300 shrink-0">
              <span>{weather.icon || '🌤️'}</span>
              <span className="font-medium text-slate-200">{weather.city || 'Budapest'}</span>
              <strong className="text-white font-mono">{weather.temperature}°C</strong>
              <span className="text-slate-500 text-[11px]">({weather.condition})</span>
            </div>
          )}
        </div>

        {/* Right: Anchor piece trigger & Info button */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowAnchorModal(true)}
            className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 border ${
              anchorItems.length > 0
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                : 'bg-[#0d121c] text-slate-300 hover:text-white border-slate-800 hover:border-slate-700'
            }`}
            title="Fixált kulcsdarab kiválasztása"
          >
            <Lock className={`w-3.5 h-3.5 ${anchorItems.length > 0 ? 'text-amber-400' : 'text-slate-400'}`} />
            <span>{anchorItems.length > 0 ? `Fixált (${anchorItems.length} db)` : 'Fixált darab'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className={`p-2 rounded-xl border transition-colors cursor-pointer shrink-0 ${
              showGuide
                ? 'bg-slate-200 text-slate-900 border-white'
                : 'bg-[#0d121c] text-slate-400 hover:text-white border-slate-800'
            }`}
            title="Információ és tippek"
            aria-label="Információ"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. REFINED MODULE FIRST TIME GUIDE (OPENED BY INFO BUTTON) */}
      {/* ========================================================================= */}
      {showGuide && (
        <ModuleFirstTimeGuide
          moduleId="outfits"
          title="Hogyan működik az Outfit generátor?"
          subtitle="Személyre szabott esemény- és időjárás-hangolt szettajánló"
          badgeText="Útmutató & Tippek"
          description="Az AI a meglévő ruhatáradból állít össze 3 teljes anatómiailag és esztétikailag összehangolt szettet a megadott eseményre és az aktuális időjárásra."
          points={[
            "1. Esemény & Hangulat: Írd be a tervezett alkalmat, vagy válassz a gyors context chipek közül.",
            "2. 🔒 Fixált Kulcsdarab: Rögzíts egy meglévő kedvenc darabot (pl. új zakó vagy loafer), és az AI garantáltan köré építi a szetteket.",
            "3. Vizuális Flatlay Vászon: A szettek valós ruhafotókkal, arányosan rétegezve (felöltő, bázis, nadrág, cipő, öv) jelennek meg.",
            "4. Intelligens Csere & Mentés: Bármelyik darabot kicserélheted más alternatívára a ruhatáradból, a kész szettet pedig elmentheted."
          ]}
          forceOpen={true}
          onClose={() => setShowGuide(false)}
          wardrobeCount={wardrobe.length}
        />
      )}

      {/* ========================================================================= */}
      {/* 3. CATEGORY READINESS WARNING BANNER (IF INCOMPLETE OUTFIT SET) */}
      {/* ========================================================================= */}
      {!isOutfitReady && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-3 animate-slide-up">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-xs sm:text-sm">
              <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0" />
              <span>
                {wardrobe.length === 0
                  ? 'A szettgeneráláshoz tölts fel néhány alapdarabot a ruhatáradba!'
                  : 'A komplett szettekhez még hiányzik néhány alapkategória:'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => { window.location.hash = '#wardrobe'; }}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold py-1.5 px-3 rounded-xl flex items-center gap-1 shrink-0 shadow cursor-pointer"
            >
              <Shirt className="w-3.5 h-3.5" />
              <span>Ruhák Hozzáadása</span>
            </button>
          </div>
          
          <div className="grid grid-cols-3 gap-2 py-1 text-center text-xs">
            <div className={`p-2.5 rounded-xl border ${topsCount >= 1 ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300' : 'bg-black/40 border-rose-500/40 text-rose-300'}`}>
              <div className="font-bold">👕 Felső</div>
              <div className="text-[11px] mt-0.5">{topsCount >= 1 ? `✅ ${topsCount} db` : '❌ Hiányzik'}</div>
            </div>
            <div className={`p-2.5 rounded-xl border ${bottomsCount >= 1 ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300' : 'bg-black/40 border-rose-500/40 text-rose-300'}`}>
              <div className="font-bold">👖 Nadrág / Alsó</div>
              <div className="text-[11px] mt-0.5">{bottomsCount >= 1 ? `✅ ${bottomsCount} db` : '❌ Hiányzik'}</div>
            </div>
            <div className={`p-2.5 rounded-xl border ${shoesCount >= 1 ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300' : 'bg-black/40 border-rose-500/40 text-rose-300'}`}>
              <div className="font-bold">👞 Lábbeli</div>
              <div className="text-[11px] mt-0.5">{shoesCount >= 1 ? `✅ ${shoesCount} db` : '❌ Hiányzik'}</div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. EVENT & PRESET CONTROL BAR (DARK SLEEK CONTAINER) */}
      {/* ========================================================================= */}
      <div className="p-3 sm:p-4 rounded-3xl bg-[#0a0e17] border border-slate-800 space-y-3 shadow-2xl">
        
        {/* Free-text Input & Generate Button in 1 Clean Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <input
              type="text"
              placeholder="Esemény / alkalom megadása (pl. Kávérandi & Séta, Toszkánai esküvő, Irodai péntek)..."
              value={customEvent}
              onChange={(e) => setCustomEvent(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleGenerate(); }}
              className="w-full bg-[#090d15] border border-slate-800 rounded-xl px-3.5 py-2.5 pr-14 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-500 transition-colors"
            />
            {customEvent && (
              <button
                type="button"
                onClick={() => setCustomEvent('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white px-1.5 py-0.5 rounded cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || wardrobe.length === 0}
            className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-white text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer shrink-0 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                <span>Szettek összeállítása folyamatban...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>3 szett összeállítása</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Context Preset Chips */}
        <div className="space-y-1.5 pt-1">
          <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-500 block">
            Gyors Context Chipek:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {recentEvents.map(preset => {
              const isSelected = (!customEvent && selectedEvent === preset) || customEvent === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setSelectedEvent(preset);
                    setCustomEvent(preset);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-200 text-slate-950 font-bold shadow-sm'
                      : 'bg-[#090d15] text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {preset}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Anchor Piece Banner if selected */}
        {anchorItems.length > 0 && (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 animate-fade-in">
            <div className="flex items-center gap-2 min-w-0">
              <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="font-bold text-amber-300 shrink-0">Fixált kulcsdarab:</span>
              <div className="flex items-center gap-1.5 min-w-0 overflow-x-auto scrollbar-none">
                {anchorItems.map(a => (
                  <span key={a.id} className="inline-flex items-center gap-1 bg-black/50 px-2 py-0.5 rounded-md border border-amber-400/20 truncate text-[11px]">
                    <span className="truncate">{a.name}</span>
                  </span>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAnchorItems([])}
              className="text-amber-400 hover:text-white px-2 py-0.5 text-xs transition-colors shrink-0 ml-2 cursor-pointer font-bold"
              title="Fixálás feloldása"
            >
              ✕ Törlés
            </button>
          </div>
        )}

        {/* Generation Error Alert */}
        {generationError && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-fade-in">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
            <div className="flex-1 space-y-0.5">
              <p className="font-semibold text-rose-200">AI Szettgenerálási Figyelmeztetés</p>
              <p className="text-rose-300/90 leading-relaxed">{generationError}</p>
            </div>
            <button
              type="button"
              onClick={() => setGenerationError(null)}
              className="text-rose-400 hover:text-white text-xs font-bold cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* 5. GENERATED OUTFITS SECTION (LOOKBOOK FLATLAY & VIEW MODE SWITCHER) */}
      {/* ========================================================================= */}
      {generatedOutfits && generatedOutfits.length > 0 && (
        <div className="space-y-4">
          
          {/* Header & Segmented View Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2">
            <h3 className="text-lg sm:text-xl font-serif font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>3 Szettvariáció</span>
            </h3>

            {/* View Mode Switcher: 1. Szett | 2. Szett | 3. Szett | Mind a 3 */}
            <div className="flex items-center bg-[#0d121c] p-1 rounded-xl border border-slate-800 self-start sm:self-auto overflow-x-auto scrollbar-none">
              {[0, 1, 2].map(idx => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveOutfitTab(idx)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    activeOutfitTab === idx
                      ? 'bg-slate-200 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>{idx + 1}. Szett</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setActiveOutfitTab('all')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeOutfitTab === 'all'
                    ? 'bg-slate-200 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>👁️ Mind a 3</span>
              </button>
            </div>
          </div>

          {/* Outfits Display: Single Tab View OR Grid View */}
          {activeOutfitTab === 'all' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {generatedOutfits.map((outfit, idx) => renderOutfitFlatlay(outfit, idx))}
            </div>
          ) : (
            <div className="max-w-2xl mx-auto">
              {generatedOutfits[activeOutfitTab] && renderOutfitFlatlay(generatedOutfits[activeOutfitTab], activeOutfitTab)}
            </div>
          )}

        </div>
      )}

      {/* Empty Wardrobe Guidance */}
      {wardrobe.length === 0 && (
        <div className="p-8 text-center space-y-3 max-w-md mx-auto rounded-3xl bg-[#0a0e17] border border-slate-800 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-[#0d121c] border border-slate-800 mx-auto flex items-center justify-center text-xl">
            👔
          </div>
          <h3 className="font-serif font-bold text-white text-base">
            Még nincs ruha rögzítve a ruhatáradban
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            A szettgenerálás kizárólag a meglévő darabjaidból dolgozik. Lépj a <strong>Wardrobe</strong> fülre és tölts fel néhány ruhát az induláshoz!
          </p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. ANCHOR ITEMS MODAL (DARK TITANIUM GLASSMORPHISM - PORTAL CENTERED) */}
      {/* ========================================================================= */}
      {showAnchorModal && createPortal(
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setShowAnchorModal(false); }}
          className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-[#0a0e17] border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 max-h-[85vh] flex flex-col shadow-2xl overflow-hidden my-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                <h3 className="font-serif font-bold text-white text-base">
                  Fixált Kulcsdarab Kiválasztása
                </h3>
              </div>
              <button 
                onClick={() => setShowAnchorModal(false)} 
                className="p-1 rounded-lg text-slate-400 hover:text-white bg-[#0d121c] border border-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 shrink-0">
              Válaszd ki azt a ruhadarabot, amely köré a szettet építeni szeretnéd (pl. egy konkrét zakó vagy új cipő). Az AI garantáltan beépíti mind a 3 szettbe!
            </p>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 overscroll-contain scrollbar-thin">
              {wardrobe.map(item => {
                const isSelected = anchorItems.some(a => a.id === item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleAnchorItem(item)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-500/50 text-white font-bold'
                        : 'bg-[#090d15] border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-[#05070c] p-1 shrink-0 overflow-hidden border border-slate-800 flex items-center justify-center">
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-white truncate">{item.name}</h4>
                        <span className="text-[10px] text-slate-400 block truncate">
                          {item.category} • {item.color} • {item.material}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {isSelected ? (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 text-[10px] font-bold">Fixálva</span>
                      ) : (
                        <span className="text-xs text-slate-400">+ Kiválasztás</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowAnchorModal(false)}
                className="bg-slate-200 hover:bg-white text-slate-950 font-bold text-xs py-2 px-5 rounded-xl cursor-pointer shadow transition-colors"
              >
                Kész ({anchorItems.length} db fixálva)
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* 7. GARMENT SWAP MODAL (AI VS MANUAL REPLACEMENT - PORTAL CENTERED) */}
      {/* ========================================================================= */}
      {itemSwapModal && createPortal(
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setItemSwapModal(null); }}
          className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-[#0a0e17] border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 max-h-[85vh] flex flex-col shadow-2xl overflow-hidden my-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-amber-400" />
                <h3 className="font-serif font-bold text-white text-base">
                  Darab Cseréje a Szettben
                </h3>
              </div>
              <button 
                onClick={() => setItemSwapModal(null)} 
                className="p-1 rounded-lg text-slate-400 hover:text-white bg-[#0d121c] border border-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Item being replaced */}
            <div className="p-3 rounded-xl bg-[#090d15] border border-slate-800 flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-[#05070c] p-1 shrink-0 overflow-hidden border border-slate-800 flex items-center justify-center">
                <img src={itemSwapModal.item.imageUrl} alt={itemSwapModal.item.name} className="w-full h-full object-contain" />
              </div>
              <div>
                <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider block">Lecserélendő Darab:</span>
                <h4 className="text-xs font-bold text-white">{itemSwapModal.item.name}</h4>
                <span className="text-[10px] text-slate-400">{itemSwapModal.item.category} • {itemSwapModal.item.color}</span>
              </div>
            </div>

            {/* AI Smart Swap Button */}
            <button
              type="button"
              onClick={() => handleAiSwapGarment(itemSwapModal.outfitIndex, itemSwapModal.item)}
              disabled={isAiSwapping}
              className="bg-slate-200 hover:bg-white text-slate-950 w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow cursor-pointer transition-colors"
            >
              {isAiSwapping ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Az AI Keresi a Legjobb Alternatívát...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  <span>🤖 AI Automatikus Okos Csere</span>
                </>
              )}
            </button>

            {swapError && (
              <div className="p-2.5 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs">
                {swapError}
              </div>
            )}

            {/* Manual Candidates from Wardrobe */}
            <div className="space-y-2 pt-1">
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-500 block">
                Vagy válassz egy darabot a gardróbodból:
              </span>

              <div className="max-h-48 overflow-y-auto overscroll-contain space-y-1.5 pr-1 scrollbar-thin">
                {getSwapCandidates(itemSwapModal.item, itemSwapModal.outfit).map(candidate => (
                  <div
                    key={candidate.id}
                    onClick={() => handleManualSwapGarment(itemSwapModal.outfitIndex, itemSwapModal.item, candidate)}
                    className="p-2 rounded-xl bg-[#090d15] hover:bg-slate-800/60 border border-slate-800 hover:border-slate-700 cursor-pointer flex items-center justify-between gap-2 transition-all"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[#05070c] p-0.5 shrink-0 border border-slate-800 flex items-center justify-center">
                        <img src={candidate.imageUrl} alt={candidate.name} className="w-full h-full object-contain" />
                      </div>
                      <span className="text-xs text-white truncate">{candidate.name}</span>
                    </div>
                    <span className="text-[10px] text-amber-400 font-bold shrink-0">Csere erre ➔</span>
                  </div>
                ))}
              </div>
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
          defaultView={lightboxData.defaultView}
          onClose={() => setLightboxData(prev => ({ ...prev, isOpen: false }))}
        />
      )}

    </div>
  );
}
