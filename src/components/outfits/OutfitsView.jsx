import React, { useState, useEffect } from 'react';
import { 
  Sparkles, CloudSun, Calendar, Compass, ArrowRight, Bookmark, Check, RefreshCw, 
  Loader2, Plus, X, Layers, Lock, Unlock, CheckCircle2, ShieldAlert,
  Maximize2, Grid, ChevronRight, Feather, SlidersHorizontal as Sliders, Shirt
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { generateEventOutfits, swapOutfitItem, enforceAnatomicalOutfitLayers } from '../../services/gemini';
import { fetchCurrentWeather, CITIES } from '../../services/weather';
import { getDynamicEventPresets } from '../../services/demographics';
import confetti from 'canvas-confetti';
import GarmentLightboxModal from '../common/GarmentLightboxModal';
import ModuleFirstTimeGuide from '../common/ModuleFirstTimeGuide';

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
  const [generatedOutfits, setGeneratedOutfits] = useState(() => {
    try {
      const saved = localStorage.getItem('sartorial_last_generated_outfits');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      // If any outfit contains legacy items with old URLs or old brands, invalidate
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
  const [swappingItemKey, setSwappingItemKey] = useState(null); // "${outfitIndex}-${itemId}"
  const [itemSwapModal, setItemSwapModal] = useState(null); // { outfitIndex, item, outfit }
  const [isAiSwapping, setIsAiSwapping] = useState(false);
  const [swapError, setSwapError] = useState(null);

  // Anchor / Key Items
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
    outfitContext: null // { outfitIndex, outfit }
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

  // Lock body scroll when any modal is open to prevent background viewport jump
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

  // Persist outfits to localStorage whenever updated
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
  }, [initialAnchorItem, anchorItems]);

  const saveEventToHistory = (evt) => {
    if (!evt || eventPresets.includes(evt)) return;
    setRecentEvents(prev => {
      const filtered = prev.filter(e => e !== evt);
      const updated = [evt, ...filtered].slice(0, 8);
      localStorage.setItem('user_event_history', JSON.stringify(updated));
      return updated;
    });
  };

  // Category Readiness Check (Base Anatomical Blueprint: Min 1 top, 1 bottom, 1 shoes)
  const topsCount = (wardrobe || []).filter(w => w.category === 'tops' || (w.name || '').toLowerCase().includes('ing') || (w.name || '').toLowerCase().includes('póló')).length;
  const bottomsCount = (wardrobe || []).filter(w => w.category === 'bottoms' || w.category === 'skirts' || (w.name || '').toLowerCase().includes('nadrág')).length;
  const shoesCount = (wardrobe || []).filter(w => w.category === 'shoes' || (w.name || '').toLowerCase().includes('cipő') || (w.name || '').toLowerCase().includes('loafer') || (w.name || '').toLowerCase().includes('sneaker') || (w.name || '').toLowerCase().includes('csizma')).length;
  const isOutfitReady = topsCount >= 1 && bottomsCount >= 1 && shoesCount >= 1;

  // 1. Generate Outfits
  const handleGenerate = async () => {
    if (!isOutfitReady) {
      const missingCats = [];
      if (topsCount < 1) missingCats.push('1 db Felső (ing vagy póló)');
      if (bottomsCount < 1) missingCats.push('1 db Nadrág vagy szoknya');
      if (shoesCount < 1) missingCats.push('1 db Lábbeli (cipő vagy csizma)');
      setGenerationError(`A szettgeneráláshoz még a következő alapkategóriák szükségesek a ruhatáradból: ${missingCats.join(', ')}.`);
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    const eventName = customEvent.trim() || selectedEvent;
    if (customEvent.trim()) saveEventToHistory(customEvent.trim());

    try {
      const outfits = await generateEventOutfits({
        eventName,
        weather: weather || { temperature: 21, condition: 'Kellemes' },
        wardrobe,
        styleProfile: profile,
        anchorItemIds: anchorItems.map(a => a.id)
      });
      setGeneratedOutfits(outfits);


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
        anchorItemIds: anchorItems.map(a => a.id)
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
    const isOuterwear = cat === 'outerwear' || (itemToReplace.name || '').toLowerCase().includes('zakó') || (itemToReplace.name || '').toLowerCase().includes('kabát') || (itemToReplace.name || '').toLowerCase().includes('blézer');
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
        return w.category === 'outerwear' || (w.name || '').toLowerCase().includes('zakó') || (w.name || '').toLowerCase().includes('blézer') || (w.name || '').toLowerCase().includes('dzseki') || (w.name || '').toLowerCase().includes('kabát');
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

        // Close swap modal if open
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

  return (
    <div className="space-y-6 animate-slide-up">
      
      {/* Top Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="badge badge-gold">AI Stylist</span>
            <span className="badge badge-emerald">Rétegrend & Stílus</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold font-serif gold-gradient-text mt-1">
            Napi & Esemény Szettkérő
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
            Önazonos, az időjárásnak és az alkalomnak megfelelő harmonikus összeállítások a ruhatáradból.
          </p>
        </div>

        {/* Weather Indicator Card */}
        {weather && (
          <div className="flex items-center gap-2.5 p-2 sm:p-2.5 rounded-2xl bg-[#080d1a]/80 border border-[var(--border-gold)]/40 shadow-lg shrink-0">
            <div className="min-w-[48px] px-2 h-9 sm:h-10 rounded-xl bg-[var(--accent-gold)]/15 border border-[var(--border-gold)]/50 flex items-center justify-center text-[var(--accent-gold)] text-sm sm:text-base font-bold whitespace-nowrap shrink-0">
              {weather.temperature}°C
            </div>
            <div className="min-w-0 pr-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-white truncate">
                <CloudSun className="w-3.5 h-3.5 text-[var(--accent-gold)] shrink-0" />
                <span className="truncate">{weather.city || 'Helyi időjárás'}</span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-[var(--text-secondary)] truncate">
                {weather.condition || 'Kellemes idő'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* First-time module guidance */}
      <ModuleFirstTimeGuide 
        moduleId="outfits"
        title="Hogyan működik a Szettkérő?"
        subtitle="Személyre szabott esemény- és időjárás-hangolt szettek kizárólag a meglévő ruháidból"
        description="Az AI Wardrobe Assistant nem talál ki fantomruhákat: kizárólag a saját fizikai ruhatárad darabjaiból állít össze harmonikus, stílusos szetteket."
        points={[
          "A szettkészítéshez legalább 1 db Felső (ing/póló), 1 db Nadrág és 1 db Lábbeli szükséges a gardróbodban.",
          "Az AI szigorúan betartja a gallérharmóniát, az ujjhosszt és az időjárási rétegrendet.",
          "Kijelölhetsz kötelező kulcsdarabot (Anchor Item) is, ami köré épülnek a szettek."
        ]}
        actionLabel="Irány a Gardrób – Ruhák feltöltése"
        onAction={() => {
          window.location.hash = '#wardrobe';
        }}
        wardrobeCount={wardrobe?.length || 0}
      />

      {/* Category Readiness Warning Banner (if incomplete outfit set) */}
      {!isOutfitReady && (
        <div className="glass-card p-4 sm:p-5 border-amber-500/40 bg-gradient-to-r from-amber-950/30 via-black/50 to-amber-950/20 rounded-2xl space-y-3 animate-slide-up">
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
              className="btn-gold text-xs py-1.5 px-3 flex items-center gap-1 shrink-0 shadow"
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

      {/* Main Request Box (Free-text + Context Chips) */}
      <div className="glass-card p-4 sm:p-6 space-y-4 border-[var(--border-gold)]/50 shadow-xl bg-gradient-to-b from-[#0e1628]/90 to-[#070b14]/90">
        
        {/* Free text input */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-[var(--accent-gold-light)] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--accent-gold)]" />
            <span>Milyen alkalomra vagy eseményre keresel szettet?</span>
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Írd le szabadon (pl. 'Szerda esti kávérandi hűvös időben', 'Sprezzatura üzleti ebéd')..."
              value={customEvent}
              onChange={(e) => setCustomEvent(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleGenerate(); }}
              className="custom-input text-sm sm:text-base py-3 pr-24"
            />
            {customEvent && (
              <button
                type="button"
                onClick={() => setCustomEvent('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] hover:text-white"
              >
                Törlés
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Context Chips */}
        <div className="space-y-1.5">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)] block">
            Gyors Context Chipek:
          </span>
          <div className="flex flex-wrap gap-2">
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
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-[var(--accent-gold)] text-black font-bold shadow-md shadow-[var(--accent-gold)]/20 scale-102'
                      : 'bg-white/5 text-[var(--text-secondary)] hover:bg-white/10 hover:text-white border border-white/5'
                  }`}
                >
                  {preset}
                </button>
              );
            })}
          </div>
        </div>

        {/* Fine-tune Controls: Local Weather Status & Anchor Piece */}
        <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          
          {/* Automatic Local Weather Indicator */}
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-muted)]">Helyi időjárás:</span>
            {weather ? (
              <span className="text-white font-medium flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-lg border border-white/10">
                <span>{weather.icon || '🌤️'}</span>
                <span>{weather.city || 'Helyi időjárás'}</span>
                <strong className="text-[var(--accent-gold)]">{weather.temperature}°C</strong>
                <span className="text-[var(--text-muted)] text-[10px]">({weather.condition})</span>
              </span>
            ) : (
              <span className="text-[var(--text-muted)] italic">Időjárás lekérése...</span>
            )}
          </div>

          {/* Anchor Item Selector Trigger */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAnchorModal(true)}
              className={`px-3 py-1 rounded-lg border text-xs flex items-center gap-1.5 transition-all ${
                anchorItems.length > 0
                  ? 'bg-[var(--accent-gold)]/20 border-[var(--border-gold)] text-[var(--accent-gold-light)] font-medium'
                  : 'border-white/10 text-[var(--text-muted)] hover:text-white bg-white/5'
              }`}
            >
              <Lock className="w-3 h-3 text-[var(--accent-gold)]" />
              <span>
                {anchorItems.length > 0 
                  ? `Fixált kulcsdarab (${anchorItems.length} db)` 
                  : '+ Fixált kulcsdarab hozzáadása'}
              </span>
            </button>
          </div>

        </div>

        {/* Big Action Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || wardrobe.length === 0}
            className="btn-gold w-full py-3.5 sm:py-4 text-sm sm:text-base font-serif font-bold tracking-wide shadow-xl flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>3 Kifinomult Szett Generálása Folyamatban...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-black" />
                <span>3 Önazonos Szett Összeállítása a Gardróbomból</span>
              </>
            )}
          </button>

          {/* Generation Error Alert */}
          {generationError && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-start gap-3 animate-fadeIn">
              <ShieldAlert className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
              <div className="flex-1 space-y-1">
                <p className="font-semibold text-rose-200">AI Szettgenerálási Figyelmeztetés</p>
                <p className="text-rose-300/90 leading-relaxed">{generationError}</p>
              </div>
              <button
                type="button"
                onClick={() => setGenerationError(null)}
                className="text-rose-400 hover:text-white text-xs font-bold"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Generated Outfits Section */}
      {generatedOutfits && generatedOutfits.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-serif font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[var(--accent-gold)]" />
              <span>3 Jóváhagyott Szettvariáció</span>
            </h3>
            <span className="text-xs text-[var(--text-secondary)]">
              {generatedOutfits.length} komplett összeállítás
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {generatedOutfits.map((outfit, outfitIdx) => {
              const isSaved = savedIds.has(outfitIdx);
              const items = enforceAnatomicalOutfitLayers(outfit.items || []);

              return (
                <div
                  key={outfit.id || outfitIdx}
                  className="glass-card p-5 space-y-4 flex flex-col justify-between border-[var(--border-subtle)] hover:border-[var(--border-gold)] transition-all relative group"
                >
                  <div className="space-y-3.5">
                    
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-[var(--accent-gold)]">
                            #{outfitIdx + 1} Szett
                          </span>
                          <span className="badge badge-subtle text-[10px]">
                            {outfit.formality || 'Smart Casual'}
                          </span>
                        </div>
                        <h4 className="font-serif font-bold text-white text-base mt-0.5">
                          {outfit.title || `Összeállítás #${outfitIdx + 1}`}
                        </h4>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openLightbox(items, 0, outfit.title || `Szett #${outfitIdx + 1}`, 'lookbook', { outfitIndex: outfitIdx, outfit })}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-[var(--text-secondary)] hover:text-white transition-colors"
                          title="Lookbook Magazin Nézet"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRefreshSingleOutfit(outfitIdx)}
                          disabled={isRefreshingIndex === outfitIdx}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-[var(--text-secondary)] hover:text-white transition-colors"
                          title="Szett újragenerálása"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingIndex === outfitIdx ? 'animate-spin text-[var(--accent-gold)]' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {/* Concise Decision Badge */}
                    {outfit.decisionBadge && (
                      <div className="px-2.5 py-1 rounded-xl bg-[var(--accent-gold)]/10 border border-[var(--border-gold)]/35 text-[var(--accent-gold-light)] text-[11px] font-medium flex items-center gap-1.5 shadow-xs">
                        <span className="shrink-0 text-xs">✨</span>
                        <span className="truncate">{outfit.decisionBadge}</span>
                      </div>
                    )}

                    {/* Collapsible Reasoning & Layering Notes */}
                    {(outfit.culturalFitReasoning || outfit.layeringAdvice) && (
                      <details className="group/details text-xs rounded-xl bg-black/25 border border-white/5 overflow-hidden transition-all">
                        <summary className="cursor-pointer select-none px-3 py-2 text-[11px] font-medium text-[var(--text-secondary)] hover:text-white flex items-center justify-between transition-colors">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <ChevronRight className="w-3.5 h-3.5 text-[var(--accent-gold)] transition-transform duration-200 group-open/details:rotate-90 shrink-0" />
                            <span className="font-semibold text-white/90">Szakértői indoklás & rétegezés</span>
                          </div>
                          <span className="text-[10px] text-[var(--text-muted)] shrink-0 ml-1 group-open/details:hidden">részletek ▾</span>
                        </summary>
                        <div className="px-3 pb-3 pt-1 space-y-2 border-t border-white/5 animate-fadeIn">
                          {outfit.culturalFitReasoning && (
                            <div className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-gold-light)] block mb-0.5">
                                Stílusharmónia & Esemény-összhang:
                              </span>
                              {outfit.culturalFitReasoning}
                            </div>
                          )}
                          {outfit.layeringAdvice && (
                            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10.5px] text-amber-200/90 leading-snug">
                              <strong className="text-amber-300">Rétegezés:</strong> {outfit.layerAdvice || outfit.layeringAdvice}
                            </div>
                          )}
                        </div>
                      </details>
                    )}

                    {/* Garment Items List with Swap Actions */}
                    <div className="space-y-2 pt-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                        Szett Elemek ({items.length} db):
                      </span>
                      
                      <div className="space-y-2">
                        {items.map((item, itemIdx) => {
                          const swapKey = `${outfitIdx}-${item.id}`;
                          const isCurrentlySwapping = isAiSwapping && swappingItemKey === swapKey;

                          return (
                            <div
                              key={item.id || itemIdx}
                              className="p-2 rounded-xl bg-black/40 border border-white/5 hover:border-[var(--border-gold)]/40 transition-all flex items-center justify-between gap-3 group/item"
                            >
                              <div 
                                onClick={() => openLightbox(items, itemIdx, outfit.title, 'single', { outfitIndex: outfitIdx, outfit })}
                                className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
                              >
                                <div className="w-10 h-10 rounded-lg bg-[#07090e] p-1 shrink-0 overflow-hidden border border-white/10 flex items-center justify-center">
                                  <img
                                    src={item.imageUrl}
                                    alt={item.name}
                                    className="w-full h-full object-contain"
                                    loading="lazy"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <h5 className="text-xs font-medium text-white truncate group-hover/item:text-[var(--accent-gold)] transition-colors">
                                    {item.name}
                                  </h5>
                                  <span className="text-[10px] text-[var(--text-muted)] block truncate">
                                    {item.brand ? `${item.brand} • ` : ''}{item.color || ''} {item.material ? `(${item.material})` : ''}
                                  </span>
                                </div>
                              </div>

                              {/* Swap Button */}
                              <button
                                type="button"
                                onClick={() => setItemSwapModal({ outfitIndex: outfitIdx, item, outfit })}
                                disabled={isCurrentlySwapping}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-[var(--accent-gold)]/20 hover:text-[var(--accent-gold)] text-[var(--text-muted)] transition-all shrink-0 text-xs flex items-center gap-1"
                                title="Darab cseréje"
                              >
                                {isCurrentlySwapping ? (
                                  <Loader2 className="w-3 h-3 animate-spin text-[var(--accent-gold)]" />
                                ) : (
                                  <RefreshCw className="w-3 h-3" />
                                )}
                                <span className="text-[10px] hidden sm:inline">Csere</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>

                  {/* Card Footer: Save Button */}
                  <div className="pt-3 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => handleSaveOutfit(outfit, outfitIdx)}
                      disabled={isSaved}
                      className={`w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                        isSaved
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default'
                          : 'btn-secondary hover:border-[var(--border-gold)] text-white'
                      }`}
                    >
                      {isSaved ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span>Elmentve a Kedvencekhez</span>
                        </>
                      ) : (
                        <>
                          <Bookmark className="w-4 h-4 text-[var(--accent-gold)]" />
                          <span>Szett Mentése Kedvencként</span>
                        </>
                      )}
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty Wardrobe Guidance */}
      {wardrobe.length === 0 && (
        <div className="glass-card p-8 text-center space-y-3 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-full bg-[var(--accent-gold)]/20 text-[var(--accent-gold)] flex items-center justify-center mx-auto">
            <Compass className="w-6 h-6" />
          </div>
          <h3 className="font-serif font-bold text-white text-base">
            Még nincs ruha rögzítve a gardróbodban
          </h3>
          <p className="text-xs text-[var(--text-secondary)]">
            A szettgenerálás kizárólag a fizikai ruhatáradban meglévő darabokból dolgozik. Lépj a <strong>Gardrób</strong> fülre és töltsd fel az első pár darabodat!
          </p>
        </div>
      )}

      {/* Anchor Items Modal */}
      {showAnchorModal && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setShowAnchorModal(false); }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md overscroll-contain animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="glass-card max-w-xl w-full p-5 sm:p-6 space-y-4 max-h-[85vh] my-auto flex flex-col border-[var(--border-gold)] shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-[var(--accent-gold)]" />
                <h3 className="font-serif font-bold text-white text-base">
                  Fixált Kulcsdarab Kiválasztása
                </h3>
              </div>
              <button onClick={() => setShowAnchorModal(false)} className="text-[var(--text-muted)] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[var(--text-secondary)] shrink-0">
              Válaszd ki azt a ruhadarabot, amely köré a szettet építeni szeretnéd (pl. egy konkrét zakó vagy új cipő).
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
                        ? 'bg-[var(--accent-gold)]/20 border-[var(--border-gold)] text-white'
                        : 'bg-black/30 border-white/5 hover:border-white/20 text-[var(--text-secondary)]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-[#07090e] p-1 shrink-0 overflow-hidden">
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-white truncate">{item.name}</h4>
                        <span className="text-[10px] text-[var(--text-muted)] block truncate">
                          {item.category} • {item.color} • {item.material}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {isSelected ? (
                        <span className="badge badge-gold text-[10px] font-bold">Fixálva</span>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)]">+ Kiválasztás</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowAnchorModal(false)}
                className="btn-gold text-xs py-2 px-5"
              >
                Kész ({anchorItems.length} db fixálva)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Garment Swap Modal (AI vs Manual replacement) */}
      {itemSwapModal && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setItemSwapModal(null); }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md overscroll-contain animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="glass-card max-w-lg w-full p-5 sm:p-6 space-y-4 max-h-[85vh] my-auto flex flex-col border-[var(--border-gold)] shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-[var(--accent-gold)]" />
                <h3 className="font-serif font-bold text-white text-base">
                  Darab Cseréje a Szettben
                </h3>
              </div>
              <button onClick={() => setItemSwapModal(null)} className="text-[var(--text-muted)] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Item being replaced */}
            <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-[#07090e] p-1 shrink-0 overflow-hidden">
                <img src={itemSwapModal.item.imageUrl} alt={itemSwapModal.item.name} className="w-full h-full object-contain" />
              </div>
              <div>
                <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider block">Lecserélendő Darab:</span>
                <h4 className="text-xs font-bold text-white">{itemSwapModal.item.name}</h4>
                <span className="text-[10px] text-[var(--text-muted)]">{itemSwapModal.item.category} • {itemSwapModal.item.color}</span>
              </div>
            </div>

            {/* AI Smart Swap Button */}
            <button
              type="button"
              onClick={() => handleAiSwapGarment(itemSwapModal.outfitIndex, itemSwapModal.item)}
              disabled={isAiSwapping}
              className="btn-gold w-full py-3 text-xs font-bold flex items-center justify-center gap-2 shadow"
            >
              {isAiSwapping ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Az AI Keresi a Legjobb Alternatívát...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-black" />
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
            <div className="space-y-2 pt-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)] block">
                Vagy válassz egy darabot a gardróbodból:
              </span>

              <div className="max-h-48 overflow-y-auto overscroll-contain space-y-1.5 pr-1 scrollbar-thin">
                {getSwapCandidates(itemSwapModal.item, itemSwapModal.outfit).map(candidate => (
                  <div
                    key={candidate.id}
                    onClick={() => handleManualSwapGarment(itemSwapModal.outfitIndex, itemSwapModal.item, candidate)}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/15 border border-white/5 cursor-pointer flex items-center justify-between gap-2 transition-all"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded bg-[#07090e] p-0.5 shrink-0">
                        <img src={candidate.imageUrl} alt={candidate.name} className="w-full h-full object-contain" />
                      </div>
                      <span className="text-xs text-white truncate">{candidate.name}</span>
                    </div>
                    <span className="text-[10px] text-[var(--accent-gold)] font-bold shrink-0">Csere erre ➔</span>
                  </div>
                ))}
              </div>
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
          defaultView={lightboxData.defaultView}
          onClose={() => setLightboxData(prev => ({ ...prev, isOpen: false }))}
        />
      )}

    </div>
  );
}
