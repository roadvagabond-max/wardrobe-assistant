import React, { useState } from 'react';
import { X, LogIn, LogOut, User, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AuthModal({ isOpen, onClose }) {
  const { currentUser, loginWithGoogle, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      await loginWithGoogle();
      onClose();
    } catch (err) {
      console.error('Firebase Auth hiba:', err);
      let errorMsg = err.message || 'Hiba történt a bejelentkezés során.';
      
      if (err.code === 'auth/unauthorized-domain') {
        errorMsg = 'A domain még nincs hozzáadva a Firebase engedélyezett domainjeihez (Firebase Console > Authentication > Settings > Authorized domains).';
      } else if (err.code === 'auth/operation-not-allowed') {
        errorMsg = 'A Google bejelentkezés még nincs bekapcsolva a Firebase Console-ban (Authentication > Sign-in method > Google > Enable).';
      } else if (err.code === 'auth/popup-blocked') {
        errorMsg = 'A böngésző letiltotta a felugró ablakot. Kérlek engedélyezd a felugró ablakokat a bejelentkezéshez!';
      } else if (err.code === 'auth/popup-closed-by-user') {
        errorMsg = 'A bejelentkezési ablak be lett zárva a folyamat befejezése előtt.';
      }
      
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="glass-card max-w-md w-full p-6 border-[var(--border-gold)] space-y-5 animate-slide-up">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-[var(--accent-gold)]" />
            <h3 className="font-serif font-bold text-lg text-white">Felhasználói Fiók & Belépés</h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 text-[var(--text-muted)] hover:text-white transition-colors"
            title="Bezárás"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Status */}
        {currentUser ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              {currentUser.photoURL ? (
                <img src={currentUser.photoURL} alt="User Avatar" width="48" height="48" className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg">
                  {currentUser.email?.[0]?.toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-white text-sm truncate">{currentUser.displayName || 'Bejelentkezett Felhasználó'}</h4>
                <p className="text-xs text-[var(--text-muted)] truncate">{currentUser.email}</p>
                <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-emerald-400 font-semibold uppercase">
                  <ShieldCheck className="w-3 h-3" />
                  Személyes felhő szinkronizáció aktív
                </span>
              </div>
            </div>

            <button
              onClick={async () => {
                await logout();
                onClose();
              }}
              className="btn-secondary w-full text-xs text-rose-300 hover:text-rose-200 border-rose-500/20 py-2.5"
            >
              <LogOut className="w-4 h-4" />
              <span>Kijelentkezés</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Jelentkezz be Google fiókoddal a saját személyes ruhatárad, stílusprofilod és mentett szettjeid eléréséhez, valamint az AI funkciók használatához!
            </p>

            {error && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-start gap-2.5 leading-relaxed">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="btn-gold w-full py-3 text-sm font-semibold shadow-md flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? 'Bejelentkezés folyamatban...' : 'Belépés Google Fiókkal'}</span>
            </button>

            <p className="text-[11px] text-center text-[var(--text-muted)] pt-2 border-t border-white/5">
              Belépés nélkül a bemutató mintakollekció tekinthető meg.
            </p>

          </div>
        )}

      </div>
    </div>
  );
}
