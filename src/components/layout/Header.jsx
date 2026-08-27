import React from 'react';
import { Sparkles, User, Settings, LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Header({ onOpenSettings, onOpenAuth, weather }) {
  const { currentUser, isDemoMode, wardrobe } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-[var(--border-subtle)] px-4 py-3 sm:px-8">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#d4af37] to-[#8c6b12] flex items-center justify-center shadow-lg shadow-[#d4af37]/20">
            <Sparkles className="w-5 h-5 text-[#0a0b0e]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight font-serif gold-gradient-text">
                WARDROBE ASSISTANT
              </h1>
              <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-[var(--accent-gold-glow)] text-[var(--accent-gold-light)] border border-[var(--border-gold)]">
                AI Stylist
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] hidden xs:block">
              Személyes gardrób & 3-outfit döntéstámogató
            </p>
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
                <img src={currentUser.photoURL} alt="Avatar" className="w-5 h-5 rounded-full object-cover" />
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
