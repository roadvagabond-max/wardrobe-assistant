import React, { useState, useMemo } from 'react';
import { Plus, Search, Shirt } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { normalizeBrandName } from '../../services/webshop';

export default function WardrobeView({ onAddNewItem, onSelectItem }) {
  const { wardrobe } = useAuth();

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSeason, setSelectedSeason] = useState('all');
  const [selectedCondition, setSelectedCondition] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { id: 'all', label: 'Összes darab' },
    { id: 'outerwear', label: '🧥 Zakók & Kabátok' },
    { id: 'knitwear', label: '🧶 Kötöttáru & Pulóverek' },
    { id: 'tops', label: '👔 Ingek & Felsők' },
    { id: 'bottoms', label: '👖 Nadrágok' },
    { id: 'shoes', label: '👞 Cipők' },
    { id: 'dresses', label: '👗 Ruhák' },
    { id: 'skirts', label: '💃 Szoknyák' },
    { id: 'accessories', label: '⌚ Kiegészítők' }
  ];

  const seasons = [
    { id: 'all', label: 'Minden évszak' },
    { id: 'tavasz', label: '🌸 Tavasz' },
    { id: 'nyar', label: '☀️ Nyár' },
    { id: 'osz', label: '🍂 Ősz' },
    { id: 'tel', label: '❄️ Tél' }
  ];

  const conditions = [
    { id: 'all', label: 'Minden állapot' },
    { id: 'clean', label: '✨ Csak szép / megkímélt' },
    { id: 'casual', label: '🧸 Játszós / kopott' },
    { id: 'replace', label: '🗑️ Lecserélendő' }
  ];

  const filteredWardrobe = useMemo(() => {
    return wardrobe.filter(item => {
      const matchCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchSeason = selectedSeason === 'all' || (item.season && item.season.includes(selectedSeason));
      
      let matchCondition = true;
      if (selectedCondition === 'clean') {
        matchCondition = !item.condition || item.condition.includes('Vadonatúj') || item.condition.includes('Megkímélt');
      } else if (selectedCondition === 'casual') {
        matchCondition = item.condition && item.condition.includes('Játszós');
      } else if (selectedCondition === 'replace') {
        matchCondition = item.condition && (item.condition.includes('Lecserélendő') || item.condition.includes('Javításra'));
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const normalizedBrand = normalizeBrandName(item.brand);
        const matchName = item.name?.toLowerCase().includes(q);
        const matchMaterial = item.material?.toLowerCase().includes(q);
        const matchColor = item.color?.toLowerCase().includes(q);
        const matchBrand = item.brand?.toLowerCase().includes(q) || normalizedBrand?.toLowerCase().includes(q);
        const matchSize = item.size?.toLowerCase().includes(q);
        const matchStyle = item.styleArchetype?.toLowerCase().includes(q);
        const matchTags = item.tags?.some(t => t.toLowerCase().includes(q));
        return matchCategory && matchSeason && matchCondition && (matchName || matchMaterial || matchColor || matchBrand || matchSize || matchStyle || matchTags);
      }
      
      return matchCategory && matchSeason && matchCondition;
    });
  }, [wardrobe, selectedCategory, selectedSeason, selectedCondition, searchQuery]);

  return (
    <div className="space-y-6 animate-slide-up">
      
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold font-serif gold-gradient-text">
            Gardróbom
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
            {wardrobe.length} rögzített ruhadarab és kiegészítő
          </p>
        </div>

        <button
          onClick={onAddNewItem}
          className="btn-gold w-full sm:w-auto shadow-lg flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          <span>Új Ruha Feltöltése</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-card p-4 space-y-4">
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            id="wardrobe-search-input"
            name="wardrobe-search"
            aria-label="Keresés a gardróbban"
            placeholder="Keresés szín, anyag, márka vagy stílus szerint (pl. 'lenvászon', 'sötétkék', 'loafer')..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="custom-input pl-10"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] hover:text-white"
            >
              Törlés
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-[var(--accent-gold)] text-black font-semibold shadow-md'
                  : 'bg-white/5 text-[var(--text-secondary)] hover:bg-white/10 hover:text-white border border-white/5'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Sub-Filters: Season & Condition */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5 text-xs">
          
          {/* Season Selector */}
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-[var(--text-muted)] whitespace-nowrap">Évszak:</span>
            {seasons.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedSeason(s.id)}
                className={`px-2.5 py-1 rounded-lg text-xs transition-colors whitespace-nowrap ${
                  selectedSeason === s.id
                    ? 'bg-white/20 text-white font-medium'
                    : 'text-[var(--text-muted)] hover:text-white'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Condition Selector */}
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-[var(--text-muted)] whitespace-nowrap">Állapot:</span>
            {conditions.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedCondition(c.id)}
                className={`px-2.5 py-1 rounded-lg text-xs transition-colors whitespace-nowrap ${
                  selectedCondition === c.id
                    ? 'bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-500/30'
                    : 'text-[var(--text-muted)] hover:text-white'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

        </div>

      </div>

      {/* Grid of Clothing Items */}
      {filteredWardrobe.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {filteredWardrobe.map(item => (
            <div
              key={item.id}
              onClick={() => onSelectItem(item)}
              className="glass-card overflow-hidden group cursor-pointer border-[var(--border-subtle)] hover:border-[var(--border-gold)] transition-all duration-300 flex flex-col justify-between hover:scale-[1.02]"
            >
              <div>
                {/* Image Container (Uncropped, Proportional object-contain) */}
                <div className="relative aspect-[4/3] bg-[#07090e] p-2 flex items-center justify-center overflow-hidden">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    loading="lazy"
                    decoding="async"
                    width="320"
                    height="240"
                    className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500"
                  />
                  
                  {/* Category Badge */}
                  <span className="absolute top-2 left-2 badge badge-gold text-[10px] uppercase font-bold tracking-wider backdrop-blur-md">
                    {item.category === 'outerwear' ? 'Zakó' : item.category === 'knitwear' ? 'Kötött' : item.category === 'tops' ? 'Felső' : item.category === 'bottoms' ? 'Nadrág' : item.category === 'shoes' ? 'Cipő' : item.category === 'skirts' ? 'Szoknya' : item.category}
                  </span>

                  {/* Condition Badge */}
                  {item.condition && (
                    <span className={`absolute bottom-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded shadow ${
                      item.condition.includes('Lecserélendő')
                        ? 'bg-rose-500/80 text-white'
                        : item.condition.includes('Játszós')
                        ? 'bg-amber-500/80 text-black'
                        : 'bg-black/70 text-emerald-300'
                    }`}>
                      {item.condition.split('/')[0].trim()}
                    </span>
                  )}
                </div>

                {/* Card Info */}
                <div className="p-3.5 space-y-1.5">
                  <h3 className="font-serif font-bold text-white text-sm line-clamp-1 group-hover:text-[var(--accent-gold)] transition-colors">
                    {item.name}
                  </h3>

                  {/* Brand & Size Info */}
                  {(item.brand || item.size) && (
                    <div className="flex items-center justify-between text-[11px] text-[var(--accent-gold-light)] font-medium">
                      <span className="truncate">{item.brand || ''}</span>
                      {item.size && (
                        <span className="bg-white/10 px-1.5 py-0.5 rounded font-mono text-white text-[10px] shrink-0 font-bold">
                          {item.size}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                    <span className="truncate">{item.material || 'Természetes'}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {item.colorHex && (
                        <span className="w-2.5 h-2.5 rounded-full border border-white/30" style={{ backgroundColor: item.colorHex }} />
                      )}
                      <span className="text-white text-[11px]">{item.color}</span>
                    </div>
                  </div>

                  {item.styleArchetype && (
                    <span className="text-[10px] text-[var(--accent-gold-light)] block truncate font-medium">
                      ✦ {item.styleArchetype}
                    </span>
                  )}
                </div>
              </div>

              {/* Card Footer with Tags */}
              <div className="p-3.5 pt-0 flex items-center justify-between text-[10px] text-[var(--text-muted)] border-t border-white/5">
                <span className="capitalize">{item.formality || 'Smart Casual'}</span>
                <span className="text-[var(--accent-gold)] font-bold">Részletek ➔</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card p-12 text-center space-y-4">
          <Shirt className="w-12 h-12 text-[var(--accent-gold)] mx-auto opacity-50" />
          <div className="space-y-1">
            <h3 className="text-lg font-serif font-bold text-white">Nincs találat a szűrésre</h3>
            <p className="text-xs text-[var(--text-secondary)]">Próbálj más kategóriát vagy szűrőt választani.</p>
          </div>
          <button
            onClick={() => {
              setSelectedCategory('all');
              setSelectedSeason('all');
              setSelectedCondition('all');
              setSearchQuery('');
            }}
            className="btn-secondary text-xs"
          >
            Szűrők Visszaállítása
          </button>
        </div>
      )}

    </div>
  );
}
