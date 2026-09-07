import React, { useState, useEffect } from 'react';
import { X, Sparkles, User, Palette, Compass, Shirt, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import StepIdentity from './steps/StepIdentity';
import StepColorSeason from './steps/StepColorSeason';
import StepStyles from './steps/StepStyles';
import StepAddFirstItem from './steps/StepAddFirstItem';
import StepSummaryLaunch from './steps/StepSummaryLaunch';

const TOTAL_STEPS = 5;

export default function OnboardingModal({ isOpen, onClose, onFinish }) {
  const { profile, currentUser, updateProfile, addItem, wardrobe = [] } = useAuth();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState(() => {
    const isFemale = profile?.gender === 'Női' || profile?.gender === 'female';
    return {
      name: profile?.name || '',
      gender: isFemale ? 'Női' : 'Férfi',
      birthYear: profile?.birthYear || '',
      height: profile?.height || '',
      weight: profile?.weight || '',
      bodyType: profile?.bodyType || 'Normál / Átlagos',
      skinTone: profile?.skinTone || '',
      thermalPreference: profile?.thermalPreference || 'balanced',
      preferredStyles: profile?.preferredStyles?.length ? profile.preferredStyles : (isFemale ? ['Klasszikus & Nőies Chic', 'Smart Casual'] : ['Klasszikus & Időtlen', 'Smart Urban']),
      favoriteColors: profile?.favoriteColors || [],
      avoidColors: profile?.avoidColors || [],
      avatarUrl: profile?.avatarUrl || ''
    };
  });

  // Strict re-sync when profile, user or modal visibility changes (clean slate per user)
  useEffect(() => {
    if (isOpen && profile) {
      const isFemale = profile.gender === 'Női' || profile.gender === 'female';
      setFormData({
        name: profile.name || '',
        gender: isFemale ? 'Női' : 'Férfi',
        birthYear: profile.birthYear || '',
        height: profile.height || '',
        weight: profile.weight || '',
        bodyType: profile.bodyType || 'Normál / Átlagos',
        skinTone: profile.skinTone || '',
        thermalPreference: profile.thermalPreference || 'balanced',
        preferredStyles: Array.isArray(profile.preferredStyles) && profile.preferredStyles.length > 0 
          ? profile.preferredStyles 
          : (isFemale ? ['Klasszikus & Nőies Chic', 'Smart Casual'] : ['Klasszikus & Időtlen', 'Smart Urban']),
        favoriteColors: Array.isArray(profile.favoriteColors) ? profile.favoriteColors : [],
        avoidColors: Array.isArray(profile.avoidColors) ? profile.avoidColors : [],
        avatarUrl: profile.avatarUrl || ''
      });
      setCurrentStep(1);
    }
  }, [isOpen, currentUser?.uid, profile?.name, profile?.birthYear, profile?.gender]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    if (currentStep === 4) {
      // Skipping item addition goes straight to step 5 (summary)
      setCurrentStep(5);
    } else if (currentStep < TOTAL_STEPS) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleComplete = async () => {
    const updated = {
      ...profile,
      ...formData,
      onboardingCompleted: true,
      updatedAt: new Date().toISOString()
    };
    await updateProfile(updated);
    if (onFinish) {
      onFinish(updated);
    } else {
      onClose();
    }
  };

  const progressPercent = Math.round((currentStep / TOTAL_STEPS) * 100);

  const stepIcons = [
    { num: 1, label: 'Identitás', icon: User },
    { num: 2, label: 'Színtípus', icon: Palette },
    { num: 3, label: 'Stílusok', icon: Compass },
    { num: 4, label: '1. Ruha', icon: Shirt },
    { num: 5, label: 'Kész', icon: CheckCircle2 }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div 
        className="relative w-full max-w-2xl bg-[#0e131d] border border-[var(--border-gold)] rounded-2xl shadow-2xl p-5 sm:p-7 space-y-5 my-6 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header & Close */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#f59e0b] to-[#b45309] flex items-center justify-center text-black font-bold shadow-md shrink-0">
              <Sparkles className="w-4 h-4 text-[#080e1a]" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base sm:text-lg text-white">
                Stílusprofil Varázsló
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                {currentStep}. lépés az 5-ből • Személyre szabott öltözködési tanácsadás
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-white/10 transition-colors"
            title="Bezárás / Később folytatom"
            aria-label="Bezárás"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Bar & Indicator Pills */}
        <div className="space-y-2">
          <div className="w-full bg-black/60 h-1.5 rounded-full overflow-hidden border border-white/10">
            <div 
              className="h-full bg-gradient-to-r from-[#d4af37] via-[#f59e0b] to-[#10b981] transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between gap-1 text-[10px] text-[var(--text-muted)] pt-0.5">
            {stepIcons.map(({ num, label, icon: StepIcon }) => {
              const isDone = currentStep > num;
              const isCurrent = currentStep === num;
              return (
                <div 
                  key={num} 
                  className={`flex items-center gap-1 font-medium transition-colors ${
                    isCurrent 
                      ? 'text-[var(--accent-gold)] font-bold' 
                      : isDone 
                        ? 'text-emerald-400' 
                        : 'text-zinc-500'
                  }`}
                >
                  <StepIcon className="w-3 h-3" />
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sm:hidden">{num}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* STEP CONTENT CONTAINER */}
        <div className="pt-2">
          {currentStep === 1 && (
            <StepIdentity 
              formData={formData} 
              setFormData={setFormData} 
              onNext={handleNext} 
            />
          )}

          {currentStep === 2 && (
            <StepColorSeason 
              formData={formData} 
              setFormData={setFormData} 
              onNext={handleNext} 
              onBack={handleBack} 
              onSkip={handleSkip} 
            />
          )}

          {currentStep === 3 && (
            <StepStyles 
              formData={formData} 
              setFormData={setFormData} 
              onNext={handleNext} 
              onBack={handleBack} 
              onSkip={handleSkip} 
            />
          )}

          {currentStep === 4 && (
            <StepAddFirstItem 
              formData={formData} 
              onAddItem={addItem} 
              onNext={handleNext} 
              onBack={handleBack} 
              onSkip={handleSkip} 
            />
          )}

          {currentStep === 5 && (
            <StepSummaryLaunch 
              formData={formData} 
              wardrobeCount={wardrobe.length} 
              onComplete={handleComplete} 
            />
          )}
        </div>

      </div>
    </div>
  );
}
