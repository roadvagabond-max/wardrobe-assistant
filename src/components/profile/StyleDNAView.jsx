import React, { useState } from 'react';
import { User, Compass, Sparkles, Edit3, Check, Palette, Ruler, PieChart, Award, Heart, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

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
  const { profile, updateProfile, wardrobe } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(profile);

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

  // Calculate wardrobe analytics
  const averageQuality = (
    wardrobe.reduce((acc, item) => acc + (item.qualityScore || 8.5), 0) / (wardrobe.length || 1)
  ).toFixed(1);

  const categoryCounts = wardrobe.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {});

  const replacementCount = wardrobe.filter(w => w.condition === 'Lecserélendő' || w.condition === 'Javításra vár').length;

  return (
    <div className="space-y-6 animate-slide-up">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="badge badge-gold">Személyes Stílustérkép</span>
          <h2 className="text-2xl sm:text-3xl font-bold font-serif gold-gradient-text mt-1">
            Stílus DNA & Profil
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Az AI a preferenciáidból, testalkatodból és a gardróbod valós darabjaiból tanul.
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

      {isEditing ? (
        /* Edit Form */
        <form onSubmit={handleSave} className="glass-card p-6 border-[var(--border-gold)] space-y-4">
          <h3 className="text-lg font-serif font-bold text-white mb-3">Személyes Adottságok & Stílus Beállítása</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">Név / Megszólítás</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="custom-input text-sm"
              />
            </div>

            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">Magasság</label>
              <input
                type="text"
                value={formData.height}
                onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                className="custom-input text-sm"
                placeholder="pl. 182 cm"
              />
            </div>

            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">Testsúly (opcionális)</label>
              <input
                type="text"
                value={formData.weight || ''}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                className="custom-input text-sm"
                placeholder="pl. 78 kg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">Testalkat</label>
              <input
                type="text"
                value={formData.bodyType}
                onChange={(e) => setFormData({ ...formData, bodyType: e.target.value })}
                className="custom-input text-sm"
                placeholder="pl. Atlétikus / Trapéz"
              />
            </div>

            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">Bőrtónus & Színtípus</label>
              <input
                type="text"
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
            <label className="block text-xs text-[var(--text-secondary)] mb-1">Stílusfilozófia & Szabási preferenciák</label>
            <textarea
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
            
            <div className="flex items-center gap-4 pb-4 border-b border-white/10">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#d4af37] to-[#785908] flex items-center justify-center text-black font-bold text-2xl shadow-xl shadow-[#d4af37]/20">
                {profile.name?.[0] || 'A'}
              </div>
              <div>
                <h3 className="text-xl font-serif font-bold text-white">{profile.name}</h3>
                <p className="text-xs text-[var(--accent-gold-light)] font-medium">{profile.title}</p>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-[var(--text-muted)]">
                  <span>{profile.height}</span>
                  {profile.weight && <span>• {profile.weight}</span>}
                  <span>• {profile.bodyType}</span>
                  <span>• {profile.skinTone}</span>
                </div>
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
                  <span className="font-bold text-emerald-400 text-sm">92% (Magas variálhatóság)</span>
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

    </div>
  );
}
