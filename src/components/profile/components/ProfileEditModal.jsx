import React, { useState, useEffect } from 'react';
import { X, Check, Sparkles, User, ThermometerSnowflake, Sun, Scale } from 'lucide-react';

const ALL_STYLE_ARCHETYPES = [
  'Klasszikus & Időtlen',
  'Old Money & Quiet Luxury',
  'Smart Urban',
  'Streetwear',
  'Olasz Sprezzatura',
  'Minimalista',
  'Vintage & Retro'
];

const BODY_TYPE_PRESETS = [
  'Atlétikus / Trapéz (V-alak)',
  'Slim / Karcsú',
  'Normál / Átlagos',
  'Erős / Zömök',
  'Homokóra'
];

export default function ProfileEditModal({ 
  isOpen, 
  onClose, 
  initialProfile, 
  onSave 
}) {
  const [formData, setFormData] = useState(initialProfile || {});

  useEffect(() => {
    if (initialProfile) {
      setFormData(initialProfile);
    }
  }, [initialProfile, isOpen]);

  if (!isOpen) return null;

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

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div 
        className="relative w-full max-w-2xl bg-[#12161f] border border-[var(--border-gold)] rounded-2xl shadow-2xl p-5 sm:p-7 space-y-5 my-8 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <span className="badge badge-gold text-[10px]">Profil Beállítások</span>
            <h3 className="text-xl sm:text-2xl font-serif font-bold text-white mt-1">
              Személyes Adottságok & Stílus Módosítása
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
          
          {/* Row 1: Name & Gender */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label htmlFor="modal-profile-name" className="block text-xs text-[var(--text-secondary)] mb-1 font-medium">
                Név / Megszólítás:
              </label>
              <input
                type="text"
                id="modal-profile-name"
                name="profileName"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="custom-input text-xs sm:text-sm"
                placeholder="pl. Attila"
              />
            </div>

            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1 font-medium">
                Nem:
              </label>
              <div className="grid grid-cols-2 gap-1">
                {['Férfi', 'Női'].map(g => {
                  const isSel = (formData.gender || 'Férfi') === g;
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setFormData({ ...formData, gender: g })}
                      className={`py-2 px-1 text-center rounded-xl text-xs font-semibold border transition-all ${
                        isSel
                          ? 'bg-[var(--accent-gold)] text-black border-[var(--accent-gold)] shadow'
                          : 'bg-white/5 text-[var(--text-secondary)] border-white/10 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {g === 'Férfi' ? '👔 Férfi' : '👗 Női'}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Row 2: Birth Year & Measurements */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="modal-profile-birthyear" className="block text-xs text-[var(--text-secondary)] mb-1 font-medium flex items-center justify-between">
                <span>Születési év:</span>
                {formData.birthYear && (
                  <span className="text-[10px] text-[var(--accent-gold)] font-bold">
                    {new Date().getFullYear() - parseInt(formData.birthYear, 10)} éves
                  </span>
                )}
              </label>
              <input
                type="number"
                id="modal-profile-birthyear"
                name="profileBirthYear"
                min="1910"
                max={new Date().getFullYear()}
                value={formData.birthYear || ''}
                onChange={(e) => setFormData({ ...formData, birthYear: e.target.value })}
                className="custom-input text-xs sm:text-sm"
                placeholder="pl. 1992"
              />
            </div>

            <div>
              <label htmlFor="modal-profile-height" className="block text-xs text-[var(--text-secondary)] mb-1 font-medium">
                Magasság:
              </label>
              <input
                type="text"
                id="modal-profile-height"
                name="profileHeight"
                value={formData.height || ''}
                onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                className="custom-input text-xs sm:text-sm"
                placeholder="pl. 182 cm"
              />
            </div>

            <div>
              <label htmlFor="modal-profile-weight" className="block text-xs text-[var(--text-secondary)] mb-1 font-medium">
                Testsúly (kg):
              </label>
              <input
                type="text"
                id="modal-profile-weight"
                name="profileWeight"
                value={formData.weight || ''}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setFormData({ ...formData, weight: val ? `${val} kg` : '' });
                }}
                className="custom-input text-xs sm:text-sm"
                placeholder="pl. 78 kg"
              />
            </div>
          </div>

          {/* Row 3: Body Type Presets & Custom Input */}
          <div className="space-y-1.5">
            <label className="block text-xs text-[var(--text-secondary)] font-medium">
              Testalkat & Sziluett:
            </label>
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {BODY_TYPE_PRESETS.map(preset => {
                const isSel = formData.bodyType === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setFormData({ ...formData, bodyType: preset })}
                    className={`py-1 px-2.5 rounded-lg text-xs font-medium border transition-all ${
                      isSel
                        ? 'bg-[var(--accent-gold)]/20 text-[var(--accent-gold-light)] border-[var(--border-gold)] font-bold'
                        : 'bg-white/5 text-[var(--text-secondary)] border-white/5 hover:bg-white/10'
                    }`}
                  >
                    {preset}
                  </button>
                );
              })}
            </div>
            <input
              type="text"
              id="modal-profile-bodytype"
              name="profileBodyType"
              value={formData.bodyType || ''}
              onChange={(e) => setFormData({ ...formData, bodyType: e.target.value })}
              className="custom-input text-xs sm:text-sm"
              placeholder="Vagy írd be egyedileg: pl. Atlétikus, széles vállak, vékony derék"
            />
          </div>

          {/* Row 4: Skin Tone & Color Season string */}
          <div>
            <label htmlFor="modal-profile-skintone" className="block text-xs text-[var(--text-secondary)] mb-1 font-medium">
              Bőrtónus & Színtípus megnevezése:
            </label>
            <input
              type="text"
              id="modal-profile-skintone"
              name="profileSkinTone"
              value={formData.skinTone || ''}
              onChange={(e) => setFormData({ ...formData, skinTone: e.target.value })}
              className="custom-input text-xs sm:text-sm"
              placeholder="pl. Meleg Ősz / Tavasz paletta"
            />
          </div>

          {/* Row 5: Thermal Preference (Transferred from Settings) */}
          <div className="space-y-1.5 p-3 rounded-xl bg-white/5 border border-white/10">
            <label className="block text-xs font-semibold text-white">
              Hőtűrési Preferencia (AI Stylist Rétegezési Motor):
            </label>
            <p className="text-[11px] text-[var(--text-muted)] mb-2">
              Befolyásolja, hogy hűvösebb időben a Stylist milyen vastag és mennyi réteget javasoljon neked.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { 
                  key: 'coldSensitive', 
                  label: 'Fázósabb alkat', 
                  icon: <ThermometerSnowflake className="w-4 h-4 text-cyan-300" />,
                  desc: 'Hűvösben melegebb rétegek, kötött kasmír/gyapjú' 
                },
                { 
                  key: 'balanced', 
                  label: 'Kiegyensúlyozott', 
                  icon: <Scale className="w-4 h-4 text-emerald-300" />,
                  desc: 'Standard anatómiai rétegezés' 
                },
                { 
                  key: 'warmSensitive', 
                  label: 'Melegérzékeny alkat', 
                  icon: <Sun className="w-4 h-4 text-amber-400" />,
                  desc: 'Könnyedebb, szellős pamut/len anyagok' 
                }
              ].map(opt => {
                const isSel = (formData.thermalPreference || 'balanced') === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setFormData({ ...formData, thermalPreference: opt.key })}
                    className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-1 ${
                      isSel
                        ? 'bg-[var(--accent-gold)]/20 border-[var(--border-gold)] text-white shadow'
                        : 'bg-black/30 border-white/5 text-[var(--text-secondary)] hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      {opt.icon}
                      <span className={isSel ? 'text-[var(--accent-gold-light)]' : 'text-white'}>{opt.label}</span>
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] leading-tight">{opt.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 6: Style Archetypes selector */}
          <div className="space-y-1.5">
            <label className="block text-xs text-[var(--text-secondary)] font-medium">
              Preferált Stílusirányzatok:
            </label>
            <div className="flex flex-wrap gap-1.5">
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

          {/* Row 7: Style Philosophy */}
          <div>
            <label htmlFor="modal-profile-philosophy" className="block text-xs text-[var(--text-secondary)] mb-1 font-medium">
              Stílusfilozófia & Szabási preferenciák:
            </label>
            <textarea
              id="modal-profile-philosophy"
              name="profilePhilosophy"
              rows={3}
              value={formData.stylePhilosophy || ''}
              onChange={(e) => setFormData({ ...formData, stylePhilosophy: e.target.value })}
              className="custom-input text-xs sm:text-sm"
              placeholder="pl. Időtlen, letisztult kapszula ruhatár minőségi alapdarabokkal, slim szabással."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary py-2 px-4 text-xs"
            >
              Mégse
            </button>
            <button
              type="submit"
              className="btn-gold py-2 px-5 text-xs flex items-center gap-1.5 shadow"
            >
              <Check className="w-4 h-4" />
              <span>Módosítások Mentése</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
