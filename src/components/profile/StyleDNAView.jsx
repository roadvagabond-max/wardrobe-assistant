import React, { useState, useRef } from 'react';
import { User, Sparkles, Sliders, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { analyzeColorSeason } from '../../services/gemini';
import { ensureBase64Image } from '../../services/imageOptimizer';
import { deduplicateColors } from '../common/ColorPalettePicker';

// Subcomponents
import ProfileIdentityCard from './components/ProfileIdentityCard';
import ProfileEditModal from './components/ProfileEditModal';
import ColorSeasonCard from './components/ColorSeasonCard';
import DynamicColorPaletteCard from './components/DynamicColorPaletteCard';
import WardrobeAnalyticsCard from './components/WardrobeAnalyticsCard';
import CustomRulesCard from './components/CustomRulesCard';
import SartorialKnowledgeHub from './components/SartorialKnowledgeHub';
import BrandSizingMatrixCard from './components/BrandSizingMatrixCard';

export default function StyleDNAView() {
  const { 
    profile, 
    updateProfile, 
    wardrobe, 
    isAdmin,
    sartorialRules = [],
    isMiningRules,
    mineNewRules,
    toggleRule,
    deleteSartorialRule
  } = useAuth();
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
  const [colorSeasonResult, setColorSeasonResult] = useState(null);

  const photoInputRef = useRef(null);

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
        ...profile,
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
            favoriteColors: cleanPalette.length > 0 ? cleanPalette : (profile.favoriteColors || ['Sötétkék', 'Törtfehér', 'Dohánybarna']),
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
    <div className="space-y-7 animate-slide-up pb-10">
      
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
            Stílusprofil
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

      {/* 📌 SZEKCIÓ 1: Identitás, Adottságok & Intelligens Színek */}
      <section id="identity-section" className="space-y-6 scroll-mt-20">
        
        {/* Profile Card & Wardrobe Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ProfileIdentityCard 
              profile={profile}
              onEditClick={() => setIsEditModalOpen(true)}
              onPhotoFileSelect={handlePhotoUpload}
              photoInputRef={photoInputRef}
            />
          </div>

          <div className="lg:col-span-1">
            <WardrobeAnalyticsCard 
              wardrobe={wardrobe}
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
          profile={profile}
          wardrobe={wardrobe}
          onUpdateProfile={updateProfile}
        />

      </section>

      {/* 📌 SZEKCIÓ 2: AI Stylist Tanítás & Stílusszabály Tudásbázis */}
      <section id="rules-section" className="space-y-6 scroll-mt-20">
        
        {/* Custom Rules & AI Learning Card */}
        <CustomRulesCard 
          profile={profile}
          onUpdateProfile={updateProfile}
        />

        {/* Autonomous Style Knowledge Hub & Web Grounding */}
        <SartorialKnowledgeHub 
          profile={profile}
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
          wardrobe={wardrobe}
        />
      </section>

      {/* Profile Edit Modal */}
      <ProfileEditModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        initialProfile={profile}
        onSave={updateProfile}
      />

    </div>
  );
}
