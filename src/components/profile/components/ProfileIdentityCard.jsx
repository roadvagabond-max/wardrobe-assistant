import React from 'react';
import { Camera, Edit3, ThermometerSnowflake, Sun, Scale, Sparkles, User } from 'lucide-react';

export default function ProfileIdentityCard({ 
  profile = {}, 
  onEditClick, 
  onPhotoFileSelect, 
  photoInputRef 
}) {
  const safeProfile = profile || {};
  const genderLabel = safeProfile.gender === 'Női' ? '👗 Női' : '👔 Férfi';
  const currentYear = new Date().getFullYear();
  const birthYearDisplay = safeProfile.birthYear 
    ? `${safeProfile.birthYear} (${currentYear - parseInt(safeProfile.birthYear, 10)} év)`
    : (safeProfile.age ? `${safeProfile.age} év` : null);

  const thermalInfo = safeProfile.thermalPreference === 'coldSensitive'
    ? { label: 'Fázósabb alkat', icon: <ThermometerSnowflake className="w-3.5 h-3.5 text-cyan-300" />, desc: 'Hűvösben melegebb rétegek és kötöttek' }
    : safeProfile.thermalPreference === 'warmSensitive'
      ? { label: 'Melegérzékeny alkat', icon: <Sun className="w-3.5 h-3.5 text-amber-400" />, desc: 'Könnyed, szellős pamut és len preferálása' }
      : { label: 'Kiegyensúlyozott', icon: <Scale className="w-3.5 h-3.5 text-emerald-300" />, desc: 'Standard kiegyensúlyozott rétegezés' };

  return (
    <div className="glass-card p-6 sm:p-7 border-[var(--border-gold)] space-y-6">
      
      {/* Header Row: Profile photo + Names + Edit button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-4">
          <input 
            type="file" 
            id="profile-photo-file-input"
            name="profilePhotoFile"
            aria-label="Profilfotó feltöltése"
            accept="image/*" 
            ref={photoInputRef} 
            onChange={onPhotoFileSelect} 
            className="hidden" 
          />
          <div 
            onClick={() => photoInputRef.current?.click()}
            className="relative w-16 h-16 rounded-2xl overflow-hidden bg-gradient-to-br from-[#d4af37] to-[#785908] flex items-center justify-center text-black font-bold text-2xl shadow-xl shadow-[#d4af37]/20 border border-[var(--border-gold)] shrink-0 cursor-pointer group"
            title="Kattints a profilfotó cseréjéhez"
          >
            {safeProfile.avatarUrl ? (
              <img src={safeProfile.avatarUrl} alt={safeProfile.name || 'Profil'} width="64" height="64" className="w-full h-full object-cover" />
            ) : (
              <span>{safeProfile.name?.[0] || 'U'}</span>
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
              <Camera className="w-5 h-5" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-serif font-bold text-white">{safeProfile.name || 'Felhasználó'}</h3>
              <span className="badge badge-gold text-[10px] py-0.5 px-2 font-medium">
                {genderLabel}
              </span>
            </div>
            <p className="text-xs text-[var(--accent-gold-light)] font-medium mt-0.5">
              {safeProfile.title || 'Személyes Stílusprofil'}
            </p>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-[var(--text-muted)] flex-wrap">
              {birthYearDisplay && <span>{birthYearDisplay}</span>}
              {safeProfile.height && safeProfile.height !== '—' && <span>• {safeProfile.height}</span>}
              {safeProfile.weight && safeProfile.weight !== '—' && <span>• {safeProfile.weight}</span>}
              {safeProfile.bodyType && <span>• {safeProfile.bodyType}</span>}
              {safeProfile.skinTone && <span>• {safeProfile.skinTone}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-onboarding'))}
            className="btn-gold text-xs py-2 px-3 flex items-center gap-1.5 shadow"
            title="Stílusprofil Varázsló Újraindítása"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Varázsló</span>
          </button>
          <button
            type="button"
            onClick={onEditClick}
            className="btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Szerkesztés</span>
          </button>
        </div>
      </div>

      {/* Attributes Grid: Thermal preference + Body Type & Measurements */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Thermal comfort */}
        <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--text-muted)] flex items-center gap-1.5">
              {thermalInfo.icon}
              <span>Hőtűrés & Komfort:</span>
            </span>
            <span className="font-bold text-white text-xs">{thermalInfo.label}</span>
          </div>
          <p className="text-[10px] text-[var(--text-secondary)]">
            {thermalInfo.desc}
          </p>
        </div>

        {/* Measurements & Shape */}
        <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--text-muted)] flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
              <span>Testalkati Sziluett:</span>
            </span>
            <span className="font-bold text-white text-xs">{safeProfile.bodyType || 'Normál / Átlagos'}</span>
          </div>
          <p className="text-[10px] text-[var(--text-secondary)]">
            {safeProfile.height && safeProfile.weight ? `${safeProfile.height}, ${safeProfile.weight}` : 'Arányos testalkat'}
          </p>
        </div>
      </div>

      {/* Style Philosophy Box */}
      {safeProfile.stylePhilosophy && (
        <div className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-1.5">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)]">
            Stílusfilozófia & Szabási preferenciák:
          </span>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed italic">
            "{safeProfile.stylePhilosophy}"
          </p>
        </div>
      )}

      {/* Preferred Style Archetypes Pills */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-white block">Preferált Stílusirányzatok:</span>
        <div className="flex flex-wrap gap-2">
          {safeProfile.preferredStyles && safeProfile.preferredStyles.length > 0 ? (
            safeProfile.preferredStyles.map((style, idx) => (
              <span key={idx} className="badge badge-gold py-1 px-3 text-xs">
                ✦ {style}
              </span>
            ))
          ) : (
            <span className="text-xs text-[var(--text-muted)]">Még nincs kiválasztott stílusirányzat.</span>
          )}
        </div>
      </div>

    </div>
  );
}
