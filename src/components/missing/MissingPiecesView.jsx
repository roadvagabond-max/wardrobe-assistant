import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ArrowRight, ExternalLink, RefreshCw, Loader2, AlertTriangle, BookmarkPlus } from 'lucide-react';
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

  const rulesKey = (profile?.customStylingRules || []).join(';;');
  const prevRulesKeyRef = useRef(rulesKey);

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

  // Invalidate and reload when custom styling rules change in profile
  useEffect(() => {
    if (prevRulesKeyRef.current !== rulesKey) {
      prevRulesKeyRef.current = rulesKey;
      try {
        localStorage.removeItem('capsule_gaps_cache');
      } catch (_) {}
      loadGaps(true);
    }
  }, [rulesKey]);

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
    const score = gap.priorityScore || (gap.isReplacement ? 85 : 75);
    if (selectedFilter === 'critical_important') return score >= 80;
    if (selectedFilter === 'high_variance') return score >= 70 && score < 80;
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
            <span className="badge badge-gold">Kapszula Audit</span>
            <span className="badge badge-emerald">AI Gap Elemzés</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold font-serif gold-gradient-text mt-1">
            Hiányzó Kulcsdarabok
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
            A ruhatárad variálhatóságát leginkább növelő és hiányzó kulcselemek listája.
          </p>
          {profile.customStylingRules && profile.customStylingRules.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-[10px] text-[var(--accent-gold-light)] bg-[var(--accent-gold-glow)] px-2.5 py-1 rounded-lg border border-[var(--border-gold)]/40 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-[var(--accent-gold)] shrink-0" />
                <span className="truncate max-w-xl">
                  <strong>Egyéni szabályok érvényben ({profile.customStylingRules.length}):</strong> {profile.customStylingRules.join(' • ')}
                </span>
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            try { localStorage.removeItem('capsule_gaps_cache'); } catch (_) {}
            loadGaps(true);
          }}
          disabled={isLoading}
          className="btn-secondary text-xs self-start sm:self-center flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[var(--accent-gold)]' : ''}`} />
          <span>{isLoading ? 'Elemzés folyamatban...' : 'Újraelemzés'}</span>
        </button>
      </div>

      {/* Helpful Capsule Guidance Banner */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-amber-500/15 via-black/40 to-transparent border border-amber-500/30 text-xs space-y-1.5">
        <div className="flex items-center gap-2 text-amber-200 font-serif font-bold text-xs">
          <Sparkles className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
          <span>Hogyan választja ki az AI a hiányzó kulcsdarabokat?</span>
        </div>
        <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
          Az AI megvizsgálja a ruhatárad kategória-lefedettségét és a darabok állapotát. Azokat az elemeket (pl. <em>szezonális lábbelik</em>, <em>természetes anyagú rétegek</em>) sorolja előre, amelyek a <strong>legtöbb új szettkombinációt</strong> nyitják meg a meglévő ruháiddal.
        </p>
      </div>

      {/* Seasonal & Category Filter Tabs */}
      <div className="flex flex-wrap gap-2 p-1 bg-black/40 rounded-xl border border-white/5">
        {[
          { id: 'all', label: 'Összes Kulcsdarab' },
          { id: 'critical_important', label: '🔴 Kritikus & Fontos Alapok' },
          { id: 'high_variance', label: '🟢 Nagy Varianciájú Újdonságok' },
          { id: 'osz_tel', label: '🍂❄️ Őszi / Téli Kapszula' },
          { id: 'tavasz_nyar', label: '🌸☀️ Tavaszi / Nyári Kapszula' },
          { id: 'replacement', label: '♻️ Megújítandó Darabok' }
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
          <p className="text-sm text-white font-medium">Gemini 3.7 Flash elemzi a kapszula ruhatáradat és rangsorolja a hiányzó darabokat...</p>
        </div>
      )}

      {/* Gaps List */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredGaps.map(gap => {
            const isWishlisted = wishlistIds.has(gap.id);
            const score = gap.priorityScore || 80;

            return (
              <div
                key={gap.id}
                className="glass-card p-5 sm:p-6 space-y-4 flex flex-col justify-between border-[var(--border-subtle)] hover:border-[var(--border-gold)] transition-all"
              >
                <div className="space-y-3">
                  
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Priority Score & Level Badge */}
                      {score >= 90 ? (
                        <span className="badge bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                          🔴 {gap.priorityLevel || 'Kritikus Alapdarab'} ({score}p)
                        </span>
                      ) : score >= 80 ? (
                        <span className="badge bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                          🟡 {gap.priorityLevel || 'Fontos Bázis'} ({score}p)
                        </span>
                      ) : score >= 70 ? (
                        <span className="badge bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                          🟢 {gap.priorityLevel || 'Nagy Variancia'} ({score}p)
                        </span>
                      ) : (
                        <span className="badge bg-slate-500/20 text-slate-300 border border-slate-500/30 text-[10px] font-medium">
                          ⚪ {gap.priorityLevel || 'Nice to Have'} ({score}p)
                        </span>
                      )}

                      <span className="badge badge-emerald text-[10px]">
                        ✨ {gap.impact}
                      </span>
                      {gap.isReplacement && (
                        <span className="badge badge-rose text-[10px]">
                          ♻️ Megújítandó Darab
                        </span>
                      )}
                      {gap.recommendedFit && (
                        <span className="badge badge-gold text-[10px]">
                          📐 {gap.recommendedFit}
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
