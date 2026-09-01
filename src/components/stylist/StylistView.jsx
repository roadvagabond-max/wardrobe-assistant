import React, { useState, useEffect } from 'react';
import { 
  Sparkles, CloudSun, Calendar, Compass, ArrowRight, Bookmark, Check, RefreshCw, 
  Loader2, Plus, X, Layers, Lock, Unlock, MessageSquare, CheckCircle2, ShieldAlert,
  Maximize2, Grid, ChevronRight, Feather, Sliders
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { generateEventOutfits, auditManualOutfit } from '../../services/gemini';
import { fetchCurrentWeather, CITIES } from '../../services/weather';
import confetti from 'canvas-confetti';
import GarmentLightboxModal from '../common/GarmentLightboxModal';
import StylistChatView from './StylistChatView';

const DEFAULT_EVENT_PRESETS = [
  'Üzleti Tárgyalás & Ebéd',
  'Nyári Teraszos Randevú',
  'Sprezzatura Kötetlen Péntek',
  'Esküvő & Ünnepi Esemény',
  'Hétvégi Városi Séta & Kávézás',
  'Elegáns Esti Színház / Vacsora'
];

const SLOT_DEFINITIONS = [
  { key: 'tops', label: 'Bázis Felső (Ing / Póló)', icon: '👔', category: 'tops', required: true },
  { key: 'knitwear', label: 'Köztes Réteg (Pulóver)', icon: '🧶', category: 'knitwear', required: false },
  { key: 'outerwear', label: 'Külső Réteg (Zakó / Kabát)', icon: '🧥', category: 'outerwear', required: false },
  { key: 'bottoms', label: 'Nadrág (Alsó)', icon: '👖', category: 'bottoms', required: true },
  { key: 'shoes', label: 'Lábbeli (Cipő)', icon: '👞', category: 'shoes', required: true },
  { key: 'accessories', label: 'Öv / Kiegészítő', icon: '🎗️', category: 'accessories', required: false }
];

export default function StylistView({ weather, setWeather, initialAnchorItem = null }) {
  const { wardrobe, profile, saveOutfit, savedOutfits } = useAuth();

  // Top Mode Selector: 'generator' | 'manual-audit' | 'chat'
  const [activeSubTab, setActiveSubTab] = useState('generator');

  // Generator States
  const [selectedEvent, setSelectedEvent] = useState('Üzleti Tárgyalás & Ebéd');
  const [customEvent, setCustomEvent] = useState('');
  const [selectedCity, setSelectedCity] = useState('Budapest');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefreshingIndex, setIsRefreshingIndex] = useState(null);
  const [generatedOutfits, setGeneratedOutfits] = useState([]);
  const [savedIds, setSavedIds] = useState(new Set());

  // Anchor / Key Items
  const [anchorItems, setAnchorItems] = useState(initialAnchorItem ? [initialAnchorItem] : []);
  const [showAnchorModal, setShowAnchorModal] = useState(false);

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
  const [isAuditing, setIsAuditing] = useState(false);
  const [manualAuditResult, setManualAuditResult] = useState(null);
  const [isManualSaved, setIsManualSaved] = useState(false);

  // Lightbox Modal State
  const [lightboxData, setLightboxData] = useState({
    isOpen: false,
    items: [],
    initialIndex: 0,
    outfitTitle: '',
    defaultView: 'lookbook'
  });

  const openLightbox = (items, initialIndex = 0, outfitTitle = '', defaultView = 'lookbook') => {
    setLightboxData({
      isOpen: true,
      items: items || [],
      initialIndex: initialIndex >= 0 ? initialIndex : 0,
      outfitTitle: outfitTitle || '',
      defaultView: items && items.length > 1 ? defaultView : 'single'
    });
  };

  // Recent Events History
  const [recentEvents, setRecentEvents] = useState(() => {
    const saved = localStorage.getItem('user_event_history');
    return saved ? JSON.parse(saved) : DEFAULT_EVENT_PRESETS;
  });

  // Sync anchor item if provided externally
  useEffect(() => {
    if (initialAnchorItem && !anchorItems.some(a => a.id === initialAnchorItem.id)) {
      setAnchorItems(prev => [...prev, initialAnchorItem]);
    }
  }, [initialAnchorItem, anchorItems]);

  // Load weather when city changes
  useEffect(() => {
    async function loadCityWeather() {
      const data = await fetchCurrentWeather(selectedCity);
      setWeather(data);
    }
    loadCityWeather();
  }, [selectedCity, setWeather]);

  const saveEventToHistory = (evt) => {
    if (!evt || DEFAULT_EVENT_PRESETS.includes(evt)) return;
    setRecentEvents(prev => {
      const filtered = prev.filter(e => e !== evt);
      const updated = [evt, ...filtered].slice(0, 8);
      localStorage.setItem('user_event_history', JSON.stringify(updated));
      return updated;
    });
  };

  // 1. Generate Outfits
  const handleGenerate = async () => {
    setIsGenerating(true);
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

  const handleSaveOutfit = (outfit) => {
    saveOutfit(outfit);
    setSavedIds(prev => new Set(prev).add(outfit.id));
  };

  const handleToggleAnchor = (item) => {
    setAnchorItems(prev => {
      const exists = prev.some(a => a.id === item.id);
      if (exists) {
        return prev.filter(a => a.id !== item.id);
      } else {
        return prev.length < 2 ? [...prev, item] : [prev[1], item];
      }
    });
  };

  // 2. Manual Outfit Builder Handlers
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
    const eventName = customEvent.trim() || selectedEvent;
    if (customEvent.trim()) saveEventToHistory(customEvent.trim());

    try {
      const auditRes = await auditManualOutfit({
        items: selectedItems,
        eventName,
        weather: weather || { temperature: 21, condition: 'Kellemes' },
        styleProfile: profile
      });

      setManualAuditResult(auditRes);

      if (auditRes?.score >= 80) {
        try {
          confetti({
            particleCount: 50,
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
      occasion: customEvent.trim() || selectedEvent,
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

  const openLightbox = (items, index = 0, title = '', defaultView = 'lookbook') => {
    setLightboxData({
      isOpen: true,
      items: items || [],
      initialIndex: index || 0,
      outfitTitle: title || '',
      defaultView: items && items.length > 1 ? defaultView : 'single'
    });
  };

  return (
    <div className="space-y-6 animate-slide-up">
      
      {/* Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold font-serif gold-gradient-text">
              Outfit Stylist
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
              Alkalomhoz és időjáráshoz hangolt szettajánlások és stílusellenőrzés
            </p>
          </div>

          {/* Sub-Tabs Selector */}
          <div className="flex items-center bg-black/60 p-1 rounded-xl border border-white/10 self-start sm:self-auto shrink-0">
            <button
              onClick={() => setActiveSubTab('generator')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeSubTab === 'generator'
                  ? 'bg-[var(--accent-gold)] text-black shadow-md'
                  : 'text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Ajánló</span>
            </button>

            <button
              onClick={() => setActiveSubTab('manual-audit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeSubTab === 'manual-audit'
                  ? 'bg-[var(--accent-gold)] text-black shadow-md'
                  : 'text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Saját Szett & Audit</span>
            </button>

            <button
              onClick={() => setActiveSubTab('chat')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeSubTab === 'chat'
                  ? 'bg-[var(--accent-gold)] text-black shadow-md'
                  : 'text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Stylist Chat</span>
            </button>
          </div>
        </div>

        {profile.customStylingRules && profile.customStylingRules.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
            <span className="text-[10px] text-[var(--accent-gold-light)] bg-[var(--accent-gold-glow)] px-2.5 py-1 rounded-lg border border-[var(--border-gold)]/40 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[var(--accent-gold)] shrink-0" />
              <span className="truncate max-w-xl">
                <strong>Egyéni stílusszabályok aktívak ({profile.customStylingRules.length}):</strong> {profile.customStylingRules.join(' • ')}
              </span>
            </span>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: AI OUTFIT GENERATOR */}
      {/* ========================================================================= */}
      {activeSubTab === 'generator' && (
        <div className="space-y-6">
          
          {/* Control Panel Card */}
          <div className="glass-card p-5 sm:p-6 space-y-5">
            
            {/* Weather Bar & City Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-black/40 rounded-xl border border-white/5">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{weather?.icon || '🌤️'}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{weather?.city || selectedCity}:</span>
                    <span className="text-[var(--accent-gold)] font-bold text-sm">{weather?.temperature}°C</span>
                    <span className="text-xs text-[var(--text-secondary)]">({weather?.condition})</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{weather?.recommendation}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <span className="text-xs text-[var(--text-muted)]">Város:</span>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="bg-black/60 border border-white/10 text-white text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-[var(--accent-gold)]"
                >
                  {CITIES.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Anchor Item (Kulcsdarab) Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                  <span>Kötelező Kulcsdarab a szetthez (opcionális):</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowAnchorModal(true)}
                  className="text-xs text-[var(--accent-gold)] hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{anchorItems.length > 0 ? 'Módosítás' : 'Ruha kiválasztása'}</span>
                </button>
              </div>

              {anchorItems.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {anchorItems.map(item => (
                    <div key={item.id} className="flex items-center gap-2 p-2 rounded-xl bg-[var(--accent-gold-glow)] border border-[var(--border-gold)] text-xs">
                      <img src={item.imageUrl} alt={item.name} loading="lazy" decoding="async" className="w-7 h-7 rounded-lg object-contain bg-black" />
                      <span className="font-semibold text-white truncate max-w-[180px]">{item.name}</span>
                      <button
                        type="button"
                        onClick={() => handleToggleAnchor(item)}
                        className="p-1 hover:text-rose-400 text-[var(--text-muted)]"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-[var(--text-muted)] italic">
                  Nincs kulcsdarab rögzítve (az AI a teljes ruhatáradból szabadon válogat).
                </p>
              )}
            </div>

            {/* Event Selection & Learning History */}
            <div className="space-y-2.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Válassz eseményt / alkalmat (vagy írd be szabadon):
              </label>
              <div className="flex flex-wrap gap-2">
                {recentEvents.map(preset => (
                  <button
                    key={preset}
                    onClick={() => {
                      setSelectedEvent(preset);
                      setCustomEvent('');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      selectedEvent === preset && !customEvent
                        ? 'bg-[var(--accent-gold)] text-black font-bold shadow-md'
                        : 'bg-white/5 text-[var(--text-secondary)] hover:bg-white/10 hover:text-white border border-white/5'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              {/* Natural language free text input */}
              <div className="pt-2">
                <input
                  type="text"
                  placeholder="Írj be bármit: pl. 'Holnap este elegáns vacsora', 'Szombat délután kerti parti 26 fokban'..."
                  value={customEvent}
                  onChange={(e) => setCustomEvent(e.target.value)}
                  className="custom-input text-sm font-medium"
                />
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || wardrobe.length === 0}
              className="btn-gold w-full py-3.5 text-base shadow-xl flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Gemini 3.7 Flash kombinálja a ruhatáradat...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>3 Egyéni Outfit Összeállítása</span>
                </>
              )}
            </button>

          </div>

          {/* Outfits Display */}
          {generatedOutfits.length > 0 && (
            <div className="space-y-6 pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold font-serif gold-gradient-text">
                  Ajánlott Szettek ({generatedOutfits.length} stílusvariáció)
                </h3>
                <span className="text-xs text-[var(--text-muted)]">
                  Kattints a ruhákra a nagyításhoz és részletekhez!
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {generatedOutfits.map((outfit, index) => {
                  const isSaved = savedIds.has(outfit.id);
                  const isThisRefreshing = isRefreshingIndex === index;

                  return (
                    <div key={index} className="glass-card p-5 space-y-4 flex flex-col justify-between border-[var(--border-subtle)] hover:border-[var(--border-gold)] transition-all">
                      
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="badge badge-gold text-[10px]">
                              {outfit.styleArchetype || 'Stílusos'}
                            </span>
                            <span className="text-[11px] text-[var(--text-muted)]">
                              {outfit.matchScore}% Összhang
                            </span>
                          </div>
                          <h4 className="text-lg font-serif font-bold text-white mt-1">
                            {outfit.title}
                          </h4>
                        </div>

                        <div className="flex items-center gap-1">
                          {/* Lookbook Fullscreen Inspector Button */}
                          <button
                            type="button"
                            onClick={() => openLightbox(outfit.items, 0, outfit.title)}
                            className="p-2 rounded-xl bg-white/5 text-[var(--text-secondary)] hover:text-white hover:bg-white/10 transition-all"
                            title="Szett megtekintése nagyban (Lookbook)"
                          >
                            <Maximize2 className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                          </button>

                          {/* Individual Refresh / Shuffle Button */}
                          <button
                            type="button"
                            onClick={() => handleRefreshSingleOutfit(index)}
                            disabled={isThisRefreshing}
                            className="p-2 rounded-xl bg-white/5 text-[var(--text-secondary)] hover:text-white hover:bg-white/10 transition-all"
                            title="Másik szett ebben a stílusban"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isThisRefreshing ? 'animate-spin text-[var(--accent-gold)]' : ''}`} />
                          </button>

                          {/* Bookmark Button */}
                          <button
                            onClick={() => handleSaveOutfit(outfit)}
                            className={`p-2 rounded-xl transition-all ${
                              isSaved 
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                : 'bg-white/5 text-[var(--text-secondary)] hover:text-white hover:bg-white/10'
                            }`}
                            title={isSaved ? 'Mentve a kedvencekbe' : 'Mentés a kedvencekbe'}
                          >
                            {isSaved ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Visual Items Showcase Row with Click-to-Enlarge Lightbox */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 py-2 p-2 rounded-xl bg-black/40 border border-white/5">
                        {outfit.items?.map((item, iIdx) => (
                          <div 
                            key={iIdx} 
                            onClick={() => openLightbox(outfit.items, iIdx, outfit.title)}
                            className="space-y-1 group relative cursor-pointer"
                          >
                            <div className="aspect-[4/3] rounded-lg overflow-hidden bg-[#07090e] border border-white/10 group-hover:border-[var(--accent-gold)] p-1 flex items-center justify-center relative transition-all">
                              <img src={item.imageUrl} alt={item.name} loading="lazy" decoding="async" className="max-h-full max-w-full object-contain group-hover:scale-110 transition-transform duration-300" />
                              <span className="absolute bottom-1 left-1 text-[8px] bg-black/80 backdrop-blur-sm px-1.5 py-0.5 rounded text-white/90 font-medium border border-white/10">
                                {item.subCategory === 'belt' || item.name?.toLowerCase().includes('öv') ? '🎗️ Öv' : item.category === 'tops' ? '👔 Bázis' : item.category === 'knitwear' ? '🧶 Köztes' : (item.subCategory === 'overcoat' || item.subCategory === 'coat' || item.name?.toLowerCase().includes('kabát')) ? '🧥 Nagykabát' : item.category === 'outerwear' ? '🧥 Zakó' : item.category === 'bottoms' ? '👖 Alsó' : item.category === 'shoes' ? '👞 Cipő' : '✦ Kiegészítő'}
                              </span>
                            </div>
                            <p className="text-[10px] text-[var(--text-secondary)] line-clamp-1 font-medium px-0.5 group-hover:text-white transition-colors">
                              {item.name}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Styling Notes, Layering & Thermal Advice */}
                      <div className="space-y-2.5 bg-black/30 p-3.5 rounded-xl border border-white/5 text-xs">
                        {outfit.culturalFitReasoning && (
                          <div className="flex items-start gap-2 text-amber-200/90 pb-2 border-b border-white/5">
                            <span className="font-bold text-[var(--accent-gold)] shrink-0">🎯 Esemény Összhang:</span>
                            <p className="leading-relaxed">{outfit.culturalFitReasoning}</p>
                          </div>
                        )}

                        {outfit.layeringAdvice && (
                          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-200/90">
                            <Layers className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-sky-300 block mb-0.5 text-[11px]">Rétegezés & Hőmérsékleti Dinamika:</span>
                              <p className="leading-relaxed text-[11px]">{outfit.layeringAdvice}</p>
                            </div>
                          </div>
                        )}

                        <div className="flex items-start gap-2 text-[var(--text-secondary)]">
                          <Sparkles className="w-3.5 h-3.5 text-[var(--accent-gold)] shrink-0 mt-0.5" />
                          <p><strong className="text-white">Stílustipp:</strong> {outfit.stylingNotes}</p>
                        </div>

                        <div className="flex items-start gap-2 text-[var(--text-muted)] text-[11px]">
                          <CloudSun className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                          <p>{outfit.weatherSuitability}</p>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: SAJÁT SZETT ÖSSZEÁLLÍTÁSA & SARTORIAL AI AUDIT */}
      {/* ========================================================================= */}
      {activeSubTab === 'manual-audit' && (
        <div className="space-y-6">
          
          <div className="glass-card p-5 sm:p-6 space-y-6">
            
            <div className="border-b border-white/10 pb-4">
              <span className="badge badge-gold text-xs">Interaktív Szettépítő & Stílusellenőr</span>
              <h3 className="text-xl font-serif font-bold text-white mt-1">
                Állítsd össze a mai szettedet a gardróbodból!
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Válassz ki tetszőleges darabokat az alábbi slotokba, és a Gemini 3.7 Flash sartorial szempontok (dress code, színharmónia, anyagok, rétegezés) alapján auditálja a kombinációdat.
              </p>
            </div>

            {/* Event & Weather Header for Manual Audit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                  Alkalom / Esemény:
                </label>
                <input
                  type="text"
                  placeholder="pl. Üzleti Tárgyalás, Randi, Színház, Laza Péntek..."
                  value={customEvent || selectedEvent}
                  onChange={(e) => {
                    setCustomEvent(e.target.value);
                    setSelectedEvent(e.target.value);
                  }}
                  className="custom-input text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                  Időjárási Kontextus:
                </label>
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-xs flex items-center justify-between">
                  <span className="text-white font-medium flex items-center gap-1.5">
                    <span>{weather?.icon || '🌤️'}</span>
                    <span>{weather?.city || 'Budapest'}, {weather?.temperature}°C</span>
                  </span>
                  <span className="text-[var(--text-muted)]">{weather?.condition || 'Kellemes'}</span>
                </div>
              </div>
            </div>

            {/* 6 Category Slots Grid */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Szett Elemek Kiválasztása ({getSelectedManualItems().length} darab kiválasztva):
              </label>

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
                            <img src={selected.imageUrl} alt={selected.name} className="max-h-full max-w-full object-contain group-hover:scale-110 transition-transform" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="text-xs font-bold text-white truncate">{selected.name}</h5>
                            <span className="text-[10px] text-[var(--text-muted)] block">
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
              onClick={handleRunManualAudit}
              disabled={isAuditing || getSelectedManualItems().length < 2}
              className="btn-gold w-full py-3.5 text-base shadow-xl flex items-center justify-center gap-2"
            >
              {isAuditing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Gemini 3.7 Flash auditálja a szettedet...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
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
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-emerald-500/10'
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

              {/* Visual Flat-Lay of Audited Items */}
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Összeállított Darabok (Kattints bármelyikre a nagyításhoz):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 p-2.5 rounded-2xl bg-black/40 border border-white/5">
                  {getSelectedManualItems().map((itm, iIdx) => (
                    <div
                      key={iIdx}
                      onClick={() => openLightbox(getSelectedManualItems(), iIdx, manualAuditResult.verdict)}
                      className="cursor-pointer group p-1.5 rounded-xl bg-black/50 border border-white/10 hover:border-[var(--accent-gold)] transition-all text-left"
                    >
                      <div className="aspect-[4/3] rounded-lg overflow-hidden bg-[#07090e] p-1 flex items-center justify-center relative mb-1">
                        <img src={itm.imageUrl} alt={itm.name} className="max-h-full max-w-full object-contain group-hover:scale-110 transition-transform" />
                      </div>
                      <span className="text-[10px] text-white/90 line-clamp-1 font-medium group-hover:text-[var(--accent-gold)]">
                        {itm.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Detailed Evaluation Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                
                {/* Event & Dress Code */}
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

                {/* Color Harmony */}
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

                {/* Fabric Synergy */}
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

                {/* Layering & Weather */}
                {manualAuditResult.layeringEvaluation && (
                  <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-white">
                      <Layers className="w-4 h-4 text-sky-400" />
                      <span>🧥 Rétegezés & Időjárási Dinamika:</span>
                    </div>
                    <p className="text-[var(--text-secondary)] leading-relaxed">
                      {manualAuditResult.layeringEvaluation}
                    </p>
                  </div>
                )}

              </div>

              {/* Strengths & Actionable Stylist Suggestions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                
                {manualAuditResult.strengths?.length > 0 && (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-200/90 space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-400 text-xs">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Miért működik kiválóan ez a szett:</span>
                    </div>
                    <ul className="space-y-1 text-xs list-disc list-inside">
                      {manualAuditResult.strengths.map((str, sIdx) => (
                        <li key={sIdx}>{str}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {manualAuditResult.suggestions?.length > 0 && (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200/90 space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-[var(--accent-gold)] text-xs">
                      <Sparkles className="w-4 h-4" />
                      <span>Finomhangolási Stylist Javaslatok:</span>
                    </div>
                    <ul className="space-y-1 text-xs list-disc list-inside">
                      {manualAuditResult.suggestions.map((sug, sIdx) => (
                        <li key={sIdx}>{sug}</li>
                      ))}
                    </ul>
                  </div>
                )}

              </div>

            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 3: SZEMÉLYES MESTER STYLIST CHAT */}
      {/* ========================================================================= */}
      {activeSubTab === 'chat' && (
        <StylistChatView weather={weather} />
      )}

      {/* ========================================================================= */}
      {/* MODAL: Ruhatár Slot Kiválasztó Modal */}
      {/* ========================================================================= */}
      {slotPickerModal && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setSlotPickerModal(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md"
        >
          <div className="glass-card max-w-xl w-full max-h-[85vh] overflow-y-auto p-5 border-[var(--border-gold)] space-y-4 animate-scale-up">
            
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="font-serif font-bold text-white text-lg flex items-center gap-2">
                <span>Válassz darabot:</span>
                <span className="badge badge-gold text-xs">
                  {SLOT_DEFINITIONS.find(s => s.key === slotPickerModal)?.label}
                </span>
              </h3>
              <button onClick={() => setSlotPickerModal(null)} className="p-1 text-[var(--text-muted)] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filtered items from wardrobe */}
            {(() => {
              const targetSlot = SLOT_DEFINITIONS.find(s => s.key === slotPickerModal);
              const filteredItems = wardrobe.filter(w => {
                if (targetSlot?.key === 'knitwear') {
                  return w.category === 'knitwear' || (w.subCategory || '').includes('sweater') || (w.name || '').toLowerCase().includes('pulóver') || (w.name || '').toLowerCase().includes('garbó');
                }
                if (targetSlot?.key === 'outerwear') {
                  return w.category === 'outerwear' || (w.subCategory || '').includes('blazer') || (w.subCategory || '').includes('coat') || (w.name || '').toLowerCase().includes('zakó') || (w.name || '').toLowerCase().includes('kabát');
                }
                if (targetSlot?.key === 'accessories') {
                  return w.category === 'accessories' || (w.subCategory || '').includes('belt') || (w.name || '').toLowerCase().includes('öv');
                }
                return w.category === targetSlot?.category;
              });

              if (filteredItems.length === 0) {
                return (
                  <div className="p-8 text-center space-y-2">
                    <p className="text-sm text-[var(--text-muted)]">
                      Nincs elérhető darab ebben a kategóriában ({targetSlot?.label}).
                    </p>
                    <button
                      onClick={() => setSlotPickerModal(null)}
                      className="btn-secondary text-xs mt-2"
                    >
                      Bezárás
                    </button>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-1">
                  {filteredItems.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSetSlotItem(slotPickerModal, item)}
                      className="p-2.5 rounded-xl bg-black/40 border border-white/10 hover:border-[var(--accent-gold)] hover:bg-black/60 transition-all text-left group flex flex-col justify-between"
                    >
                      <div className="aspect-[4/3] rounded-lg overflow-hidden bg-[#07090e] p-1 flex items-center justify-center mb-2">
                        <img src={item.imageUrl} alt={item.name} className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white line-clamp-1 group-hover:text-[var(--accent-gold)] transition-colors">
                          {item.name}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] mt-0.5">
                          <span>{item.brand || item.material || item.category}</span>
                          {item.size && <span className="font-mono text-[var(--accent-gold)]">{item.size}</span>}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              );
            })()}

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Kulcsdarab (Anchor) Kiválasztó Modal */}
      {/* ========================================================================= */}
      {showAnchorModal && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAnchorModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md"
        >
          <div className="glass-card max-w-lg w-full max-h-[85vh] overflow-y-auto p-5 border-[var(--border-gold)] space-y-4 animate-scale-up">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="font-serif font-bold text-white text-lg">Válassz Kötelező Kulcsdarabot:</h3>
              <button onClick={() => setShowAnchorModal(false)} className="p-1 text-[var(--text-muted)] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[var(--text-secondary)]">
              Kattints arra a ruhára (max 2), amire feltétlenül építeni szeretnéd a mai szetteket:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-96 overflow-y-auto pr-1">
              {wardrobe.map(item => {
                const isSelected = anchorItems.some(a => a.id === item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleToggleAnchor(item)}
                    className={`p-2 rounded-xl border text-left transition-all relative ${
                      isSelected
                        ? 'bg-[var(--accent-gold-glow)] border-[var(--accent-gold)] ring-2 ring-[var(--accent-gold)]'
                        : 'bg-black/40 border-white/10 hover:border-white/30'
                    }`}
                  >
                    <div className="aspect-[4/3] rounded-lg overflow-hidden bg-[#07090e] p-1 flex items-center justify-center mb-1.5">
                      <img src={item.imageUrl} alt={item.name} loading="lazy" decoding="async" className="max-h-full max-w-full object-contain" />
                    </div>
                    <p className="text-[11px] font-medium text-white line-clamp-1">{item.name}</p>
                    <span className="text-[9px] text-[var(--text-muted)] block">{item.category}</span>
                    {isSelected && (
                      <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[var(--accent-gold)] text-black flex items-center justify-center text-[10px] font-bold">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAnchorModal(false)}
                className="btn-gold py-2 px-5 text-xs font-bold"
              >
                Kész
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* UNIVERSAL GARMENT LIGHTBOX MODAL */}
      {/* ========================================================================= */}
      <GarmentLightboxModal
        isOpen={lightboxData.isOpen}
        onClose={() => setLightboxData(prev => ({ ...prev, isOpen: false }))}
        items={lightboxData.items}
        initialIndex={lightboxData.initialIndex}
        outfitTitle={lightboxData.outfitTitle}
        defaultView={lightboxData.defaultView}
      />

    </div>
  );
}
