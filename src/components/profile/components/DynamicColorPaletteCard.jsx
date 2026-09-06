import React, { useState, useMemo } from 'react';
import { Palette, Plus, X, Sparkles, Check, Info, ShieldCheck } from 'lucide-react';
import { normalizeColorName, areColorsMatching, deduplicateColors } from '../../common/ColorPalettePicker';

export default function DynamicColorPaletteCard({ 
  profile, 
  wardrobe = [], 
  onUpdateProfile 
}) {
  const [newColorInput, setNewColorInput] = useState('');

  // Extract canonical color distribution from wardrobe
  const wardrobeColors = useMemo(() => {
    const counts = {};
    wardrobe.forEach(item => {
      const raw = item.color?.trim();
      if (raw) {
        const canonical = normalizeColorName(raw) || raw;
        counts[canonical] = (counts[canonical] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [wardrobe]);

  // Clean, deduplicated favorite colors
  const favoriteColors = useMemo(() => {
    if (!Array.isArray(profile?.favoriteColors)) return [];
    return deduplicateColors(profile.favoriteColors);
  }, [profile?.favoriteColors]);

  const handleAddColor = async (colorToAdd) => {
    const raw = (colorToAdd || newColorInput).trim();
    if (!raw) return;
    const normalized = normalizeColorName(raw) || raw;
    
    if (favoriteColors.some(c => areColorsMatching(c, normalized))) {
      setNewColorInput('');
      return;
    }
    const updated = [...favoriteColors, normalized];
    await onUpdateProfile({
      ...profile,
      favoriteColors: updated
    });
    setNewColorInput('');
  };

  const handleRemoveColor = async (colorToRemove) => {
    const updated = favoriteColors.filter(c => !areColorsMatching(c, colorToRemove));
    await onUpdateProfile({
      ...profile,
      favoriteColors: updated
    });
  };

  return (
    <div className="glass-card p-6 sm:p-7 border-[var(--border-gold)] space-y-5">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-[var(--accent-gold)]" />
            <span className="badge badge-gold text-[10px]">Színintelligencia</span>
            <span className="badge badge-emerald text-[10px]">Kapszula Paletta</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-serif font-bold text-white mt-1">
            Alappaletta & Kedvelt Színek
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            A színtípusodhoz illő bázisszínek és az egyénileg rögzített kedvenc akcentszíneid.
          </p>
        </div>
      </div>

      {/* Active Signature Palette Chips */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-white block">
            Aktív Bázis & Kedvenc Színeid (Core Palette):
          </span>
          <span className="text-[10px] text-[var(--text-muted)]">
            {favoriteColors.length > 0 ? `${favoriteColors.length} db aktív szín` : 'Még nincs beállítva'}
          </span>
        </div>

        {favoriteColors.length === 0 ? (
          <div className="p-4 rounded-xl bg-white/5 border border-dashed border-white/15 text-center space-y-1">
            <p className="text-xs text-[var(--text-secondary)]">
              Még nincsenek rögzített színeid a profilodban.
            </p>
            <p className="text-[11px] text-[var(--text-muted)]">
              Használd a fenti <strong>AI Portré Elemzőt</strong> az arcbőrödhöz illő paletta meghatározásához, vagy adj hozzá saját kedvenceket alább!
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {favoriteColors.map((color, idx) => (
              <div 
                key={idx}
                className="badge badge-subtle text-xs py-1.5 px-3 flex items-center gap-2 bg-white/5 border border-white/10 hover:border-[var(--border-gold)]/60 transition-colors group"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent-gold)] shrink-0 shadow-sm" />
                <span className="text-white font-medium">{color}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveColor(color)}
                  className="text-[var(--text-muted)] hover:text-rose-400 p-0.5 rounded transition-colors"
                  title={`${color} eltávolítása`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Custom Color form */}
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          handleAddColor();
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          id="new-color-input"
          name="newColor"
          aria-label="Új kedvenc szín megadása"
          value={newColorInput}
          onChange={(e) => setNewColorInput(e.target.value)}
          placeholder="Egyedi szín hozzáadása (pl. Konyakbarna, Olívazöld, Bordó...)"
          className="custom-input text-xs sm:text-sm flex-1"
        />
        <button
          type="submit"
          disabled={!newColorInput.trim()}
          className="btn-gold px-4 text-xs sm:text-sm flex items-center gap-1.5 shrink-0 shadow"
        >
          <Plus className="w-4 h-4" />
          <span>Hozzáadás</span>
        </button>
      </form>

      {/* Wardrobe Color Frequency (Auto-Learning Insight) */}
      {wardrobe.length >= 3 && wardrobeColors.length > 0 && (
        <div className="space-y-2.5 pt-3 border-t border-white/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="text-[11px] font-semibold text-[var(--accent-gold)] uppercase tracking-wider block">
              Gardrób Színkészlet (A Ruhatárad Valós Megoszlása):
            </span>
            <span className="text-[10px] text-[var(--text-muted)]">
              {wardrobe.length} db ruha alapján számítva
            </span>
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
            A meglévő ruháid valós színei automatikusan nem íródnak be a kedvencek közé, de az AI Stylist figyelembe veszi őket. Kattints a <strong>[+]</strong> gombra, ha egy meglévő színt hivatalos kedvencként is rögzíteni szeretnél:
          </p>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {wardrobeColors.slice(0, 8).map((wc, cIdx) => {
              const isFavorite = favoriteColors.some(fc => areColorsMatching(fc, wc.name));
              return (
                <button
                  key={cIdx}
                  type="button"
                  onClick={() => !isFavorite && handleAddColor(wc.name)}
                  disabled={isFavorite}
                  className={`text-[11px] py-1 px-2.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                    isFavorite
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 cursor-default'
                      : 'bg-white/5 border-white/10 text-[var(--text-secondary)] hover:border-[var(--border-gold)] hover:text-white'
                  }`}
                  title={isFavorite ? 'Már szerepel a palettádban' : `Kattints a(z) ${wc.name} palettához adásához`}
                >
                  {isFavorite ? <Check className="w-3 h-3 text-emerald-400" /> : <Plus className="w-3 h-3 text-[var(--accent-gold)]" />}
                  <span>{wc.name}</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-black/40 text-[var(--text-muted)]">
                    {wc.count} db
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Auto-learning Info Notice */}
      <div className="p-3 rounded-xl bg-[var(--accent-gold-glow)]/40 border border-[var(--border-gold)]/40 text-[11px] text-[var(--accent-gold-light)] flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-[var(--accent-gold)] shrink-0" />
        <span>
          <strong>Harmonikus Kapszula Elv:</strong> Az AI Wardrobe Assistant az arcbőrödhöz illő színtípus bázisszíneket és a fenti egyéni kedvenceidet összehangolva építi fel az önazonos szetteket.
        </span>
      </div>

    </div>
  );
}
