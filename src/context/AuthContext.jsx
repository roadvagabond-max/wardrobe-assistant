import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { auth, db, loginWithGoogle, logoutUser, isFirebaseConfigured } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, setDoc, getDoc, getDocs, deleteDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { INITIAL_WARDROBE, INITIAL_USER_PROFILE } from '../data/mockWardrobe';
import { ensureBase64Image } from '../services/imageOptimizer';

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

  // 🧹 Smart Background Image Optimizer for existing large images
  const optimizationDoneRef = useRef(false);
  useEffect(() => {
    if (optimizationDoneRef.current || wardrobe.length === 0) return;
    optimizationDoneRef.current = true;

    const optimizeOversizedImages = async () => {
      let hasUpdates = false;
      const optimizedItems = await Promise.all(
        wardrobe.map(async (item) => {
          // If image is a large Base64 string (> 150KB), compress it
          if (item.imageUrl && typeof item.imageUrl === 'string' && item.imageUrl.startsWith('data:') && item.imageUrl.length > 150000) {
            try {
              const compressed = await ensureBase64Image(item.imageUrl, 640, 640, 0.75);
              if (compressed && compressed.length < item.imageUrl.length) {
                hasUpdates = true;
                return { ...item, imageUrl: compressed };
              }
            } catch (_) {}
          }
          return item;
        })
      );

      if (hasUpdates) {
        setWardrobe(optimizedItems);
        // Also update Firestore in background if logged in
        if (currentUser && db && isFirebaseConfigured) {
          for (const itm of optimizedItems) {
            try {
              await setDoc(doc(db, 'users', currentUser.uid, 'wardrobe', itm.id), itm, { merge: true });
            } catch (_) {}
          }
        }
      }
    };

    // Run when browser is idle to never block UI
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => optimizeOversizedImages());
    } else {
      setTimeout(optimizeOversizedImages, 2000);
    }
  }, [wardrobe.length, currentUser]);

  // Listen to Firebase Auth state & Real-time Firestore Cloud Sync
  useEffect(() => {
    if (!auth || !isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    let unsubProfile = null;
    let unsubWardrobe = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        setIsDemoMode(false);

        // 1. Real-time User Document Listener (Profile & Settings)
        try {
          const userDocRef = doc(db, 'users', user.uid);
          unsubProfile = onSnapshot(userDocRef, async (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              if (data.profile) {
                setProfile(data.profile);
              }
              if (data.savedOutfits) {
                setSavedOutfits(data.savedOutfits);
              }
            } else {
              // If user document doesn't exist yet, seed it with current local profile
              const localProfile = JSON.parse(localStorage.getItem('user_style_profile') || JSON.stringify(INITIAL_USER_PROFILE));
              await setDoc(userDocRef, {
                email: user.email,
                displayName: user.displayName,
                profile: localProfile,
                updatedAt: new Date().toISOString()
              }, { merge: true });
            }
          }, (err) => {
            console.warn('Firestore profile snapshot hiba:', err);
          });
        } catch (e) {
          console.warn('Profile listener setup hiba:', e);
        }

        // 2. Real-time Wardrobe Collection Listener
        try {
          const wardrobeCol = collection(db, 'users', user.uid, 'wardrobe');
          unsubWardrobe = onSnapshot(wardrobeCol, async (snapshot) => {
            if (!snapshot.empty) {
              const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
              // Sort newest first
              items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
              setWardrobe(items);
            } else {
              // If cloud wardrobe is empty, upload local items to cloud
              const localItems = JSON.parse(localStorage.getItem('wardrobe_items') || '[]');
              if (localItems.length > 0) {
                for (const itm of localItems) {
                  await setDoc(doc(db, 'users', user.uid, 'wardrobe', itm.id), itm);
                }
              }
            }
          }, (err) => {
            console.warn('Firestore wardrobe snapshot hiba:', err);
          });
        } catch (e) {
          console.warn('Wardrobe listener setup hiba:', e);
        }

      } else {
        setCurrentUser(null);
        if (unsubProfile) unsubProfile();
        if (unsubWardrobe) unsubWardrobe();
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubProfile) unsubProfile();
      if (unsubWardrobe) unsubWardrobe();
    };
  }, []);

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
        await setDoc(doc(db, 'users', currentUser.uid, 'wardrobe', newItem.id), newItem);
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
        await deleteDoc(doc(db, 'users', currentUser.uid, 'wardrobe', itemId));
      } catch (e) {
        console.error('Hiba a Firestore törléskor:', e);
      }
    }
  };

  // Update Item in Wardrobe
  const updateItem = async (itemId, updatedData) => {
    setWardrobe(prev => prev.map(item => item.id === itemId ? { ...item, ...updatedData } : item));

    if (currentUser && db && isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'users', currentUser.uid, 'wardrobe', itemId), updatedData, { merge: true });
      } catch (e) {
        console.error('Hiba a Firestore frissítéskor:', e);
      }
    }
  };

  // Update Profile
  const updateProfile = async (newProfile) => {
    setProfile(newProfile);
    if (currentUser && db && isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'users', currentUser.uid), {
          profile: newProfile,
          updatedAt: new Date().toISOString()
        }, { merge: true });
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
        updateItem,
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
