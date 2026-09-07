import React, { useState, useEffect } from 'react';
import { Sparkles, Info, X, ArrowRight, Shirt } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function ModuleFirstTimeGuide({
  moduleId,
  title,
  subtitle,
  badgeText = 'Első Használati Útmutató',
  badgeIcon: BadgeIcon = Sparkles,
  description,
  points = [],
  actionLabel,
  onAction,
  wardrobeCount = 0,
  minRequiredItems = 3
}) {
  const { currentUser } = useAuth();
  const storageKey = `sartorial_guide_dismissed_${moduleId}_${currentUser?.uid || 'guest'}`;

  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      return localStorage.getItem(storageKey) === 'true';
    } catch (_) {
      return false;
    }
  });

  useEffect(() => {
    try {
      setIsDismissed(localStorage.getItem(storageKey) === 'true');
    } catch (_) {
      setIsDismissed(false);
    }
  }, [storageKey]);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem(storageKey, 'true');
    } catch (_) {}
  };

  if (isDismissed) {
    return null;
  }

  return (
    <div className="glass-card border-[var(--border-gold)]/60 bg-gradient-to-r from-black/70 via-[#141b27]/80 to-[var(--accent-gold-glow)]/10 p-4 sm:p-5 rounded-2xl shadow-lg relative overflow-hidden animate-slide-up mb-5">
      {/* Glow accent */}
      <div className="absolute -top-12 -right-12 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-start justify-between gap-3 relative z-10">
        <div className="space-y-2 max-w-3xl min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="badge badge-gold text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
              <BadgeIcon className="w-3 h-3" />
              <span>{badgeText}</span>
            </span>
            {wardrobeCount > 0 && (
              <span className="text-[11px] text-[var(--text-muted)]">
                (Jelenleg {wardrobeCount} db ruha van a gardróbodban)
              </span>
            )}
          </div>

          <div>
            <h4 className="font-serif font-bold text-white text-sm sm:text-base">
              {title}
            </h4>
            {subtitle && (
              <p className="text-xs text-[var(--accent-gold-light)] font-medium mt-0.5">
                {subtitle}
              </p>
            )}
          </div>

          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            {description}
          </p>

          {points.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {points.map((pt, idx) => (
                <div key={idx} className="flex items-start gap-2 text-[11px] text-zinc-300">
                  <span className="text-[var(--accent-gold)] mt-0.5 shrink-0">✦</span>
                  <span className="leading-snug">{pt}</span>
                </div>
              ))}
            </div>
          )}

          {actionLabel && onAction && (
            <div className="pt-2 flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={onAction}
                className="btn-gold text-xs py-1.5 px-3 flex items-center gap-1.5 shadow"
              >
                <Shirt className="w-3.5 h-3.5" />
                <span>{actionLabel}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="text-[11px] text-[var(--text-muted)] hover:text-white transition-colors underline cursor-pointer"
              >
                Értem, bezárás
              </button>
            </div>
          )}
        </div>

        {/* Dismiss X button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-white/10 transition-colors shrink-0"
          title="Tájékoztató bezárása"
          aria-label="Tájékoztató bezárása"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
