import React, { useState, useEffect } from 'react';
import { PlusCircle, Sparkles, ShoppingBag, ArrowRight, ExternalLink, ShieldAlert, Check, RefreshCw, Loader2, AlertTriangle, Layers, BookmarkPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { analyzeWardrobeGaps } from '../../services/gemini';

export default function MissingPiecesView({ onTestInAdvisor }) {
  const { wardrobe, profile } = useAuth();
  const [gaps, setGaps] = useState(() => {
    const saved = localStorage.getItem('capsule_gaps_cache');
    return saved ? JSON.parse(saved) : [];
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all'); // 'all', 'tavasz_nyar', 'osz_tel', 'replacement'
  const [wishlistIds, setWishlistIds] = useState(new Set());

  const loadGaps = async (force = false) => {
    if (!force && gaps.length > 0) return;
    setIsLoading(true);
    try {
      const results = await analyzeWardrobeGaps(wardrobe, profile);
      if (results && results.length > 0) {
        setGaps(results);
        localStorage.setItem('capsule_gaps_cache', JSON.stringify(results));
      }
    } catch (e) {
      console.error('Kapszula elemzési hiba:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (gaps.length === 0) {
      loadGaps(true);
    }
  }, []);

  const handleToggleWishlist = (gapId) => {
    setWishlistIds(prev => {
      const next = new Set(prev);
      if (next.has(gapId)) {
        next.delete(gapId);
      } else {
        next.add(gapId);
      }
      return next;
    });
  };

  // Filter gaps
  const filteredGaps = gaps.filter(gap => {
    if (selectedFilter === 'replacement') return gap.isReplacement;
    if (selectedFilter === 'tavasz_nyar') return gap.season?.includes('Tavasz') || gap.season?.includes('Nyár') || gap.season?.includes('Egész');
    if (selectedFilter === 'osz_tel') return gap.season?.includes('Ősz') || gap.season?.includes('Tél') || gap.season?.includes('Egész');
    return true;
  });

  return (
    <div className="space-y-6 animate-slide-up">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="badge badge-gold">Kapszula Ruhatár Elemzés</span>
            <span className="badge badge-emerald">Dinamikus AI Gap Analysis</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold font-serif gold-gradient-text mt-1">
            Hiányzó Stratégiai Kulcsdarabok
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Az AI azonosítja a ruhatárad legfontosabb hiányzó láncszemeit a maximális variálhatóságért.
          </p>
        </div>

        <button
          type="button"
          onClick={loadGaps}
          disabled={isLoading}
          className="btn-secondary text-xs self-start sm:self-center flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[var(--accent-gold)]' : ''}`} />
          <span>Újraelemzés</span>
        </button>
      </div>

      {/* Seasonal & Category Filter Tabs */}
      <div className="flex flex-wrap gap-2 p-1 bg-black/40 rounded-xl border border-white/5">
        {[
          { id: 'all', label: 'Összes Hiányzó Kulcsdarab' },
          { id: 'tavasz_nyar', label: '🌸☀️ Tavaszi / Nyári Kapszula' },
          { id: 'osz_tel', label: '🍂❄️ Őszi / Téli Kapszula' },
          { id: 'replacement', label: '♻️ Megújítandó / Lecserélendő Alapdarabok' }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSelectedFilter(tab.id)}
            className={`py-2 px-3 rounded-lg text-xs font-medium transition-all ${
              selectedFilter === tab.id
                ? 'bg-[var(--accent-gold)] text-black font-bold shadow'
                : 'text-[var(--text-secondary)] hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="glass-card p-12 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-[var(--accent-gold)] animate-spin mx-auto" />
          <p className="text-sm text-white font-medium">Gemini 3.7 Flash elemzi a kapszula ruhatáradat és a hiányzó darabokat...</p>
        </div>
      )}

      {/* Gaps List */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredGaps.map(gap => {
            const isWishlisted = wishlistIds.has(gap.id);

            return (
              <div
                key={gap.id}
                className="glass-card p-5 sm:p-6 space-y-4 flex flex-col justify-between border-[var(--border-subtle)] hover:border-[var(--border-gold)] transition-all"
              >
                <div className="space-y-3">
                  
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="badge badge-emerald text-[10px]">
                        ✨ {gap.impact}
                      </span>
                      {gap.isReplacement && (
                        <span className="badge badge-rose text-[10px]">
                          ♻️ Megújítandó Darab
                        </span>
                      )}
                      {gap.season && (
                        <span className="badge badge-subtle text-[10px]">
                          {gap.season}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleWishlist(gap.id)}
                      className={`p-1.5 rounded-lg text-xs transition-colors ${
                        isWishlisted
                          ? 'bg-[var(--accent-gold)] text-black font-bold'
                          : 'text-[var(--text-muted)] hover:text-white hover:bg-white/10'
                      }`}
                      title={isWishlisted ? 'Kívánságlistán' : 'Mentés kívánságlistára'}
                    >
                      <BookmarkPlus className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <h3 className="text-lg font-serif font-bold text-white">
                      {gap.title}
                    </h3>
                    <span className="text-xs text-[var(--accent-gold-light)] font-medium block mt-0.5">
                      Becsült ársáv: {gap.estimatedPrice}
                    </span>
                  </div>

                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    {gap.reason}
                  </p>

                  <div className="bg-black/30 p-3 rounded-xl border border-white/5 space-y-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)] block">
                      Ajánlott Keresési Kulcsszavak:
                    </span>
                    <code className="text-xs text-[var(--accent-gold-light)] font-mono block">
                      "{gap.searchKeywords}"
                    </code>
                  </div>

                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                  <a
                    href={`https://www.google.com/search?q=${encodeURIComponent(gap.searchKeywords)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary text-xs py-2 px-3 flex-1 text-center flex items-center justify-center gap-1.5"
                  >
                    <span>Keresés Online</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    onClick={() => onTestInAdvisor(gap)}
                    className="btn-gold text-xs py-2 px-3 flex-1 flex items-center justify-center gap-1.5"
                  >
                    <span>3-Outfit Teszt</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {!isLoading && filteredGaps.length === 0 && (
        <div className="glass-card p-8 text-center text-xs text-[var(--text-muted)]">
          <p>Nincs a szűrőnek megfelelő hiányzó darab.</p>
        </div>
      )}

    </div>
  );
}
