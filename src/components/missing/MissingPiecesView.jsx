import React, { useMemo } from 'react';
import { PlusCircle, Sparkles, ShoppingBag, ArrowRight, ExternalLink, ShieldAlert, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { analyzeWardrobeGaps } from '../../services/gemini';

export default function MissingPiecesView({ onTestInAdvisor }) {
  const { wardrobe, profile } = useAuth();

  const missingGaps = useMemo(() => {
    return analyzeWardrobeGaps(wardrobe, profile);
  }, [wardrobe, profile]);

  return (
    <div className="space-y-6 animate-slide-up">
      
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="badge badge-gold">Kapszula Ruhatár Elemzés</span>
          <span className="badge badge-emerald">Maximális Variálhatóság</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold font-serif gold-gradient-text mt-1">
          Hiányzó Kulcsdarabok
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Olyan stratégiai darabok, amelyek beszerzésével ugrásszerűen megnő a kombinálható szettek száma a meglévő ruhatáradból.
        </p>
      </div>

      {/* Gaps List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {missingGaps.map(gap => (
          <div
            key={gap.id}
            className="glass-card p-5 sm:p-6 space-y-4 flex flex-col justify-between border-[var(--border-subtle)] hover:border-[var(--border-gold)]"
          >
            <div className="space-y-3">
              
              <div className="flex items-start justify-between gap-3">
                <span className="badge badge-emerald text-[10px]">
                  ✨ {gap.impact}
                </span>
                <span className="text-xs text-[var(--text-muted)] font-medium">
                  {gap.estimatedPrice}
                </span>
              </div>

              <h3 className="text-lg font-serif font-bold text-white">
                {gap.title}
              </h3>

              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {gap.reason}
              </p>

              <div className="bg-black/30 p-3 rounded-xl border border-white/5 space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)] block">
                  Keresési kulcsszavak:
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
                className="btn-secondary text-xs py-2 px-3 flex-1 text-center"
              >
                <span>Keresés Online</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                onClick={() => onTestInAdvisor(gap)}
                className="btn-gold text-xs py-2 px-3 flex-1"
              >
                <span>3-Outfit Teszt</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}
