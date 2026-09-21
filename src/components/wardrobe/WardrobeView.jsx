import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Plus, Search, Shirt, Sparkles, AlertCircle, RefreshCw, 
  ChevronDown, ChevronUp, ExternalLink, ArrowRight, Loader2,
  Info
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { normalizeBrandName } from '../../services/webshop';
import { analyzeWardrobeGaps } from '../../services/gemini';
import ModuleFirstTimeGuide from '../common/ModuleFirstTimeGuide';

export default function WardrobeView({ onAddNewItem, onSelectItem, onNavigateTab }) {
  const { wardrobe, profile } = useAuth();

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSeason, setSelectedSeason] = useState('all');
  const [selectedCondition, setSelectedCondition] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [openDropdown, setOpenDropdown] = useState(null); // 'category' | 'season' | 'condition' | null
  const filterDropdownRef = useRef(null);

  // Click-outside listener for filter popovers
  useEffect(() => {
    function handleClickOutside(event) {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    }
    if (openDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [openDropdown]);

  // View mode and header states matching Mix & Match & Buy or Skip
  const [wardrobeViewMode, setWardrobeViewMode] = useState('grid'); // 'grid' | 'cri'
  const [showGuide, setShowGuide] = useState(false);

  // Wardrobe Index & Gap Analysis Drawer States (Strictly NO "kapszula" word)
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

  const rulesKey = (profile?.customStylingRules || []).join(';;');
  const prevRulesKeyRef = useRef(rulesKey);

  // Calculate Wardrobe Index (0-100) with English status labels
  const criData = useMemo(() => {
    if (!wardrobe || wardrobe.length === 0) {
      return { score: 0, readiness: 'Empty / Getting Started', levelColor: 'text-slate-400', progressColor: 'bg-slate-500' };
    }

    const topsCount = wardrobe.filter(w => w.category === 'tops' || (w.name || '').toLowerCase().includes('ing') || (w.name || '').toLowerCase().includes('póló')).length;
    const bottomsCount = wardrobe.filter(w => w.category === 'bottoms' || (w.name || '').toLowerCase().includes('nadrág') || (w.name || '').toLowerCase().includes('farmer')).length;
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

    let readiness = 'Building Foundations';
    let levelColor = 'text-amber-400';
    let progressColor = 'bg-amber-500';

    if (clampedScore >= 85) {
      readiness = 'Excellent Balance';
      levelColor = 'text-emerald-400';
      progressColor = 'bg-emerald-500';
    } else if (clampedScore >= 65) {
      readiness = 'Well-Versatile Wardrobe';
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
      console.error('Hiányelemzési hiba:', e);
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
    { id: 'repair', label: '🧵 Javításra vár' },
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
        matchCondition = Boolean(item.condition && item.condition.includes('Játszós'));
      } else if (selectedCondition === 'repair') {
        matchCondition = Boolean(item.condition && item.condition.includes('Javításra'));
      } else if (selectedCondition === 'replace') {
        matchCondition = Boolean(item.condition && item.condition.includes('Lecserélendő'));
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
    <div className="space-y-4 animate-fade-in relative pb-32">
      
      {/* ========================================================================= */}
      {/* 1. TOP HEADER BAR: EXACT 1-ROW MIX & MATCH / BUY OR SKIP DESIGN (STICKY) */}
      {/* ========================================================================= */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-3 sm:px-4 py-2.5 rounded-2xl bg-[#090d15]/95 border border-slate-800 shadow-xl backdrop-blur-md">
        
        {/* Left: Wardrobe badge, count & segmented view mode switch */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="px-3 py-1.5 rounded-xl bg-slate-200 text-slate-950 font-bold text-xs shadow-sm flex items-center gap-1.5 shrink-0">
            <span>🚪</span>
            <span>Wardrobe</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-200 font-mono ml-1">
              {wardrobe.length} pcs
            </span>
          </span>

          {/* Segmented View Switcher: Items | Wardrobe index */}
          <div className="hidden sm:flex items-center bg-[#0d121c] p-1 rounded-xl border border-slate-800 shrink-0">
            <button
              type="button"
              onClick={() => setWardrobeViewMode('grid')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                wardrobeViewMode === 'grid'
                  ? 'bg-slate-200 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Items</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setWardrobeViewMode('cri');
                setIsCriExpanded(true);
                if (gaps.length === 0) loadGaps(true);
              }}
              className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                wardrobeViewMode === 'cri'
                  ? 'bg-slate-200 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Wardrobe index</span>
            </button>
          </div>
        </div>

        {/* Right: + Add and Info Guide toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={onAddNewItem}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-white text-slate-950 font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
            title="Add new clothing item"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>

          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className={`p-2 rounded-xl border transition-colors cursor-pointer shrink-0 ${
              showGuide
                ? 'bg-slate-200 text-slate-900 border-white'
                : 'bg-[#0d121c] text-slate-400 hover:text-white border-slate-800'
            }`}
            title="Súgó / Információ"
            aria-label="Információ"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. REFINED MODULE FIRST TIME GUIDE (OPENED BY INFO BUTTON) */}
      {/* ========================================================================= */}
      {showGuide && (
        <ModuleFirstTimeGuide
          moduleId="wardrobe"
          title="Hogyan működik a Wardrobe nézet?"
          subtitle="Digitális ruhatár-menedzsment és ruhatár index elemzés"
          badgeText="Útmutató & Tippek"
          description="Itt kezelheted a rögzített ruhadarabjaidat, átláthatod a ruhatárad sokoldalúságát és felfedezheted az ajánlott kulcsdarabokat."
          points={[
            "1. Fotózás & Felvitel: Készíts képet, másolj be fotót vágólapról, vagy illessz be webshop linket/termékkódot az Add gombbal.",
            "2. Wardrobe Index: A rendszer valós időben értékeli (0–100) a ruhatárad variálhatóságát és a kategória-arányokat.",
            "3. Recommended Pieces: Az AI azonosítja a ruhatárból hiányzó darabokat, és konkrét piaci keresőszavakat javasol.",
            "4. Részletek & Szettépítés: Bármelyik darabra kattintva szerkesztheted az adatait, vagy kiinduló darabként használhatod az Outfit tervezőben."
          ]}
          forceOpen={true}
          onClose={() => setShowGuide(false)}
          wardrobeCount={wardrobe.length}
        />
      )}

      {/* ========================================================================= */}
      {/* 3. WARDROBE INDEX PANEL (STRICTLY NO KAPSZULA WORD, ENGLISH STATUSES) */}
      {/* ========================================================================= */}
      <div className="p-4 sm:p-5 rounded-3xl bg-[#0a0e17] border border-slate-800 shadow-2xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-slate-800 text-slate-200 border border-slate-700">
                Wardrobe Index
              </span>
              <span className={`text-xs font-bold ${criData.levelColor}`}>
                {criData.readiness}
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Wardrobe balance: <strong>{criData.score} / 100 pts</strong> • {criData.topsCount || 0} Tops / {criData.bottomsCount || 0} Bottoms / {criData.outerCount || 0} Outerwear / {criData.shoesCount || 0} Shoes
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsCriExpanded(!isCriExpanded);
              if (!isCriExpanded && gaps.length === 0) loadGaps(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-[#0d121c] hover:bg-slate-800 border border-slate-800 text-xs flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors cursor-pointer self-start sm:self-center shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>{isCriExpanded ? 'Close recommendations' : `Recommended pieces${gaps.length > 0 ? ` (${gaps.length})` : ''}`}</span>
            {isCriExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full h-2 rounded-full bg-black/60 overflow-hidden border border-slate-800">
          <div 
            className={`h-full ${criData.progressColor} transition-all duration-700 shadow-sm`}
            style={{ width: `${criData.score}%` }}
          />
        </div>

        {/* Expandable Recommendations Drawer */}
        {isCriExpanded && (
          <div className="pt-3 border-t border-slate-800 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-serif font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-sky-400" />
                <span>Search recommended pieces</span>
                {gaps.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-200 border border-slate-700 ml-1">
                    {gaps.length} pcs key pieces
                  </span>
                )}
              </span>

              <button
                type="button"
                onClick={() => loadGaps(true)}
                disabled={isLoadingGaps}
                className="text-[11px] text-slate-300 hover:text-white hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingGaps ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {isLoadingGaps ? (
              <div className="p-6 text-center space-y-2">
                <Loader2 className="w-6 h-6 text-slate-300 animate-spin mx-auto" />
                <p className="text-xs text-slate-400">Az AI elemzi az ajánlott darabokat...</p>
              </div>
            ) : gaps.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {gaps.map(gap => {
                  const score = gap.priorityScore || 80;

                  return (
                    <div key={gap.id} className="p-3.5 rounded-2xl bg-[#090d15] border border-slate-800 space-y-2.5 flex flex-col justify-between shadow">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`badge text-[9px] font-bold ${
                            score >= 90 ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}>
                            {score >= 90 ? 'Priority 1' : 'Key Piece'} ({score} pts)
                          </span>
                          <span className="text-[10px] text-slate-400 truncate">{gap.season || ''}</span>
                        </div>

                        <h4 className="text-xs font-bold text-white">{gap.title}</h4>
                        <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">{gap.reason}</p>

                        <div className="bg-[#0d121c] p-2 rounded-xl border border-slate-800">
                          <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold">Search keywords:</span>
                          <code className="text-[11px] text-amber-200 font-mono truncate block mt-0.5">
                            "{gap.searchKeywords}"
                          </code>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
                        <a
                          href={`https://www.google.com/search?q=${encodeURIComponent(gap.searchKeywords)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 rounded-xl bg-[#0d121c] hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-200 hover:text-white flex-1 text-center flex items-center justify-center gap-1 transition-colors"
                        >
                          <span>Search</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <button
                          type="button"
                          onClick={() => onNavigateTab && onNavigateTab('advisor')}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-200 hover:bg-white text-slate-950 font-bold text-[11px] flex-1 flex items-center justify-center gap-1 shadow transition-colors cursor-pointer"
                        >
                          <span>Buy or Skip</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Nincs azonosított hiányzó kulcsdarab.</p>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. FILTER & SEARCH BAR (POPOVER DROPDOWNS - ZERO HORIZONTAL SCROLL) */}
      {/* ========================================================================= */}
      <div 
        ref={filterDropdownRef}
        className="p-3 sm:p-4 rounded-3xl bg-[#0a0e17] border border-slate-800 space-y-3 shadow-2xl relative z-20"
      >
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            id="wardrobe-search-input"
            name="wardrobe-search"
            aria-label="Keresés a gardróbban"
            placeholder="Keresés szín, anyag, márka vagy stílus szerint (pl. 'lenvászon', 'sötétkék', 'loafer')..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#090d15] border border-slate-800 rounded-xl pl-10 pr-16 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-500 transition-colors"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white px-1.5 py-0.5 rounded cursor-pointer"
            >
              Törlés
            </button>
          )}
        </div>

        {/* 3 Dropdown Chips in a single clean row + Reset button */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          
          {/* 1. Category Dropdown Chip */}
          <div className="relative flex-1 min-w-[120px]">
            <button
              type="button"
              onClick={() => setOpenDropdown(prev => prev === 'category' ? null : 'category')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                selectedCategory !== 'all'
                  ? 'bg-slate-200 text-slate-950 border-slate-200 shadow-sm font-bold'
                  : 'bg-[#090d15] text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[11px] opacity-70">Kategória:</span>
                <span className="truncate">
                  {selectedCategory === 'all' 
                    ? 'Mind' 
                    : (categories.find(c => c.id === selectedCategory)?.label || 'Kategória').replace(/^[^\s]+\s/, '')}
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 shrink-0 ml-1 transition-transform ${openDropdown === 'category' ? 'rotate-180' : ''}`} />
            </button>

            {/* Category Dropdown Popover */}
            {openDropdown === 'category' && (
              <div className="absolute left-0 top-full mt-1.5 w-60 max-h-72 overflow-y-auto rounded-2xl bg-[#0d121c] border border-slate-700 shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800">
                  Válassz kategóriát
                </div>
                {categories.map(cat => {
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        setOpenDropdown(null);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-slate-800 text-white font-bold'
                          : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                      }`}
                    >
                      <span>{cat.label}</span>
                      {isSelected && <span className="text-emerald-400 text-xs">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Season Dropdown Chip */}
          <div className="relative flex-1 min-w-[110px]">
            <button
              type="button"
              onClick={() => setOpenDropdown(prev => prev === 'season' ? null : 'season')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                selectedSeason !== 'all'
                  ? 'bg-slate-200 text-slate-950 border-slate-200 shadow-sm font-bold'
                  : 'bg-[#090d15] text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[11px] opacity-70">Évszak:</span>
                <span className="truncate">
                  {selectedSeason === 'all' 
                    ? 'Mind' 
                    : (seasons.find(s => s.id === selectedSeason)?.label || 'Évszak').replace(/^[^\s]+\s/, '')}
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 shrink-0 ml-1 transition-transform ${openDropdown === 'season' ? 'rotate-180' : ''}`} />
            </button>

            {/* Season Dropdown Popover */}
            {openDropdown === 'season' && (
              <div className="absolute left-0 top-full mt-1.5 w-48 rounded-2xl bg-[#0d121c] border border-slate-700 shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800">
                  Válassz évszakot
                </div>
                {seasons.map(s => {
                  const isSelected = selectedSeason === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setSelectedSeason(s.id);
                        setOpenDropdown(null);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-slate-800 text-white font-bold'
                          : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                      }`}
                    >
                      <span>{s.label}</span>
                      {isSelected && <span className="text-emerald-400 text-xs">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. Condition Dropdown Chip */}
          <div className="relative flex-1 min-w-[110px]">
            <button
              type="button"
              onClick={() => setOpenDropdown(prev => prev === 'condition' ? null : 'condition')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                selectedCondition !== 'all'
                  ? selectedCondition === 'repair'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm font-bold'
                    : selectedCondition === 'replace'
                    ? 'bg-rose-500 text-white border-rose-400 shadow-sm font-bold'
                    : 'bg-slate-200 text-slate-950 border-slate-200 shadow-sm font-bold'
                  : 'bg-[#090d15] text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[11px] opacity-70">Állapot:</span>
                <span className="truncate">
                  {selectedCondition === 'all' 
                    ? 'Mind' 
                    : (conditions.find(c => c.id === selectedCondition)?.label || 'Állapot').replace(/^[^\s]+\s/, '')}
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 shrink-0 ml-1 transition-transform ${openDropdown === 'condition' ? 'rotate-180' : ''}`} />
            </button>

            {/* Condition Dropdown Popover */}
            {openDropdown === 'condition' && (
              <div className="absolute right-0 sm:left-0 top-full mt-1.5 w-56 rounded-2xl bg-[#0d121c] border border-slate-700 shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800">
                  Válassz állapotot
                </div>
                {conditions.map(c => {
                  const isSelected = selectedCondition === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedCondition(c.id);
                        setOpenDropdown(null);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-slate-800 text-white font-bold'
                          : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                      }`}
                    >
                      <span className={c.id === 'repair' ? 'text-amber-300' : c.id === 'replace' ? 'text-rose-300' : ''}>{c.label}</span>
                      {isSelected && <span className="text-emerald-400 text-xs">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Reset Filters Button if any active */}
          {(selectedCategory !== 'all' || selectedSeason !== 'all' || selectedCondition !== 'all' || searchQuery.trim().length > 0) && (
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('all');
                setSelectedSeason('all');
                setSelectedCondition('all');
                setSearchQuery('');
                setOpenDropdown(null);
              }}
              className="px-2.5 py-2 rounded-xl text-xs text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 transition-colors whitespace-nowrap cursor-pointer shrink-0"
              title="Minden szűrő visszaállítása"
            >
              Szűrők törlése
            </button>
          )}

        </div>

      </div>

      {/* ========================================================================= */}
      {/* 5. GRID OF CLOTHING ITEMS */}
      {/* ========================================================================= */}
      {filteredWardrobe.length > 0 ? (
        <div className={profile?.displayCompactCards 
          ? "grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3.5" 
          : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
        }>
          {filteredWardrobe.map(item => (
            <div
              key={item.id}
              onClick={() => onSelectItem(item)}
              className={`p-0 rounded-2xl bg-[#0a0e17] border border-slate-800 hover:border-slate-600 transition-all duration-300 overflow-hidden group cursor-pointer flex flex-col justify-between hover:scale-[1.02] shadow-lg hover:shadow-2xl`}
            >
              <div>
                {/* Image Container (Uncropped, Proportional object-contain) */}
                <div 
                  className={`relative aspect-[4/3] w-full flex items-center justify-center overflow-hidden ${
                    profile?.displayCompactCards ? 'p-1.5' : 'p-2'
                  }`} 
                  style={{ background: 'radial-gradient(circle at center, #2e3544 0%, #171b24 60%, #0a0c10 100%)' }}
                >
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
                  <span className={`absolute bg-black/75 backdrop-blur-md border border-white/10 text-white uppercase font-bold tracking-wider ${
                    profile?.displayCompactCards ? 'top-1.5 left-1.5 text-[8.5px] px-1.5 py-0.5 rounded' : 'top-2 left-2 text-[10px] px-2 py-0.5 rounded-lg'
                  }`}>
                    {item.category === 'outerwear' ? 'Zakó' : item.category === 'knitwear' ? 'Kötött' : item.category === 'tops' ? 'Felső' : item.category === 'bottoms' ? 'Nadrág' : item.category === 'shoes' ? 'Cipő' : item.category === 'skirts' ? 'Szoknya' : item.category}
                  </span>

                  {/* Condition Badge */}
                  {item.condition && (
                    <span className={`absolute bottom-1.5 right-1.5 font-bold px-1.5 py-0.5 rounded shadow ${
                      profile?.displayCompactCards ? 'text-[8px]' : 'text-[9px]'
                    } ${
                      item.condition.includes('Javításra')
                        ? 'bg-amber-600/90 text-white border border-amber-400/40'
                        : item.condition.includes('Lecserélendő')
                        ? 'bg-rose-500/80 text-white'
                        : item.condition.includes('Játszós')
                        ? 'bg-amber-500/80 text-black'
                        : 'bg-black/70 text-emerald-300'
                    }`}>
                      {item.condition.includes('Javításra') ? '🧵 Javításra vár' : item.condition.split('/')[0].trim()}
                    </span>
                  )}
                </div>

                {/* Card Info */}
                <div className={profile?.displayCompactCards ? 'p-2 space-y-1' : 'p-3.5 space-y-1.5'}>
                  <h3 className={`font-serif font-bold text-white line-clamp-1 group-hover:text-slate-200 transition-colors ${
                    profile?.displayCompactCards ? 'text-xs' : 'text-sm'
                  }`}>
                    {item.name}
                  </h3>

                  {/* Brand & Size Info */}
                  {(item.brand || item.size) && (
                    <div className="flex items-center justify-between text-[10.5px] text-slate-300 font-medium">
                      <span className="truncate">{item.brand || ''}</span>
                      {item.size && (
                        <span className="bg-white/10 px-1.5 py-0.5 rounded font-mono text-white text-[9.5px] shrink-0 font-bold">
                          {item.size}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10.5px] text-slate-400">
                    <span className="truncate">{item.material || 'Természetes'}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {item.colorHex && (
                        <span className="w-2.5 h-2.5 rounded-full border border-white/30" style={{ backgroundColor: item.colorHex }} />
                      )}
                      <span className="text-white text-[10.5px]">{item.color}</span>
                    </div>
                  </div>

                  {item.styleArchetype && !profile?.displayCompactCards && (
                    <span className="text-[10px] text-amber-200/90 block truncate font-medium">
                      ✦ {item.styleArchetype}
                    </span>
                  )}
                </div>
              </div>

              {!profile?.displayCompactCards && (
                <div className="p-3.5 pt-0 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800/80">
                  <span className="capitalize">{item.formality || 'Smart Casual'}</span>
                  <span className="text-slate-300 font-bold group-hover:text-white transition-colors">Részletek ➔</span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : wardrobe.length === 0 ? (
        <div className="p-8 sm:p-12 text-center space-y-5 rounded-3xl bg-[#0a0e17] border border-slate-800 max-w-xl mx-auto shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-slate-200 shadow-lg">
            <Shirt className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-serif font-bold text-white">
              A digitális gardróbod még üres
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Töltsd fel az első 3-5 ruhádat az <strong>aktuális szezonból</strong> (pl. kedvenc inged, zakód, nadrágod, cipőd), hogy az AI azonnal dolgozni tudjon velük!
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={onAddNewItem}
              className="px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-white text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow transition-all cursor-pointer w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Első Szezonális Ruha Feltöltése</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center space-y-4 rounded-3xl bg-[#0a0e17] border border-slate-800 shadow-xl">
          <Shirt className="w-12 h-12 text-slate-500 mx-auto opacity-50" />
          <div className="space-y-1">
            <h3 className="text-lg font-serif font-bold text-white">Nincs találat a szűrésre</h3>
            <p className="text-xs text-slate-400">Próbálj más kategóriát vagy szűrőt választani.</p>
          </div>
          <button
            onClick={() => {
              setSelectedCategory('all');
              setSelectedSeason('all');
              setSelectedCondition('all');
              setSearchQuery('');
            }}
            className="px-4 py-2 rounded-xl bg-[#0d121c] hover:bg-slate-800 border border-slate-800 text-xs text-slate-200 hover:text-white transition-colors cursor-pointer"
          >
            Szűrők Visszaállítása
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. FLOATING ACTION BUTTON (FAB) - ERGONOMIC BOTTOM-RIGHT ACTION */}
      {/* ========================================================================= */}
      <div className="fixed bottom-20 sm:bottom-24 right-4 sm:right-8 z-30 pointer-events-none">
        <button
          type="button"
          onClick={onAddNewItem}
          className="pointer-events-auto bg-slate-200 hover:bg-white text-slate-950 font-bold p-3.5 sm:px-5 sm:py-3.5 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.6)] border border-white/20 flex items-center gap-2 transform hover:scale-105 active:scale-95 transition-all duration-200 group cursor-pointer"
          title="Add Item"
        >
          <Plus className="w-5 h-5 text-slate-950 group-hover:rotate-90 transition-transform duration-300" />
          <span className="hidden sm:inline font-serif font-bold text-slate-950 text-xs uppercase tracking-wider">
            Add
          </span>
        </button>
      </div>

    </div>
  );
}
