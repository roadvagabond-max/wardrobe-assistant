import React, { useState } from 'react';
import { 
  X, 
  LogIn, 
  LogOut, 
  User, 
  AlertCircle, 
  ShieldCheck, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  ArrowLeft, 
  Sparkles,
  KeyRound,
  UserPlus
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AuthModal({ isOpen, onClose, onOpenSettings }) {
  const { 
    currentUser, 
    loginWithGoogle, 
    loginWithEmail, 
    registerWithEmail, 
    sendPasswordReset, 
    getAuthErrorMessage, 
    logout 
  } = useAuth();

  // Mode: 'login' | 'register' | 'forgot'
  const [authMode, setAuthMode] = useState('login');
  
  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const resetFormState = () => {
    setError('');
    setSuccessMessage('');
  };

  const handleSwitchMode = (newMode) => {
    setAuthMode(newMode);
    resetFormState();
  };

  // 1. Google Sign-In Handler
  const handleGoogleSignIn = async () => {
    setLoading(true);
    resetFormState();
    try {
      await loginWithGoogle();
      onClose();
    } catch (err) {
      console.error('Firebase Auth hiba:', err);
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // 2. Email & Password Sign-In Handler
  const handleEmailSignIn = async (e) => {
    e?.preventDefault();
    if (!email.trim() || !password) {
      setError('Kérlek add meg az email címedet és a jelszavadat!');
      return;
    }

    setLoading(true);
    resetFormState();
    try {
      await loginWithEmail(email, password);
      onClose();
    } catch (err) {
      console.error('Email bejelentkezési hiba:', err);
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // 3. Email & Password Registration Handler
  const handleEmailRegister = async (e) => {
    e?.preventDefault();
    if (!email.trim() || !password) {
      setError('Kérlek töltsd ki az összes kötelező mezőt!');
      return;
    }

    if (password.length < 6) {
      setError('A jelszónak legalább 6 karakter hosszúnak kell lennie!');
      return;
    }

    if (password !== confirmPassword) {
      setError('A két megadott jelszó nem egyezik meg!');
      return;
    }

    setLoading(true);
    resetFormState();
    try {
      await registerWithEmail(email, password, name.trim());
      onClose();
    } catch (err) {
      console.error('Email regisztrációs hiba:', err);
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // 4. Password Reset Handler
  const handlePasswordResetSubmit = async (e) => {
    e?.preventDefault();
    if (!email.trim()) {
      setError('Kérlek add meg a regisztrált email címedet!');
      return;
    }

    setLoading(true);
    resetFormState();
    try {
      await sendPasswordReset(email);
      setSuccessMessage('A jelszó-visszaállító linket elküldtük az email címedre! Kérlek ellenőrizd a beérkező leveleidet (és a Spam mappát is).');
    } catch (err) {
      console.error('Jelszó-visszaállítási hiba:', err);
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="glass-card max-w-md w-full p-6 sm:p-7 border-[var(--border-gold)] space-y-5 animate-slide-up max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#f59e0b] to-[#b45309] flex items-center justify-center shadow-md shadow-[#f59e0b]/20">
              <User className="w-4 h-4 text-[#080e1a]" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base sm:text-lg text-white">
                {currentUser 
                  ? 'Felhasználói Profil' 
                  : authMode === 'register' 
                    ? 'Új Fiók Regisztráció' 
                    : authMode === 'forgot' 
                      ? 'Jelszó Visszaállítás' 
                      : 'Bejelentkezés & Fiók'}
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                {currentUser ? 'Személyes ruhatár & felhő szinkronizáció' : 'Sartorial Wardrobe Assistant'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 text-[var(--text-muted)] hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            title="Bezárás"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* LOGGED IN VIEW */}
        {currentUser ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3.5 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              {currentUser.photoURL ? (
                <img 
                  src={currentUser.photoURL} 
                  alt="User Avatar" 
                  width="48" 
                  height="48" 
                  className="w-12 h-12 rounded-full object-cover border border-emerald-500/40 shadow-sm" 
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg border border-emerald-500/40 shadow-sm">
                  {currentUser.displayName?.[0]?.toUpperCase() || currentUser.email?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-white text-sm truncate">
                  {currentUser.displayName || 'Bejelentkezett Felhasználó'}
                </h4>
                <p className="text-xs text-[var(--text-muted)] truncate">{currentUser.email}</p>
                <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-emerald-400 font-semibold uppercase">
                  <ShieldCheck className="w-3 h-3" />
                  Személyes felhő szinkronizáció aktív
                </span>
              </div>
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed bg-white/5 p-3 rounded-xl border border-white/5">
              A ruháid, saját szettjeid, egyéni stílusszabályaid és testméreteid biztonságosan mentve vannak a személyes felhő fiókodban.
            </p>

            <div className="pt-2 space-y-2">
              <button
                onClick={async () => {
                  await logout();
                  onClose();
                }}
                className="btn-secondary w-full text-xs text-rose-300 hover:text-rose-200 border-rose-500/20 hover:border-rose-500/40 py-2.5 flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Kijelentkezés a fiókból</span>
              </button>
            </div>
          </div>
        ) : (
          /* NOT LOGGED IN VIEW (Login / Register / Forgot Password) */
          <div className="space-y-4">

            {/* Mode Switcher Tabs (Login vs Register) */}
            {authMode !== 'forgot' && (
              <div className="grid grid-cols-2 p-1 rounded-xl bg-black/40 border border-white/10 text-xs">
                <button
                  type="button"
                  onClick={() => handleSwitchMode('login')}
                  className={`py-2 px-3 rounded-lg font-medium transition-all text-center flex items-center justify-center gap-1.5 ${
                    authMode === 'login'
                      ? 'bg-[var(--accent-gold)] text-black font-semibold shadow-md'
                      : 'text-[var(--text-secondary)] hover:text-white'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Bejelentkezés</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchMode('register')}
                  className={`py-2 px-3 rounded-lg font-medium transition-all text-center flex items-center justify-center gap-1.5 ${
                    authMode === 'register'
                      ? 'bg-[var(--accent-gold)] text-black font-semibold shadow-md'
                      : 'text-[var(--text-secondary)] hover:text-white'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Új Fiók</span>
                </button>
              </div>
            )}

            {/* Error Message Box */}
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-2.5 leading-relaxed">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Success Message Box */}
            {successMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-start gap-2.5 leading-relaxed">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* --- FORGOT PASSWORD VIEW --- */}
            {authMode === 'forgot' && (
              <form onSubmit={handlePasswordResetSubmit} className="space-y-4">
                <button
                  type="button"
                  onClick={() => handleSwitchMode('login')}
                  className="inline-flex items-center gap-1 text-xs text-[var(--accent-gold)] hover:underline mb-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Vissza a bejelentkezéshez</span>
                </button>

                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Add meg a regisztrált email címedet, és elküldjük a jelszó-visszaállító linket.
                </p>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-white flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                    <span>Email cím</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="pelda@email.com"
                    autoComplete="email"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/30 text-xs focus:outline-none focus:border-[var(--accent-gold)] transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-gold w-full py-2.5 text-xs font-semibold shadow-md flex items-center justify-center gap-2 mt-2"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{loading ? 'Küldés folyamatban...' : 'Jelszó-visszaállító link küldése'}</span>
                </button>
              </form>
            )}

            {/* --- LOGIN VIEW --- */}
            {authMode === 'login' && (
              <form onSubmit={handleEmailSignIn} className="space-y-3.5">
                
                {/* Email Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-white flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                    <span>Email cím</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="pelda@email.com"
                    autoComplete="email"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/30 text-xs focus:outline-none focus:border-[var(--accent-gold)] transition-colors"
                  />
                </div>

                {/* Password Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-white flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                      <span>Jelszó</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleSwitchMode('forgot')}
                      className="text-[11px] text-[var(--accent-gold)] hover:underline cursor-pointer"
                    >
                      Elfelejtetted a jelszavad?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/30 text-xs focus:outline-none focus:border-[var(--accent-gold)] transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(prev => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer p-1"
                      title={showPassword ? 'Jelszó elrejtése' : 'Jelszó megjelenítése'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-gold w-full py-2.5 text-xs font-semibold shadow-md flex items-center justify-center gap-2 mt-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{loading ? 'Bejelentkezés folyamatban...' : 'Bejelentkezés Emaillel'}</span>
                </button>
              </form>
            )}

            {/* --- REGISTER VIEW --- */}
            {authMode === 'register' && (
              <form onSubmit={handleEmailRegister} className="space-y-3.5">
                
                {/* Name Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-white flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                    <span>Név (Megjelenített név)</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="pl. Kovács Péter"
                    autoComplete="name"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/30 text-xs focus:outline-none focus:border-[var(--accent-gold)] transition-colors"
                  />
                </div>

                {/* Email Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-white flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                    <span>Email cím *</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="pelda@email.com"
                    autoComplete="email"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/30 text-xs focus:outline-none focus:border-[var(--accent-gold)] transition-colors"
                  />
                </div>

                {/* Password Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-white flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                    <span>Jelszó (min. 6 karakter) *</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Legalább 6 karakter"
                      autoComplete="new-password"
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/30 text-xs focus:outline-none focus:border-[var(--accent-gold)] transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(prev => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer p-1"
                      title={showPassword ? 'Jelszó elrejtése' : 'Jelszó megjelenítése'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-white flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                    <span>Jelszó megerősítése *</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Jelszó újra"
                      autoComplete="new-password"
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/30 text-xs focus:outline-none focus:border-[var(--accent-gold)] transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(prev => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer p-1"
                      title={showConfirmPassword ? 'Jelszó elrejtése' : 'Jelszó megjelenítése'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-gold w-full py-2.5 text-xs font-semibold shadow-md flex items-center justify-center gap-2 mt-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{loading ? 'Regisztráció folyamatban...' : 'Fiók Létrehozása'}</span>
                </button>
              </form>
            )}

            {/* Divider */}
            {authMode !== 'forgot' && (
              <div className="relative flex items-center justify-center py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative px-3 bg-[#0c121e] text-[11px] text-[var(--text-muted)]">
                  vagy gyors belépés
                </div>
              </div>
            )}

            {/* Google Sign-in Alternative */}
            {authMode !== 'forgot' && (
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="btn-secondary w-full py-2.5 text-xs font-medium border-white/10 hover:border-[var(--border-gold)] flex items-center justify-center gap-2.5 transition-all"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.2s.7 5.5 1.9 7.9l3.7-2.9z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z"
                  />
                </svg>
                <span>Google Fiók Használata</span>
              </button>
            )}

            <p className="text-[11px] text-center text-[var(--text-muted)] pt-2 border-t border-white/5">
              Belépés nélkül a bemutató mintakollekció tekinthető meg.
            </p>

          </div>
        )}

      </div>
    </div>
  );
}
