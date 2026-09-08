import React, { useState, useRef } from 'react';
import { User, Sparkles, Sliders, ShieldCheck, Settings, HelpCircle, LogOut, LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { analyzeColorSeason } from '../../services/gemini';
import { ensureBase64Image } from '../../services/imageOptimizer';
import { deduplicateColors } from '../common/ColorPalettePicker';
import AppLogo from '../common/AppLogo';

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

  const photoInputRef = useRef(null);

  const handleOpenSettings = () => {
    if (onOpenSettings) onOpenSettings();
    else window.dispatchEvent(new CustomEvent('open-settings'));
  };

  const handleOpenHelp = () => {
    if (onOpenHelp) onOpenHelp();
    else window.dispatchEvent(new CustomEvent('open-help'));
  };

  const handleOpenAuth = () => {
    if (onOpenAuth) onOpenAuth();
    else window.dispatchEvent(new CustomEvent('open-auth'));
  };

  // Quick navigation smooth scroller
  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsAnalyzingPhoto(true);
      // Compact optimized profile image
      const base64 = await ensureBase64Image(file, 512, 512, 0.8);
      
      // 1. Immediately save avatarUrl to profile and sync
      const immediateUpdate = {
        ...safeProfile,
        avatarUrl: base64
      };
      await updateProfile(immediateUpdate);

      // 2. Run AI Color Season Analysis in background
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

  return (
    <div className="space-y-6 animate-slide-up pb-10">
      
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="badge badge-gold">Profile</span>
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
            Profile
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
            Testalkati adottságok, színtípus, mérettérkép és egyéni szabályok.
          </p>
        </div>

        {/* Quick-Jump Navigation Pills & Onboarding Launcher */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-black/40 border border-white/10 self-start sm:self-center">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-onboarding'))}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--accent-gold)] text-black shadow hover:opacity-90 transition-all flex items-center gap-1.5 cursor-pointer"
            title="Stílusprofil Varázsló Újraindítása"
          >
            <Sparkles className="w-3.5 h-3.5 text-black" />
            <span>Varázsló</span>
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('identity-section')}
            className="px-3 py-1.5 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-all flex items-center gap-1.5"
          >
            <span>👤</span>
            <span>Identitás & Színek</span>
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('rules-section')}
            className="px-3 py-1.5 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-all flex items-center gap-1.5"
          >
            <span>🧠</span>
            <span>AI Szabályok</span>
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('sizes-section')}
            className="px-3 py-1.5 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-all flex items-center gap-1.5"
          >
            <span>📏</span>
            <span>Mérettérkép</span>
          </button>
        </div>
      </div>

      {/* Account, Settings & Help Control Hub */}
      <div className="glass-card p-4 sm:p-5 border-[var(--border-gold)]/35 bg-gradient-to-r from-[#0c1527]/95 via-[#080d1a]/95 to-black/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
        {/* Left: User account identity / guest indicator */}
        <div className="flex items-center gap-3 min-w-0">
          {currentUser ? (
            <div className="flex items-center gap-3 min-w-0">
              {currentUser.photoURL ? (
                <img 
                  src={currentUser.photoURL} 
                  alt="Avatar" 
                  className="w-10 h-10 rounded-xl object-cover border border-[var(--border-gold)] shrink-0" 
                />
              ) : (
                <AppLogo className="w-10 h-10 shrink-0 shadow-md" />
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-white truncate">
                    {currentUser.displayName || currentUser.email?.split('@')[0]}
                  </span>
                  {isAdmin ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm">
                      👑 Admin
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 text-[9px] font-medium rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Bejelentkezve
                    </span>
                  )}
                  {isSimulatingUser && (
                    <button
                      type="button"
                      onClick={toggleUserSimulation}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold uppercase rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 cursor-pointer"
                      title="Visszalépés az Adminisztrátori Módba"
                    >
                      👁️ User Teszt (Visszalépés)
                    </button>
                  )}
                </div>
                <span className="text-[11px] text-[var(--text-muted)] truncate block mt-0.5">
                  {currentUser.email}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <AppLogo className="w-10 h-10 shrink-0 shadow-md" />
              <div>
                <span className="text-xs font-semibold text-white block">Vendég fiók</span>
                <span className="text-[10px] text-[var(--text-muted)]">Jelentkezz be adatszinkronizációhoz</span>
              </div>
            </div>
          )}
        </div>

        {/* Right: Actions (Súgó, Beállítások, Login/Logout) */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            onClick={handleOpenHelp}
            className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            title="Használati Útmutató & Sartorial Kódex"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
            <span>Súgó</span>
          </button>

          <button
            type="button"
            onClick={handleOpenSettings}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Rendszerbeállítások"
          >
            <Settings className="w-3.5 h-3.5 text-slate-300" />
            <span>Beállítások</span>
          </button>

          {currentUser ? (
            <button
              type="button"
              onClick={logout}
              className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-rose-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Kijelentkezés a fiókból"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Kijelentkezés</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOpenAuth}
              className="px-3 py-1.5 rounded-xl bg-[var(--accent-gold)] text-black text-xs font-bold flex items-center gap-1.5 hover:opacity-90 transition-all shadow cursor-pointer"
              title="Bejelentkezés vagy Regisztráció"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Bejelentkezés</span>
            </button>
          )}
        </div>
      </div>

      {/* 📌 SZEKCIÓ 1: Identitás, Adottságok & Intelligens Színek */}
      <section id="identity-section" className="space-y-6 scroll-mt-20">
        
        {/* Profile Card & Wardrobe Analytics Grid */}
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

        {/* Color Season Analyzer Card */}
        <ColorSeasonCard 
          isAnalyzingPhoto={isAnalyzingPhoto}
          colorSeasonResult={colorSeasonResult}
          onPhotoUpload={handlePhotoUpload}
        />

        {/* Dynamic Auto-Learning Color Palette Card */}
        <DynamicColorPaletteCard 
          profile={safeProfile}
          wardrobe={safeWardrobe}
          onUpdateProfile={updateProfile}
        />

      </section>

      {/* 📌 SZEKCIÓ 2: AI Stylist Tanítás & Stílusszabály Tudásbázis */}
      <section id="rules-section" className="space-y-6 scroll-mt-20">
        
        {/* Custom Rules & AI Learning Card */}
        <CustomRulesCard 
          profile={safeProfile}
          onUpdateProfile={updateProfile}
        />

        {/* Autonomous Style Knowledge Hub & Web Grounding */}
        <SartorialKnowledgeHub 
          profile={safeProfile}
          sartorialRules={sartorialRules}
          isMiningRules={isMiningRules}
          mineNewRules={mineNewRules}
          toggleRule={toggleRule}
          deleteSartorialRule={deleteSartorialRule}
        />

      </section>

      {/* 📌 SZEKCIÓ 3: Gyártmány & Méretprofil Térkép */}
      <section id="sizes-section" className="space-y-6 scroll-mt-20">
        <BrandSizingMatrixCard 
          wardrobe={safeWardrobe}
        />
      </section>

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
