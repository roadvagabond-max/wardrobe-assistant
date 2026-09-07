import React from 'react';
import { User, Sparkles, Scale, ThermometerSnowflake, Sun, ArrowRight, ShieldCheck, Calendar, CheckCircle2 } from 'lucide-react';
import { getProfileDemographics } from '../../../services/demographics';

const BODY_TYPE_PRESETS = [
  'Atlétikus / Trapéz (V-alak)',
  'Slim / Karcsú',
  'Normál / Átlagos',
  'Erős / Zömök',
  'Homokóra'
];

export default function StepIdentity({ formData, setFormData, onNext }) {
  const currentYear = new Date().getFullYear();
  const isNameValid = Boolean(formData.name && formData.name.trim().length > 0);
  const isGenderValid = Boolean(formData.gender && ['Férfi', 'Női'].includes(formData.gender));
  
  const parsedBirthYear = parseInt(formData.birthYear, 10);
  const isBirthYearValid = Boolean(!isNaN(parsedBirthYear) && parsedBirthYear >= 1910 && parsedBirthYear <= currentYear);
  const demographics = isBirthYearValid ? getProfileDemographics({ birthYear: parsedBirthYear, gender: formData.gender }) : null;

  const canProceed = isNameValid && isGenderValid && isBirthYearValid;

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Intro text */}
      <div className="space-y-1">
        <span className="badge badge-gold text-[10px] uppercase tracking-wider font-bold">
          1. Lépés • Személyes Identitás
        </span>
        <h3 className="text-xl sm:text-2xl font-serif font-bold text-white">
          Kezdjük az alapokkal!
        </h3>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          Add meg a nevedet, válassz nemet és add meg a születési évedet, hogy az AI pontosan a korosztályodhoz (és életkorodhoz) illő stílustanácsokat adhasson.
        </p>
      </div>

      {/* Mandatory Identifiers Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-black/40 border border-[var(--border-gold)]/60 space-y-4 shadow-sm">
        
        {/* Row 1: Name and Gender */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Name input */}
          <div className="space-y-1.5">
            <label htmlFor="onboarding-name" className="block text-xs font-bold text-white flex items-center justify-between">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                <span>Név / Megszólítás</span>
                <span className="text-amber-400">*</span>
              </span>
              <span className="text-[10px] text-amber-300 font-normal uppercase tracking-wider">Kötelező</span>
            </label>
            <input
              type="text"
              id="onboarding-name"
              name="name"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="pl. Attila vagy Dóra"
              autoComplete="given-name"
              className={`w-full px-3.5 py-2.5 rounded-xl bg-[#090d14] border text-white placeholder-white/30 text-xs sm:text-sm focus:outline-none transition-all ${
                !isNameValid && formData.name !== undefined && formData.name !== ''
                  ? 'border-amber-500/60 focus:border-amber-400'
                  : 'border-white/10 focus:border-[var(--accent-gold)]'
              }`}
            />
          </div>

          {/* Gender selector (Strictly Male/Female) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-white flex items-center justify-between">
              <span className="flex items-center gap-1">
                <span>Nem</span>
                <span className="text-amber-400">*</span>
              </span>
              <span className="text-[10px] text-amber-300 font-normal uppercase tracking-wider">Kötelező</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'Férfi', label: '👔 Férfi' },
                { key: 'Női', label: '👗 Női' }
              ].map(g => {
                const isSel = formData.gender === g.key;
                return (
                  <button
                    key={g.key}
                    type="button"
                    onClick={() => setFormData({ ...formData, gender: g.key })}
                    className={`py-2 px-3 text-center rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      isSel
                        ? 'bg-[var(--accent-gold)] text-black border-[var(--accent-gold)] shadow-md font-bold'
                        : 'bg-white/5 text-[var(--text-secondary)] border-white/10 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {g.label}
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Row 2: Birth Year (Mandatory & Prominent) */}
        <div className="pt-2 border-t border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="onboarding-birthyear" className="block text-xs font-bold text-white flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
              <span>Születési év</span>
              <span className="text-amber-400">*</span>
              <span className="text-[10px] text-amber-300 font-normal uppercase tracking-wider ml-1">(Kötelező)</span>
            </label>

            {demographics && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{demographics.age} éves ({demographics.bracketDescription.split(' (')[0]})</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            <div className="sm:col-span-4">
              <input
                type="number"
                id="onboarding-birthyear"
                name="birthYear"
                min="1910"
                max={currentYear}
                value={formData.birthYear || ''}
                onChange={(e) => setFormData({ ...formData, birthYear: e.target.value })}
                placeholder="pl. 1995 vagy 2018"
                className={`w-full px-3.5 py-2.5 rounded-xl bg-[#090d14] border text-white placeholder-white/30 text-xs sm:text-sm font-mono focus:outline-none transition-all ${
                  !isBirthYearValid && formData.birthYear
                    ? 'border-rose-500/80 focus:border-rose-400'
                    : isBirthYearValid
                      ? 'border-emerald-500/60 focus:border-emerald-400'
                      : 'border-amber-500/50 focus:border-[var(--accent-gold)]'
                }`}
              />
            </div>
            
            <div className="sm:col-span-8 text-[11px] text-[var(--text-secondary)]">
              {isBirthYearValid ? (
                <span className="text-emerald-300/90">
                  ✨ Az AI automatikusan a <strong>{demographics.age} éves {demographics.gender.toLowerCase()}</strong> korosztályi igényeihez fogja igazítani a szabásokat, darabokat és ajánlásokat.
                </span>
              ) : (
                <span className="text-amber-300/80">
                  💡 Add meg a születési évedet (pl. <strong>2018</strong> gyerekeknél, vagy <strong>1995</strong> felnőtteknél), hogy az AI pontosan ismerje az életkort!
                </span>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Optional Details Header */}
      <div className="flex items-center gap-2 pt-1">
        <div className="h-px bg-white/10 flex-1" />
        <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)]">
          Opcionális Testalkati Adatok (Átugorható)
        </span>
        <div className="h-px bg-white/10 flex-1" />
      </div>

      {/* Row 2: Height & Weight (Optional) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="onboarding-height" className="block text-xs text-[var(--text-secondary)] font-medium">
            Magasság: <span className="text-[10px] text-[var(--text-muted)]">(opcionális)</span>
          </label>
          <input
            type="text"
            id="onboarding-height"
            name="height"
            value={formData.height || ''}
            onChange={(e) => setFormData({ ...formData, height: e.target.value })}
            placeholder="pl. 182 cm"
            className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/30 text-xs focus:outline-none focus:border-[var(--accent-gold)] transition-colors"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="onboarding-weight" className="block text-xs text-[var(--text-secondary)] font-medium">
            Testsúly: <span className="text-[10px] text-[var(--text-muted)]">(opcionális)</span>
          </label>
          <input
            type="text"
            id="onboarding-weight"
            name="weight"
            value={formData.weight || ''}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, '');
              setFormData({ ...formData, weight: val ? `${val} kg` : '' });
            }}
            placeholder="pl. 76 kg"
            className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/30 text-xs focus:outline-none focus:border-[var(--accent-gold)] transition-colors"
          />
        </div>
      </div>

      {/* Row 3: Body Shape Presets (Optional, adapt to age) */}
      {(!demographics || demographics.age >= 13) && (
        <div className="space-y-1.5">
          <label className="block text-xs text-[var(--text-secondary)] font-medium">
            Testalkati Sziluett: <span className="text-[10px] text-[var(--text-muted)]">(opcionális)</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {BODY_TYPE_PRESETS.map(preset => {
              const isSel = formData.bodyType === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setFormData({ ...formData, bodyType: isSel ? '' : preset })}
                  className={`py-1.5 px-3 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                    isSel
                      ? 'bg-[var(--accent-gold)]/20 text-[var(--accent-gold-light)] border-[var(--border-gold)] font-bold shadow-sm'
                      : 'bg-white/5 text-[var(--text-secondary)] border-white/5 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {preset}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Row 4: Thermal Comfort (Optional) */}
      <div className="space-y-1.5 p-3.5 rounded-2xl bg-white/5 border border-white/10">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-white">
            Hőtűrési Preferencia (AI Rétegezési Motor):
          </label>
          <span className="text-[10px] text-[var(--text-muted)]">Opcionális</span>
        </div>
        <p className="text-[11px] text-[var(--text-muted)] mb-2">
          Segít eldönteni a Stylistnak, hogy hűvösben hány réteget és milyen vastag textíliákat javasoljon.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[
            { 
              key: 'coldSensitive', 
              label: 'Fázósabb alkat', 
              icon: <ThermometerSnowflake className="w-3.5 h-3.5 text-cyan-300" />,
              desc: 'Hűvösben melegebb kötött és gyapjú rétegek' 
            },
            { 
              key: 'balanced', 
              label: 'Kiegyensúlyozott', 
              icon: <Scale className="w-3.5 h-3.5 text-emerald-300" />,
              desc: 'Kiegyensúlyozott rétegrend' 
            },
            { 
              key: 'warmSensitive', 
              label: 'Melegkedvelő', 
              icon: <Sun className="w-3.5 h-3.5 text-amber-400" />,
              desc: 'Könnyed, szellős pamut és len preferálása' 
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

      {/* Action Footer */}
      <div className="pt-2 flex items-center justify-between gap-3">
        <div className="text-[11px] text-[var(--text-muted)]">
          {!canProceed && (
            <span className="text-amber-400/90 flex items-center gap-1">
              <span>⚠️</span>
              <span>A folytatáshoz kérlek add meg a nevedet, válassz nemet és add meg a születési évedet!</span>
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onNext}
          disabled={!canProceed}
          className={`btn-gold py-2.5 px-5 text-xs font-semibold shadow-md flex items-center gap-2 ${
            !canProceed ? 'opacity-40 cursor-not-allowed' : ''
          }`}
        >
          <span>Tovább a Színtípushoz</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
