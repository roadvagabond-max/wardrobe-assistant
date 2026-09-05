import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Plus, Search, Shirt, Sparkles, Compass, AlertCircle, RefreshCw, 
  ChevronDown, ChevronUp, ExternalLink, ArrowRight, BookmarkPlus, Loader2,
  Layers, CheckCircle2, ShieldAlert
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { normalizeBrandName } from '../../services/webshop';
import { analyzeWardrobeGaps } from '../../services/gemini';
import OnboardingGuide from '../common/OnboardingGuide';

export default function WardrobeView({ onAddNewItem, onSelectItem, onNavigateTab }) {
  const { wardrobe, profile } = useAuth();

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSeason, setSelectedSeason] = useState('all');
  const [selectedCondition, setSelectedCondition] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Capsule Ruhatár Index (CRI) & Gap Analysis Drawer States
  const [isCriExpanded, setIsCriExpanded] = useState(false);
  const [gaps, setGaps] = useState(() => {
    try {
      const saved = localStorage.getItem('capsule_gaps_cache');
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });
  const [isLoadingGaps, setIsLoadingGaps] = useState(false);
  const [wishlistIds, setWishlistIds] = useState(new Set());

  const rulesKey = (profile?.customStylingRules || []).join(';;');
  const prevRulesKeyRef = useRef(rulesKey);

  // Calculate Capsule Ruhatár Index (CRI 0-100)
  const criData = useMemo(() => {
    if (!wardrobe || wardrobe.length === 0) {
      return { score: 0, readiness: 'Kezdő / Üres', levelColor: 'text-slate-400', progressColor: 'bg-slate-500' };
    }

    const topsCount = wardrobe.filter(w => w.category === 'tops' || (w.name || '').toLowerCase().includes('ing') || (w.name || '').toLowerCase().includes('póló')).length;
    const bottomsCount = wardrobe.filter(w => w.category === 'bottoms' || (w.name || '').toLowerCase().includes('nadrág')).length;
    const outerCount = wardrobe.filter(w => w.category === 'outerwear' || (w.name || '').toLowerCase().includes('zakó') || (w.name || '').toLowerCase().includes('kabát')).length;
    const shoesCount = wardrobe.filter(w => w.category === 'shoes' || (w.name || '').toLowerCase().includes('cipő') || (w.name || '').toLowerCase().includes('loafer')).length;

    let score = 30; // base score for having items

    // Ratio 3+ rule: at least 1 bottom per 3 tops
    if (bottomsCount > 0 && topsCount > 0) {
      const ratio = topsCount / bottomsCount;
      if (ratio <= 3.5) score += 20;
      else score += 10;
    }

    // Category coverage
    if (topsCount >= 3) score += 15;
    if (bottomsCount >= 2) score += 15;
    if (outerCount >= 1) score += 10;
    if (shoesCount >= 2) score += 10;

    // Quality/Condition penalty
    const wornCount = wardrobe.filter(w => w.condition && (w.condition.includes('Lecserélendő') || w.condition.includes('Javításra'))).length;
    score -= (wornCount * 5);

    const clampedScore = Math.max(10, Math.min(100, Math.round(score)));

    let readiness = 'Fejlesztendő alapok';
    let levelColor = 'text-amber-400';
    let progressColor = 'bg-amber-500';

    if (clampedScore >= 85) {
      readiness = 'Kiváló Kapszula Egyensúly';
      levelColor = 'text-emerald-400';
      progressColor = 'bg-emerald-500';
    } else if (clampedScore >= 65) {
      readiness = 'Jól variálható ruhatár';
      levelColor = 'text-[var(--accent-gold)]';
      progressColor = 'bg-[var(--accent-gold)]';
    }

    return { score: clampedScore, readiness, levelColor, progressColor, topsCount, bottomsCount, outerCount, shoesCount };
  }, [wardrobe]);

  const loadGaps = async (force = false) => {
    if (!force && gaps.length > 0) return;
    if (wardrobe.length === 0) return;
    setIsLoadingGaps(true);
    try {
      const results = await analyzeWardrobeGaps(wardrobe, profile);
      if (results && results.length > 0) {
        setGaps(results);
        localStorage.setItem('capsule_gaps_cache', JSON.stringify(results));
      }
    } catch (e) {
      console.error('Kapszula hiányelemzési hiba:', e);
    } finally {
      setIsLoadingGaps(false);
    }
  };

  useEffect(() => {
    if (wardrobe.length > 0 && gaps.length === 0) {
      loadGaps(false);
    }
  }, [wardrobe]);

  useEffect(() => {
    if (prevRulesKeyRef.current !== rulesKey) {
      prevRulesKeyRef.current = rulesKey;
      try { localStorage.removeItem('capsule_gaps_cache'); } catch (_) {}
      loadGaps(true);
    }
  }, [rulesKey]);

  const handleToggleWishlist = (gapId) => {
    setWishlistIds(prev => {
      const next = new Set(prev);
      if (next.has(gapId)) next.delete(gapId);
      else next.add(gapId);
      return next;
    });
  };

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
    <div className="space-y-6 animate-slide-up relative pb-16">
      
      {/* Interactive Onboarding Quick-Start Guide */}
      <OnboardingGuide 
        onNavigateTab={onNavigateTab || (() => {})} 
        onOpenAddModal={onAddNewItem} 
      />

      {/* Top Banner & Header */}
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

      {/* Capsule Ruhatár Index (CRI) Bar with Expandable Drawer */}
      <div className="glass-card p-4 sm:p-5 border-[var(--border-gold)]/45 bg-gradient-to-r from-[#0c1527]/95 via-[#080d1a]/95 to-black/90 shadow-xl space-y-3">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="badge badge-gold text-[10px]">Kapszula Ruhatár Index (CRI)</span>
              <span className={`text-xs font-bold ${criData.levelColor}`}>
                {criData.readiness}
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Kapszula egyensúly: <strong>{criData.score} / 100 pont</strong> • {criData.topsCount || 0} Felső / {criData.bottomsCount || 0} Nadrág / {criData.shoesCount || 0} Cipő
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsCriExpanded(!isCriExpanded);
              if (!isCriExpanded && gaps.length === 0) loadGaps(true);
            }}
            className="btn-secondary text-xs py-2 px-3 self-start sm:self-center flex items-center gap-1.5 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
            <span>{isCriExpanded ? 'Hiányelemző Becsukása' : 'Hiánypótló Kulcsdarabok'}</span>
            {isCriExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full h-2 rounded-full bg-black/60 overflow-hidden border border-white/10">
          <div 
            className={`h-full ${criData.progressColor} transition-all duration-700 shadow-sm`}
            style={{ width: `${criData.score}%` }}
          />
        </div>

        {/* Expandable Gap Analysis Drawer */}
        {isCriExpanded && (
          <div className="pt-3 border-t border-white/10 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-serif font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[var(--accent-gold)]" />
                <span>Kapszula Hiányelemzés & Piaci Keresőszintaxis</span>
                {gaps.length > 0 && (
                  <span className="badge badge-gold text-[10px] ml-1">
                    {gaps.length} db kulcsdarab
                  </span>
                )}
              </span>

              <button
                type="button"
                onClick={() => loadGaps(true)}
                disabled={isLoadingGaps}
                className="text-[11px] text-[var(--accent-gold)] hover:underline flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingGaps ? 'animate-spin' : ''}`} />
                <span>Újraelemzés</span>
              </button>
            </div>

            {isLoadingGaps ? (
              <div className="p-6 text-center space-y-2">
                <Loader2 className="w-6 h-6 text-[var(--accent-gold)] animate-spin mx-auto" />
                <p className="text-xs text-[var(--text-secondary)]">Gemini 3.7 Flash elemzi a hiányzó kulcsdarabokat...</p>
              </div>
            ) : gaps.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {gaps.map(gap => {
                  const isWishlisted = wishlistIds.has(gap.id);
                  const score = gap.priorityScore || 80;

                  return (
                    <div key={gap.id} className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-2.5 flex flex-col justify-between">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`badge text-[9px] font-bold ${
                            score >= 90 ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}>
                            {gap.priorityLevel || 'Kulcsdarab'} ({score}p)
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)] truncate">{gap.season || ''}</span>
                        </div>

                        <h4 className="text-xs font-bold text-white">{gap.title}</h4>
                        <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2">{gap.reason}</p>

                        <div className="bg-black/30 p-2 rounded-lg border border-white/5">
                          <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] block">Keresőszintaxis:</span>
                          <code className="text-[11px] text-[var(--accent-gold-light)] font-mono truncate block">
                            "{gap.searchKeywords}"
                          </code>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-white/5 flex items-center gap-2">
                        <a
                          href={`https://www.google.com/search?q=${encodeURIComponent(gap.searchKeywords)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-secondary text-[10px] py-1.5 px-2.5 flex-1 text-center flex items-center justify-center gap-1"
                        >
                          <span>Keresés</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <button
                          type="button"
                          onClick={() => onNavigateTab && onNavigateTab('advisor')}
                          className="btn-gold text-[10px] py-1.5 px-2.5 flex-1 flex items-center justify-center gap-1"
                        >
                          <span>Megvegyem?</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-[var(--text-muted)] italic">Nincs azonosított hiányzó kulcsdarab.</p>
            )}

          </div>
        )}

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

      {/* Grid of Clothing Items (2-Column Masonry on Mobile, 3-4 on Desktop) */}
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
                <div className="relative aspect-[4/3] w-full bg-[#07090e] p-2 flex items-center justify-center overflow-hidden">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    loading="lazy"
                    decoding="async"
                    width="320"
                    height="240"
                    style={{ aspectRatio: '4 / 3' }}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
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
      ) : wardrobe.length === 0 ? (
        <div className="glass-card p-8 sm:p-12 text-center space-y-5 border-[var(--border-gold)]/50 bg-gradient-to-b from-black/60 to-[var(--accent-gold-glow)]/10 max-w-xl mx-auto">
          <div className="w-16 h-16 rounded-full bg-[var(--accent-gold)]/20 border border-[var(--border-gold)] flex items-center justify-center mx-auto text-[var(--accent-gold)] shadow-lg">
            <Shirt className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-serif font-bold text-white">
              A digitális gardróbod még üres
            </h3>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
              Töltsd fel az első 3-5 ruhádat az <strong>aktuális szezonból</strong> (pl. kedvenc inged, zakód, nadrágod, cipőd), hogy az AI azonnal dolgozni tudjon velük!
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={onAddNewItem}
              className="btn-gold w-full sm:w-auto text-xs py-2.5 px-5 flex items-center justify-center gap-2 shadow"
            >
              <Plus className="w-4 h-4" />
              <span>Első Szezonális Ruha Feltöltése</span>
            </button>
          </div>
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

      {/* Floating Action Button (FAB) - Ergonomic Bottom-Right Action */}
      <div className="fixed bottom-20 sm:bottom-24 right-4 sm:right-8 z-30 pointer-events-none">
        <button
          type="button"
          onClick={onAddNewItem}
          className="pointer-events-auto btn-gold p-3.5 sm:px-5 sm:py-3.5 rounded-full shadow-[0_8px_30px_rgba(212,175,55,0.4)] flex items-center gap-2 transform hover:scale-105 active:scale-95 transition-all duration-200 group"
          title="Új Ruha Hozzáadása"
        >
          <Plus className="w-5 h-5 text-black group-hover:rotate-90 transition-transform duration-300" />
          <span className="hidden sm:inline font-serif font-bold text-black text-xs uppercase tracking-wider">
            Új Ruha
          </span>
        </button>
      </div>

    </div>
  );
}

