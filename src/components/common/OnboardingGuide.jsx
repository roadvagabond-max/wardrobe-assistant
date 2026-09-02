import React, { useState } from 'react';
import { 
  Sparkles, Camera, Shirt, Sliders, CheckCircle2, Circle, ArrowRight, 
  ChevronDown, ChevronUp, X, HelpCircle, ShieldCheck, HeartHandshake,
  Compass, ShoppingBag, Layers, AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function OnboardingGuide({ onNavigateTab, onOpenAddModal }) {
  const { profile, wardrobe, savedOutfits = [] } = useAuth();

  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sartorial_onboarding_collapsed') === 'true';
  });
  const [isHidden, setIsHidden] = useState(() => {
    return localStorage.getItem('sartorial_onboarding_hidden') === 'true';
  });

  React.useEffect(() => {
    const handleShowOnboarding = () => {
      setIsHidden(false);
      setIsCollapsed(false);
      try {
        localStorage.removeItem('sartorial_onboarding_hidden');
        localStorage.removeItem('sartorial_onboarding_collapsed');
      } catch (_) {}
    };
    window.addEventListener('show-onboarding', handleShowOnboarding);
    return () => window.removeEventListener('show-onboarding', handleShowOnboarding);
  }, []);

  // Dynamic step completion logic
  const isStep1Done = Boolean(profile.avatarUrl || (profile.skinTone && !profile.skinTone.includes('Közép tónus')));
  const isStep2Done = (wardrobe || []).length >= 3;
  const isStep3Done = (wardrobe || []).some(w => w.size && w.size.trim() !== '') && (wardrobe || []).some(w => w.condition);
  const isStep4Done = Boolean(profile.customStylingRules && profile.customStylingRules.length > 0);
  const isStep5Done = savedOutfits.length > 0 || (wardrobe || []).length >= 5;

  const steps = [
    {
      id: 1,
      done: isStep1Done,
      badge: '1. Lépés',
      title: 'Portré / Szelfi fotó a Színtípushoz',
      desc: 'Tölts fel egy természetes fényű képet magadról a Stílus DNS fülön! A Gemini 3.7 Flash AI meghatározza a 12 évszakos színtípusodat és a hozzád legjobban passzoló színpalettát.',
      actionText: 'Irány a Stílus DNS',
      action: () => onNavigateTab('profile')
    },
    {
      id: 2,
      done: isStep2Done,
      badge: '2. Lépés',
      title: 'Aktuális szezonális ruháid feltöltése',
      desc: 'Kezdd a mostani évszakban (pl. tavasz/nyár vagy ősz/tél) hordott alapdarabjaiddal (ingek, nadrágok, zakó, cipő), hogy az AI Stylist azonnal hiteles, mai napi szetteket tudjon generálni!',
      actionText: 'Ruha Hozzáadása',
      action: onOpenAddModal
    },
    {
      id: 3,
      done: isStep3Done,
      badge: '3. Lépés',
      title: 'Ruhaállapot & Illeszkedés ellenőrzése',
      desc: 'Csak olyan ruhát rögzíts, ami ma is tökéletesen passzol rád és kényelmes. A kinőtt vagy leharcolt darabokat hagyd ki, a kopottabbakat pedig állítsd "Játszós" vagy "Lecserélendő" állapotra!',
      actionText: 'Gardrób Átnézése',
      action: () => onNavigateTab('wardrobe')
    },
    {
      id: 4,
      done: isStep4Done,
      badge: '4. Lépés',
      title: 'Egyéni stílusszabályok rögzítése',
      desc: 'Add meg saját tiltásaidat és elveidet szabad szöveggel a Stílus DNS-ben (pl. "Nem szeretem a műszálat", "Kerülöm a skinny szabást"). Az AI minden szettnél szigorúan betartja!',
      actionText: 'Szabályok Megadása',
      action: () => onNavigateTab('profile')
    },
    {
      id: 5,
      done: isStep5Done,
      badge: '5. Lépés',
      title: 'Esemény szett generálása & Próbafülke teszt',
      desc: 'Próbáld ki a Stylist fület egy konkrét eseményre (pl. randevú, üzleti tárgyalás), és nézd meg a Tanácsadót, ha legközelebb webshopban vagy próbafülkében vásárolsz!',
      actionText: 'Stylist Kipróbálása',
      action: () => onNavigateTab('stylist')
    }
  ];

  const completedCount = steps.filter(s => s.done).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem('sartorial_onboarding_collapsed', String(next));
  };

  const handleDismiss = () => {
    setIsHidden(true);
    localStorage.setItem('sartorial_onboarding_hidden', 'true');
  };

  if (isHidden) {
    return null;
  }

  return (
    <div className="glass-card border-[var(--border-gold)]/70 bg-gradient-to-br from-[#0c1017]/95 via-[#131a26]/90 to-[#1e1708]/85 p-4 sm:p-6 shadow-xl relative overflow-hidden animate-slide-up mb-6">
      
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

      {/* Header Row */}
      <div className="flex items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#d4af37] to-[#8a6b18] flex items-center justify-center text-black font-bold shadow-md shrink-0">
            <Compass className="w-5 h-5 text-[#07090e]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="badge badge-gold text-[10px] uppercase font-bold tracking-wider">
                Gyors Útmutató
              </span>
              <span className="text-[11px] text-[var(--accent-gold-light)] font-medium">
                {completedCount} / {steps.length} lépés kész ({progressPercent}%)
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-serif font-bold text-white mt-0.5">
              Hogyan hozd ki a legtöbbet a digitális gardróbodból?
            </h3>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={toggleCollapse}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[var(--text-secondary)] hover:text-white transition-colors"
            title={isCollapsed ? 'Kinyitás' : 'Összecsukás'}
            aria-label="Útmutató összecsukása"
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          <button
            onClick={handleDismiss}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[var(--text-muted)] hover:text-rose-400 transition-colors"
            title="Útmutató elrejtése"
            aria-label="Útmutató elrejtése"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-black/50 h-2 rounded-full overflow-hidden mt-3.5 border border-white/10">
        <div 
          className="h-full bg-gradient-to-r from-[#d4af37] via-[#f59e0b] to-[#10b981] transition-all duration-700 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Expanded Content */}
      {!isCollapsed && (
        <div className="mt-5 space-y-3 relative z-10 animate-fade-in">
          
          {/* Important Quick Tips Banner */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs text-amber-200/90">
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-[var(--accent-gold)] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-100">Aranyszabály az induláshoz: </span>
                <span>Mindig a <strong>mostani szezonban hordott ruháiddal kezdd</strong> a feltöltést, és csak olyan darabokat rögzíts, amelyek <strong>méretben és állapotban ma is tökéletesen passzolnak rád</strong>!</span>
              </div>
            </div>
          </div>

          {/* Steps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {steps.map(step => (
              <div
                key={step.id}
                className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                  step.done 
                    ? 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/50' 
                    : 'bg-black/40 border-white/10 hover:border-[var(--border-gold)]/60'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      step.done 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                        : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    }`}>
                      {step.badge}
                    </span>
                    {step.done ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Kész</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                        <Circle className="w-3.5 h-3.5" />
                        <span>Teendő</span>
                      </span>
                    )}
                  </div>

                  <h4 className={`text-sm font-bold font-serif ${step.done ? 'text-emerald-100' : 'text-white'}`}>
                    {step.title}
                  </h4>

                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                    {step.desc}
                  </p>
                </div>

                <div className="pt-3 mt-2 border-t border-white/5 flex items-center justify-between">
                  <button
                    onClick={step.action}
                    className={`text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      step.done
                        ? 'text-emerald-400 hover:text-emerald-300'
                        : 'text-[var(--accent-gold)] hover:text-amber-200'
                    }`}
                  >
                    <span>{step.actionText}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 text-[11px] text-[var(--text-muted)]">
            <span>💡 Tipp: Bármikor újra megnyithatod a jobb felső sarokban található <strong>❓ Súgó</strong> gombbal.</span>
            <button
              onClick={handleDismiss}
              className="text-[var(--text-muted)] hover:text-white underline cursor-pointer"
            >
              Értem, elrejtés
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
