import React, { useState, useEffect } from 'react';
import { Sparkles, Info, X, ArrowRight, Shirt } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function ModuleFirstTimeGuide({
  moduleId,
  title,
  subtitle,
  badgeText = 'Útmutató & Tippek',
  badgeIcon: BadgeIcon = Sparkles,
  description,
  points = [],
  actionLabel,
  onAction,
  wardrobeCount = 0,
  minRequiredItems = 3,
  forceOpen = false,
  onClose = null
}) {
  const { currentUser } = useAuth();
  const storageKey = `sartorial_guide_dismissed_${moduleId}_${currentUser?.uid || 'guest'}`;

  const [isDismissed, setIsDismissed] = useState(() => {
    if (forceOpen) return false;
    try {
      return localStorage.getItem(storageKey) === 'true';
    } catch (_) {
      return false;
    }
  });

  useEffect(() => {
    if (forceOpen) {
      setIsDismissed(false);
      return;
    }
    try {
      setIsDismissed(localStorage.getItem(storageKey) === 'true');
    } catch (_) {
      setIsDismissed(false);
    }
  }, [storageKey, forceOpen]);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem(storageKey, 'true');
    } catch (_) {}
    if (onClose) {
      onClose();
    }
  };

  // If forceOpen is active (e.g. user clicked the info button), never hide due to past dismissal
  if (!forceOpen && isDismissed) {
    return null;
  }

  return (
    <div className="glass-card border border-slate-700/80 bg-gradient-to-br from-[#0e131f]/95 via-[#121826]/90 to-[#0b0f17]/95 p-4 sm:p-5 rounded-2xl shadow-2xl relative overflow-hidden animate-slide-up mb-5">
      {/* Subtle ambient accent glow */}
      <div className="absolute -top-12 -right-12 w-36 h-36 bg-slate-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-start justify-between gap-3 relative z-10">
        <div className="space-y-2 max-w-3xl min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-slate-800/80 text-slate-300 border border-slate-700">
              <BadgeIcon className="w-3 h-3 text-sky-400" />
              <span>{badgeText}</span>
            </span>
            {wardrobeCount > 0 && (
              <span className="text-[11px] text-slate-400">
                (Jelenleg {wardrobeCount} db ruha van a gardróbodban)
              </span>
            )}
          </div>

          <div>
            <h4 className="font-serif font-bold text-white text-sm sm:text-base">
              {title}
            </h4>
            {subtitle && (
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                {subtitle}
              </p>
            )}
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            {description}
          </p>

          {points.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {points.map((pt, idx) => (
                <div key={idx} className="flex items-start gap-2 text-[11px] text-slate-300">
                  <span className="text-sky-400 mt-0.5 shrink-0 font-bold">✦</span>
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
                className="bg-slate-200 text-slate-900 hover:bg-white text-xs font-semibold py-1.5 px-3 rounded-xl flex items-center gap-1.5 shadow transition-colors cursor-pointer"
              >
                <Shirt className="w-3.5 h-3.5" />
                <span>{actionLabel}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="text-[11px] text-slate-400 hover:text-white transition-colors underline cursor-pointer"
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
          className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
          title="Tájékoztató bezárása"
          aria-label="Tájékoztató bezárása"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

