import React, { useState, useMemo } from 'react';
import { PieChart, Award, Sparkles, ChevronDown, CheckCircle2, AlertCircle, ShieldCheck, Layers, Shirt } from 'lucide-react';
import { calculateCapsuleWardrobeIndex } from '../../../services/capsuleAnalytics';

export default function WardrobeAnalyticsCard({ wardrobe = [], profile = {} }) {
  const [showPillars, setShowPillars] = useState(false);

  const analytics = useMemo(() => {
    return calculateCapsuleWardrobeIndex(wardrobe, profile);
  }, [wardrobe, profile]);

  const {
    totalScore = 0,
    statusTier = {
      label: 'Kezdeti Fázis',
      color: 'rose',
      description: 'Alapkategóriák és kulcsdarabok felvitele javasolt.'
    },
    averageQuality = '0.0',
    replacementCount = 0,
    breakdown = {
      coreBalance: { score: 0, max: 35, percent: 0, label: 'Alapkategóriák & Arányok' },
      seasonalFootwear: { score: 0, max: 25, percent: 0, label: 'Szezonalitás & Lábbelik' },
      conditionIntegrity: { score: 0, max: 20, percent: 0, label: 'Ruhaállapot' },
      fabricQuality: { score: 0, max: 20, percent: 0, label: 'Anyagminőség' }
    },
    categoryCounts = {},
    insights = []
  } = (analytics || {});

  return (
    <div className="glass-card p-5 sm:p-6 space-y-4 flex flex-col justify-between border-[var(--border-gold)]/40 hover:border-[var(--border-gold)] transition-all">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <PieChart className="w-5 h-5 text-[var(--accent-gold)]" />
            <h4 className="font-serif font-bold text-base sm:text-lg text-white">Gardrób Statisztikák</h4>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            totalScore >= 85 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
            totalScore >= 70 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
            'bg-rose-500/20 text-rose-300 border border-rose-500/30'
          }`}>
            {statusTier?.label || 'Kapszula'}
          </span>
        </div>

        {/* Primary Metrics Grid */}
        <div className="space-y-2.5 mt-3">
          
          {/* Item Count */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 text-xs">
            <span className="text-[var(--text-secondary)]">Összes rögzített ruha:</span>
            <span className="font-bold text-white text-sm">{wardrobe.length} db</span>
          </div>

          {/* Average Quality */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 text-xs">
            <span className="text-[var(--text-secondary)]">Átlagos Anyagminőség:</span>
            <span className="font-bold text-amber-300 text-sm">{averageQuality} / 10</span>
          </div>

          {/* Capsule Wardrobe Index Box */}
          <div className="p-3 rounded-xl bg-black/40 border border-[var(--border-gold)]/30 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent-gold-light)] block">
                  Kapszula Ruhatár Index
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">
                  4-pilléres variálhatósági formula
                </span>
              </div>
              <div className="text-right">
                <span className="text-xl font-serif font-extrabold gold-gradient-text">
                  {totalScore}%
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 via-[var(--accent-gold)] to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(5, totalScore)}%` }}
              />
            </div>

            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
              {statusTier.description}
            </p>

            {/* Toggle 4-Pillar Breakdown Button */}
            <button
              type="button"
              onClick={() => setShowPillars(prev => !prev)}
              className="w-full pt-1.5 flex items-center justify-center gap-1 text-[10px] text-[var(--accent-gold-light)] hover:text-white transition-colors cursor-pointer"
            >
              <span>{showPillars ? 'Részletes pontszámok elrejtése' : '4 Pilléres Pontszám-bontás megtekintése'}</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showPillars ? 'rotate-180' : ''}`} />
            </button>

            {/* 4 Pillars Breakdown Drawer */}
            {showPillars && (
              <div className="pt-2 border-t border-white/10 space-y-2 animate-slide-up">
                
                {/* Pillar 1: Core Balance */}
                <div className="space-y-0.5 text-[10px]">
                  <div className="flex justify-between text-[var(--text-secondary)]">
                    <span>{breakdown.coreBalance.label}</span>
                    <span className="font-bold text-white">{breakdown.coreBalance.score} / {breakdown.coreBalance.max} p</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: `${breakdown.coreBalance.percent}%` }} />
                  </div>
                </div>

                {/* Pillar 2: Seasonal & Footwear */}
                <div className="space-y-0.5 text-[10px]">
                  <div className="flex justify-between text-[var(--text-secondary)]">
                    <span>{breakdown.seasonalFootwear.label}</span>
                    <span className="font-bold text-white">{breakdown.seasonalFootwear.score} / {breakdown.seasonalFootwear.max} p</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${breakdown.seasonalFootwear.percent}%` }} />
                  </div>
                </div>

                {/* Pillar 3: Condition */}
                <div className="space-y-0.5 text-[10px]">
                  <div className="flex justify-between text-[var(--text-secondary)]">
                    <span>{breakdown.conditionIntegrity.label}</span>
                    <span className="font-bold text-white">{breakdown.conditionIntegrity.score} / {breakdown.conditionIntegrity.max} p</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${breakdown.conditionIntegrity.percent}%` }} />
                  </div>
                </div>

                {/* Pillar 4: Fabric Quality */}
                <div className="space-y-0.5 text-[10px]">
                  <div className="flex justify-between text-[var(--text-secondary)]">
                    <span>{breakdown.fabricQuality.label}</span>
                    <span className="font-bold text-white">{breakdown.fabricQuality.score} / {breakdown.fabricQuality.max} p</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--accent-gold)] rounded-full" style={{ width: `${breakdown.fabricQuality.percent}%` }} />
                  </div>
                </div>

                {/* Actionable Insights */}
                {insights && insights.length > 0 && (
                  <div className="pt-2 border-t border-white/5 space-y-1">
                    {insights.map((ins, iIdx) => (
                      <div key={iIdx} className="flex items-start gap-1.5 text-[10px] text-amber-200/90">
                        <span className="text-[var(--accent-gold)] shrink-0">•</span>
                        <span>{ins}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Replacement Warning */}
          {replacementCount > 0 && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs">
              <span className="text-rose-300">Megújítandó / selejtezendő:</span>
              <span className="font-bold text-rose-400 text-sm">{replacementCount} db</span>
            </div>
          )}
        </div>

        {/* Category Breakdown */}
        <div className="mt-4 space-y-2">
          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
            Kategória eloszlás:
          </span>
          <div className="grid grid-cols-2 gap-1.5 text-xs text-[var(--text-secondary)]">
            <div className="p-1.5 rounded-lg bg-white/5 flex items-center justify-between">
              <span>Felsők & Ingek:</span>
              <span className="font-bold text-white">{categoryCounts['tops'] || 0}</span>
            </div>
            <div className="p-1.5 rounded-lg bg-white/5 flex items-center justify-between">
              <span>Nadrágok:</span>
              <span className="font-bold text-white">{categoryCounts['bottoms'] || 0}</span>
            </div>
            <div className="p-1.5 rounded-lg bg-white/5 flex items-center justify-between">
              <span>Zakók & Kabátok:</span>
              <span className="font-bold text-white">{categoryCounts['outerwear'] || 0}</span>
            </div>
            <div className="p-1.5 rounded-lg bg-white/5 flex items-center justify-between">
              <span>Lábbelik:</span>
              <span className="font-bold text-white">{categoryCounts['shoes'] || 0}</span>
            </div>
            <div className="p-1.5 rounded-lg bg-white/5 flex items-center justify-between">
              <span>Kötöttáru:</span>
              <span className="font-bold text-white">{categoryCounts['knitwear'] || 0}</span>
            </div>
            {(categoryCounts['dresses'] > 0 || profile?.gender === 'Női') ? (
              <div className="p-1.5 rounded-lg bg-white/5 flex items-center justify-between">
                <span>Ruhák & Szoknyák:</span>
                <span className="font-bold text-white">{categoryCounts['dresses'] || 0}</span>
              </div>
            ) : (
              <div className="p-1.5 rounded-lg bg-white/5 flex items-center justify-between">
                <span>Kiegészítők:</span>
                <span className="font-bold text-white">{categoryCounts['accessories'] || 0}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Style DNA Badge */}
      <div className="p-2.5 rounded-xl bg-[var(--accent-gold-glow)] border border-[var(--border-gold)] text-[10px] text-[var(--accent-gold-light)] flex items-center gap-2 mt-3">
        <Award className="w-4 h-4 text-[var(--accent-gold)] shrink-0" />
        <span>Személyes stílusod és kapszulád dinamikusan szinkronizálódik az AI Stylisttal.</span>
      </div>

    </div>
  );
}
