import React, { useState } from 'react';
import { X, Key, Database, Sparkles, RotateCcw, Download, Check, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { isFirebaseConfigured } from '../../services/firebase';
import { isGeminiConfigured } from '../../services/gemini';

export default function SettingsModal({ isOpen, onClose }) {
  const { wardrobe, resetToDemoData } = useAuth();

  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem('GEMINI_API_KEY') || '');
  const [firebaseApiKey, setFirebaseApiKey] = useState(() => localStorage.getItem('VITE_FIREBASE_API_KEY') || '');
  const [firebaseProjectId, setFirebaseProjectId] = useState(() => localStorage.getItem('VITE_FIREBASE_PROJECT_ID') || '');
  const [firebaseAuthDomain, setFirebaseAuthDomain] = useState(() => localStorage.getItem('VITE_FIREBASE_AUTH_DOMAIN') || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSaveKeys = (e) => {
    e.preventDefault();
    if (geminiKey) localStorage.setItem('GEMINI_API_KEY', geminiKey.trim());
    if (firebaseApiKey) localStorage.setItem('VITE_FIREBASE_API_KEY', firebaseApiKey.trim());
    if (firebaseProjectId) localStorage.setItem('VITE_FIREBASE_PROJECT_ID', firebaseProjectId.trim());
    if (firebaseAuthDomain) localStorage.setItem('VITE_FIREBASE_AUTH_DOMAIN', firebaseAuthDomain.trim());

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      window.location.reload();
    }, 1200);
  };

  const handleExportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(wardrobe, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `wardrobe-backup-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="modal-backdrop">
      <div className="glass-card max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 border-[var(--border-gold)] space-y-5 animate-slide-up">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-[var(--accent-gold)]" />
            <h3 className="font-serif font-bold text-lg text-white">Beállítások & API Integráció</h3>
          </div>
          <button onClick={onClose} className="p-1 text-[var(--text-muted)] hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form for Keys */}
        <form onSubmit={handleSaveKeys} className="space-y-4">
          
          {/* Gemini API Key */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                <span>Google Gemini API Kulcs</span>
              </label>
              <span className={`text-[10px] ${isGeminiConfigured() ? 'text-emerald-400 font-bold' : 'text-[var(--text-muted)]'}`}>
                {isGeminiConfigured() ? '✓ Aktív' : 'Beépített AI motor fut'}
              </span>
            </div>
            <input
              type="password"
              placeholder="AIzaSy..."
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              className="custom-input text-xs font-mono"
            />
            <p className="text-[10px] text-[var(--text-muted)]">
              Képfelismeréshez és egyedi stíluselemzéshez (ingyenesen lekérhető: aistudio.google.com).
            </p>
          </div>

          {/* Firebase Keys */}
          <div className="space-y-3 pt-3 border-t border-white/5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-amber-400" />
                <span>Firebase Konfiguráció</span>
              </label>
              <span className={`text-[10px] ${isFirebaseConfigured ? 'text-emerald-400 font-bold' : 'text-[var(--text-muted)]'}`}>
                {isFirebaseConfigured ? '✓ Csatlakoztatva' : 'Helyi DB aktív'}
              </span>
            </div>

            <div>
              <label className="block text-[11px] text-[var(--text-muted)] mb-1">Firebase API Key</label>
              <input
                type="text"
                placeholder="AIzaSy..."
                value={firebaseApiKey}
                onChange={(e) => setFirebaseApiKey(e.target.value)}
                className="custom-input text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] text-[var(--text-muted)] mb-1">Project ID</label>
              <input
                type="text"
                placeholder="wardrobe-assistant-123"
                value={firebaseProjectId}
                onChange={(e) => setFirebaseProjectId(e.target.value)}
                className="custom-input text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] text-[var(--text-muted)] mb-1">Auth Domain</label>
              <input
                type="text"
                placeholder="wardrobe-assistant-123.firebaseapp.com"
                value={firebaseAuthDomain}
                onChange={(e) => setFirebaseAuthDomain(e.target.value)}
                className="custom-input text-xs font-mono"
              />
            </div>
          </div>

          <button type="submit" className="btn-gold w-full text-xs">
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Mentve! Újratöltés...</span>
              </>
            ) : (
              <span>API Kulcsok Mentése</span>
            )}
          </button>
        </form>

        {/* Data Utilities */}
        <div className="pt-4 border-t border-white/10 space-y-2">
          <span className="text-xs font-semibold text-white block">Adatkezelés & Mentés</span>
          
          <div className="flex gap-2">
            <button
              onClick={handleExportData}
              className="btn-secondary flex-1 text-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Mentés JSON-be</span>
            </button>

            <button
              onClick={() => {
                if (window.confirm('Visszaállítod a ruhatárat a beépített olasz sprezzatura alapértékekre?')) {
                  resetToDemoData();
                  window.location.reload();
                }
              }}
              className="btn-secondary flex-1 text-xs text-amber-300 hover:text-amber-200"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Alapadatok Betöltése</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
