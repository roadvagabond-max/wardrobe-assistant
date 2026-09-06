// Firebase Initialization & Multi-tenant Database Layer
import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInAnonymously, 
  signOut as fbSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile as fbUpdateProfile
} from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  updateDoc 
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { ensureBase64Image } from './imageOptimizer';

const getEnvOrLocal = (key, fallback = '') => {
  return import.meta.env[key] || localStorage.getItem(key) || fallback;
};

export const firebaseConfig = {
  apiKey: getEnvOrLocal('VITE_FIREBASE_API_KEY', 'AIzaSyAe0quT2U1GjgnxubsOFXVWtt7iigJ6tO8'),
  authDomain: getEnvOrLocal('VITE_FIREBASE_AUTH_DOMAIN', 'wardrobe-assistant-48e01.firebaseapp.com'),
  projectId: getEnvOrLocal('VITE_FIREBASE_PROJECT_ID', 'wardrobe-assistant-48e01'),
  storageBucket: getEnvOrLocal('VITE_FIREBASE_STORAGE_BUCKET', 'wardrobe-assistant-48e01.firebasestorage.app'),
  messagingSenderId: getEnvOrLocal('VITE_FIREBASE_MESSAGING_SENDER_ID', '804800324403'),
  appId: getEnvOrLocal('VITE_FIREBASE_APP_ID', '1:804800324403:web:82232ade24245364ca1446'),
  measurementId: getEnvOrLocal('VITE_FIREBASE_MEASUREMENT_ID', 'G-60LY2T4ZR6')
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let app = null;
let auth = null;
let db = null;
let storage = null;
let functions = null;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    });
  } catch (_) {
    db = getFirestore(app);
  }
  storage = getStorage(app);
  functions = getFunctions(app, 'us-central1');
} catch (err) {
  console.warn('Firebase inicializálási figyelmeztetés:', err);
}

export { app, auth, db, storage, functions };

/**
 * Universal Server-Side Cloud Function Caller with Auth Guarantee
 */
export async function callCloudFunction(functionName, payload = {}) {
  if (!functions || !auth) {
    throw new Error('A Firebase Cloud Functions szolgáltatás nem érhető el.');
  }

  // Require real authenticated user (no anonymous guests)
  if (!auth.currentUser || auth.currentUser.isAnonymous) {
    throw new Error('A mesterséges intelligencia funkciók használatához kérlek jelentkezz be a fiókodba (pl. Google fiókkal)!');
  }

  const callable = httpsCallable(functions, functionName);
  const result = await callable(payload);
  return result.data;
}

// Google Sign In
export async function loginWithGoogle() {
  if (!auth) throw new Error('Firebase Auth nincs inicializálva.');
  const provider = new GoogleAuthProvider();
  return await signInWithPopup(auth, provider);
}

// Email & Password Sign In
export async function loginWithEmail(email, password) {
  if (!auth) throw new Error('Firebase Auth nincs inicializálva.');
  return await signInWithEmailAndPassword(auth, email.trim(), password);
}

// Email & Password Registration with Display Name
export async function registerWithEmail(email, password, displayName = '') {
  if (!auth) throw new Error('Firebase Auth nincs inicializálva.');
  const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (displayName && displayName.trim() && userCredential.user) {
    try {
      await fbUpdateProfile(userCredential.user, { displayName: displayName.trim() });
    } catch (nameErr) {
      console.warn('Profilnév beállítási figyelmeztetés:', nameErr);
    }
  }
  return userCredential;
}

// Password Reset Email
export async function sendPasswordReset(email) {
  if (!auth) throw new Error('Firebase Auth nincs inicializálva.');
  return await sendPasswordResetEmail(auth, email.trim());
}

// Friendly Hungarian Error Message Translator for Firebase Auth
export function getAuthErrorMessage(err) {
  if (!err) return 'Ismeretlen hiba történt.';
  const code = err.code || '';

  switch (code) {
    case 'auth/invalid-email':
      return 'Kérlek adj meg egy érvényes email címet!';
    case 'auth/user-not-found':
      return 'Nem található felhasználói fiók ezzel az email címmel.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Helytelen email cím vagy jelszó. Kérlek ellenőrizd az adataidat!';
    case 'auth/email-already-in-use':
      return 'Ez az email cím már regisztrálva van. Kérlek jelentkezz be, vagy kérj új jelszót!';
    case 'auth/weak-password':
      return 'A megadott jelszó túl gyenge. A jelszónak legalább 6 karakter hosszúnak kell lennie!';
    case 'auth/missing-password':
      return 'Kérlek add meg a jelszavadat!';
    case 'auth/too-many-requests':
      return 'Túl sok sikertelen próbálkozás történt egymás után. Biztonsági okokból kérlek várj néhány percet, mielőtt újra próbálkozol!';
    case 'auth/user-disabled':
      return 'Ez a felhasználói fiók zárolva vagy letiltva lett.';
    case 'auth/operation-not-allowed':
      return 'Az email/jelszavas bejelentkezés még nincs engedélyezve a Firebase felületén.';
    case 'auth/unauthorized-domain':
      return 'A jelenlegi webes domain nincs engedélyezve a Firebase hitelesítéshez.';
    case 'auth/popup-blocked':
      return 'A böngésző letiltotta a felugró ablakot. Kérlek engedélyezd a felugró ablakokat a bejelentkezéshez!';
    case 'auth/popup-closed-by-user':
      return 'A bejelentkezési ablak be lett zárva a folyamat befejezése előtt.';
    case 'auth/network-request-failed':
      return 'Hálózati hiba történt. Kérlek ellenőrizd az internetkapcsolatodat!';
    default:
      return err.message || 'Hiba történt a hitelesítés során. Kérlek próbáld újra!';
  }
}

// Sign Out
export async function logoutUser() {
  if (auth) {
    await fbSignOut(auth);
  }
}

// Upload Image to Firebase Storage (Always compressed client-side to ~35-50KB)
export async function uploadGarmentImage(fileOrDataUrl, userId = 'user') {
  if (storage) {
    try {
      // Compress to lightweight 600x600 JPEG (~35KB)
      const base64 = await ensureBase64Image(fileOrDataUrl, 600, 600, 0.75);
      if (base64 && typeof base64 === 'string' && base64.startsWith('data:')) {
        const byteString = atob(base64.split(',')[1]);
        const mimeString = base64.split(',')[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: mimeString });
        const storageRef = ref(storage, `users/${userId}/wardrobe/${Date.now()}.jpg`);
        const snapshot = await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
        return await getDownloadURL(snapshot.ref);
      }
    } catch (e) {
      console.warn('Firebase Storage hiba, helyi adatURL használata:', e);
    }
  }

  // Fallback to DataURL
  return await ensureBase64Image(fileOrDataUrl, 600, 600, 0.75);
}
