import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Sparkles, User, ThermometerSnowflake, Sun, Scale, Calendar } from 'lucide-react';
import { getProfileDemographics } from '../../../services/demographics';

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
  const parsedBirthYear = parseInt(formData.birthYear, 10);
  const isBirthYearValid = Boolean(!isNaN(parsedBirthYear) && parsedBirthYear >= 1910 && parsedBirthYear <= new Date().getFullYear());
  const demographics = isBirthYearValid ? getProfileDemographics({ birthYear: parsedBirthYear, gender: formData.gender }) : null;

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

  return createPortal(
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <form 
        onSubmit={handleSubmit}
        className="relative w-full max-w-xl bg-[#0a0e17] border border-slate-800 rounded-3xl shadow-2xl flex flex-col my-auto max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 p-4 sm:p-5 border-b border-slate-800 bg-[#0a0e17] flex items-center justify-between">
          <div>
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
              Profil Beállítások
            </span>
            <h3 className="text-lg sm:text-xl font-serif font-bold text-white mt-1">
              Személyes Adottságok & Stílus Módosítása
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-[#0d121c] border border-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4 text-xs sm:text-sm scrollbar-thin">
          
          {/* Row 1: Name & Gender */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label htmlFor="modal-profile-name" className="block text-xs text-slate-300 mb-1 font-medium">
                Név / Megszólítás:
              </label>
              <input
                type="text"
                id="modal-profile-name"
                name="profileName"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-[#0d121c] border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                placeholder="pl. Attila"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1 font-medium">
                Nem:
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {['Férfi', 'Női'].map(g => {
                  const isSel = (formData.gender || 'Férfi') === g;
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setFormData({ ...formData, gender: g })}
                      className={`py-2 px-1 text-center rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        isSel
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                          : 'bg-[#0d121c] text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
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
              <label htmlFor="modal-profile-birthyear" className="block text-xs text-slate-300 mb-1 font-medium flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>Születési év:</span>
                </span>
                {demographics && (
                  <span className="text-[10px] text-emerald-400 font-bold">
                    {demographics.age} éves
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
                className="w-full bg-[#0d121c] border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                placeholder="pl. 1995"
              />
            </div>

            <div>
              <label htmlFor="modal-profile-height" className="block text-xs text-slate-300 mb-1 font-medium">
                Magasság:
              </label>
              <input
                type="text"
                id="modal-profile-height"
                name="profileHeight"
                value={formData.height || ''}
                onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                className="w-full bg-[#0d121c] border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                placeholder="pl. 182 cm"
              />
            </div>

            <div>
              <label htmlFor="modal-profile-weight" className="block text-xs text-slate-300 mb-1 font-medium">
                Testsúly:
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
                className="w-full bg-[#0d121c] border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                placeholder="pl. 78 kg"
              />
            </div>
          </div>

          {/* Row 3: Body Type Presets & Custom Input */}
          <div className="space-y-1.5">
            <label className="block text-xs text-slate-300 font-medium">
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
                    className={`py-1 px-2.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                      isSel
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                        : 'bg-[#0d121c] text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
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
              className="w-full bg-[#0d121c] border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
              placeholder="Vagy írd be egyedileg: pl. Atlétikus, széles vállak, vékony derék"
            />
          </div>

          {/* Row 4: Thermal Preference */}
          <div className="space-y-1.5 p-3 rounded-2xl bg-[#0d121c] border border-slate-800">
            <label className="block text-xs font-semibold text-white">
              Hőtűrési Preferencia (AI Rétegezési Motor):
            </label>
            <p className="text-[11px] text-slate-400 mb-2">
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
                  desc: 'Standard kiegyensúlyozott rétegrend' 
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
                    className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-1 cursor-pointer ${
                      isSel
                        ? 'bg-amber-500/20 border-amber-500/40 text-white shadow'
                        : 'bg-[#070a12] border-slate-800 text-slate-400 hover:bg-[#090d15] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      {opt.icon}
                      <span className={isSel ? 'text-amber-300' : 'text-white'}>{opt.label}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 leading-tight">{opt.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 5: Style Archetypes selector */}
          <div className="space-y-1.5">
            <label className="block text-xs text-slate-300 font-medium">
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
                    className={`py-1.5 px-3 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/20 text-amber-300 font-bold border-amber-500/40 shadow-sm'
                        : 'bg-[#0d121c] text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    ✦ {s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 6: Style Philosophy */}
          <div>
            <label htmlFor="modal-profile-philosophy" className="block text-xs text-slate-300 mb-1 font-medium">
              Stílusfilozófia & Szabási preferenciák:
            </label>
            <textarea
              id="modal-profile-philosophy"
              name="profilePhilosophy"
              rows={3}
              value={formData.stylePhilosophy || ''}
              onChange={(e) => setFormData({ ...formData, stylePhilosophy: e.target.value })}
              className="w-full bg-[#0d121c] border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
              placeholder="pl. Időtlen, letisztult ruhatár minőségi alapdarabokkal, slim szabással."
            />
          </div>
        </div>

        {/* Sticky Actions Footer */}
        <div className="shrink-0 p-4 sm:p-5 border-t border-slate-800 bg-[#0a0e17] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="bg-[#0d121c] hover:bg-slate-800 text-slate-300 border border-slate-700 py-2 px-4 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Mégse
          </button>
          <button
            type="submit"
            className="bg-slate-200 hover:bg-white text-slate-950 font-bold py-2 px-5 text-xs rounded-xl flex items-center gap-1.5 shadow transition-colors cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Módosítások Mentése</span>
          </button>
        </div>

      </form>
    </div>,
    document.body
  );
}
