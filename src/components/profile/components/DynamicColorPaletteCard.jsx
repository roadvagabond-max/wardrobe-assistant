import React, { useState, useMemo } from 'react';
import { Palette, Plus, X, Sparkles, Check, Info } from 'lucide-react';

export default function DynamicColorPaletteCard({ 
  profile, 
  wardrobe = [], 
  onUpdateProfile 
}) {
  const [newColorInput, setNewColorInput] = useState('');

  // Extract color distribution from wardrobe
  const wardrobeColors = useMemo(() => {
    const counts = {};
    wardrobe.forEach(item => {
      const col = item.color?.trim();
      if (col) {
        counts[col] = (counts[col] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [wardrobe]);

  const favoriteColors = Array.isArray(profile.favoriteColors) 
    ? profile.favoriteColors 
    : ['Sötétkék (Navy)', 'Törtfehér / Krém', 'Dohánybarna / Espresso'];

  const handleAddColor = async (colorToAdd) => {
    const color = (colorToAdd || newColorInput).trim();
    if (!color) return;
    if (favoriteColors.includes(color)) {
      setNewColorInput('');
      return;
    }
    const updated = [...favoriteColors, color];
    await onUpdateProfile({
      ...profile,
      favoriteColors: updated
    });
    setNewColorInput('');
  };

  const handleRemoveColor = async (colorToRemove) => {
    const updated = favoriteColors.filter(c => c !== colorToRemove);
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
            <span className="badge badge-emerald text-[10px]">Automatikus Tanulás</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-serif font-bold text-white mt-1">
            Alappaletta & Kedvelt Színek
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            A ruhatárad domináns színei és a színtípusod alapján automatikusan összeállított és finomhangolt színpaletta.
          </p>
        </div>
      </div>

      {/* Active Signature Palette Chips */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-white block">
          Aktív Kedvenc & Bázis Színeid:
        </span>
        <div className="flex flex-wrap gap-2">
          {favoriteColors.map((color, idx) => (
            <div 
              key={idx}
              className="badge badge-subtle text-xs py-1.5 px-3 flex items-center gap-2 bg-white/5 border border-white/10 hover:border-[var(--border-gold)]/60 transition-colors group"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent-gold)] shrink-0" />
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
          placeholder="Egyedi szín hozzáadása (pl. Olívazöld, Homokbézs, Konyakbarna...)"
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
      {wardrobeColors.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[var(--accent-gold)] uppercase tracking-wider block">
              Gardrób Színmegoszlás (A Ruhatáradból Tanulva):
            </span>
            <span className="text-[10px] text-[var(--text-muted)]">
              {wardrobe.length} db ruha alapján
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {wardrobeColors.slice(0, 8).map((wc, cIdx) => {
              const isFavorite = favoriteColors.includes(wc.name);
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
          <strong>Automatikus Tanulás:</strong> Az AI Wardrobe Assistant a feltöltött ruháid és a színtípusod alapján automatikusan finomhangolja és alkalmazza a palettádat a szettajánlások során.
        </span>
      </div>

    </div>
  );
}
