import React, { useState, useRef } from 'react';
import { User, Sparkles, Sliders, ShieldCheck, Settings, HelpCircle, LogOut, LogIn, Edit3 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { analyzeColorSeason } from '../../services/gemini';
import { ensureBase64Image } from '../../services/imageOptimizer';
import { deduplicateColors } from '../common/ColorPalettePicker';
import AppLogo from '../common/AppLogo';
import ModuleFirstTimeGuide from '../common/ModuleFirstTimeGuide';

// Subcomponents
import ProfileIdentityCard from './components/ProfileIdentityCard';
import ProfileEditModal from './components/ProfileEditModal';
import ColorSeasonCard from './components/ColorSeasonCard';
import DynamicColorPaletteCard from './components/DynamicColorPaletteCard';
import WardrobeAnalyticsCard from './components/WardrobeAnalyticsCard';
import CustomRulesCard from './components/CustomRulesCard';
import SartorialKnowledgeHub from './components/SartorialKnowledgeHub';
import BrandSizingMatrixCard from './components/BrandSizingMatrixCard';

export default function StyleDNAView({ onOpenSettings, onOpenHelp, onOpenAuth }) {
  const { 
    profile, 
    updateProfile, 
    wardrobe = [], 
    currentUser,
    logout,
    isAdmin,
    isSimulatingUser,
    toggleUserSimulation,
    sartorialRules = [],
    isMiningRules,
    mineNewRules,
    toggleRule,
    deleteSartorialRule
  } = useAuth();
  
  const safeProfile = profile || {};
  const safeWardrobe = Array.isArray(wardrobe) ? wardrobe : [];

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
  const [colorSeasonResult, setColorSeasonResult] = useState(null);
  const [showGuide, setShowGuide] = useState(false);
  const [activeSection, setActiveSection] = useState('all');

  const photoInputRef = useRef(null);

  const handleOpenSettings = () => {
    if (onOpenSettings) onOpenSettings();
    else window.dispatchEvent(new CustomEvent('open-settings'));
  };

  const handleOpenHelp = () => {
    setShowGuide(prev => !prev);
  };

  const handleOpenAuth = () => {
    if (onOpenAuth) onOpenAuth();
    else window.dispatchEvent(new CustomEvent('open-auth'));
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsAnalyzingPhoto(true);
      const base64 = await ensureBase64Image(file, 512, 512, 0.8);
      
      const immediateUpdate = {
        ...safeProfile,
        avatarUrl: base64
      };
      await updateProfile(immediateUpdate);

      try {
        const result = await analyzeColorSeason(base64);
        setColorSeasonResult(result);

        if (result) {
          const rawRecommended = Array.isArray(result.recommendedPalette) ? result.recommendedPalette : [];
          const cleanPalette = deduplicateColors(rawRecommended).slice(0, 5);

          const fullUpdate = {
            ...immediateUpdate,
            skinTone: `${result.seasonName} - ${result.skinTone}`,
            favoriteColors: cleanPalette.length > 0 ? cleanPalette : (safeProfile.favoriteColors || ['Sötétkék', 'Törtfehér', 'Dohánybarna']),
            avoidColors: Array.isArray(result.avoidPalette) ? deduplicateColors(result.avoidPalette) : []
          };
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

  const profileGuideSteps = [
    {
      icon: '👤',
      title: '1. Testalkat & Identitás',
      desc: 'Add meg magasságodat, testsúlyodat, testalkatodat és stíluspreferenciáidat az arányos szettekhez.'
    },
    {
      icon: '🎨',
      title: '2. Színtípus & Paletta',
      desc: 'AI színelemzés fotóból vagy manuális palettaválasztás a harmóniában lévő összeállításokért.'
    },
    {
      icon: '🧠',
      title: '3. Egyéni AI Szabályok',
      desc: 'Tanítsd a személyes stylistodat saját tiltásokkal és a nemzetközi szabászati kódexekkel.'
    },
    {
      icon: '📏',
      title: '4. Mérettérkép & Garancia',
      desc: 'Márkánkénti méretprofil a hibátlan illeszkedésért és vásárlási méretválasztáshoz.'
    }
  ];

  return (
    <div className="space-y-6 animate-slide-up pb-10">
      
      {/* 1-Row Compact Top Header Bar */}
      <div className="rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 bg-gradient-to-r from-[#0c1527]/95 via-[#080d1a]/95 to-black/90 border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-3">
        {/* Left: Module title + user identification badge */}
        <div className="flex items-center gap-3 min-w-0">
          {currentUser ? (
            <div className="flex items-center gap-2.5 min-w-0">
              {currentUser.photoURL ? (
                <img 
                  src={currentUser.photoURL} 
                  alt="Avatar" 
                  className="w-9 h-9 rounded-xl object-cover border border-[var(--border-gold)]/40 shrink-0" 
                />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-[var(--accent-gold)]/10 border border-[var(--accent-gold)]/30 flex items-center justify-center text-[var(--accent-gold)] font-bold text-sm shrink-0">
                  {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h2 className="text-base sm:text-lg font-bold font-serif gold-gradient-text truncate">
                    Profil & Stílus DNS
                  </h2>
                  {isAdmin ? (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold uppercase rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      👑 Admin
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 text-[9px] font-medium rounded-md bg-white/5 text-slate-300 border border-white/10">
                      Tag
                    </span>
                  )}
                  {isSimulatingUser && (
                    <button
                      type="button"
                      onClick={toggleUserSimulation}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold uppercase rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 cursor-pointer"
                      title="Visszalépés az Adminisztrátori Módba"
                    >
                      👁️ User Teszt
                    </button>
                  )}
                </div>
                <span className="text-[11px] text-slate-400 truncate block">
                  {currentUser.displayName || currentUser.email}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <AppLogo className="w-8 h-8 shrink-0" />
              <div>
                <h2 className="text-base sm:text-lg font-bold font-serif gold-gradient-text">
                  Profil & Stílus DNS
                </h2>
                <span className="text-[11px] text-slate-400 block">Vendég fiók</span>
              </div>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-onboarding'))}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--accent-gold)] text-black shadow hover:opacity-90 transition-all flex items-center gap-1.5 cursor-pointer"
            title="Stílusprofil Varázsló Újraindítása"
          >
            <Sparkles className="w-3.5 h-3.5 text-black" />
            <span className="hidden xs:inline">Varázsló</span>
          </button>

          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Profil Adatok Szerkesztése"
          >
            <Edit3 className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
            <span>Szerkesztés</span>
          </button>

          <button
            type="button"
            onClick={handleOpenSettings}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Rendszerbeállítások"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Beállítások</span>
          </button>

          <button
            type="button"
            onClick={handleOpenHelp}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            title="Használati Útmutató"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
            <span className="hidden sm:inline">Súgó</span>
          </button>

          {currentUser ? (
            <button
              type="button"
              onClick={logout}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-rose-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Kijelentkezés"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kijelentkezés</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOpenAuth}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-[var(--accent-gold)] text-black text-xs font-bold flex items-center gap-1.5 hover:opacity-90 transition-all shadow cursor-pointer"
              title="Bejelentkezés"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Belépés</span>
            </button>
          )}
        </div>
      </div>

      {/* Module First-Time Interactive Guide */}
      <ModuleFirstTimeGuide
        storageKey="profile_first_time_guide"
        forceOpen={showGuide}
        onClose={() => setShowGuide(false)}
        title="Hogyan működik a Profil & Stílus DNS?"
        steps={profileGuideSteps}
      />

      {/* Responsive Zero-Scroll Segmented Navigation */}
      {/* Mobile: 2 distinct rows (Row 1: 2 items, Row 2: 3 items) with zero horizontal scroll */}
      {/* Desktop: 1 single clean row */}
      <div className="space-y-1.5 sm:space-y-0 sm:flex sm:items-center sm:gap-1.5 p-1.5 rounded-2xl bg-[#0a0e17] border border-slate-800 shadow-lg">
        {/* Mobile Row 1 */}
        <div className="grid grid-cols-2 gap-1.5 sm:contents">
          <button
            type="button"
            onClick={() => setActiveSection('identity')}
            className={`px-3 py-2 sm:py-1.5 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeSection === 'identity'
                ? 'bg-[var(--accent-gold)] text-black font-semibold shadow-md'
                : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 border border-white/5'
            }`}
          >
            <span>👤</span>
            <span>Identitás</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('colors')}
            className={`px-3 py-2 sm:py-1.5 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeSection === 'colors'
                ? 'bg-[var(--accent-gold)] text-black font-semibold shadow-md'
                : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 border border-white/5'
            }`}
          >
            <span>🎨</span>
            <span>Színek</span>
          </button>
        </div>

        {/* Mobile Row 2 */}
        <div className="grid grid-cols-3 gap-1.5 sm:contents">
          <button
            type="button"
            onClick={() => setActiveSection('rules')}
            className={`px-2.5 py-2 sm:py-1.5 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeSection === 'rules'
                ? 'bg-[var(--accent-gold)] text-black font-semibold shadow-md'
                : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 border border-white/5'
            }`}
          >
            <span>🧠</span>
            <span className="truncate">AI Szabályok</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('sizes')}
            className={`px-2.5 py-2 sm:py-1.5 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeSection === 'sizes'
                ? 'bg-[var(--accent-gold)] text-black font-semibold shadow-md'
                : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 border border-white/5'
            }`}
          >
            <span>📏</span>
            <span className="truncate">Mérettérkép</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('all')}
            className={`px-2.5 py-2 sm:py-1.5 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeSection === 'all'
                ? 'bg-[var(--accent-gold)] text-black font-semibold shadow-md'
                : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 border border-white/5'
            }`}
          >
            <span>👁️</span>
            <span>Mind</span>
          </button>
        </div>
      </div>

      {/* 📌 SZEKCIÓ 1: Identitás & Ruhatári Elemzés */}
      {(activeSection === 'identity' || activeSection === 'all') && (
        <section className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ProfileIdentityCard 
                profile={safeProfile}
                onEditClick={() => setIsEditModalOpen(true)}
                onPhotoFileSelect={handlePhotoUpload}
                photoInputRef={photoInputRef}
              />
            </div>

            <div className="lg:col-span-1">
              <WardrobeAnalyticsCard 
                wardrobe={safeWardrobe}
                profile={safeProfile}
              />
            </div>
          </div>
        </section>
      )}

      {/* 📌 SZEKCIÓ 2: Színtípus & Harmonikus Paletták */}
      {(activeSection === 'colors' || activeSection === 'all') && (
        <section className="space-y-6">
          <ColorSeasonCard 
            isAnalyzingPhoto={isAnalyzingPhoto}
            colorSeasonResult={colorSeasonResult}
            onPhotoUpload={handlePhotoUpload}
          />

          <DynamicColorPaletteCard 
            profile={safeProfile}
            wardrobe={safeWardrobe}
            onUpdateProfile={updateProfile}
          />
        </section>
      )}

      {/* 📌 SZEKCIÓ 3: AI Stylist Tanítás & Sartorial Szabálybázis */}
      {(activeSection === 'rules' || activeSection === 'all') && (
        <section className="space-y-6">
          <CustomRulesCard 
            profile={safeProfile}
            onUpdateProfile={updateProfile}
          />

          <SartorialKnowledgeHub 
            profile={safeProfile}
            sartorialRules={sartorialRules}
            isMiningRules={isMiningRules}
            mineNewRules={mineNewRules}
            toggleRule={toggleRule}
            deleteSartorialRule={deleteSartorialRule}
          />
        </section>
      )}

      {/* 📌 SZEKCIÓ 4: Gyártói Méretprofil & Illeszkedési Mátrix */}
      {(activeSection === 'sizes' || activeSection === 'all') && (
        <section className="space-y-6">
          <BrandSizingMatrixCard 
            wardrobe={safeWardrobe}
          />
        </section>
      )}

      {/* Profile Edit Modal */}
      <ProfileEditModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        initialProfile={safeProfile}
        onSave={updateProfile}
      />

    </div>
  );
}
