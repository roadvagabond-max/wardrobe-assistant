import React from 'react';
import { X, Trash2, Sparkles, Tag, ShieldCheck, Calendar, Layers, Compass, Lightbulb } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function ItemDetailModal({ item, onClose }) {
  const { deleteItem } = useAuth();

  if (!item) return null;

  const handleDelete = () => {
    if (window.confirm(`Biztosan törölni szeretnéd ezt a ruhadarabot (${item.name})?`)) {
      deleteItem(item.id);
      onClose();
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="glass-card max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 border-[var(--border-gold)] space-y-5 animate-slide-up">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <span className="badge badge-gold">
            {item.formality || 'Sartorial'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Törlés"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Large Image (Uncropped, Proportional) */}
        <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-[#07090e] border border-white/10 p-2 flex items-center justify-center">
          <img src={item.imageUrl} alt={item.name} className="max-h-full max-w-full object-contain rounded-lg shadow-md" />
          {item.qualityScore && (
            <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-black/85 backdrop-blur-md border border-[var(--border-gold)] text-xs font-bold text-amber-300 flex items-center gap-1.5 shadow-lg">
              <Sparkles className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
              <span>Minőség: {item.qualityScore} / 10</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-bold font-serif text-white">{item.name}</h3>
            {item.stylingAdvice && (
              <p className="text-xs text-[var(--text-secondary)] mt-1 italic">
                "{item.stylingAdvice}"
              </p>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-xs bg-black/30 p-3.5 rounded-xl border border-white/5">
            <div>
              <span className="text-[var(--text-muted)] block mb-0.5">Anyag:</span>
              <span className="font-medium text-white">{item.material || 'Természetes szálak'}</span>
            </div>
            <div>
              <span className="text-[var(--text-muted)] block mb-0.5">Szín:</span>
              <div className="flex items-center gap-1.5">
                {item.colorHex && (
                  <span className="w-3 h-3 rounded-full border border-white/40" style={{ backgroundColor: item.colorHex }} />
                )}
                <span className="font-medium text-white">{item.color}</span>
              </div>
            </div>
            <div>
              <span className="text-[var(--text-muted)] block mb-0.5">Szabás:</span>
              <span className="font-medium text-white">{item.fit || 'Tailored'}</span>
            </div>
            <div>
              <span className="text-[var(--text-muted)] block mb-0.5">Márka:</span>
              <span className="font-medium text-white">{item.brand || 'Egyedi / Kézműves'}</span>
            </div>
          </div>

          {/* AI Styling Recommendation: Mivel és Mikor hordd */}
          {(item.stylingTip || item.whenToWear) && (
            <div className="space-y-2.5">
              {item.stylingTip && (
                <div className="p-3.5 rounded-xl bg-black/40 border border-[var(--border-gold)] space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-gold-light)]">
                    <Compass className="w-4 h-4 text-[var(--accent-gold)] shrink-0" />
                    <span>Mivel érdemes hordani (AI Stylist tanács):</span>
                  </div>
                  <p className="text-xs text-white/90 leading-relaxed pl-5">
                    {item.stylingTip}
                  </p>
                </div>
              )}

              {item.whenToWear && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
                    <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Mikor és milyen alkalomra ajánlott:</span>
                  </div>
                  <p className="text-xs text-emerald-100/90 leading-relaxed pl-5">
                    {item.whenToWear}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Season badges */}
          <div>
            <span className="text-xs text-[var(--text-muted)] block mb-1.5">Ajánlott évszakok:</span>
            <div className="flex gap-2">
              {item.season?.map((s, idx) => (
                <span key={idx} className="badge badge-subtle uppercase text-[10px]">
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Tags */}
          {item.tags && (
            <div>
              <span className="text-xs text-[var(--text-muted)] block mb-1.5">Stílusjegyek:</span>
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map((tag, idx) => (
                  <span key={idx} className="text-xs text-[var(--accent-gold-light)] bg-[var(--accent-gold-glow)] px-2.5 py-1 rounded-lg border border-[var(--border-gold)]">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
