import React, { useState, useEffect } from 'react';
import { 
  X, Sparkles, Download, Check, ShieldCheck, Cpu, HardDrive, 
  Trash2, Mail, Shield, ChevronRight, FileText, Table, RefreshCw, 
  ThermometerSnowflake, Sun, Scale, Layers, AlertTriangle, LogOut,
  User, CheckCircle2, Sliders, Activity, Database, UserPlus
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { exportWardrobeToPrintableHtml, exportWardrobeToCsv } from '../../services/exportService';
import { APP_VERSION, APP_BUILD_NAME } from '../../version';
import { isFirebaseConfigured } from '../../services/firebase';

export default function SettingsModal({ isOpen, onClose }) {
  const { 
    wardrobe, 
    profile, 
    updateProfile, 
    currentUser, 
    logout, 
    deleteUserAccountAndData,
    resetToDemoData, 
    isActualAdmin, 
    isAdmin, 
    isSimulatingUser, 
    toggleUserSimulation,
    preferredModel, 
    setPreferredModel,
    sartorialRules = [],
    adminEmails = [],
    addAdminEmail,
    removeAdminEmail,
    resetUserByUid
  } = useAuth();

  const [activeTab, setActiveTab] = useState('user'); // 'user' | 'admin'
  const [thermalPref, setThermalPref] = useState(() => profile?.thermalPreference || 'balanced');
  const [compactCards, setCompactCards] = useState(() => Boolean(profile?.displayCompactCards));
  const [compactTips, setCompactTips] = useState(() => Boolean(profile?.displayCompactTips));
  const [savedFeedback, setSavedFeedback] = useState(false);

  // Account deletion states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Admin states
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [targetUidToReset, setTargetUidToReset] = useState('');
  const [isResettingUser, setIsResettingUser] = useState(false);
  const [resetUserResult, setResetUserResult] = useState(null);

  // Sync profile when opened
  useEffect(() => {
    if (isOpen && profile) {
      setThermalPref(profile.thermalPreference || 'balanced');
      setCompactCards(Boolean(profile.displayCompactCards));
      setCompactTips(Boolean(profile.displayCompactTips));
      setShowDeleteConfirm(false);
      setDeleteError(null);
    }
  }, [isOpen, profile]);

  if (!isOpen) return null;

  const handleUpdateThermal = async (pref) => {
    setThermalPref(pref);
    const updated = {
      ...profile,
      thermalPreference: pref
    };
    await updateProfile(updated);
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 1500);
  };

  const handleToggleCompactCards = async () => {
    const nextVal = !compactCards;
    setCompactCards(nextVal);
    const updated = {
      ...profile,
      displayCompactCards: nextVal
    };
    await updateProfile(updated);
  };

  const handleToggleCompactTips = async () => {
    const nextVal = !compactTips;
    setCompactTips(nextVal);
    const updated = {
      ...profile,
      displayCompactTips: nextVal
    };
    await updateProfile(updated);
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    setDeleteError(null);
    try {
      await deleteUserAccountAndData();
      onClose();
    } catch (err) {
      setDeleteError(err.message || 'Nem sikerült a fiók törlése. Kérlek próbáld újra!');
      setIsDeletingAccount(false);
    }
  };

  const handleAddNewAdmin = async (e) => {
    e.preventDefault();
    const clean = newAdminEmail.trim();
    if (!clean) return;
    await addAdminEmail(clean);
    setNewAdminEmail('');
  };

  const handleResetUser = async () => {
    const cleanUid = targetUidToReset.trim();
    if (!cleanUid) return;
    if (!window.confirm(`Biztosan törölni akarod a(z) ${cleanUid} azonosítójú felhasználó adatait?`)) return;

    setIsResettingUser(true);
    setResetUserResult(null);
    const res = await resetUserByUid(cleanUid);
    setIsResettingUser(false);
    if (res.success) {
      setResetUserResult({ success: true, message: `✓ A(z) ${cleanUid} felhasználó adatai sikeresen törölve lettek.` });
      setTargetUidToReset('');
    } else {
      setResetUserResult({ success: false, message: `Hiba: ${res.error}` });
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="glass-card max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 border-[var(--border-gold)] space-y-5 animate-slide-up shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[var(--accent-gold)]" />
            <h3 className="font-serif font-bold text-lg text-white">
              {isActualAdmin && activeTab === 'admin' ? '👑 Admin Rendszerközpont' : 'Beállítások & Preferenciák'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-[var(--text-muted)] hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher - ONLY shown if user is an authenticated Admin */}
        {isActualAdmin && (
          <div className="flex rounded-xl bg-white/5 p-1 border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('user')}
              className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'user'
                  ? 'bg-[var(--accent-gold)] text-black font-bold shadow'
                  : 'text-[var(--text-muted)] hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Felhasználói Beállítások</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('admin')}
              className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'admin'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold shadow'
                  : 'text-[var(--text-muted)] hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>👑 Admin Központ</span>
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 1. FELHASZNÁLÓI BEÁLLÍTÁSOK (USER SETTINGS) */}
        {/* ========================================================================= */}
        {(!isActualAdmin || activeTab === 'user') && (
          <div className="space-y-5 animate-fade-in">
            
            {/* A. Személyes Hőérzet & Komfort (Natív AI Kontextus) */}
            <div className="bg-[#07090e]/60 p-4 rounded-xl border border-[var(--border-gold)]/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[var(--accent-gold)]" />
                  <span>Személyes Öltözködési Hőérzet</span>
                </span>
                {savedFeedback && (
                  <span className="text-[10px] text-emerald-400 font-bold animate-fade-in">
                    ✓ AI frissítve
                  </span>
                )}
              </div>

              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                Add meg a személyes hőérzetedet! A <strong>Gemini AI</strong> ezt natív kontextusként veszi figyelembe az aktuális időjárás, hőmérséklet és rétegezés tervezésekor:
              </p>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleUpdateThermal('coldSensitive')}
                  className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                    thermalPref === 'coldSensitive'
                      ? 'bg-amber-500/20 border-[var(--accent-gold)] text-amber-200 font-bold shadow-md shadow-amber-500/10'
                      : 'bg-white/5 border-white/5 text-[var(--text-muted)] hover:text-white hover:bg-white/10'
                  }`}
                >
                  <ThermometerSnowflake className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs">Fázósabb</span>
                  <span className="text-[9px] opacity-75 font-normal">Melegebb rétegek</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdateThermal('balanced')}
                  className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                    thermalPref === 'balanced'
                      ? 'bg-amber-500/20 border-[var(--accent-gold)] text-amber-200 font-bold shadow-md shadow-amber-500/10'
                      : 'bg-white/5 border-white/5 text-[var(--text-muted)] hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Scale className="w-4 h-4 text-[var(--accent-gold)]" />
                  <span className="text-xs">Normál</span>
                  <span className="text-[9px] opacity-75 font-normal">Kiegyensúlyozott</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdateThermal('warmSensitive')}
                  className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                    thermalPref === 'warmSensitive'
                      ? 'bg-amber-500/20 border-[var(--accent-gold)] text-amber-200 font-bold shadow-md shadow-amber-500/10'
                      : 'bg-white/5 border-white/5 text-[var(--text-muted)] hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="text-xs">Melegkedvelő</span>
                  <span className="text-[9px] opacity-75 font-normal">Szellős len/pamut</span>
                </button>
              </div>
            </div>

            {/* B. Megjelenési & Elrendezési Preferenciák */}
            <div className="bg-[#07090e]/60 p-4 rounded-xl border border-white/5 space-y-3">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[var(--accent-gold)]" />
                <span>Megjelenés & Elrendezés</span>
              </span>

              <div className="space-y-2 text-xs">
                {/* Compact Cards Toggle */}
                <div 
                  onClick={handleToggleCompactCards}
                  className="p-2.5 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer flex items-center justify-between transition-colors"
                >
                  <div>
                    <span className="text-white font-medium block">Kompakt Gardrób Kártyák</span>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      {compactCards ? 'Letisztult, minimalista kártyák a rácsban' : 'Részletes kártyák méret és anyag jelvényekkel'}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={compactCards}
                    onChange={() => {}}
                    className="w-4 h-4 accent-[var(--accent-gold)] cursor-pointer"
                  />
                </div>

                {/* Compact Tips Toggle */}
                <div 
                  onClick={handleToggleCompactTips}
                  className="p-2.5 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer flex items-center justify-between transition-colors"
                >
                  <div>
                    <span className="text-white font-medium block">Kompakt Szett Stílustippek</span>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      {compactTips ? 'Összecsukott, helytakarékos indoklások' : 'Részletes stílusharmónia és rétegezési leírások'}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={compactTips}
                    onChange={() => {}}
                    className="w-4 h-4 accent-[var(--accent-gold)] cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* C. Emberileg Értelmezhető Gardrób Exportálás */}
            <div className="bg-[#07090e]/60 p-4 rounded-xl border border-white/5 space-y-3">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Download className="w-4 h-4 text-[var(--accent-gold)]" />
                <span>Gardróbom Exportálása & Letöltése</span>
              </span>

              <p className="text-[11px] text-[var(--text-secondary)]">
                Töltsd le a teljes ruhatáradat nyomtatható magazin formátumban vagy táblázatként ({wardrobe.length} db ruha):
              </p>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => exportWardrobeToPrintableHtml(wardrobe, profile)}
                  className="btn-gold text-xs py-2 px-3 flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <FileText className="w-4 h-4" />
                  <span>Nyomtatható Magazin</span>
                </button>

                <button
                  type="button"
                  onClick={() => exportWardrobeToCsv(wardrobe)}
                  className="btn-secondary text-xs py-2 px-3 flex items-center justify-center gap-1.5"
                >
                  <Table className="w-4 h-4 text-emerald-400" />
                  <span>Excel / CSV Táblázat</span>
                </button>
              </div>

              <div className="pt-2 border-t border-white/5 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Visszaállítod a ruhatáradat a bemutató mintakollekció alapértékeire?')) {
                      resetToDemoData();
                      window.location.reload();
                    }
                  }}
                  className="text-[11px] text-amber-300 hover:text-amber-200 flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Minta Gardrób Visszaállítása</span>
                </button>
              </div>
            </div>

            {/* D. Fiók & GDPR Adattörlés */}
            <div className="bg-[#07090e]/60 p-4 rounded-xl border border-white/5 space-y-3">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <User className="w-4 h-4 text-[var(--accent-gold)]" />
                <span>Fiók & Adatvédelem (GDPR)</span>
              </span>

              <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-white/5">
                <div className="min-w-0">
                  <span className="text-white font-medium block truncate">
                    {currentUser ? currentUser.email : 'Vendég Munkamenet'}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">
                    {currentUser ? 'Felhő szinkronizáció aktív' : 'Helyi bemutató nézet'}
                  </span>
                </div>

                {currentUser && (
                  <button
                    type="button"
                    onClick={logout}
                    className="text-xs text-[var(--text-secondary)] hover:text-white px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 flex items-center gap-1 transition-colors"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>Kijelentkezés</span>
                  </button>
                )}
              </div>

              {/* GDPR Permanent Delete Button */}
              {!showDeleteConfirm ? (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-[11px] text-rose-400/80 hover:text-rose-300 flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Fiók és Saját Adatok Végleges Törlése (GDPR)</span>
                  </button>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 space-y-3 animate-scale-up text-xs">
                  <div className="flex items-start gap-2 text-rose-200">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-rose-300 mb-0.5">Biztosan törölni szeretnéd a fiókodat?</strong>
                      <p className="text-[11px] text-rose-200/90 leading-relaxed">
                        Ez a művelet <strong>100%-ban végleges</strong> és visszavonhatatlan. Minden mentett ruhád, szetted, stílusprofilod és képed azonnal törlődik a felhőből és az eszközödről.
                      </p>
                    </div>
                  </div>

                  {deleteError && (
                    <span className="text-[11px] text-rose-300 font-bold block">{deleteError}</span>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={isDeletingAccount}
                      className="btn-secondary text-xs py-1.5 px-3"
                    >
                      Mégse
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteAccount}
                      disabled={isDeletingAccount}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{isDeletingAccount ? 'Törlés folyamatban...' : 'Igen, Véglegesen Törlöm'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. ADMINISZTRÁTORI RENDSZERKÖZPONT (ADMIN CONSOLE) */}
        {/* ========================================================================= */}
        {isActualAdmin && activeTab === 'admin' && (
          <div className="space-y-4 animate-fade-in">
            
            {/* User Mode Simulation Banner for Admins */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-base">{isSimulatingUser ? '👁️' : '👑'}</span>
                <div>
                  <span className="font-bold text-amber-300 block">
                    {isSimulatingUser ? 'Felhasználói Nézet Teszt Aktív' : 'Adminisztrátori Mód'}
                  </span>
                  <span className="text-[10px] text-amber-200/80">
                    {isSimulatingUser ? 'Úgy látod az alkalmazást, mint egy normál felhasználó.' : 'Teljes hozzáférés a rendszervezérléshez.'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={toggleUserSimulation}
                className="btn-gold text-[10px] py-1.5 px-3 shrink-0 shadow-sm"
              >
                {isSimulatingUser ? 'Vissza Adminra' : 'User Nézet Tesztelése'}
              </button>
            </div>

            {/* AI Model Strategy */}
            <div className="space-y-2 bg-[#07090e]/60 p-3.5 rounded-xl border border-white/5">
              <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-amber-400" />
                <span>AI Modell Stratégia & Motor</span>
              </label>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPreferredModel('gemini-3.7-flash')}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    preferredModel === 'gemini-3.7-flash'
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-200 font-bold'
                      : 'bg-white/5 border-white/10 text-[var(--text-muted)] hover:text-white'
                  }`}
                >
                  <span className="text-xs block">Gemini 3.7 Flash</span>
                  <span className="text-[10px] opacity-75 font-normal">Deep Reasoning & Stílus</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreferredModel('gemini-3.5-flash-lite')}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    preferredModel === 'gemini-3.5-flash-lite'
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-200 font-bold'
                      : 'bg-white/5 border-white/10 text-[var(--text-muted)] hover:text-white'
                  }`}
                >
                  <span className="text-xs block">Gemini 3.5 Flash-Lite</span>
                  <span className="text-[10px] opacity-75 font-normal">Szupergyors & Gazdaságos</span>
                </button>
              </div>
            </div>

            {/* Admin Whitelist Management */}
            <div className="space-y-3 bg-[#07090e]/60 p-3.5 rounded-xl border border-white/5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  <span>👑 Feljogosított Adminisztrátorok ({adminEmails.length})</span>
                </label>
              </div>

              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {adminEmails.map((email) => (
                  <div key={email} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <Mail className="w-3.5 h-3.5 text-[var(--accent-gold)] shrink-0" />
                      <span className="font-mono text-white/90 truncate">{email}</span>
                    </div>
                    {adminEmails.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeAdminEmail(email)}
                        className="p-1 text-rose-400/70 hover:text-rose-300 rounded"
                        title="Törlés"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddNewAdmin} className="flex gap-2 pt-1">
                <input
                  type="email"
                  placeholder="uj.admin@gmail.com"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  className="custom-input text-xs flex-1 py-1.5 font-mono"
                />
                <button
                  type="submit"
                  disabled={!newAdminEmail.trim()}
                  className="btn-gold text-xs py-1.5 px-3 shrink-0 flex items-center gap-1"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Hozzáadás</span>
                </button>
              </form>
            </div>

            {/* System Diagnostics */}
            <div className="bg-[#07090e]/60 p-3.5 rounded-xl border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-white">
                <div className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Rendszerdiagnosztika</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  {APP_BUILD_NAME}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 text-[var(--text-muted)]">
                <div className="p-2 rounded-lg bg-white/5">
                  <span className="block text-[9px] uppercase tracking-wider">Ruhatár méret</span>
                  <span className="font-bold text-white text-xs">{wardrobe.length} db elem</span>
                </div>
                <div className="p-2 rounded-lg bg-white/5">
                  <span className="block text-[9px] uppercase tracking-wider">Sartorial Szabályok</span>
                  <span className="font-bold text-white text-xs">{sartorialRules.length} db aktív</span>
                </div>
              </div>
            </div>

            {/* User Reset Tool */}
            <div className="space-y-2 bg-[#07090e]/60 p-3.5 rounded-xl border border-white/5">
              <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Felhasználói Adatok Nullázása (UID alapján)</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Firebase UID..."
                  value={targetUidToReset}
                  onChange={(e) => setTargetUidToReset(e.target.value)}
                  className="custom-input text-xs flex-1 py-1.5 font-mono"
                />
                <button
                  type="button"
                  onClick={handleResetUser}
                  disabled={!targetUidToReset.trim() || isResettingUser}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-semibold shrink-0"
                >
                  {isResettingUser ? 'Törlés...' : 'Nullázás'}
                </button>
              </div>
              {resetUserResult && (
                <span className={`text-[11px] block ${resetUserResult.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {resetUserResult.message}
                </span>
              )}
            </div>

          </div>
        )}

        {/* Footer */}
        <div className="pt-2 text-center text-[10px] text-[var(--text-muted)] font-mono tracking-wider border-t border-white/5">
          Sartorial Wardrobe Assistant • {APP_BUILD_NAME} (v{APP_VERSION})
        </div>

      </div>
    </div>
  );
}
