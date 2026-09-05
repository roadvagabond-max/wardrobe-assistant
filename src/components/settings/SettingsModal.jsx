import React, { useState, useEffect } from 'react';
import { 
  X, Key, Database, Sparkles, RotateCcw, Download, Check, Eye, EyeOff, Play, 
  Loader2, AlertCircle, ShieldCheck, Cpu, HardDrive, UserCheck, Sliders, Activity,
  Lock, Unlock, UserPlus, Trash2, Mail, Shield, ChevronRight, HelpCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { isFirebaseConfigured } from '../../services/firebase';
import { isGeminiConfigured, testGeminiApiKey } from '../../services/gemini';
import { APP_VERSION, APP_BUILD_NAME } from '../../version';

export default function SettingsModal({ isOpen, onClose }) {
  const { 
    wardrobe, 
    resetToDemoData, 
    geminiApiKey: contextGeminiKey, 
    saveGeminiApiKey,
    role,
    isAdmin,
    isActualAdmin,
    isSimulatingUser,
    toggleUserSimulation,
    setRole,
    preferredModel,
    setPreferredModel,
    sartorialRules,
    adminEmails = [],
    addAdminEmail,
    removeAdminEmail,
    adminPin,
    setAdminPin,
    verifyAndUnlockAdmin,
    resetUserByUid
  } = useAuth();

  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'admin'
  const [testStatus, setTestStatus] = useState({ testing: false, message: '', success: null });
  const [firebaseApiKey, setFirebaseApiKey] = useState(() => localStorage.getItem('VITE_FIREBASE_API_KEY') || '');
  const [firebaseProjectId, setFirebaseProjectId] = useState(() => localStorage.getItem('VITE_FIREBASE_PROJECT_ID') || '');
  const [firebaseAuthDomain, setFirebaseAuthDomain] = useState(() => localStorage.getItem('VITE_FIREBASE_AUTH_DOMAIN') || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Admin Management States
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newPinCode, setNewPinCode] = useState('');
  const [pinChangeSuccess, setPinChangeSuccess] = useState(false);
  const [showUnlockForm, setShowUnlockForm] = useState(false);
  const [unlockPinInput, setUnlockPinInput] = useState('');
  const [unlockError, setUnlockError] = useState(null);
  const [targetUidToReset, setTargetUidToReset] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetResult, setResetResult] = useState(null);

  // Sync state whenever modal is opened
  useEffect(() => {
    if (isOpen) {
      setFirebaseApiKey(localStorage.getItem('VITE_FIREBASE_API_KEY') || '');
      setFirebaseProjectId(localStorage.getItem('VITE_FIREBASE_PROJECT_ID') || '');
      setFirebaseAuthDomain(localStorage.getItem('VITE_FIREBASE_AUTH_DOMAIN') || '');
      setTestStatus({ testing: false, message: '', success: null });
      setSavedSuccess(false);
      setShowUnlockForm(false);
      setUnlockPinInput('');
      setUnlockError(null);
    }
  }, [isOpen, contextGeminiKey]);

  if (!isOpen) return null;

  const handleTestKey = async () => {
    setTestStatus({ testing: true, message: '', success: null });
    const result = await testGeminiApiKey();
    setTestStatus({ testing: false, message: result.message, success: result.success });
  };

  const handleSaveKeys = async (e) => {
    e.preventDefault();

    if (isAdmin) {
      if (firebaseApiKey) localStorage.setItem('VITE_FIREBASE_API_KEY', firebaseApiKey.trim());
      if (firebaseProjectId) localStorage.setItem('VITE_FIREBASE_PROJECT_ID', firebaseProjectId.trim());
      if (firebaseAuthDomain) localStorage.setItem('VITE_FIREBASE_AUTH_DOMAIN', firebaseAuthDomain.trim());
    }

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1000);
  };

  const handleUnlockAdminWithPin = (e) => {
    e.preventDefault();
    setUnlockError(null);
    const success = verifyAndUnlockAdmin(unlockPinInput);
    if (success) {
      setShowUnlockForm(false);
      setUnlockPinInput('');
      setActiveTab('admin');
    } else {
      setUnlockError('Hibás Admin Mesterkód! Próbáld újra.');
    }
  };

  const handleAddNewAdmin = async (e) => {
    e.preventDefault();
    const clean = newAdminEmail.trim();
    if (!clean) return;
    await addAdminEmail(clean);
    setNewAdminEmail('');
  };

  const handleUpdatePin = (e) => {
    e.preventDefault();
    if (newPinCode.trim().length < 4) {
      alert('A PIN kódnak legalább 4 karakterből kell állnia!');
      return;
    }
    setAdminPin(newPinCode.trim());
    setNewPinCode('');
    setPinChangeSuccess(true);
    setTimeout(() => setPinChangeSuccess(false), 2000);
  };

  const handleResetUser = async () => {
    const cleanUid = targetUidToReset.trim();
    if (!cleanUid) return;
    if (!window.confirm(`Biztosan nullázni és törölni akarod a(z) ${cleanUid} azonosítójú felhasználó adatait a Firestore-ból?`)) return;

    setIsResetting(true);
    setResetResult(null);
    const res = await resetUserByUid(cleanUid);
    setIsResetting(false);
    if (res.success) {
      setResetResult({ success: true, message: `✓ A(z) ${cleanUid} felhasználó adatai sikeresen törölve lettek a Firebase-ből!` });
      setTargetUidToReset('');
    } else {
      setResetResult({ success: false, message: `Hiba a törléskor: ${res.error}` });
    }
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
            <h3 className="font-serif font-bold text-lg text-white">
              {isAdmin ? 'Beállítások & Rendszerközpont' : 'Beállítások & API Integráció'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-[var(--text-muted)] hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher for Admin */}
        {isAdmin && (
          <div className="flex rounded-xl bg-white/5 p-1 border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('general')}
              className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'general'
                  ? 'bg-[var(--accent-gold-glow)] text-[var(--accent-gold-light)] border border-[var(--border-gold)] font-bold shadow'
                  : 'text-[var(--text-muted)] hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Általános & API</span>
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
              <span>👑 Admin Vezérlőpult</span>
            </button>
          </div>
        )}

        {/* Form for Keys */}
        <form onSubmit={handleSaveKeys} className="space-y-4">
          
          {/* GENERAL TAB */}
          {(!isAdmin || activeTab === 'general') && (
            <div className="space-y-4">
              
              {/* Server-Side AI Proxy Connection Card */}
              <div className="space-y-3 bg-[#07090e]/60 p-4 rounded-xl border border-[var(--border-gold)]/40 shadow-lg">
                <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#f59e0b] to-[#b45309] flex items-center justify-center text-black font-bold shadow-md shadow-[#f59e0b]/20 shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>Google Gemini AI Szerveroldali Proxy</span>
                      </h4>
                      <p className="text-[10px] text-[var(--text-muted)]">
                        Google Cloud Secret Manager & Service Account védelem
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] px-2.5 py-1 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>✓ Szerver Védelem Aktív</span>
                  </span>
                </div>

                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  A rendszer 100%-ban szerveroldali Firebase Cloud Functions v2 végpontokon keresztül éri el a legújabb Gemini 3.7 és 3.5 Flash neurális modelleket. A mesterkulcs biztonságosan a felhőben tárolódik, nem igényel kliensoldali beállítást.
                </p>

                {/* Connection Test Button */}
                <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-[var(--text-muted)]">
                    Modell: <strong className="text-amber-200">Gemini 3.7 Flash & 3.5 Flash-Lite</strong>
                  </span>

                  <button
                    type="button"
                    onClick={handleTestKey}
                    disabled={testStatus.testing}
                    className="btn-gold text-[10px] py-1.5 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                  >
                    {testStatus.testing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                    <span>{testStatus.testing ? 'Tesztelés...' : 'Szerverkapcsolat Tesztelése'}</span>
                  </button>
                </div>

                {/* Test Status Feedback */}
                {testStatus.message && (
                  <div className={`p-2.5 rounded-lg text-[11px] border leading-relaxed ${
                    testStatus.success 
                      ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200' 
                      : 'bg-rose-950/50 border-rose-500/40 text-rose-200'
                  }`}>
                    {testStatus.message}
                  </div>
                )}
              </div>

              {/* Secure Role Card */}
              <div className="bg-[#07090e]/40 p-3.5 rounded-xl border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm ${
                      isAdmin ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : isSimulatingUser ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    }`}>
                      {isAdmin ? '👑' : isSimulatingUser ? '👁️' : '👤'}
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-white block">
                        {isAdmin ? 'Adminisztrátori Szerepkör' : isSimulatingUser ? 'Felhasználói Nézet (Szimuláció)' : 'Normál Felhasználó'}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)]">
                        {isAdmin ? 'Teljes hozzáférés a rendszerbeállításokhoz' : isSimulatingUser ? 'Tesztelés alatt: úgy látod az appot, mint egy normál user' : 'Személyes gardrób élmény'}
                      </span>
                    </div>
                  </div>

                  {isActualAdmin ? (
                    <button
                      type="button"
                      onClick={() => {
                        toggleUserSimulation();
                        if (isSimulatingUser) {
                          setActiveTab('admin');
                        } else {
                          setActiveTab('general');
                        }
                      }}
                      className={`text-[10px] px-2.5 py-1.5 rounded-lg border font-semibold transition-all flex items-center gap-1 ${
                        isSimulatingUser 
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30 animate-pulse'
                          : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/90 hover:text-white'
                      }`}
                      title={isSimulatingUser ? "Visszatérés az Adminisztrátori módba" : "Felhasználói nézet kipróbálása"}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{isSimulatingUser ? 'Vissza Adminra' : 'User Nézet Teszt'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowUnlockForm(!showUnlockForm)}
                      className="text-[10px] px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 flex items-center gap-1 transition-all"
                      title="Adminisztrátori Mód Feloldása"
                    >
                      <Lock className="w-3 h-3" />
                      <span>Admin Feloldása</span>
                    </button>
                  )}
                </div>

                {/* PIN Code Unlock Form (Only for non-admins trying to access) */}
                {!isAdmin && showUnlockForm && (
                  <div className="pt-2 border-t border-white/5 space-y-2 animate-slide-up">
                    <span className="text-[11px] text-[var(--text-secondary)] block">
                      Add meg az Admin Mesterkódot / PIN-t a rendszergazdai jogok aktiválásához:
                    </span>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        placeholder="Admin Mesterkód..."
                        value={unlockPinInput}
                        onChange={(e) => setUnlockPinInput(e.target.value)}
                        className="custom-input text-xs flex-1 py-1.5 font-mono"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleUnlockAdminWithPin}
                        className="btn-gold text-xs py-1.5 px-3 shrink-0 flex items-center gap-1"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Feloldás</span>
                      </button>
                    </div>
                    {unlockError && (
                      <span className="text-[10px] text-rose-400 block">{unlockError}</span>
                    )}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ADMIN ONLY TAB */}
          {isAdmin && activeTab === 'admin' && (
            <div className="space-y-4 animate-fade-in">
              
              {/* 👥 User & Admin Access Management */}
              <div className="space-y-3 bg-[#07090e]/60 p-3.5 rounded-xl border border-white/5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-amber-400" />
                    <span>👑 Adminisztrátorok & Hozzáférések</span>
                  </label>
                  <span className="text-[10px] text-amber-300 font-medium">
                    {adminEmails.length} feljogosított admin
                  </span>
                </div>

                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  Az alábbi e-mail címekkel bejelentkező felhasználók automatikusan teljes körű <strong>Adminisztrátori jogosultságot</strong> kapnak.
                </p>

                {/* List of Admin Emails */}
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {adminEmails.map((email) => (
                    <div key={email} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5 text-xs">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                        <span className="font-mono text-white/90">{email}</span>
                      </div>
                      {adminEmails.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeAdminEmail(email)}
                          className="p-1 text-rose-400/70 hover:text-rose-300 hover:bg-rose-500/10 rounded transition-colors"
                          title="Admin jog visszavonása"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add New Admin Form */}
                <div className="pt-2 flex gap-2">
                  <input
                    type="email"
                    placeholder="uj.admin@gmail.com"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    className="custom-input text-xs flex-1 py-1.5 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleAddNewAdmin}
                    disabled={!newAdminEmail.trim()}
                    className="btn-gold text-xs py-1.5 px-3 shrink-0 flex items-center gap-1 disabled:opacity-40"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Hozzáadás</span>
                  </button>
                </div>

                {/* Change PIN section */}
                <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                  <div className="text-[11px] text-[var(--text-muted)]">
                    <span>Vészhelyzeti PIN kód: </span>
                    <strong className="font-mono text-white">{adminPin}</strong>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      placeholder="Új PIN..."
                      value={newPinCode}
                      onChange={(e) => setNewPinCode(e.target.value)}
                      className="custom-input text-xs w-24 py-1 font-mono text-center"
                    />
                    <button
                      type="button"
                      onClick={handleUpdatePin}
                      disabled={!newPinCode.trim()}
                      className="text-[10px] px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium disabled:opacity-30"
                    >
                      Módosítás
                    </button>
                  </div>
                </div>
                {pinChangeSuccess && (
                  <span className="text-[10px] text-emerald-400 block text-right">✓ PIN kód sikeresen frissítve!</span>
                )}
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
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                        : 'bg-white/5 border-white/10 text-[var(--text-muted)] hover:text-white'
                    }`}
                  >
                    <span className="text-xs font-bold block">Gemini 3.7 Flash</span>
                    <span className="text-[10px] opacity-75">Deep Reasoning & Stílus mélység</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreferredModel('gemini-3.5-flash-lite')}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      preferredModel === 'gemini-3.5-flash-lite'
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                        : 'bg-white/5 border-white/10 text-[var(--text-muted)] hover:text-white'
                    }`}
                  >
                    <span className="text-xs font-bold block">Gemini 3.5 Flash-Lite</span>
                    <span className="text-[10px] opacity-75">Szupergyors & Gazdaságos</span>
                  </button>
                </div>
              </div>

              {/* Firebase Keys (Admin Only) */}
              <div className="space-y-3 bg-[#07090e]/60 p-3.5 rounded-xl border border-white/5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-amber-400" />
                    <span>Firebase Felhő Konfiguráció</span>
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

              {/* System Diagnostics */}
              <div className="bg-[#07090e]/60 p-3.5 rounded-xl border border-white/5 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-white">
                  <div className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Rendszerdiagnosztika & Statisztika</span>
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
                    <span className="font-bold text-white text-xs">{(sartorialRules || []).length} db aktív</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white/5">
                    <span className="block text-[9px] uppercase tracking-wider">Firestore Állapot</span>
                    <span className={`font-bold text-xs ${isFirebaseConfigured ? 'text-emerald-400' : 'text-amber-300'}`}>
                      {isFirebaseConfigured ? 'Realtime Szinkron' : 'Offline / LocalStorage'}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-white/5">
                    <span className="block text-[9px] uppercase tracking-wider">Verzió / Kiadás</span>
                    <span className="font-bold text-amber-300 text-xs">{APP_BUILD_NAME} (v{APP_VERSION})</span>
                  </div>
                </div>
              </div>

              {/* 🗑️ User Data Reset Tool */}
              <div className="space-y-3 bg-[#07090e]/60 p-3.5 rounded-xl border border-white/5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Felhasználói Adatok Törlése & Nullázása (UID alapján)</span>
                  </label>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  Ha egy korábban belépett tesztfelhasználó adatait (pl. profil, magasság, gardrób) szeretnéd teljesen kitörölni a Firebase-ből, add meg az ő Firebase UID-ját:
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="pl. HdP0TKSjw1dRwAFzUV4stpyR8Ww1"
                    value={targetUidToReset}
                    onChange={(e) => setTargetUidToReset(e.target.value)}
                    className="custom-input text-xs flex-1 py-1.5 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleResetUser}
                    disabled={!targetUidToReset.trim() || isResetting}
                    className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-semibold disabled:opacity-40 flex items-center gap-1 transition-all shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isResetting ? 'Törlés...' : 'Nullázás'}</span>
                  </button>
                </div>
                {resetResult && (
                  <div className={`p-2 rounded-lg text-[11px] border ${resetResult.success ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200' : 'bg-rose-950/50 border-rose-500/40 text-rose-200'}`}>
                    {resetResult.message}
                  </div>
                )}
              </div>

            </div>
          )}

          <button type="submit" className="btn-gold w-full text-xs">
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Mentve! Újratöltés...</span>
              </>
            ) : (
              <span>Beállítások Mentése</span>
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

        {/* Modal App Version Footer */}
        <div className="pt-2 text-center text-[10px] text-[var(--text-muted)] font-mono tracking-wider">
          Sartorial Wardrobe Assistant • {APP_BUILD_NAME} (v{APP_VERSION})
        </div>

      </div>
    </div>
  );
}
