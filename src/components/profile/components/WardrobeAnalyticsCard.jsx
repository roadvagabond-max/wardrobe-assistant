import React, { useMemo } from 'react';
import { PieChart, Award, Sparkles } from 'lucide-react';

export default function WardrobeAnalyticsCard({ wardrobe = [] }) {
  const averageQuality = useMemo(() => {
    return (
      wardrobe.reduce((acc, item) => acc + (item.qualityScore || 8.5), 0) / (wardrobe.length || 1)
    ).toFixed(1);
  }, [wardrobe]);

  const categoryCounts = useMemo(() => {
    return wardrobe.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {});
  }, [wardrobe]);

  const replacementCount = useMemo(() => {
    return wardrobe.filter(w => w.condition === 'Lecserélendő' || w.condition === 'Javításra vár').length;
  }, [wardrobe]);

  const capsuleIndex = useMemo(() => {
    if (wardrobe.length === 0) return 0;
    const coreCategories = ['outerwear', 'tops', 'bottoms', 'shoes', 'knitwear'];
    const coveredCategories = coreCategories.filter(cat => categoryCounts[cat] > 0).length;
    const categoryCoverage = (coveredCategories / coreCategories.length) * 40;
    const goodConditionRatio = wardrobe.filter(w => !w.condition?.includes('Lecserélendő') && !w.condition?.includes('Javításra')).length / wardrobe.length;
    const conditionScore = goodConditionRatio * 30;
    const sizeScore = Math.min(wardrobe.length / 10, 1) * 30;
    return Math.round(categoryCoverage + conditionScore + sizeScore);
  }, [wardrobe, categoryCounts]);

  return (
    <div className="glass-card p-6 space-y-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 mb-4">
          <PieChart className="w-5 h-5 text-[var(--accent-gold)]" />
          <h4 className="font-serif font-bold text-lg text-white">Gardrób Statisztikák</h4>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 text-xs">
            <span className="text-[var(--text-secondary)]">Összes rögzített ruha:</span>
            <span className="font-bold text-white text-sm">{wardrobe.length} db</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 text-xs">
            <span className="text-[var(--text-secondary)]">Átlagos Anyagminőség:</span>
            <span className="font-bold text-amber-300 text-sm">{averageQuality} / 10</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 text-xs">
            <span className="text-[var(--text-secondary)]">Kapszula Ruhatár Index:</span>
            <span className="font-bold text-emerald-400 text-sm">
              {capsuleIndex}% ({capsuleIndex >= 85 ? 'Magas variálhatóság' : capsuleIndex >= 60 ? 'Jó variálhatóság' : 'Fejlesztésre szorul'})
            </span>
          </div>

          {replacementCount > 0 && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs">
              <span className="text-rose-300">Megújítandó / selejtezendő:</span>
              <span className="font-bold text-rose-400 text-sm">{replacementCount} db</span>
            </div>
          )}
        </div>

        {/* Breakdown */}
        <div className="mt-5 space-y-2">
          <span className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider block">
            Kategória eloszlás:
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs text-[var(--text-secondary)]">
            <div>Zakók: {categoryCounts['outerwear'] || 0} db</div>
            <div>Kötöttáru: {categoryCounts['knitwear'] || 0} db</div>
            <div>Felsők/Ingek: {categoryCounts['tops'] || 0} db</div>
            <div>Nadrágok: {categoryCounts['bottoms'] || 0} db</div>
            <div>Cipők: {categoryCounts['shoes'] || 0} db</div>
            <div>Ruhák: {categoryCounts['dresses'] || 0} db</div>
          </div>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-[var(--accent-gold-glow)] border border-[var(--border-gold)] text-[11px] text-[var(--accent-gold-light)] flex items-center gap-2 mt-4">
        <Award className="w-4 h-4 text-[var(--accent-gold)] shrink-0" />
        <span>Stílusod az időtlen elegancia és a modern smart-casual harmóniájára épül.</span>
      </div>

    </div>
  );
}
