import React, { useState, useMemo } from 'react';
import { Plus, Search, Filter, Sparkles, Tag, Shirt, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function WardrobeView({ onAddNewItem, onSelectItem }) {
  const { wardrobe } = useAuth();

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSeason, setSelectedSeason] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { id: 'all', label: 'Összes darab' },
    { id: 'outerwear', label: 'Zakók & Kabátok' },
    { id: 'tops', label: 'Ingek & Kötöttáru' },
    { id: 'bottoms', label: 'Nadrágok' },
    { id: 'shoes', label: 'Cipők & Loaferek' },
    { id: 'accessories', label: 'Kiegészítők' }
  ];

  const seasons = [
    { id: 'all', label: 'Minden évszak' },
    { id: 'tavasz', label: '🌸 Tavasz' },
    { id: 'nyar', label: '☀️ Nyár' },
    { id: 'osz', label: '🍂 Ősz' },
    { id: 'tel', label: '❄️ Tél' }
  ];

  const filteredWardrobe = useMemo(() => {
    return wardrobe.filter(item => {
      const matchCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchSeason = selectedSeason === 'all' || (item.season && item.season.includes(selectedSeason));
      const matchSearch = !searchQuery || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.color.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.material?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.formality?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.tags && item.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));

      return matchCategory && matchSeason && matchSearch;
    });
  }, [wardrobe, selectedCategory, selectedSeason, searchQuery]);

  return (
    <div className="space-y-6 animate-slide-up">
      
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold font-serif gold-gradient-text">
            Digitális Gardróbom
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {wardrobe.length} prémium ruhadarab rendszerezve és AI-val címkézve.
          </p>
        </div>

        <button
          onClick={onAddNewItem}
          className="btn-gold w-full sm:w-auto shadow-lg"
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
            placeholder="Keresés szín, anyag, márka vagy stílus szerint (pl. 'kasmír', 'sötétkék', 'loafer')..."
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
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map(cat => {
            const count = cat.id === 'all' 
              ? wardrobe.length 
              : wardrobe.filter(w => w.category === cat.id).length;
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[var(--accent-gold)] text-black font-semibold shadow-md shadow-[var(--accent-gold-glow)]'
                    : 'bg-white/5 text-[var(--text-secondary)] hover:bg-white/10 hover:text-white border border-white/5'
                }`}
              >
                <span>{cat.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isSelected ? 'bg-black/20 text-black' : 'bg-white/10 text-[var(--text-muted)]'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Season Selector */}
        <div className="flex items-center gap-2 pt-2 border-t border-white/5 overflow-x-auto">
          <span className="text-[11px] uppercase font-bold tracking-wider text-[var(--text-muted)] mr-1">
            Évszak:
          </span>
          {seasons.map(season => (
            <button
              key={season.id}
              onClick={() => setSelectedSeason(season.id)}
              className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                selectedSeason === season.id
                  ? 'bg-white/15 text-white font-medium border border-white/20'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {season.label}
            </button>
          ))}
        </div>

      </div>

      {/* Wardrobe Items Grid */}
      {filteredWardrobe.length === 0 ? (
        <div className="glass-card p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto text-[var(--text-muted)]">
            <Shirt className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-serif font-bold text-white">Nincs találat a szűrésre</h3>
          <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
            Próbálj más kategóriát vagy töröld a keresőkifejezést az összes ruhadarab megjelenítéséhez.
          </p>
        </div>
      ) : (
        <div className="wardrobe-grid">
          {filteredWardrobe.map(item => (
            <div
              key={item.id}
              onClick={() => onSelectItem(item)}
              className="glass-card group overflow-hidden cursor-pointer flex flex-col justify-between hover:scale-[1.02] transition-all"
            >
              {/* Image Container with Luxury Badges */}
              <div className="relative aspect-[3/4] w-full bg-black/40 overflow-hidden">
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-80 group-hover:opacity-90 transition-opacity"></div>
                
                {/* Formality Tag Top-Left */}
                <div className="absolute top-2.5 left-2.5">
                  <span className="badge badge-gold shadow-sm backdrop-blur-md">
                    {item.formality ? item.formality.split('/')[0].trim() : 'Sartorial'}
                  </span>
                </div>

                {/* Quality Score Top-Right */}
                {item.qualityScore && (
                  <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-[10px] font-bold text-amber-300 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[var(--accent-gold)]" />
                    <span>{item.qualityScore} / 10</span>
                  </div>
                )}

                {/* Color Dot & Material at Bottom of Image */}
                <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-[11px] text-white/90">
                  <span className="font-medium truncate max-w-[70%]">{item.material || item.brand}</span>
                  {item.colorHex && (
                    <span 
                      className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-sm shrink-0" 
                      style={{ backgroundColor: item.colorHex }}
                      title={item.color}
                    />
                  )}
                </div>
              </div>

              {/* Card Meta Content */}
              <div className="p-3.5 space-y-1.5 bg-gradient-to-b from-transparent to-black/30">
                <h4 className="font-medium text-sm text-white line-clamp-1 group-hover:text-[var(--accent-gold-light)] transition-colors">
                  {item.name}
                </h4>
                
                <div className="flex items-center gap-1.5 flex-wrap">
                  {item.tags?.slice(0, 2).map((tag, idx) => (
                    <span key={idx} className="text-[10px] text-[var(--text-muted)] bg-white/5 px-2 py-0.5 rounded-md">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
}
