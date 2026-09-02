import React, { useState, useEffect } from 'react';
import { X, Key, Database, Sparkles, RotateCcw, Download, Check, Eye, EyeOff, Play, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { isFirebaseConfigured } from '../../services/firebase';
import { isGeminiConfigured, testGeminiApiKey } from '../../services/gemini';

export default function SettingsModal({ isOpen, onClose }) {
  const { wardrobe, resetToDemoData, geminiApiKey: contextGeminiKey, saveGeminiApiKey } = useAuth();

  const [geminiKey, setGeminiKey] = useState(() => {
    return (localStorage.getItem('GEMINI_API_KEY') || contextGeminiKey || '').trim();
  });
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [testStatus, setTestStatus] = useState({ testing: false, message: '', success: null });
  const [firebaseApiKey, setFirebaseApiKey] = useState(() => localStorage.getItem('VITE_FIREBASE_API_KEY') || '');
  const [firebaseProjectId, setFirebaseProjectId] = useState(() => localStorage.getItem('VITE_FIREBASE_PROJECT_ID') || '');
  const [firebaseAuthDomain, setFirebaseAuthDomain] = useState(() => localStorage.getItem('VITE_FIREBASE_AUTH_DOMAIN') || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync state whenever modal is opened
  useEffect(() => {
    if (isOpen) {
      const current = (contextGeminiKey || localStorage.getItem('GEMINI_API_KEY') || '').trim();
      setGeminiKey(current);
      setFirebaseApiKey(localStorage.getItem('VITE_FIREBASE_API_KEY') || '');
      setFirebaseProjectId(localStorage.getItem('VITE_FIREBASE_PROJECT_ID') || '');
      setFirebaseAuthDomain(localStorage.getItem('VITE_FIREBASE_AUTH_DOMAIN') || '');
      setTestStatus({ testing: false, message: '', success: null });
      setSavedSuccess(false);
    }
  }, [isOpen, contextGeminiKey]);

  if (!isOpen) return null;

  const handleTestKey = async () => {
    const clean = geminiKey.trim();
    if (!clean) return;
    setTestStatus({ testing: true, message: '', success: null });
    const result = await testGeminiApiKey(clean);
    setTestStatus({ testing: false, message: result.message, success: result.success });
  };

  const handleSaveKeys = async (e) => {
    e.preventDefault();
    const cleanGeminiKey = geminiKey ? geminiKey.trim() : '';
    await saveGeminiApiKey(cleanGeminiKey);

    if (firebaseApiKey) localStorage.setItem('VITE_FIREBASE_API_KEY', firebaseApiKey.trim());
    if (firebaseProjectId) localStorage.setItem('VITE_FIREBASE_PROJECT_ID', firebaseProjectId.trim());
    if (firebaseAuthDomain) localStorage.setItem('VITE_FIREBASE_AUTH_DOMAIN', firebaseAuthDomain.trim());

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1000);
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

  const isKeyActive = isGeminiConfigured(geminiKey);

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
          <div className="space-y-2 bg-[#07090e]/60 p-3.5 rounded-xl border border-white/5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                <span>Google Gemini API Kulcs</span>
              </label>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                isKeyActive 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {isKeyActive ? '✓ Aktív Kulcs' : '⚠️ Nincs Beállítva'}
              </span>
            </div>

            <div className="relative">
              <input
                type={showGeminiKey ? "text" : "password"}
                id="settings-gemini-key-input"
                name="geminiApiKey"
                aria-label="Google Gemini API Kulcs"
                placeholder="AQ.Ab... vagy AIzaSy..."
                value={geminiKey}
                onChange={(e) => {
                  setGeminiKey(e.target.value);
                  setTestStatus({ testing: false, message: '', success: null });
                }}
                className="custom-input text-xs font-mono pr-10"
              />
              <button
                type="button"
                onClick={() => setShowGeminiKey(prev => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-white transition-colors"
                title={showGeminiKey ? "Kulcs elrejtése" : "Kulcs megjelenítése"}
              >
                {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Live Format & Test Button Row */}
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <div className="text-[10px]">
                {geminiKey ? (
                  <span className="text-emerald-400 font-medium flex items-center gap-1">✓ API Kulcs Megadva ({geminiKey.slice(0, 6)}...)</span>
                ) : (
                  <span className="text-[var(--text-muted)]">Nincs kulcs megadva</span>
                )}
              </div>

              <button
                type="button"
                onClick={handleTestKey}
                disabled={!geminiKey || testStatus.testing}
                className="text-[10px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/90 hover:text-white border border-white/10 disabled:opacity-30 flex items-center gap-1 transition-all"
              >
                {testStatus.testing ? <Loader2 className="w-3 h-3 animate-spin text-[var(--accent-gold)]" /> : <Play className="w-3 h-3 text-[var(--accent-gold)]" />}
                <span>{testStatus.testing ? 'Tesztelés...' : 'Kapcsolat Tesztelése'}</span>
              </button>
            </div>

            {/* Test Status Feedback */}
            {testStatus.message && (
              <div className={`p-2 rounded-lg text-[11px] border leading-relaxed ${
                testStatus.success 
                  ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200' 
                  : 'bg-rose-950/50 border-rose-500/40 text-rose-200'
              }`}>
                {testStatus.message}
              </div>
            )}
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
              <label htmlFor="settings-firebase-api-key" className="block text-[11px] text-[var(--text-muted)] mb-1">Firebase API Key</label>
              <input
                type="text"
                id="settings-firebase-api-key"
                name="firebaseApiKey"
                aria-label="Firebase API Key"
                placeholder="AIzaSy..."
                value={firebaseApiKey}
                onChange={(e) => setFirebaseApiKey(e.target.value)}
                className="custom-input text-xs font-mono"
              />
            </div>

            <div>
              <label htmlFor="settings-firebase-project-id" className="block text-[11px] text-[var(--text-muted)] mb-1">Project ID</label>
              <input
                type="text"
                id="settings-firebase-project-id"
                name="firebaseProjectId"
                aria-label="Firebase Project ID"
                placeholder="wardrobe-assistant-123"
                value={firebaseProjectId}
                onChange={(e) => setFirebaseProjectId(e.target.value)}
                className="custom-input text-xs font-mono"
              />
            </div>

            <div>
              <label htmlFor="settings-firebase-auth-domain" className="block text-[11px] text-[var(--text-muted)] mb-1">Auth Domain</label>
              <input
                type="text"
                id="settings-firebase-auth-domain"
                name="firebaseAuthDomain"
                aria-label="Firebase Auth Domain"
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
