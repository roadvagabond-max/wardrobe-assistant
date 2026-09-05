// Firebase Initialization & Multi-tenant Database Layer
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInAnonymously, signOut as fbSignOut } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';
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
  db = getFirestore(app);
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
