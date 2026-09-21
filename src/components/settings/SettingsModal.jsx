import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Sparkles, Download, Check, ShieldCheck, Cpu, HardDrive, 
  Trash2, Mail, Shield, ChevronRight, FileText, Table, RefreshCw, 
  ThermometerSnowflake, Sun, Scale, Layers, AlertTriangle, LogOut,
  User, CheckCircle2, Sliders, Activity, Database, UserPlus
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { exportWardrobeToPrintableHtml, exportWardrobeToCsv } from '../../services/exportService';
import { APP_VERSION, APP_BUILD_NAME } from '../../version';
import AppLogo from '../common/AppLogo';

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
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const isGoogleUser = currentUser?.providerData?.some(p => p.providerId === 'google.com');
  const isPasswordUser = currentUser?.providerData?.some(p => p.providerId === 'password');

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
      setDeletePassword('');
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
    if (isPasswordUser && !deletePassword.trim()) {
      setDeleteError('Kérlek add meg a jelszavadat a fiók törlésének megerősítéséhez!');
      return;
    }
    setIsDeletingAccount(true);
    setDeleteError(null);
    try {
      await deleteUserAccountAndData({ password: deletePassword });
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

  return createPortal(
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[#0a0e17] border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 max-h-[85vh] flex flex-col shadow-2xl overflow-hidden my-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <AppLogo className="w-8 h-8 shrink-0 shadow-sm" />
            <h3 className="font-serif font-bold text-base sm:text-lg text-white">
              {isActualAdmin && activeTab === 'admin' ? '👑 Admin Rendszerközpont' : 'Beállítások & Preferenciák'}
            </h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-[#0d121c] border border-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher - ONLY shown if user is an authenticated Admin */}
        {isActualAdmin && (
          <div className="flex rounded-xl bg-[#0d121c] p-1 border border-slate-800 text-xs shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('user')}
              className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'user'
                  ? 'bg-slate-200 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Felhasználói Beállítások</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('admin')}
              className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>👑 Admin Központ</span>
            </button>
          </div>
        )}

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain space-y-4 pr-1 scrollbar-thin">
          
          {/* ========================================================================= */}
          {/* 1. FELHASZNÁLÓI BEÁLLÍTÁSOK (USER SETTINGS) */}
          {/* ========================================================================= */}
          {(!isActualAdmin || activeTab === 'user') && (
            <div className="space-y-4">
              
              {/* A. Személyes Hőérzet & Komfort */}
              <div className="bg-[#0d121c] p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Személyes Öltözködési Hőérzet</span>
                  </span>
                  {savedFeedback && (
                    <span className="text-[10px] text-emerald-400 font-bold animate-fade-in">
                      ✓ AI frissítve
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Add meg a személyes hőérzetedet! Az AI ezt natív kontextusként veszi figyelembe az aktuális időjárás és rétegezés tervezésekor:
                </p>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateThermal('coldSensitive')}
                    className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1 cursor-pointer ${
                      thermalPref === 'coldSensitive'
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-200 font-bold shadow'
                        : 'bg-[#070a12] border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <ThermometerSnowflake className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs">Fázósabb</span>
                    <span className="text-[9px] opacity-75 font-normal">Melegebb rétegek</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUpdateThermal('balanced')}
                    className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1 cursor-pointer ${
                      thermalPref === 'balanced'
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-200 font-bold shadow'
                        : 'bg-[#070a12] border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Scale className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs">Normál</span>
                    <span className="text-[9px] opacity-75 font-normal">Kiegyensúlyozott</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUpdateThermal('warmSensitive')}
                    className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1 cursor-pointer ${
                      thermalPref === 'warmSensitive'
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-200 font-bold shadow'
                        : 'bg-[#070a12] border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Sun className="w-4 h-4 text-amber-400" />
                    <span className="text-xs">Melegkedvelő</span>
                    <span className="text-[9px] opacity-75 font-normal">Szellős pamut/len</span>
                  </button>
                </div>
              </div>

              {/* B. Megjelenési & Elrendezési Preferenciák */}
              <div className="bg-[#0d121c] p-4 rounded-2xl border border-slate-800 space-y-3">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span>Megjelenés & Elrendezés</span>
                </span>

                <div className="space-y-2 text-xs">
                  {/* Compact Cards Toggle */}
                  <div 
                    onClick={handleToggleCompactCards}
                    className="p-2.5 rounded-xl bg-[#070a12] hover:bg-[#0a0f18] cursor-pointer flex items-center justify-between border border-slate-800/80 transition-colors"
                  >
                    <div>
                      <span className="text-white font-medium block">Kompakt Gardrób Kártyák</span>
                      <span className="text-[10px] text-slate-400">
                        {compactCards ? 'Letisztult, minimalista kártyák a rácsban' : 'Részletes kártyák méret és anyag jelvényekkel'}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={compactCards}
                      onChange={() => {}}
                      className="w-4 h-4 accent-amber-400 cursor-pointer"
                    />
                  </div>

                  {/* Compact Tips Toggle */}
                  <div 
                    onClick={handleToggleCompactTips}
                    className="p-2.5 rounded-xl bg-[#070a12] hover:bg-[#0a0f18] cursor-pointer flex items-center justify-between border border-slate-800/80 transition-colors"
                  >
                    <div>
                      <span className="text-white font-medium block">Kompakt Szett Stílustippek</span>
                      <span className="text-[10px] text-slate-400">
                        {compactTips ? 'Összecsukott, helytakarékos indoklások' : 'Részletes stílusharmónia és rétegezési leírások'}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={compactTips}
                      onChange={() => {}}
                      className="w-4 h-4 accent-amber-400 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* C. Gardrób Exportálás & Letöltés */}
              <div className="bg-[#0d121c] p-4 rounded-2xl border border-slate-800 space-y-3">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-amber-400" />
                  <span>Gardróbom Exportálása & Letöltése</span>
                </span>

                <p className="text-[11px] text-slate-400">
                  Töltsd le a teljes ruhatáradat nyomtatható magazin formátumban vagy táblázatként ({wardrobe.length} db ruha):
                </p>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => exportWardrobeToPrintableHtml(wardrobe, profile)}
                    className="bg-slate-200 hover:bg-white text-slate-950 font-bold text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow transition-colors cursor-pointer"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Nyomtatható Magazin</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => exportWardrobeToCsv(wardrobe)}
                    className="bg-[#070a12] hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Table className="w-4 h-4 text-emerald-400" />
                    <span>Excel / CSV Táblázat</span>
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-800 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Visszaállítod a ruhatáradat a bemutató kollekció alapértékeire?')) {
                        resetToDemoData();
                        window.location.reload();
                      }
                    }}
                    className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Minta Gardrób Visszaállítása</span>
                  </button>
                </div>
              </div>

              {/* D. Fiók & GDPR Adattörlés */}
              <div className="bg-[#0d121c] p-4 rounded-2xl border border-slate-800 space-y-3">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <User className="w-4 h-4 text-amber-400" />
                  <span>Fiók & Adatvédelem</span>
                </span>

                <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-[#070a12] border border-slate-800">
                  <div className="min-w-0">
                    <span className="text-white font-medium block truncate">
                      {currentUser ? currentUser.email : 'Vendég Munkamenet'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {currentUser ? 'Felhő szinkronizáció aktív' : 'Helyi bemutató nézet'}
                    </span>
                  </div>

                  {currentUser && (
                    <button
                      type="button"
                      onClick={logout}
                      className="text-xs text-rose-300 hover:text-white px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 flex items-center gap-1 transition-colors cursor-pointer"
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
                      className="text-[11px] text-rose-400/80 hover:text-rose-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Fiók és Saját Adatok Végleges Törlése (GDPR)</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/40 space-y-3 animate-scale-up text-xs">
                    <div className="flex items-start gap-2 text-rose-200">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-rose-300 mb-0.5">Biztosan törölni szeretnéd a fiókodat?</strong>
                        <p className="text-[11px] text-rose-200/90 leading-relaxed">
                          Ez a művelet <strong>100%-ban végleges</strong> és visszavonhatatlan. Minden mentett ruhád, szetted, stílusprofilod azonnal törlődik.
                        </p>
                      </div>
                    </div>

                    {isPasswordUser && (
                      <div className="space-y-1 pt-1 bg-black/40 p-2.5 rounded-xl border border-rose-500/30">
                        <label className="text-[11px] font-semibold text-rose-200 block">
                          A törlés megerősítéséhez kérlek add meg a jelszavadat:
                        </label>
                        <input
                          type="password"
                          value={deletePassword}
                          onChange={(e) => setDeletePassword(e.target.value)}
                          placeholder="Jelenlegi jelszavad..."
                          disabled={isDeletingAccount}
                          className="w-full text-xs p-2 rounded-lg bg-black/60 border border-rose-500/40 text-white placeholder-rose-300/40 focus:outline-none focus:border-rose-400"
                          autoFocus
                        />
                      </div>
                    )}

                    {isGoogleUser && (
                      <div className="p-2.5 rounded-xl bg-black/40 border border-rose-500/30 text-[11px] text-rose-200/90 leading-relaxed">
                        🔒 A törlés véglegesítéséhez a Google fiókoddal szükséges jóváhagynod a műveletet a felugró ablakban.
                      </div>
                    )}

                    {deleteError && (
                      <div className="p-2.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-[11px] text-rose-200 font-bold block">
                        ⚠️ {deleteError}
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setDeletePassword('');
                          setDeleteError(null);
                        }}
                        disabled={isDeletingAccount}
                        className="bg-[#070a12] text-slate-300 hover:text-white px-3 py-1.5 rounded-lg text-xs border border-slate-700 cursor-pointer"
                      >
                        Mégse
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteAccount}
                        disabled={isDeletingAccount}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{isDeletingAccount ? 'Törlés folyamatban...' : isGoogleUser ? 'Google Jóváhagyás & Törlés' : 'Igen, Véglegesen Törlöm'}</span>
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
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs">
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
                  className="bg-slate-200 hover:bg-white text-slate-950 font-bold text-[10px] py-1.5 px-3 rounded-lg shadow-sm cursor-pointer"
                >
                  {isSimulatingUser ? 'Vissza Adminra' : 'User Nézet Tesztelése'}
                </button>
              </div>

              {/* AI Model Strategy */}
              <div className="space-y-2 bg-[#0d121c] p-3.5 rounded-2xl border border-slate-800">
                <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-amber-400" />
                  <span>AI Modell Stratégia & Motor</span>
                </label>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setPreferredModel('gemini-3.7-flash')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      preferredModel === 'gemini-3.7-flash'
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-200 font-bold'
                        : 'bg-[#070a12] border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-xs block">Gemini 3.7 Flash</span>
                    <span className="text-[10px] opacity-75 font-normal">Deep Reasoning & Stílus</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreferredModel('gemini-3.5-flash-lite')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      preferredModel === 'gemini-3.5-flash-lite'
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-200 font-bold'
                        : 'bg-[#070a12] border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-xs block">Gemini 3.5 Flash-Lite</span>
                    <span className="text-[10px] opacity-75 font-normal">Szupergyors & Gazdaságos</span>
                  </button>
                </div>
              </div>

              {/* Admin Whitelist Management */}
              <div className="space-y-3 bg-[#0d121c] p-3.5 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-amber-400" />
                    <span>👑 Feljogosított Adminisztrátorok ({adminEmails.length})</span>
                  </label>
                </div>

                <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                  {adminEmails.map((email) => (
                    <div key={email} className="flex items-center justify-between p-2 rounded-lg bg-[#070a12] border border-slate-800 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <Mail className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="font-mono text-white/90 truncate">{email}</span>
                      </div>
                      {adminEmails.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeAdminEmail(email)}
                          className="p-1 text-rose-400/70 hover:text-rose-300 rounded cursor-pointer"
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
                    className="flex-1 bg-[#070a12] border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-amber-500/50"
                  />
                  <button
                    type="submit"
                    disabled={!newAdminEmail.trim()}
                    className="bg-slate-200 hover:bg-white text-slate-950 font-bold text-xs py-1.5 px-3 rounded-xl shrink-0 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Hozzáadás</span>
                  </button>
                </form>
              </div>

              {/* System Diagnostics */}
              <div className="bg-[#0d121c] p-3.5 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-white">
                  <div className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Rendszerdiagnosztika</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                    {APP_BUILD_NAME}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 text-slate-400">
                  <div className="p-2 rounded-xl bg-[#070a12] border border-slate-800">
                    <span className="block text-[9px] uppercase tracking-wider">Ruhatár méret</span>
                    <span className="font-bold text-white text-xs">{wardrobe.length} db elem</span>
                  </div>
                  <div className="p-2 rounded-xl bg-[#070a12] border border-slate-800">
                    <span className="block text-[9px] uppercase tracking-wider">Stílusszabályok</span>
                    <span className="font-bold text-white text-xs">{sartorialRules.length} db aktív</span>
                  </div>
                </div>
              </div>

              {/* User Reset Tool */}
              <div className="space-y-2 bg-[#0d121c] p-3.5 rounded-2xl border border-slate-800">
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
                    className="flex-1 bg-[#070a12] border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-amber-500/50"
                  />
                  <button
                    type="button"
                    onClick={handleResetUser}
                    disabled={!targetUidToReset.trim() || isResettingUser}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-semibold shrink-0 cursor-pointer"
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

        </div>

        {/* Footer */}
        <div className="pt-2 text-center text-[10px] text-slate-500 font-mono tracking-wider border-t border-slate-800 shrink-0">
          AI Wardrobe Assistant • {APP_BUILD_NAME} (v{APP_VERSION})
        </div>

      </div>
    </div>,
    document.body
  );
}
