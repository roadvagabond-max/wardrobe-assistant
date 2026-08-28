import React, { useState, useEffect } from 'react';
import { Sparkles, CloudSun, Calendar, Compass, ArrowRight, Bookmark, Check, RefreshCw, Loader2, Plus, X, Layers, Lock, Unlock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { generateEventOutfits } from '../../services/gemini';
import { fetchCurrentWeather, CITIES } from '../../services/weather';
import confetti from 'canvas-confetti';

const DEFAULT_EVENT_PRESETS = [
  'Üzleti Tárgyalás & Ebéd',
  'Nyári Teraszos Randevú',
  'Sprezzatura Kötetlen Péntek',
  'Esküvő & Ünnepi Esemény',
  'Hétvégi Városi Séta & Kávézás',
  'Elegáns Esti Színház / Vacsora'
];

export default function StylistView({ weather, setWeather, initialAnchorItem = null }) {
  const { wardrobe, profile, saveOutfit, savedOutfits } = useAuth();

  const [selectedEvent, setSelectedEvent] = useState('Üzleti Tárgyalás & Ebéd');
  const [customEvent, setCustomEvent] = useState('');
  const [selectedCity, setSelectedCity] = useState('Budapest');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefreshingIndex, setIsRefreshingIndex] = useState(null);
  const [generatedOutfits, setGeneratedOutfits] = useState([]);
  const [savedIds, setSavedIds] = useState(new Set());

  // Anchor / Key Items to build outfit around
  const [anchorItems, setAnchorItems] = useState(initialAnchorItem ? [initialAnchorItem] : []);
  const [showAnchorModal, setShowAnchorModal] = useState(false);

  // Dynamic Recent Events (from localStorage history)
  const [recentEvents, setRecentEvents] = useState(() => {
    const saved = localStorage.getItem('user_event_history');
    return saved ? JSON.parse(saved) : DEFAULT_EVENT_PRESETS;
  });

  // Sync if initialAnchorItem is passed from ItemDetailModal
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

  // Single Outfit Card Shuffle / Refresh
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
          // Take the matching or next new outfit
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

  return (
    <div className="space-y-6 animate-slide-up">
      
      {/* Header */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold font-serif gold-gradient-text">
          AI Outfit Ajánló & Stylist
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Személyre szabott szettek az eseményre, időjárásra, napszakra és a gardróbod darabjaira hangolva.
        </p>
        {profile.customStylingRules && profile.customStylingRules.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <span className="text-[10px] text-[var(--accent-gold-light)] bg-[var(--accent-gold-glow)] px-2.5 py-1 rounded-lg border border-[var(--border-gold)]/40 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[var(--accent-gold)] shrink-0" />
              <span className="truncate max-w-xl">
                <strong>Egyéni stílusszabályok aktívak ({profile.customStylingRules.length}):</strong> {profile.customStylingRules.join(' • ')}
              </span>
            </span>
          </div>
        )}
      </div>

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
              Kizárólag a saját ruhatáradból
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

                  {/* Visual Items Showcase Row (Uncropped / proportional flat-lay with Layer Badges) */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 py-2 p-2 rounded-xl bg-black/40 border border-white/5">
                    {outfit.items?.map((item, iIdx) => (
                      <div key={iIdx} className="space-y-1 group relative">
                        <div className="aspect-[4/3] rounded-lg overflow-hidden bg-[#07090e] border border-white/10 p-1 flex items-center justify-center relative">
                          <img src={item.imageUrl} alt={item.name} loading="lazy" decoding="async" className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform" />
                          <span className="absolute bottom-1 left-1 text-[8px] bg-black/80 backdrop-blur-sm px-1.5 py-0.5 rounded text-white/90 font-medium border border-white/10">
                            {item.category === 'tops' ? '👔 Bázis' : item.category === 'knitwear' ? '🧶 Köztes' : item.category === 'outerwear' ? '🧥 Külső' : item.category === 'bottoms' ? '👖 Alsó' : item.category === 'shoes' ? '👞 Cipő' : '✦ Réteg'}
                          </span>
                        </div>
                        <p className="text-[10px] text-[var(--text-secondary)] line-clamp-1 font-medium px-0.5">
                          {item.name}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Styling Notes, Layering & Thermal Advice, Cultural Dress Code Match & Weather */}
                  <div className="space-y-2.5 bg-black/30 p-3.5 rounded-xl border border-white/5 text-xs">
                    {outfit.culturalFitReasoning && (
                      <div className="flex items-start gap-2 text-amber-200/90 pb-2 border-b border-white/5">
                        <span className="font-bold text-[var(--accent-gold)] shrink-0">🎯 Esemény Összhang:</span>
                        <p className="leading-relaxed">{outfit.culturalFitReasoning}</p>
                      </div>
                    )}

                    {/* Layering & Temperature Advice */}
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

      {/* Modal for selecting Anchor / Key Items */}
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

    </div>
  );
}
