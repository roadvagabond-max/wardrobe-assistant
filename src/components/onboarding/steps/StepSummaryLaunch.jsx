import React from 'react';
import { Sparkles, CheckCircle2, Shirt, User, ArrowRight, Compass, ShieldCheck } from 'lucide-react';

export default function StepSummaryLaunch({ formData, wardrobeCount, onComplete }) {
  return (
    <div className="space-y-6 animate-slide-up text-center sm:text-left">
      
      {/* Celebration Header */}
      <div className="space-y-2 text-center max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#d4af37] via-[#f59e0b] to-[#b45309] flex items-center justify-center mx-auto text-black shadow-xl shadow-amber-500/20 animate-bounce">
          <Sparkles className="w-8 h-8 text-[#07090e]" />
        </div>
        <span className="badge badge-gold text-[11px] uppercase tracking-wider font-bold">
          Gratulálunk!
        </span>
        <h3 className="text-2xl sm:text-3xl font-serif font-bold text-white">
          A személyes Stílusprofilod készen áll!
        </h3>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          Az <strong>AI Wardrobe Assistant</strong> a megadott adataid és színtípusod alapján személyre szabott szabásokkal, szettajánlásokkal és 4-pilléres vásárlási döntéstámogatással segít.
        </p>
      </div>

      {/* Profile Overview Card */}
      <div className="glass-card p-5 border-[var(--border-gold)]/60 bg-gradient-to-r from-black/60 via-[#131a26]/70 to-[var(--accent-gold-glow)]/10 rounded-2xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
          
          {/* Item 1: Identity */}
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">
              Felhasználó & Testalkat
            </span>
            <div className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>{formData.name || 'Felhasználó'}</span>
              <span className="text-xs font-normal text-amber-300">
                ({formData.gender === 'Női' ? '👗 Női' : formData.gender === 'Unisex' ? '✨ Unisex' : '👔 Férfi'})
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">
              {formData.bodyType || 'Arányos sziluett'}
              {formData.height ? ` • ${formData.height}` : ''}
              {formData.weight ? ` • ${formData.weight}` : ''}
            </p>
          </div>

          {/* Item 2: Color Season */}
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">
              Színtípus & Bőrtónus
            </span>
            <div className="text-sm font-bold text-emerald-300">
              {formData.skinTone && formData.skinTone !== '—' ? formData.skinTone : 'Természetes tónus'}
            </div>
            {formData.favoriteColors && formData.favoriteColors.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-0.5">
                {formData.favoriteColors.slice(0, 4).map((c, i) => (
                  <span key={i} className="text-[9px] px-1.5 py-0.2 rounded bg-white/5 text-zinc-300">
                    ✦ {c}
                  </span>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Selected styles */}
        {formData.preferredStyles && formData.preferredStyles.length > 0 && (
          <div className="text-left pt-1">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block mb-1.5">
              Kedvelt Stílusirányzatok:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {formData.preferredStyles.map((style, idx) => (
                <span key={idx} className="badge badge-gold text-[10px]">
                  ✦ {style}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Button */}
      <div className="pt-2 text-center">
        <button
          type="button"
          onClick={onComplete}
          className="btn-gold w-full sm:w-auto py-3 px-8 text-sm font-bold shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 mx-auto cursor-pointer"
        >
          <Compass className="w-5 h-5 text-[#07090e]" />
          <span>Irány az AI Stylist & Saját Gardrób!</span>
          <ArrowRight className="w-4 h-4 text-[#07090e]" />
        </button>
      </div>

    </div>
  );
}
