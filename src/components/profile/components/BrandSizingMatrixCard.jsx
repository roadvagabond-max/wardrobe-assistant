import React, { useMemo } from 'react';
import { Layers } from 'lucide-react';
import { normalizeBrandName } from '../../../services/webshop';

export default function BrandSizingMatrixCard({ wardrobe = [] }) {
  // 📏 Brand Size Intelligence Aggregator (Consolidates aliases like reserved.com, next(nova fides), zara man)
  const brandSizeMatrix = useMemo(() => {
    const map = {};
    wardrobe.forEach(item => {
      const rawBrand = item.brand?.trim();
      const size = item.size?.trim();
      if (!rawBrand && !size) return;

      const normalizedBrand = normalizeBrandName(rawBrand) || 'Ismeretlen gyártó';
      const brandKey = normalizedBrand;

      if (!map[brandKey]) {
        map[brandKey] = {
          brand: brandKey,
          categories: {},
          itemsCount: 0,
          rawAliases: new Set()
        };
      }
      map[brandKey].itemsCount++;
      if (rawBrand && rawBrand.toLowerCase() !== normalizedBrand.toLowerCase()) {
        map[brandKey].rawAliases.add(rawBrand);
      }

      const catKey = item.category || 'other';
      if (!map[brandKey].categories[catKey]) {
        map[brandKey].categories[catKey] = [];
      }
      if (size && !map[brandKey].categories[catKey].includes(size)) {
        map[brandKey].categories[catKey].push(size);
      }
    });

    return Object.values(map)
      .map(b => ({
        ...b,
        rawAliasesList: Array.from(b.rawAliases || [])
      }))
      .sort((a, b) => b.itemsCount - a.itemsCount);
  }, [wardrobe]);

  // 🏷️ Category Dominant Size Summary
  const categorySizeSummary = useMemo(() => {
    const cats = {
      outerwear: { label: '🧥 Zakó & Kabát', sizes: {} },
      tops: { label: '👔 Ingek & Felsők', sizes: {} },
      knitwear: { label: '🧶 Kötöttáru', sizes: {} },
      bottoms: { label: '👖 Nadrágok', sizes: {} },
      shoes: { label: '👞 Cipők', sizes: {} }
    };
    wardrobe.forEach(item => {
      const cat = item.category;
      const size = item.size?.trim();
      if (cats[cat] && size) {
        cats[cat].sizes[size] = (cats[cat].sizes[size] || 0) + 1;
      }
    });
    return Object.entries(cats).map(([key, data]) => {
      const sortedSizes = Object.entries(data.sizes).sort((a, b) => b[1] - a[1]);
      return {
        key,
        label: data.label,
        dominantSize: sortedSizes[0]?.[0] || '—',
        count: Object.values(data.sizes).reduce((a, b) => a + b, 0)
      };
    });
  }, [wardrobe]);

  return (
    <div className="glass-card p-6 sm:p-7 border-[var(--border-gold)] space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="badge badge-gold text-[10px]">Méret Tudásbázis</span>
            <span className="badge badge-emerald text-[10px]">Gyártói Illeszkedési Térkép</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-serif font-bold text-white mt-1">
            Gyártmány & Méretprofil Térkép
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Az AI folyamatosan tanulja a ruhatáradból, hogy melyik márkánál pontosan milyen méret illik a testedre.
          </p>
        </div>
      </div>

      {/* 1. Category Quick Size Pills */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent-gold)] block">
          Kategóriánkénti Domináns Méreteid:
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {categorySizeSummary.map((cat) => (
            <div key={cat.key} className="bg-black/40 p-3 rounded-xl border border-white/5 space-y-1">
              <span className="text-[11px] text-[var(--text-muted)] block truncate">{cat.label}</span>
              <span className="font-mono font-bold text-base text-white block">{cat.dominantSize}</span>
              <span className="text-[10px] text-[var(--text-muted)] block">{cat.count} db alapján</span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Brand Specific Sizing Table */}
      <div className="space-y-2 pt-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent-gold)] block">
          Márkák és Megfelelő Méretek a Gardróbodban:
        </span>

        {brandSizeMatrix.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {brandSizeMatrix.map((b, idx) => (
              <div key={idx} className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-2 hover:border-[var(--border-gold)] transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-bold text-sm text-white font-serif block truncate">{b.brand}</span>
                    {b.rawAliasesList && b.rawAliasesList.length > 0 && (
                      <div className="flex items-center gap-1 mt-0.5 text-[10px] text-[var(--accent-gold-light)]/80" title={`Összefűzött márkanevek: ${b.rawAliasesList.join(', ')}`}>
                        <Layers className="w-2.5 h-2.5 text-[var(--accent-gold)] shrink-0" />
                        <span className="truncate max-w-[150px]">
                          {b.rawAliasesList.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-[var(--accent-gold-light)] bg-[var(--accent-gold-glow)] px-2 py-0.5 rounded-full border border-[var(--border-gold)] shrink-0">
                    {b.itemsCount} db ruha
                  </span>
                </div>

                <div className="space-y-1 text-xs text-[var(--text-secondary)]">
                  {Object.entries(b.categories).map(([cat, sizes]) => (
                    <div key={cat} className="flex items-center justify-between text-[11px]">
                      <span className="text-[var(--text-muted)] capitalize">
                        {cat === 'outerwear' ? 'Zakó/Kabát' : cat === 'tops' ? 'Felső/Ing' : cat === 'bottoms' ? 'Nadrág' : cat === 'shoes' ? 'Cipő' : cat === 'knitwear' ? 'Kötött' : cat}:
                      </span>
                      <span className="font-mono font-bold text-white bg-white/5 px-2 py-0.5 rounded">
                        {sizes.join(', ') || '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center p-6 bg-black/20 rounded-xl border border-white/5 text-xs text-[var(--text-muted)]">
            Még nincs gyártó és méret rögzítve a gardróbodban. Tölts fel vagy módosíts ruhadarabokat méret megadásával!
          </div>
        )}
      </div>

    </div>
  );
}
