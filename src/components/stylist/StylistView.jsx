import React, { useState, useEffect } from 'react';
import { Sparkles, CloudSun, Calendar, Compass, ArrowRight, Bookmark, Check, RefreshCw, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { generateEventOutfits } from '../../services/gemini';
import { fetchCurrentWeather, CITIES } from '../../services/weather';
import confetti from 'canvas-confetti';

export default function StylistView({ weather, setWeather }) {
  const { wardrobe, profile, saveOutfit, savedOutfits } = useAuth();

  const [selectedEvent, setSelectedEvent] = useState('Üzleti Tárgyalás & Ebéd');
  const [customEvent, setCustomEvent] = useState('');
  const [selectedCity, setSelectedCity] = useState('Budapest');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedOutfits, setGeneratedOutfits] = useState([]);
  const [savedIds, setSavedIds] = useState(new Set());

  const eventPresets = [
    'Üzleti Tárgyalás & Ebéd',
    'Nyári Teraszos Randevú',
    'Sprezzatura Kötetlen Péntek',
    'Esküvő & Ünnepi Esemény',
    'Hétvégi Városi Séta & Kávézás',
    'Elegáns Esti Színház / Vacsora'
  ];

  // Load weather when city changes
  useEffect(() => {
    async function loadCityWeather() {
      const data = await fetchCurrentWeather(selectedCity);
      setWeather(data);
    }
    loadCityWeather();
  }, [selectedCity]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    const eventName = customEvent.trim() || selectedEvent;

    try {
      const outfits = await generateEventOutfits({
        eventName,
        weather: weather || { temperature: 21, condition: 'Kellemes' },
        wardrobe,
        styleProfile: profile
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

  const handleSaveOutfit = (outfit) => {
    saveOutfit(outfit);
    setSavedIds(prev => new Set(prev).add(outfit.id));
  };

  return (
    <div className="space-y-6 animate-slide-up">
      
      {/* Header */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold font-serif gold-gradient-text">
          AI Outfit Ajánló & Stylist
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Személyre szabott szettek az aktuális eseményre, időjárásra és a gardróbod darabjaira hangolva.
        </p>
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

        {/* Event Selection */}
        <div className="space-y-2.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Válassz eseményt / alkalmat:
          </label>
          <div className="flex flex-wrap gap-2">
            {eventPresets.map(preset => (
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

          <div className="pt-2">
            <input
              type="text"
              placeholder="Vagy írj be egyedi eseményt (pl. 'Olasz tengerparti esküvő', 'Befektetői pitch')..."
              value={customEvent}
              onChange={(e) => setCustomEvent(e.target.value)}
              className="custom-input text-sm"
            />
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating || wardrobe.length === 0}
          className="btn-gold w-full py-3.5 text-base shadow-xl"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>AI Stylist kombinálja a ruhatáradat...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>Outfit Kombinációk Összeállítása</span>
            </>
          )}
        </button>

      </div>

      {/* Outfits Display */}
      {generatedOutfits.length > 0 && (
        <div className="space-y-6 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold font-serif gold-gradient-text">
              Ajánlott Szettek ({generatedOutfits.length})
            </h3>
            <span className="text-xs text-[var(--text-muted)]">
              Kizárólag a saját gardróbod elemeiből
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {generatedOutfits.map((outfit, index) => {
              const isSaved = savedIds.has(outfit.id);

              return (
                <div key={index} className="glass-card p-5 space-y-4 flex flex-col justify-between border-[var(--border-subtle)] hover:border-[var(--border-gold)]">
                  
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="badge badge-gold text-[10px]">
                          {outfit.matchScore}% Stílusharmónia
                        </span>
                        <span className="text-xs text-[var(--text-muted)]">
                          {outfit.occasion}
                        </span>
                      </div>
                      <h4 className="text-lg font-serif font-bold text-white mt-1">
                        {outfit.title}
                      </h4>
                    </div>

                    <button
                      onClick={() => handleSaveOutfit(outfit)}
                      className={`p-2 rounded-xl transition-all ${
                        isSaved 
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                          : 'bg-white/5 text-[var(--text-secondary)] hover:text-white hover:bg-white/10'
                      }`}
                      title={isSaved ? 'Mentve' : 'Mentés a kedvencekbe'}
                    >
                      {isSaved ? <Check className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Items Showcase Row */}
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 py-2">
                    {outfit.items?.map((item, iIdx) => (
                      <div key={iIdx} className="space-y-1 group">
                        <div className="aspect-[3/4] rounded-lg overflow-hidden bg-black/40 border border-white/10 relative">
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          <span className="absolute bottom-1 left-1 right-1 text-[9px] font-semibold text-white/90 bg-black/70 px-1 py-0.5 rounded truncate">
                            {item.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] line-clamp-1 font-medium">
                          {item.name}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Styling Notes & Weather match */}
                  <div className="space-y-2 bg-black/30 p-3.5 rounded-xl border border-white/5 text-xs">
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
  );
}
