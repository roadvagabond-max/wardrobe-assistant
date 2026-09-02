import React from 'react';
import { Sparkles, User, Settings, LogIn, ShieldAlert, HelpCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Header({ onOpenSettings, onOpenAuth, onOpenHelp, weather }) {
  const { currentUser, isDemoMode, wardrobe, isAdmin, isSimulatingUser, toggleUserSimulation } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-[var(--border-subtle)] px-4 py-3 sm:px-8">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#f59e0b] to-[#b45309] flex items-center justify-center shadow-lg shadow-[#f59e0b]/25">
            <Sparkles className="w-5 h-5 text-[#080e1a]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight font-serif gold-gradient-text">
                SARTORIAL WARDROBE
              </h1>
              {isAdmin ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/10 animate-pulse">
                  <span>👑</span>
                  <span>Admin</span>
                </span>
              ) : isSimulatingUser ? (
                <button
                  onClick={toggleUserSimulation}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-all cursor-pointer animate-pulse"
                  title="Kattints ide a visszalépéshez az Adminisztrátori Módba"
                >
                  <span>👁️</span>
                  <span>User Teszt (Vissza Adminra)</span>
                </button>
              ) : (
                <span className="hidden sm:inline-block px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider rounded-full bg-[var(--accent-gold-glow)] text-[var(--accent-gold-light)] border border-[var(--border-gold)]">
                  AI Assistant
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          
          {/* Real-time Weather Pill */}
          {weather && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs">
              <span className="text-base">{weather.icon}</span>
              <span className="font-medium text-white">{weather.city}</span>
              <span className="text-[var(--accent-gold)] font-bold">{weather.temperature}°C</span>
            </div>
          )}

          {/* Wardrobe count badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-[var(--text-secondary)]">
            <span className="w-2 h-2 rounded-full bg-[var(--accent-gold)] animate-pulse"></span>
            <span>{wardrobe.length} db ruha</span>
          </div>

          {/* Sartorial Help Guide Button */}
          <button 
            onClick={onOpenHelp}
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:text-amber-200 transition-all flex items-center gap-1.5 shadow-sm"
            title="Sartorial Útmutató & Súgó"
            aria-label="Súgó és Útmutató megnyitása"
          >
            <HelpCircle className="w-4 h-4 sm:w-4 sm:h-4 text-[var(--accent-gold)]" />
            <span className="hidden md:inline text-xs font-semibold text-amber-200">Súgó</span>
          </button>

          {/* Settings Modal Button */}
          <button 
            onClick={onOpenSettings}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[var(--text-secondary)] hover:text-white transition-colors"
            title="Beállítások & API Kulcsok"
          >
            <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Auth Button */}
          {currentUser ? (
            <button 
              onClick={onOpenAuth}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-all"
            >
              {currentUser.photoURL ? (
                <img src={currentUser.photoURL} alt="Avatar" width="20" height="20" className="w-5 h-5 rounded-full object-cover" />
              ) : (
                <User className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">{currentUser.displayName || currentUser.email?.split('@')[0]}</span>
            </button>
          ) : (
            <button 
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--accent-gold-glow)] border border-[var(--border-gold)] text-[var(--accent-gold-light)] text-xs font-semibold hover:bg-[var(--accent-gold)] hover:text-black transition-all"
            >
              <LogIn className="w-4 h-4" />
              <span>{isDemoMode ? 'Demo Mód / Belépés' : 'Bejelentkezés'}</span>
            </button>
          )}

        </div>
      </div>
    </header>
  );
}
