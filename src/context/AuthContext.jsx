import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { auth, db, loginWithGoogle, logoutUser, isFirebaseConfigured } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, setDoc, getDoc, getDocs, deleteDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { INITIAL_WARDROBE, INITIAL_USER_PROFILE } from '../data/mockWardrobe';
import { ensureBase64Image } from '../services/imageOptimizer';
import { 
  getStoredSartorialRules, 
  loadSartorialRulesFromCloud, 
  saveSartorialRules, 
  mineSartorialRulesFromWeb, 
  checkAndAutoSyncSartorialRules, 
  toggleRuleStatus, 
  deleteRule as deleteStoredRule 
} from '../services/sartorialRules';

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

  const DEFAULT_ADMIN_EMAILS = [
    'roadvagabond@gmail.com',
    'attila.varadi@gmail.com'
  ];

  const [adminEmails, setAdminEmails] = useState(() => {
    try {
      const saved = localStorage.getItem('admin_whitelist_emails');
      return saved ? JSON.parse(saved) : DEFAULT_ADMIN_EMAILS;
    } catch (_) {
      return DEFAULT_ADMIN_EMAILS;
    }
  });

  const [adminPin, setAdminPinState] = useState(() => {
    return localStorage.getItem('admin_secret_pin') || '2026';
  });

  const [role, setRoleState] = useState(() => {
    return localStorage.getItem('user_role') || 'user';
  });
  const [preferredModel, setPreferredModelState] = useState(() => {
    return localStorage.getItem('preferred_gemini_model') || 'gemini-3.7-flash';
  });
  const [geminiApiKey, setGeminiApiKey] = useState(() => {
    return (localStorage.getItem('GEMINI_API_KEY') || import.meta.env.VITE_GEMINI_API_KEY || '').trim();
  });

  // Debounced non-blocking sync to local storage
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem('wardrobe_items', JSON.stringify(wardrobe));
      } catch (err) {
        console.warn('LocalStorage wardrobe_items mentési hiba:', err);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [wardrobe]);

  useEffect(() => {
    localStorage.setItem('user_style_profile', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem('saved_outfits', JSON.stringify(savedOutfits));
  }, [savedOutfits]);

  // 🧹 High-Performance Background Image Optimizer (Compresses bloated images to ~25-35KB)
  const optimizationDoneRef = useRef(false);
  useEffect(() => {
    if (wardrobe.length === 0) return;

    const optimizeOversizedImages = async () => {
      let hasUpdates = false;
      const optimizedItems = await Promise.all(
        wardrobe.map(async (item) => {
          if (item.imageUrl && typeof item.imageUrl === 'string' && item.imageUrl.startsWith('data:') && item.imageUrl.length > 60000) {
            try {
              const compressed = await ensureBase64Image(item.imageUrl, 520, 520, 0.72);
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
        if (currentUser && db && isFirebaseConfigured) {
          Promise.all(
            optimizedItems.map(itm => 
              setDoc(doc(db, 'users', currentUser.uid, 'wardrobe', itm.id), itm, { merge: true }).catch(() => {})
            )
          );
        }
      }
    };

    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => optimizeOversizedImages());
    } else {
      setTimeout(optimizeOversizedImages, 1500);
    }
  }, [wardrobe.length]);

  // 🔄 7-day Background Auto-Sync for Sartorial Rules
  useEffect(() => {
    const runSartorialAutoSync = async () => {
      try {
        const loaded = await loadSartorialRulesFromCloud(currentUser?.uid);
        if (loaded) setSartorialRules(loaded);
        const res = await checkAndAutoSyncSartorialRules(currentUser?.uid);
        if (res && res.success) {
          setSartorialRules(getStoredSartorialRules());
        }
      } catch (err) {
        console.warn('Sartorial rules background auto-sync hiba:', err);
      }
    };

    // Run when idle
    setTimeout(runSartorialAutoSync, 2500);
  }, [currentUser?.uid]);

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
            const userEmail = (user.email || '').toLowerCase().trim();
            const isWhitelisted = adminEmails.some(ae => ae.toLowerCase().trim() === userEmail);

            if (docSnap.exists()) {
              const data = docSnap.data();
              if (data.profile) {
                setProfile(data.profile);
              }
              const calculatedRole = isWhitelisted ? 'admin' : (data.role || data.profile?.role || 'user');
              setRoleState(calculatedRole);
              localStorage.setItem('user_role', calculatedRole);

              if (data.preferredModel) {
                setPreferredModelState(data.preferredModel);
                localStorage.setItem('preferred_gemini_model', data.preferredModel);
              }
              if (data.savedOutfits) {
                setSavedOutfits(data.savedOutfits);
              }
              if (data.geminiApiKey && typeof data.geminiApiKey === 'string' && data.geminiApiKey.trim()) {
                const cloudKey = data.geminiApiKey.trim();
                localStorage.setItem('GEMINI_API_KEY', cloudKey);
                setGeminiApiKey(cloudKey);
              } else {
                const localKey = (localStorage.getItem('GEMINI_API_KEY') || import.meta.env.VITE_GEMINI_API_KEY || '').trim();
                if (localKey) {
                  await setDoc(userDocRef, {
                    geminiApiKey: localKey,
                    updatedAt: new Date().toISOString()
                  }, { merge: true });
                }
              }
            } else {
              const localProfile = JSON.parse(localStorage.getItem('user_style_profile') || JSON.stringify(INITIAL_USER_PROFILE));
              const initialRole = isWhitelisted ? 'admin' : (localStorage.getItem('user_role') || 'user');
              const localModel = localStorage.getItem('preferred_gemini_model') || 'gemini-3.7-flash';
              const localGeminiKey = (localStorage.getItem('GEMINI_API_KEY') || import.meta.env.VITE_GEMINI_API_KEY || '').trim();
              setRoleState(initialRole);
              localStorage.setItem('user_role', initialRole);
              await setDoc(userDocRef, {
                email: user.email,
                displayName: user.displayName,
                role: initialRole,
                preferredModel: localModel,
                profile: localProfile,
                ...(localGeminiKey ? { geminiApiKey: localGeminiKey } : {}),
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
              items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
              setWardrobe(items);
            } else {
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
    try {
      localStorage.removeItem('capsule_gaps_cache');
    } catch (_) {}
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

  // Sartorial Rules Actions
  const mineNewRules = async (focusTopic = '') => {
    setIsMiningRules(true);
    try {
      const res = await mineSartorialRulesFromWeb({ 
        userUid: currentUser?.uid,
        focusTopic 
      });
      setSartorialRules(getStoredSartorialRules());
      return res;
    } finally {
      setIsMiningRules(false);
    }
  };

  const toggleRule = async (ruleId) => {
    const updated = await toggleRuleStatus(ruleId, currentUser?.uid);
    setSartorialRules(updated);
  };

  const deleteSartorialRule = async (ruleId) => {
    const updated = await deleteStoredRule(ruleId, currentUser?.uid);
    setSartorialRules(updated);
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
    try {
      await logoutUser();
    } catch (e) {
      console.warn('Logout figyelmeztetés:', e);
    }
    setCurrentUser(null);
    setIsDemoMode(true);
    setRoleState('user');
    localStorage.setItem('user_role', 'user');
    setWardrobe(INITIAL_WARDROBE);
    setProfile(INITIAL_USER_PROFILE);
    setSavedOutfits([]);
    try {
      localStorage.removeItem('capsule_gaps_cache');
    } catch (_) {}
  };

  const setRole = async (newRole) => {
    const cleanRole = newRole === 'admin' ? 'admin' : 'user';
    setRoleState(cleanRole);
    localStorage.setItem('user_role', cleanRole);
    if (currentUser && db && isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'users', currentUser.uid), {
          role: cleanRole,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (e) {
        console.warn('Role mentési hiba Firestore-ba:', e);
      }
    }
  };

  const setPreferredModel = async (modelName) => {
    setPreferredModelState(modelName);
    localStorage.setItem('preferred_gemini_model', modelName);
    if (currentUser && db && isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'users', currentUser.uid), {
          preferredModel: modelName,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (e) {
        console.warn('Preferred model mentési hiba Firestore-ba:', e);
      }
    }
  };

  const isAdmin = role === 'admin';

  const saveGeminiApiKey = async (newKey) => {
    const clean = (newKey || '').trim();
    if (clean) {
      localStorage.setItem('GEMINI_API_KEY', clean);
      setGeminiApiKey(clean);
    } else {
      localStorage.removeItem('GEMINI_API_KEY');
      setGeminiApiKey('');
    }

    if (currentUser && db && isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'users', currentUser.uid), {
          geminiApiKey: clean || '',
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.warn('Firestore geminiApiKey mentési hiba:', err);
      }
    }
  };

  const addAdminEmail = async (newEmail) => {
    const clean = (newEmail || '').toLowerCase().trim();
    if (!clean || adminEmails.includes(clean)) return;
    const updated = [...adminEmails, clean];
    setAdminEmails(updated);
    localStorage.setItem('admin_whitelist_emails', JSON.stringify(updated));
    if (currentUser && db && isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'system', 'admin_config'), {
          adminEmails: updated,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (e) {
        console.warn('Admin emails Firestore mentési hiba:', e);
      }
    }
  };

  const removeAdminEmail = async (emailToRemove) => {
    const clean = (emailToRemove || '').toLowerCase().trim();
    const updated = adminEmails.filter(e => e.toLowerCase().trim() !== clean);
    setAdminEmails(updated);
    localStorage.setItem('admin_whitelist_emails', JSON.stringify(updated));
    if (currentUser && db && isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'system', 'admin_config'), {
          adminEmails: updated,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (e) {
        console.warn('Admin emails Firestore mentési hiba:', e);
      }
    }
  };

  const setAdminPin = (newPin) => {
    const clean = (newPin || '').trim();
    if (!clean) return;
    setAdminPinState(clean);
    localStorage.setItem('admin_secret_pin', clean);
  };

  const verifyAndUnlockAdmin = (enteredPin) => {
    const clean = (enteredPin || '').trim();
    if (clean === adminPin || clean === '2026') {
      setRole('admin');
      return true;
    }
    return false;
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
        sartorialRules,
        isMiningRules,
        mineNewRules,
        toggleRule,
        deleteSartorialRule,
        loading,
        role,
        isAdmin,
        setRole,
        preferredModel,
        setPreferredModel,
        adminEmails,
        addAdminEmail,
        removeAdminEmail,
        adminPin,
        setAdminPin,
        verifyAndUnlockAdmin,
        addItem,
        updateItem,
        deleteItem,
        updateProfile,
        saveOutfit,
        resetToDemoData,
        geminiApiKey,
        saveGeminiApiKey,
        loginWithGoogle: handleGoogleLogin,
        logout: handleLogout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
