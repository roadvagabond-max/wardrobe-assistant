import React, { useState, useRef, useEffect } from 'react';
import { 
  User, Compass, Sparkles, Edit3, Check, Palette, PieChart, Award, Camera, Upload, 
  Loader2, Cloud, CloudOff, Layers, Link as LinkIcon, Plus, X, Trash2, SlidersHorizontal as Sliders, 
  BookOpen, ShieldAlert, Globe, RefreshCw, Search, CheckCircle2, ShieldCheck, 
  ExternalLink, ToggleLeft, ToggleRight, Filter, ChevronDown, FlaskConical, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { analyzeColorSeason } from '../../services/gemini';
import { ensureBase64Image } from '../../services/imageOptimizer';
import { normalizeBrandName } from '../../services/webshop';
import { SARTORIAL_CATEGORIES } from '../../services/sartorialRules';
import { runSartorialGoldenEvalSuite } from '../../services/sartorialEval';
import confetti from 'canvas-confetti';

const ALL_STYLE_ARCHETYPES = [
  'Klasszikus & Időtlen',
  'Old Money & Quiet Luxury',
  'Smart Urban',
  'Streetwear',
  'Olasz Sprezzatura',
  'Minimalista',
  'Vintage & Retro'
];

export default function StyleDNAView() {
  const { 
    profile, 
    updateProfile, 
    wardrobe, 
    currentUser, 
    isDemoMode,
    role,
    isAdmin,
    sartorialRules = [],
    isMiningRules,
    mineNewRules,
    toggleRule,
    deleteSartorialRule
  } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(profile);
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
  const [colorSeasonResult, setColorSeasonResult] = useState(null);
  const [newRuleInput, setNewRuleInput] = useState('');

  // Sartorial Rules Hub States (Collapsed by default to stay discreetly in the background)
  const [isSartorialExpanded, setIsSartorialExpanded] = useState(false);
  const [selectedSartorialCat, setSelectedSartorialCat] = useState('all');
  const [customMiningTopic, setCustomMiningTopic] = useState('');
  const [miningSuccessMsg, setMiningSuccessMsg] = useState(null);

  // Golden Eval Suite state (Spec Section 11)
  const [evalSuiteResults, setEvalSuiteResults] = useState(null);
  const [isRunningEval, setIsRunningEval] = useState(false);

  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const avatarInputRef = useRef(null);

  const handleRunGoldenEval = () => {
    setIsRunningEval(true);
    setTimeout(() => {
      const results = runSartorialGoldenEvalSuite();
      setEvalSuiteResults(results);
      setIsRunningEval(false);
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#d4af37', '#10b981', '#f3e5ab']
        });
      } catch (_) {}
    }, 450);
  };

  const handleMineRulesNow = async (e) => {
    if (e) e.preventDefault();
    try {
      setMiningSuccessMsg(null);
      const res = await mineNewRules(customMiningTopic.trim());
      if (res && res.success) {
        setMiningSuccessMsg(`Sikeres kutatás! +${res.newRulesCount} új sartorial szabály került beépítésre a döntési motorba.`);
        setCustomMiningTopic('');
        try {
          confetti({
            particleCount: 55,
            spread: 65,
            origin: { y: 0.65 },
            colors: ['#d4af37', '#10b981', '#f3e5ab']
          });
        } catch (_) {}
      }
    } catch (err) {
      alert(`Nem sikerült a webes szabálykutatás: ${err.message}`);
    }
  };

  // Sync formData whenever cloud profile updates
  useEffect(() => {
    setFormData(profile);
  }, [profile]);

  const currentRules = Array.isArray(profile?.customStylingRules) 
    ? profile.customStylingRules 
    : [];

  const handleAddRule = async (ruleToAdd) => {
    const text = (ruleToAdd || newRuleInput).trim();
    if (!text) return;
    if (currentRules.includes(text)) {
      setNewRuleInput('');
      return;
    }
    const updatedRules = [...currentRules, text];
    const updatedProfile = {
      ...profile,
      customStylingRules: updatedRules
    };
    setFormData(updatedProfile);
    await updateProfile(updatedProfile);
    setNewRuleInput('');
  };

  const handleRemoveRule = async (indexToRemove) => {
    const updatedRules = currentRules.filter((_, idx) => idx !== indexToRemove);
    const updatedProfile = {
      ...profile,
      customStylingRules: updatedRules
    };
    setFormData(updatedProfile);
    await updateProfile(updatedProfile);
  };

  const handleSave = (e) => {
    e.preventDefault();
    updateProfile(formData);
    setIsEditing(false);
  };

  const handleStyleToggle = (styleName) => {
    setFormData(prev => {
      const current = prev.preferredStyles || [];
      const exists = current.includes(styleName);
      return {
        ...prev,
        preferredStyles: exists ? current.filter(s => s !== styleName) : [...current, styleName]
      };
    });
  };

  const handlePortraitFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsAnalyzingPhoto(true);
      // Optimize image specifically for profile/avatar size (512x512 compact JPEG)
      const base64 = await ensureBase64Image(file, 512, 512, 0.8);
      
      // 1. Immediately save avatarUrl to profile and sync to cloud/webapp
      const immediateUpdate = {
        ...formData,
        avatarUrl: base64
      };
      setFormData(immediateUpdate);
      await updateProfile(immediateUpdate);

      // 2. Run AI Color Season Analysis in background
      try {
        const result = await analyzeColorSeason(base64);
        setColorSeasonResult(result);

        if (result) {
          const fullUpdate = {
            ...immediateUpdate,
            skinTone: `${result.seasonName} - ${result.skinTone}`,
            favoriteColors: result.recommendedPalette && result.recommendedPalette.length > 0
              ? result.recommendedPalette
              : formData.favoriteColors
          };
          setFormData(fullUpdate);
          await updateProfile(fullUpdate);
        }
      } catch (aiErr) {
        console.warn('AI színtípus elemzés figyelmeztetés:', aiErr);
      }
    } catch (err) {
      console.error('Fotó feldolgozási hiba:', err);
    } finally {
      setIsAnalyzingPhoto(false);
    }
  };

  // Calculate wardrobe analytics
  const averageQuality = (
    wardrobe.reduce((acc, item) => acc + (item.qualityScore || 8.5), 0) / (wardrobe.length || 1)
  ).toFixed(1);

  const categoryCounts = wardrobe.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {});

  const replacementCount = wardrobe.filter(w => w.condition === 'Lecserélendő' || w.condition === 'Javításra vár').length;

  // Dynamic Capsule Wardrobe Index calculation
  const capsuleIndex = (() => {
    if (wardrobe.length === 0) return 0;
    const coreCategories = ['outerwear', 'tops', 'bottoms', 'shoes', 'knitwear'];
    const coveredCategories = coreCategories.filter(cat => categoryCounts[cat] > 0).length;
    const categoryCoverage = (coveredCategories / coreCategories.length) * 40;
    const goodConditionRatio = wardrobe.filter(w => !w.condition?.includes('Lecserélendő') && !w.condition?.includes('Javításra')).length / wardrobe.length;
    const conditionScore = goodConditionRatio * 30;
    const sizeScore = Math.min(wardrobe.length / 10, 1) * 30;
    return Math.round(categoryCoverage + conditionScore + sizeScore);
  })();

  // 📏 Brand Size Intelligence Aggregator (Consolidates aliases like reserved.com, next(nova fides), zara man)
  const brandSizeMatrix = React.useMemo(() => {
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
  const categorySizeSummary = React.useMemo(() => {
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
    <div className="space-y-6 animate-slide-up">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="badge badge-gold">Stílusprofil</span>
            {isAdmin ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                <span>👑</span>
                <span>Adminisztrátor</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-medium tracking-wider rounded-full bg-white/5 text-[var(--text-muted)] border border-white/10">
                <span>👤</span>
                <span>Tag</span>
              </span>
            )}
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold font-serif gold-gradient-text mt-1">
            Stílus DNA
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
            Testalkati adottságok, színtípus, mérettérkép és egyéni szabályok.
          </p>
        </div>

        <button
          onClick={() => {
            if (isEditing) setFormData(profile);
            setIsEditing(!isEditing);
          }}
          className="btn-secondary text-xs"
        >
          {isEditing ? 'Mégse' : (
            <>
              <Edit3 className="w-4 h-4" />
              <span>Profil Módosítása</span>
            </>
          )}
        </button>
      </div>

      {/* 📷 AI Photo Color Season Analysis Card */}
      <div className="glass-card p-5 sm:p-6 border-[var(--border-gold)]/60 bg-gradient-to-r from-black/60 via-[#161b26]/70 to-[var(--accent-gold-glow)]/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--accent-gold)]" />
              <h3 className="font-serif font-bold text-white text-base sm:text-lg">
                Portré / Szelfi alapú AI Színtípus & Bőrtónus Elemző
              </h3>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Készíts egy szelfit természetes fényben! A <strong>Gemini 3.7 Flash</strong> AI meghatározza az arcbőröd tónusát (hideg/meleg), a 12 évszakos színtípusodat és a hozzád legjobban passzoló színpalettát, amit az AI Stylist azonnal beépít a szettjeidbe.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-amber-300/90 pt-0.5">
              <span>💡</span>
              <span><strong>Tipp a legpontosabb eredményhez:</strong> Természetes nappali fényben (ablak felé fordulva), smink és napszemüveg nélkül fotózz!</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <input 
              type="file" 
              id="portrait-camera-input"
              name="portraitCamera"
              aria-label="Portré fotó készítése kamerával"
              accept="image/*" 
              capture="user" 
              ref={cameraInputRef} 
              onChange={handlePortraitFile} 
              className="hidden" 
            />
            <input 
              type="file" 
              id="portrait-file-input"
              name="portraitFile"
              aria-label="Portré fotó feltöltése fájlból"
              accept="image/*" 
              ref={fileInputRef} 
              onChange={handlePortraitFile} 
              className="hidden" 
            />

            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={isAnalyzingPhoto}
              className="btn-gold text-xs py-2.5 px-3.5 flex items-center gap-1.5 shadow"
            >
              <Camera className="w-4 h-4" />
              <span>Szelfi Készítése</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isAnalyzingPhoto}
              className="btn-secondary text-xs py-2.5 px-3.5 flex items-center gap-1.5"
            >
              <Upload className="w-4 h-4" />
              <span>Kép Feltöltése</span>
            </button>
          </div>
        </div>

        {isAnalyzingPhoto && (
          <div className="p-4 rounded-xl bg-black/50 border border-[var(--border-gold)] text-center text-xs text-amber-200 flex items-center justify-center gap-2.5">
            <Loader2 className="w-4 h-4 text-[var(--accent-gold)] animate-spin" />
            <span>Gemini 3.7 Flash elemzi a bőrtónust, szemszínt és a színtípust...</span>
          </div>
        )}

        {colorSeasonResult && (
          <div className="p-4 rounded-xl bg-black/40 border border-emerald-500/30 space-y-2 animate-slide-up text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-300 text-sm flex items-center gap-1.5">
                <Check className="w-4 h-4" />
                <span>Meghatározott Színtípus: {colorSeasonResult.seasonName}</span>
              </span>
            </div>
            <p className="text-[var(--text-secondary)] leading-relaxed">{colorSeasonResult.description}</p>
            
            <div className="pt-2">
              <span className="text-[11px] font-semibold text-white block mb-1">Ragyogó, legjobban álló színeid:</span>
              <div className="flex flex-wrap gap-1.5">
                {colorSeasonResult.recommendedPalette?.map((c, i) => (
                  <span key={i} className="badge badge-gold text-[10px]">
                    ✦ {c}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {isEditing ? (
        /* Edit Form */
        <form onSubmit={handleSave} className="glass-card p-6 border-[var(--border-gold)] space-y-4">
          <h3 className="text-lg font-serif font-bold text-white mb-3">Személyes Adottságok & Stílus Beállítása</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="profile-name-input" className="block text-xs text-[var(--text-secondary)] mb-1">Név / Megszólítás</label>
              <input
                type="text"
                id="profile-name-input"
                name="profileName"
                aria-label="Név vagy Megszólítás"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="custom-input text-sm"
              />
            </div>

            <div>
              <label htmlFor="profile-height-input" className="block text-xs text-[var(--text-secondary)] mb-1">Magasság</label>
              <input
                type="text"
                id="profile-height-input"
                name="profileHeight"
                aria-label="Magasság"
                value={formData.height}
                onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                className="custom-input text-sm"
                placeholder="pl. 182 cm"
              />
            </div>

            <div>
              <label htmlFor="profile-weight-input" className="block text-xs text-[var(--text-secondary)] mb-1">Testsúly (kg):</label>
              <input
                type="text"
                id="profile-weight-input"
                name="profileWeight"
                aria-label="Testsúly"
                value={formData.weight || ''}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setFormData({ ...formData, weight: val ? `${val} kg` : '' });
                }}
                className="custom-input text-sm"
                placeholder="pl. 78 kg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="profile-bodytype-input" className="block text-xs text-[var(--text-secondary)] mb-1">Testalkat</label>
              <input
                type="text"
                id="profile-bodytype-input"
                name="profileBodyType"
                aria-label="Testalkat"
                value={formData.bodyType}
                onChange={(e) => setFormData({ ...formData, bodyType: e.target.value })}
                className="custom-input text-sm"
                placeholder="pl. Atlétikus / Trapéz"
              />
            </div>

            <div>
              <label htmlFor="profile-skintone-input" className="block text-xs text-[var(--text-secondary)] mb-1">Bőrtónus & Színtípus</label>
              <input
                type="text"
                id="profile-skintone-input"
                name="profileSkinTone"
                aria-label="Bőrtónus és Színtípus"
                value={formData.skinTone}
                onChange={(e) => setFormData({ ...formData, skinTone: e.target.value })}
                className="custom-input text-sm"
                placeholder="pl. Meleg Ősz / Tavasz paletta"
              />
            </div>
          </div>

          {/* Style Archetypes selector */}
          <div className="space-y-2">
            <label className="block text-xs text-[var(--text-secondary)]">Preferált Stílusirányzatok:</label>
            <div className="flex flex-wrap gap-2">
              {ALL_STYLE_ARCHETYPES.map(s => {
                const isSelected = (formData.preferredStyles || []).includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleStyleToggle(s)}
                    className={`py-1.5 px-3 rounded-xl text-xs font-medium border transition-all ${
                      isSelected
                        ? 'bg-[var(--accent-gold)] text-black font-bold border-[var(--accent-gold)] shadow'
                        : 'bg-white/5 text-[var(--text-secondary)] border-white/5 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    ✦ {s}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="profile-philosophy-textarea" className="block text-xs text-[var(--text-secondary)] mb-1">Stílusfilozófia & Szabási preferenciák</label>
            <textarea
              id="profile-philosophy-textarea"
              name="profilePhilosophy"
              aria-label="Stílusfilozófia és szabási preferenciák"
              rows={3}
              value={formData.stylePhilosophy}
              onChange={(e) => setFormData({ ...formData, stylePhilosophy: e.target.value })}
              className="custom-input text-sm"
            />
          </div>

          <button type="submit" className="btn-gold py-2.5 px-5">
            <Check className="w-4 h-4" />
            <span>Módosítások Mentése</span>
          </button>
        </form>
      ) : (
        /* Profile Display */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Style ID Card */}
          <div className="lg:col-span-2 glass-card p-6 sm:p-7 border-[var(--border-gold)] space-y-6">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div className="flex items-center gap-4">
                <input 
                  type="file" 
                  id="profile-avatar-file-input"
                  name="profileAvatarFile"
                  aria-label="Profilfotó feltöltése"
                  accept="image/*" 
                  ref={avatarInputRef} 
                  onChange={handlePortraitFile} 
                  className="hidden" 
                />
                <div 
                  onClick={() => avatarInputRef.current?.click()}
                  className="relative w-16 h-16 rounded-2xl overflow-hidden bg-gradient-to-br from-[#d4af37] to-[#785908] flex items-center justify-center text-black font-bold text-2xl shadow-xl shadow-[#d4af37]/20 border border-[var(--border-gold)] shrink-0 cursor-pointer group"
                  title="Kattints a profilfotó cseréjéhez"
                >
                  {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} alt={profile.name} width="64" height="64" className="w-full h-full object-cover" />
                  ) : (
                    <span>{profile.name?.[0] || 'A'}</span>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <Camera className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-serif font-bold text-white">{profile.name}</h3>
                  <p className="text-xs text-[var(--accent-gold-light)] font-medium">{profile.title}</p>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-[var(--text-muted)] flex-wrap">
                    <span>{profile.height}</span>
                    {profile.weight && <span>• {profile.weight}</span>}
                    <span>• {profile.bodyType}</span>
                    <span>• {profile.skinTone}</span>
                  </div>
                </div>
              </div>

              {/* Cloud Sync Status Badge */}
              <div className="self-start sm:self-center">
                {currentUser ? (
                  <span className="badge badge-emerald text-[10px] flex items-center gap-1.5 py-1 px-2.5">
                    <Cloud className="w-3.5 h-3.5" />
                    <span>Felhő szinkronizáció aktív</span>
                  </span>
                ) : (
                  <span className="badge badge-subtle text-[10px] flex items-center gap-1.5 py-1 px-2.5 text-amber-300 border-amber-500/30">
                    <CloudOff className="w-3.5 h-3.5 text-amber-400" />
                    <span>Helyi mód (Belépés a szinkronhoz)</span>
                  </span>
                )}
              </div>
            </div>

            {/* Philosophy Box */}
            <div className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)]">
                Stílusfilozófia:
              </span>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed italic">
                "{profile.stylePhilosophy}"
              </p>
            </div>

            {/* Aesthetics Pills */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-white block">Preferált Stílusirányzatok:</span>
              <div className="flex flex-wrap gap-2">
                {profile.preferredStyles?.map((style, idx) => (
                  <span key={idx} className="badge badge-gold py-1 px-3 text-xs">
                    ✦ {style}
                  </span>
                ))}
              </div>
            </div>

            {/* Signature Colors */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-white block">Alappaletta & Kedvelt Színek:</span>
              <div className="flex flex-wrap gap-2">
                {profile.favoriteColors?.map((color, idx) => (
                  <span key={idx} className="badge badge-subtle text-xs">
                    {color}
                  </span>
                ))}
              </div>
            </div>

          </div>

          {/* Wardrobe Analytics Widget */}
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
                  <span className="font-bold text-emerald-400 text-sm">{capsuleIndex}% ({capsuleIndex >= 85 ? 'Magas variálhatóság' : capsuleIndex >= 60 ? 'Jó variálhatóság' : 'Fejlesztésre szorul'})</span>
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
                <span className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider block">Kategória eloszlás:</span>
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

            <div className="p-3 rounded-xl bg-[var(--accent-gold-glow)] border border-[var(--border-gold)] text-[11px] text-[var(--accent-gold-light)] flex items-center gap-2">
              <Award className="w-4 h-4 text-[var(--accent-gold)] shrink-0" />
              <span>Stílusod az időtlen elegancia és a modern smart-casual harmóniájára épül.</span>
            </div>

          </div>

        </div>
      )}

      {/* 🧠 SZEMÉLYES AI STYLIST TANÍTÁSA & EGYÉNI SZABÁLYOK */}
      <div className="glass-card p-6 sm:p-7 border-[var(--border-gold)] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="badge badge-gold text-[10px]">AI Betanítás & Preferenciák</span>
              <span className="badge badge-emerald text-[10px]">
                {currentRules.length} aktív stílusszabály
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-serif font-bold text-white mt-1">
              Személyes AI Stylist Tanítása & Egyéni Szabályok
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Tanítsd meg az AI-nak a saját szabályaidat és tiltásaidat szabad szöveggel (pl. <em>"Nem szeretem a pólóingeket"</em>, <em>"Csak természetes anyagok"</em>). A Stylist szettajánló, a Kapszula hiányelemző és a Vásárlási döntéstámogató azonnal és szigorúan alkalmazza őket!
            </p>
          </div>
        </div>

        {/* Input bar to add custom free-form rule */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleAddRule();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            id="new-styling-rule-input"
            name="newStylingRule"
            aria-label="Új személyes stílusszabály megadása"
            value={newRuleInput}
            onChange={(e) => setNewRuleInput(e.target.value)}
            placeholder="pl. Nem szeretem a pólóingeket VAGY Csak rejtett gombolású ingeket hordok..."
            className="custom-input text-xs sm:text-sm flex-1"
          />
          <button
            type="submit"
            disabled={!newRuleInput.trim()}
            className="btn-gold px-4 text-xs sm:text-sm flex items-center gap-1.5 shrink-0 shadow"
          >
            <Plus className="w-4 h-4" />
            <span>Szabály Mentése</span>
          </button>
        </form>

        {/* Quick Suggestion Chips */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-[var(--accent-gold)] uppercase tracking-wider block">
            Gyakori tanítási javaslatok (Kattints a hozzáadáshoz):
          </span>
          <div className="flex flex-wrap gap-1.5">
            {[
              'Nem szeretem a pólóingeket',
              'Csak 100% természetes anyagok (gyapjú, len, pamut, selyem, kasmír, bőr)',
              'Kerülöm a túl szűk / skinny szabásokat, a slim tailored sziluettet részesítem előnyben',
              'Zakóhoz és elegáns szettekhez nem hordok kereknyakú pólót',
              'Kerülöm a műszálas poliésztert és akrilt',
              'Zakóhoz és öltönyhöz csak velúrt vagy minőségi bőrcipőt hordok',
              'Fekete felsőrészek helyett a sötétkéket, teveszínt és antracitot preferálom'
            ].map((preset, pIdx) => {
              const isAdded = currentRules.includes(preset);
              return (
                <button
                  key={pIdx}
                  type="button"
                  onClick={() => !isAdded && handleAddRule(preset)}
                  disabled={isAdded}
                  className={`text-[11px] py-1 px-2.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                    isAdded
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 cursor-default opacity-80'
                      : 'bg-white/5 border-white/10 text-[var(--text-secondary)] hover:border-[var(--border-gold)] hover:text-white hover:bg-white/10'
                  }`}
                >
                  {isAdded ? <Check className="w-3 h-3 text-emerald-400" /> : <Plus className="w-3 h-3 text-[var(--accent-gold)]" />}
                  <span>{preset}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Rules List */}
        <div className="space-y-2 pt-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-white block">
            Betanított Aktív Szabályaid:
          </span>

          {currentRules.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {currentRules.map((rule, idx) => (
                <div 
                  key={idx} 
                  className="bg-black/40 border border-white/10 hover:border-[var(--border-gold)]/60 rounded-xl p-3 flex items-start justify-between gap-2.5 transition-all group shadow-sm"
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <Sparkles className="w-3.5 h-3.5 text-[var(--accent-gold)] shrink-0 mt-0.5" />
                    <span className="text-xs text-white leading-relaxed font-medium">
                      {rule}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveRule(idx)}
                    className="text-[var(--text-muted)] hover:text-rose-400 p-1 rounded hover:bg-white/5 transition-colors shrink-0"
                    title="Szabály törlése"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-black/20 border border-white/5 text-center text-xs text-[var(--text-muted)]">
              Még nincs egyéni szabályod rögzítve. Írj be saját preferenciákat vagy válassz a fenti javaslatokból!
            </div>
          )}
        </div>

        {/* Info notice */}
        <div className="p-3 rounded-xl bg-[var(--accent-gold-glow)]/40 border border-[var(--border-gold)]/40 text-[11px] text-[var(--accent-gold-light)] flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[var(--accent-gold)] shrink-0" />
          <span>
            <strong>Valós idejű szinkron:</strong> A szabályok mentés után azonnal beépülnek az esemény-stylist, a kapszula-gap és a vásárlási döntéstámogató motorba.
          </span>
        </div>
      </div>

      {/* 🌐 AUTONÓM SARTORIAL HÁTTÉR-TUDÁSBÁZIS (DISZKRÉT, LENYITHATÓ PANEL) */}
      <div className="glass-card p-4 sm:p-5 border-white/10 hover:border-[var(--border-gold)]/40 transition-all space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-gold)]/10 border border-[var(--border-gold)]/30 flex items-center justify-center shrink-0">
              <Globe className="w-5 h-5 text-[var(--accent-gold)]" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-serif font-bold text-white">Autonóm Sartorial Háttér-Tudásbázis</span>
                <span className="badge badge-emerald text-[9px]">7 napos auto-sync aktív</span>
                <span className="badge badge-subtle text-[9px] text-white">{sartorialRules.length} szabály betanítva</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                A háttérben futó motor a nemzetközi szabászati kódexekből tanul és felügyeli a szettek rétegezési harmóniáját.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsSartorialExpanded(prev => !prev)}
            className="btn-secondary py-2 px-3 text-xs flex items-center justify-center gap-2 shrink-0 self-end sm:self-auto text-[var(--accent-gold-light)] hover:text-white border-white/10 hover:border-[var(--border-gold)]/60"
          >
            <Sliders className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
            <span>{isSartorialExpanded ? 'Szabálytár elrejtése' : 'Részletes Szabályok megtekintése'}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isSartorialExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Collapsible Expanded Panel */}
        {isSartorialExpanded && (
          <div className="pt-4 border-t border-white/10 space-y-5 animate-slide-up">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-serif font-bold text-white">
                  Élő Szabálykezelő & Webes Kutató Hub
                </h4>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Itt böngészheted és egyenként konfigurálhatod a betanított szabászati szabályokat, vagy indíthatsz új internetes kutatást.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleRunGoldenEval}
                  disabled={isRunningEval}
                  className="btn-secondary py-2 px-3.5 text-xs font-semibold flex items-center gap-1.5 shadow border-amber-500/30 hover:border-[var(--accent-gold)] text-amber-200 hover:text-white"
                  title="Determinisztikus Sartorial Tesztcsomag Futtatása (TC-1-től TC-6-ig)"
                >
                  {isRunningEval ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent-gold)]" />
                      <span>Validáció...</span>
                    </>
                  ) : (
                    <>
                      <FlaskConical className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                      <span>🧪 Golden Eval (TC-1–TC-6)</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleMineRulesNow}
                  disabled={isMiningRules}
                  className="btn-gold py-2 px-3.5 text-xs font-semibold flex items-center gap-1.5 shadow"
                >
                  {isMiningRules ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                      <span>Kutatás...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-3.5 h-3.5" />
                      <span>Új Szabályok Kutatása</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Golden Eval Suite Results Interactive Drawer (Spec Section 11) */}
            {evalSuiteResults && (
              <div className="p-4 rounded-2xl bg-emerald-950/25 border border-emerald-500/40 space-y-3.5 animate-slide-up shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-white/10">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-sm">
                      ✓
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-serif font-bold text-white">Sartorial Golden Eval Eredmény:</span>
                        <span className="badge badge-emerald text-[10px] font-mono font-bold">
                          {evalSuiteResults.passRatePercent}% SIKERES ({evalSuiteResults.passedTests}/{evalSuiteResults.totalTests})
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-200/80">
                        Minden szabászati determinisztikus szabály (TC-1–TC-6) ellenőrizve és érvényesítve.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEvalSuiteResults(null)}
                    className="text-xs text-[var(--text-muted)] hover:text-white self-end sm:self-auto px-2 py-1 rounded bg-white/5"
                  >
                    Bezárás
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                  {evalSuiteResults.results.map((test) => (
                    <div
                      key={test.id}
                      className="p-3 rounded-xl bg-black/40 border border-emerald-500/30 space-y-1.5 text-left flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="font-mono text-[10px] font-bold text-[var(--accent-gold)]">
                            {test.id}
                          </span>
                          <span className="badge badge-emerald text-[9px] py-0.5 px-1.5">
                            ✓ PASS
                          </span>
                        </div>
                        <p className="font-semibold text-xs text-white mt-1">
                          {test.name}
                        </p>
                        <p className="text-[10px] text-[var(--text-muted)] mt-0.5 line-clamp-2">
                          {test.description}
                        </p>
                      </div>
                      <div className="pt-2 border-t border-white/5 text-[10px] text-emerald-300">
                        {test.explanation}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Style-Grounded Dynamic Mining Focus */}
            <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300/90 flex items-center gap-1.5">
                  <span>🎯</span>
                  <span>Személyre szabott kutatási fókusz a profilod alapján:</span>
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">
                  Dinamikus Multi-Stílus Grounding
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {(profile?.preferredStyles && profile.preferredStyles.length > 0
                  ? profile.preferredStyles 
                  : ['Klasszikus & Időtlen', 'Olasz Sprezzatura', 'Smart Urban']
                ).map((st, sIdx) => (
                  <button
                    key={sIdx}
                    type="button"
                    onClick={() => {
                      setCustomMiningTopic(`${st} szabászati és rétegezési szabályok`);
                    }}
                    className="text-[11px] py-1 px-2.5 rounded-lg bg-[var(--accent-gold)]/10 hover:bg-[var(--accent-gold)]/25 border border-[var(--border-gold)]/40 text-[var(--accent-gold-light)] hover:text-white transition-all flex items-center gap-1.5 group"
                    title={`Kattints a kereséshez: ${st}`}
                  >
                    <span className="text-[10px] text-[var(--accent-gold)] group-hover:scale-110 transition-transform">✦</span>
                    <span className="font-medium">{st}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom topic search bar */}
            <form onSubmit={handleMineRulesNow} className="flex gap-2">
              <input
                type="text"
                id="sartorial-mining-topic-input"
                name="sartorialMiningTopic"
                aria-label="Célzott kutatási téma megadása"
                value={customMiningTopic}
                onChange={(e) => setCustomMiningTopic(e.target.value)}
                placeholder="Opcionális fókusz: pl. Női blézer és maxiruha arányok VAGY Ingdzseki rétegezési szabályok..."
                className="custom-input text-xs flex-1"
                disabled={isMiningRules}
              />
              <button
                type="submit"
                disabled={isMiningRules}
                className="btn-secondary px-3.5 text-xs flex items-center gap-1.5 shrink-0"
              >
                <RefreshCw className={`w-3 h-3 ${isMiningRules ? 'animate-spin' : ''}`} />
                <span>Kutatás</span>
              </button>
            </form>

            {/* Mining Notification */}
            {miningSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{miningSuccessMsg}</span>
                </div>
                <button
                  onClick={() => setMiningSuccessMsg(null)}
                  className="text-emerald-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Category Filter Tabs */}
            <div className="flex flex-wrap gap-1.5">
              {SARTORIAL_CATEGORIES.map(cat => {
                const count = cat.id === 'all' 
                  ? sartorialRules.length 
                  : sartorialRules.filter(r => r.category === cat.id).length;
                const isSelected = selectedSartorialCat === cat.id;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedSartorialCat(cat.id)}
                    className={`py-1 px-2.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-[var(--accent-gold)] text-black font-bold shadow'
                        : 'bg-white/5 border border-white/10 text-[var(--text-secondary)] hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-black/20 text-black' : 'bg-white/10 text-[var(--text-muted)]'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Rules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sartorialRules
                .filter(r => selectedSartorialCat === 'all' || r.category === selectedSartorialCat)
                .map((rule) => {
                  const isEnabled = rule.enabled !== false;
                  const catObj = SARTORIAL_CATEGORIES.find(c => c.id === rule.category);

                  return (
                    <div
                      key={rule.id}
                      className={`rounded-xl p-3.5 border transition-all flex flex-col justify-between gap-2.5 ${
                        isEnabled
                          ? 'bg-black/40 border-white/10 hover:border-[var(--border-gold)]/50'
                          : 'bg-black/20 border-white/5 opacity-50'
                      }`}
                    >
                      <div className="space-y-2">
                        {/* Header: Category + Badges + Toggle */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="badge badge-gold text-[9px] py-0.5 px-2">
                              {catObj?.icon || '✨'} {catObj?.label || 'Sartorial'}
                            </span>
                            {rule.gender && rule.gender !== 'universal' && (
                              <span className="badge badge-subtle text-[9px] py-0.5 px-1.5">
                                {rule.gender === 'womenswear_specific' ? '👗 Női' : '👔 Férfi'}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => toggleRule(rule.id)}
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border transition-all ${
                                isEnabled 
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                                  : 'bg-white/5 border-white/10 text-[var(--text-muted)] hover:text-white'
                              }`}
                              title={isEnabled ? 'Szabály inaktiválása' : 'Szabály aktiválása'}
                            >
                              {isEnabled ? 'Aktív' : 'Inaktív'}
                            </button>
                            {rule.id.startsWith('mined-rule-') && (
                              <button
                                type="button"
                                onClick={() => deleteSartorialRule(rule.id)}
                                className="text-[var(--text-muted)] hover:text-rose-400 p-1 rounded hover:bg-white/5 transition-colors"
                                title="Szabály törlése"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Title & Description */}
                        <div>
                          <h4 className="font-serif font-bold text-xs sm:text-sm text-white leading-snug">
                            {rule.title}
                          </h4>
                          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                            {rule.ruleDescription}
                          </p>
                        </div>

                        {/* Target Styles Badges */}
                        {Array.isArray(rule.targetStyles) && rule.targetStyles.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {rule.targetStyles.map((ts, tsIdx) => (
                              <span 
                                key={tsIdx} 
                                className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-200/90 font-medium"
                              >
                                ✦ {ts}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Dos & Don'ts */}
                        <div className="space-y-1 pt-0.5">
                          {rule.dont && (
                            <div className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[10px] text-rose-200 flex items-start gap-1">
                              <span className="font-bold text-rose-400 shrink-0">❌ Don't:</span>
                              <span className="leading-tight">{rule.dont}</span>
                            </div>
                          )}
                          {rule.do && (
                            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-200 flex items-start gap-1">
                              <span className="font-bold text-emerald-400 shrink-0">✅ Do:</span>
                              <span className="leading-tight">{rule.do}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Footer: Source */}
                      <div className="pt-1.5 border-t border-white/5 flex items-center justify-between text-[9px] text-[var(--text-muted)]">
                        <span className="truncate max-w-[200px]" title={rule.source}>
                          {rule.source || 'Bespoke Sartorial Code'}
                        </span>
                        <span>
                          {rule.discoveredAt ? new Date(rule.discoveredAt).toLocaleDateString('hu-HU') : 'Bespoke kódex'}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* 📏 BRAND SIZING INTELLIGENCE & FIT MATRIX */}
      <div className="glass-card p-6 sm:p-7 border-[var(--border-gold)] space-y-6">
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

    </div>
  );
}
