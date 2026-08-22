import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db, loginWithGoogle, logoutUser, isFirebaseConfigured } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, setDoc, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';
import { INITIAL_WARDROBE, INITIAL_USER_PROFILE } from '../data/mockWardrobe';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(true);

  const [wardrobe, setWardrobe] = useState(() => {
    const saved = localStorage.getItem('wardrobe_items');
    return saved ? JSON.parse(saved) : INITIAL_WARDROBE;
  });

  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem('user_style_profile');
    return saved ? JSON.parse(saved) : INITIAL_USER_PROFILE;
  });

  const [savedOutfits, setSavedOutfits] = useState(() => {
    const saved = localStorage.getItem('saved_outfits');
    return saved ? JSON.parse(saved) : [];
  });

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('wardrobe_items', JSON.stringify(wardrobe));
  }, [wardrobe]);

  useEffect(() => {
    localStorage.setItem('user_style_profile', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem('saved_outfits', JSON.stringify(savedOutfits));
  }, [savedOutfits]);

  // Listen to Firebase Auth state
  useEffect(() => {
    if (auth && isFirebaseConfigured) {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          setCurrentUser(user);
          setIsDemoMode(false);
          await loadUserDataFromFirestore(user.uid);
        } else {
          setCurrentUser(null);
        }
        setLoading(false);
      });
      return unsubscribe;
    } else {
      setLoading(false);
    }
  }, []);

  // Load from Firestore
  const loadUserDataFromFirestore = async (uid) => {
    try {
      if (!db) return;
      const wardrobeCol = collection(db, `users/${uid}/wardrobe`);
      const snapshot = await getDocs(wardrobeCol);
      if (!snapshot.empty) {
        const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setWardrobe(items);
      }
    } catch (err) {
      console.warn('Firestore betöltési hiba:', err);
    }
  };

  // Add Item to Wardrobe
  const addItem = async (itemData) => {
    const newItem = {
      id: itemData.id || `item-${Date.now()}`,
      createdAt: new Date().toISOString(),
      ...itemData
    };

    setWardrobe(prev => [newItem, ...prev]);

    if (currentUser && db && isFirebaseConfigured) {
      try {
        await setDoc(doc(db, `users/${currentUser.uid}/wardrobe`, newItem.id), newItem);
      } catch (e) {
        console.error('Hiba a Firestore mentéskor:', e);
      }
    }
    return newItem;
  };

  // Delete Item
  const deleteItem = async (itemId) => {
    setWardrobe(prev => prev.filter(i => i.id !== itemId));

    if (currentUser && db && isFirebaseConfigured) {
      try {
        await deleteDoc(doc(db, `users/${currentUser.uid}/wardrobe`, itemId));
      } catch (e) {
        console.error('Hiba a Firestore törléskor:', e);
      }
    }
  };

  // Update Profile
  const updateProfile = async (newProfile) => {
    setProfile(newProfile);
    if (currentUser && db && isFirebaseConfigured) {
      try {
        await setDoc(doc(db, `users/${currentUser.uid}`, 'profile'), newProfile, { merge: true });
      } catch (e) {
        console.error('Hiba a profil mentésekor:', e);
      }
    }
  };

  // Save an Outfit
  const saveOutfit = (outfit) => {
    setSavedOutfits(prev => [
      { ...outfit, id: `outfit-${Date.now()}`, savedAt: new Date().toISOString() },
      ...prev
    ]);
  };

  // Reset to Demo Data
  const resetToDemoData = () => {
    setWardrobe(INITIAL_WARDROBE);
    setProfile(INITIAL_USER_PROFILE);
    localStorage.setItem('wardrobe_items', JSON.stringify(INITIAL_WARDROBE));
    localStorage.setItem('user_style_profile', JSON.stringify(INITIAL_USER_PROFILE));
  };

  const handleGoogleLogin = async () => {
    try {
      const res = await loginWithGoogle();
      setCurrentUser(res.user);
      setIsDemoMode(false);
    } catch (err) {
      console.error('Google bejelentkezési hiba:', err);
      throw err;
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    setIsDemoMode(true);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isDemoMode,
        setIsDemoMode,
        wardrobe,
        profile,
        savedOutfits,
        loading,
        addItem,
        deleteItem,
        updateProfile,
        saveOutfit,
        resetToDemoData,
        loginWithGoogle: handleGoogleLogin,
        logout: handleLogout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
