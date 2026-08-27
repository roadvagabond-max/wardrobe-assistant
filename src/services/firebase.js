// Firebase Initialization & Multi-tenant Database Layer
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const getEnvOrLocal = (key, fallback = '') => {
  return import.meta.env[key] || localStorage.getItem(key) || fallback;
};

export const firebaseConfig = {
  apiKey: getEnvOrLocal('VITE_FIREBASE_API_KEY'),
  authDomain: getEnvOrLocal('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnvOrLocal('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnvOrLocal('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnvOrLocal('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnvOrLocal('VITE_FIREBASE_APP_ID')
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let app = null;
let auth = null;
let db = null;
let storage = null;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
} catch (err) {
  console.warn('Firebase inicializálási figyelmeztetés:', err);
}

export { app, auth, db, storage };

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

// Upload Image to Firebase Storage
export async function uploadGarmentImage(file, userId = 'user') {
  if (storage) {
    try {
      const fileExt = file.name ? file.name.split('.').pop() : 'jpg';
      const storageRef = ref(storage, `users/${userId}/wardrobe/${Date.now()}.${fileExt}`);
      const snapshot = await uploadBytes(storageRef, file);
      return await getDownloadURL(snapshot.ref);
    } catch (e) {
      console.warn('Firebase Storage hiba, helyi adatURL használata:', e);
    }
  }

  // Fallback to DataURL
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}
