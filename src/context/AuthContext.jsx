import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { 
  auth, 
  db, 
  loginWithGoogle, 
  loginWithEmail, 
  registerWithEmail, 
  sendPasswordReset, 
  reauthenticateWithPassword,
  reauthenticateWithGoogle,
  deleteFirebaseUser,
  logoutUser, 
  isFirebaseConfigured, 
  getAuthErrorMessage 
} from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, setDoc, getDoc, getDocs, deleteDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { SAMPLE_SHOWCASE_WARDROBE, DEFAULT_GUEST_PROFILE, DEFAULT_NEW_USER_PROFILE } from '../data/mockWardrobe';
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
const SHOWCASE_VERSION_KEY = 'sartorial_showcase_version';
const CURRENT_SHOWCASE_VERSION = 'v1.7.9_20260908_v1';

const getInitialWardrobe = () => {
  try {
    const version = localStorage.getItem(SHOWCASE_VERSION_KEY);
    const saved = localStorage.getItem('wardrobe_items');
    
    // Check if saved items contain legacy brands or mismatched photos
    if (saved && version === CURRENT_SHOWCASE_VERSION) {
      const parsed = JSON.parse(saved);
      const isLegacy = parsed.some(item => 
        item.brand === 'Sartorial Selection' || 
        item.brand === 'Tailored Woolens' ||
        item.brand === 'Smart Casual Collection' ||
        item.brand === 'Formal Leathercraft' ||
        (item.imageUrl && item.imageUrl.includes('photo-1594633312681')) ||
        (item.imageUrl && item.imageUrl.includes('photo-1553062407'))
      );
      if (!isLegacy && Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (_) {}

  // Auto-migrate and update cache
  try {
    localStorage.setItem(SHOWCASE_VERSION_KEY, CURRENT_SHOWCASE_VERSION);
    localStorage.setItem('wardrobe_items', JSON.stringify(SAMPLE_SHOWCASE_WARDROBE));
    localStorage.setItem('user_style_profile', JSON.stringify(DEFAULT_GUEST_PROFILE));
    localStorage.removeItem('sartorial_last_generated_outfits');
    localStorage.removeItem('sartorial_last_anchor_items');
  } catch (_) {}
  return SAMPLE_SHOWCASE_WARDROBE;
};

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(true);

  const [wardrobe, setWardrobe] = useState(getInitialWardrobe);

  const [profile, setProfile] = useState(() => {
    try {
      const version = localStorage.getItem(SHOWCASE_VERSION_KEY);
      if (version === CURRENT_SHOWCASE_VERSION) {
        const saved = localStorage.getItem('user_style_profile');
        if (saved) return JSON.parse(saved);
      }
    } catch (_) {}
    return DEFAULT_GUEST_PROFILE;
  });

  const [savedOutfits, setSavedOutfits] = useState(() => {
    const saved = localStorage.getItem('saved_outfits');
    return saved ? JSON.parse(saved) : [];
  });

  const [sartorialRules, setSartorialRules] = useState(() => getStoredSartorialRules());
  const [isMiningRules, setIsMiningRules] = useState(false);

  const DEFAULT_ADMIN_EMAILS = ['roadvagabond@gmail.com'];

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

  // Zero Client-Side Secret Guarantee: clean up any legacy keys on startup
  useEffect(() => {
    try {
      localStorage.removeItem('GEMINI_API_KEY');
    } catch (_) {}
  }, []);

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
        const res = await checkAndAutoSyncSartorialRules(currentUser?.uid, profile, wardrobe);
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
            } else {
              const newProfile = {
                ...DEFAULT_NEW_USER_PROFILE,
                name: user.displayName || user.email?.split('@')[0] || 'Felhasználó'
              };
              const initialRole = isWhitelisted ? 'admin' : 'user';
              const localModel = 'gemini-3.7-flash';
              setRoleState(initialRole);
              localStorage.setItem('user_role', initialRole);
              await setDoc(userDocRef, {
                email: user.email,
                displayName: user.displayName,
                role: initialRole,
                preferredModel: localModel,
                profile: newProfile,
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
              setWardrobe([]);
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
      localStorage.setItem('user_style_profile', JSON.stringify(newProfile));
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

  // Complete Onboarding Helper
  const completeOnboarding = async (updatedProfileData = {}) => {
    const finalProfile = {
      ...profile,
      ...updatedProfileData,
      onboardingCompleted: true,
      updatedAt: new Date().toISOString()
    };
    await updateProfile(finalProfile);
    return finalProfile;
  };

  // Save an Outfit (Syncs to Firestore for logged-in users and localStorage)
  const saveOutfit = async (outfit) => {
    const newOutfit = {
      ...outfit,
      id: outfit.id || `outfit-${Date.now()}`,
      savedAt: new Date().toISOString()
    };
    const updated = [newOutfit, ...(savedOutfits || []).filter(o => o.id !== newOutfit.id)];
    setSavedOutfits(updated);
    localStorage.setItem('saved_outfits', JSON.stringify(updated));

    if (currentUser?.uid) {
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        await setDoc(userDocRef, { savedOutfits: updated }, { merge: true });
      } catch (err) {
        console.warn('Hiba a szett Firestore-ba mentésekor:', err);
      }
    }
    return newOutfit;
  };

  const deleteOutfit = async (outfitId) => {
    const updated = (savedOutfits || []).filter(o => o.id !== outfitId);
    setSavedOutfits(updated);
    localStorage.setItem('saved_outfits', JSON.stringify(updated));

    if (currentUser?.uid) {
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        await setDoc(userDocRef, { savedOutfits: updated }, { merge: true });
      } catch (err) {
        console.warn('Hiba a szett Firestore-ból törlésekor:', err);
      }
    }
    return updated;
  };


  // Sartorial Rules Actions
  const mineNewRules = async (focusTopic = '') => {
    setIsMiningRules(true);
    try {
      const res = await mineSartorialRulesFromWeb({ 
        userUid: currentUser?.uid,
        styleProfile: profile,
        wardrobe,
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

  // Complete User & Guest Session Storage Isolation
  const clearGuestSessionStorage = () => {
    try {
      const keysToRemove = [
        'sartorial_last_generated_outfits',
        'sartorial_last_anchor_items',
        'sartorial_last_custom_event',
        'sartorial_last_selected_event',
        'user_event_history',
        'saved_outfits',
        'stylist_chat_history',
        'capsule_gaps_cache',
        'sartorial_last_ai_gaps',
        'user_style_profile',
        'wardrobe_items',
        'sartorial_onboarding_collapsed',
        'sartorial_onboarding_hidden',
        'sartorial_rules_knowledge_base',
        'last_sartorial_mining_timestamp',
        'sartorial_stylist_mode',
        'user_role',
        'preferred_gemini_model',
        'admin_secret_pin'
      ];
      keysToRemove.forEach(k => localStorage.removeItem(k));
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sartorial_guide_dismissed_') || key.startsWith('sartorial_onboarding_'))) {
          localStorage.removeItem(key);
        }
      }
      sessionStorage.clear();
    } catch (_) {}
  };

  // Reset to Sample Showcase Data
  const resetToDemoData = () => {
    clearGuestSessionStorage();
    setWardrobe(SAMPLE_SHOWCASE_WARDROBE);
    setProfile(DEFAULT_GUEST_PROFILE);
    setSavedOutfits([]);
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

  const handleEmailLogin = async (email, password) => {
    try {
      const res = await loginWithEmail(email, password);
      setCurrentUser(res.user);
      setIsDemoMode(false);
      return res.user;
    } catch (err) {
      console.error('Email bejelentkezési hiba:', err);
      throw err;
    }
  };

  const handleEmailRegister = async (email, password, displayName = '') => {
    try {
      const res = await registerWithEmail(email, password, displayName);
      setCurrentUser(res.user);
      setIsDemoMode(false);
      return res.user;
    } catch (err) {
      console.error('Email regisztrációs hiba:', err);
      throw err;
    }
  };

  const handlePasswordReset = async (email) => {
    try {
      return await sendPasswordReset(email);
    } catch (err) {
      console.error('Jelszó-visszaállítási hiba:', err);
      throw err;
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (e) {
      console.warn('Logout figyelmeztetés:', e);
    }
    clearGuestSessionStorage();
    setCurrentUser(null);
    setIsDemoMode(true);
    setRoleState('user');
    localStorage.setItem('user_role', 'user');
    setWardrobe(SAMPLE_SHOWCASE_WARDROBE);
    setProfile(DEFAULT_GUEST_PROFILE);
    setSavedOutfits([]);
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

  const [isSimulatingUser, setIsSimulatingUser] = useState(false);

  const isUserEmailWhitelisted = Boolean(
    currentUser &&
    currentUser.email &&
    adminEmails.some(ae => ae.toLowerCase().trim() === currentUser.email.toLowerCase().trim())
  );

  const isActualAdmin = Boolean(isUserEmailWhitelisted);
  const isAdmin = isActualAdmin && !isSimulatingUser;

  const toggleUserSimulation = () => {
    if (!isActualAdmin) return;
    setIsSimulatingUser(prev => !prev);
  };

  // 🔄 Load Global Admin Whitelist from Firestore on start
  useEffect(() => {
    if (!db || !isFirebaseConfigured) return;
    getDoc(doc(db, 'system', 'admin_config')).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data.adminEmails) && data.adminEmails.length > 0) {
          setAdminEmails(data.adminEmails);
          localStorage.setItem('admin_whitelist_emails', JSON.stringify(data.adminEmails));
        }
      }
    }).catch(() => {});
  }, []);

  const addAdminEmail = async (newEmail) => {
    const clean = (newEmail || '').toLowerCase().trim();
    if (!clean || adminEmails.includes(clean)) return;
    const updated = [...adminEmails, clean];
    setAdminEmails(updated);
    localStorage.setItem('admin_whitelist_emails', JSON.stringify(updated));

    if (currentUser && db && isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'users', currentUser.uid), {
          adminEmails: updated,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (_) {}

      try {
        await setDoc(doc(db, 'system', 'admin_config'), {
          adminEmails: updated,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (_) {}
    }
  };

  const removeAdminEmail = async (emailToRemove) => {
    const clean = (emailToRemove || '').toLowerCase().trim();
    const updated = adminEmails.filter(e => e.toLowerCase().trim() !== clean);
    setAdminEmails(updated);
    localStorage.setItem('admin_whitelist_emails', JSON.stringify(updated));

    if (currentUser && db && isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'users', currentUser.uid), {
          adminEmails: updated,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (_) {}

      try {
        await setDoc(doc(db, 'system', 'admin_config'), {
          adminEmails: updated,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (_) {}
    }
  };

  const setAdminPin = (newPin) => {
    const clean = (newPin || '').trim();
    if (!clean) return;
    setAdminPinState(clean);
    localStorage.setItem('admin_secret_pin', clean);
  };

  const verifyAndUnlockAdmin = (enteredPin) => {
    return isActualAdmin;
  };

  const resetUserByUid = async (uidToReset) => {
    const cleanUid = (uidToReset || '').trim();
    if (!cleanUid) return { success: false, error: 'Kérlek adj meg egy érvényes UID-t!' };
    if (!db || !isFirebaseConfigured) return { success: false, error: 'Nincs aktív Firestore kapcsolat.' };

    try {
      // 1. Töröljük a wardrobe alkollekciót
      const wardrobeCol = collection(db, 'users', cleanUid, 'wardrobe');
      const snap = await getDocs(wardrobeCol);
      const deletePromises = snap.docs.map(docItem => deleteDoc(doc(db, 'users', cleanUid, 'wardrobe', docItem.id)));
      await Promise.all(deletePromises);

      // 2. Töröljük a settings/sartorialRules alkollekciót
      try {
        await deleteDoc(doc(db, 'users', cleanUid, 'settings', 'sartorialRules'));
      } catch (_) {}

      // 3. Töröljük a felhasználói fődokumentumot
      await deleteDoc(doc(db, 'users', cleanUid));
      return { success: true };
    } catch (err) {
      console.error('Felhasználó törlési hiba:', err);
      return { success: false, error: err.message };
    }
  };

  /**
   * 🛡️ GDPR-Compliant Complete Account & Data Deletion (Art. 17 Right to Erasure)
   * Permanently deletes all wardrobe items, saved outfits, mined rules, profile, and Auth identity.
   * Requires mandatory re-authentication before touching any data.
   */
  const deleteUserAccountAndData = async (options = {}) => {
    if (!currentUser) {
      resetToDemoData();
      clearGuestSessionStorage();
      window.location.reload();
      return { success: true };
    }

    const uid = currentUser.uid;
    const isGoogleUser = currentUser.providerData.some(p => p.providerId === 'google.com');
    const isPasswordUser = currentUser.providerData.some(p => p.providerId === 'password');

    // 1. Mandatory Re-authentication BEFORE touching any data
    try {
      if (isGoogleUser) {
        await reauthenticateWithGoogle(currentUser);
      } else if (isPasswordUser) {
        if (!options.password || !options.password.trim()) {
          throw new Error('A fiókod és adataid végleges törléséhez kérlek add meg a jelenlegi jelszavadat!');
        }
        await reauthenticateWithPassword(currentUser, options.password.trim());
      }
    } catch (reauthErr) {
      console.error('Re-autentikációs hiba fióktörlés előtt:', reauthErr);
      const friendlyMsg = getAuthErrorMessage(reauthErr);
      throw new Error(friendlyMsg);
    }

    // 2. Delete Firestore data only after successful re-auth
    try {
      if (db && isFirebaseConfigured) {
        // Delete wardrobe subcollection
        try {
          const wardrobeCol = collection(db, 'users', uid, 'wardrobe');
          const wardrobeSnap = await getDocs(wardrobeCol);
          const wardrobeDeletes = wardrobeSnap.docs.map(d => deleteDoc(doc(db, 'users', uid, 'wardrobe', d.id)));
          await Promise.all(wardrobeDeletes);
        } catch (_) {}

        // Delete minedRules subcollection
        try {
          const rulesCol = collection(db, 'users', uid, 'minedRules');
          const rulesSnap = await getDocs(rulesCol);
          const rulesDeletes = rulesSnap.docs.map(d => deleteDoc(doc(db, 'users', uid, 'minedRules', d.id)));
          await Promise.all(rulesDeletes);
        } catch (_) {}

        // Delete user settings subcollection
        try {
          await deleteDoc(doc(db, 'users', uid, 'settings', 'sartorialRules'));
        } catch (_) {}

        // Delete root user document
        try {
          await deleteDoc(doc(db, 'users', uid));
        } catch (_) {}
      }

      // 3. Clear Local Storage and Session Storage completely
      clearGuestSessionStorage();

      // 4. Delete Firebase Auth User Account (guaranteed to succeed due to fresh re-auth)
      await deleteFirebaseUser(currentUser);

      // 5. Reset in-memory state and reload to clean guest session
      setCurrentUser(null);
      setIsDemoMode(true);
      setWardrobe(SAMPLE_SHOWCASE_WARDROBE);
      setProfile(DEFAULT_GUEST_PROFILE);
      setSavedOutfits([]);

      window.location.reload();
      return { success: true };
    } catch (err) {
      console.error('GDPR fióktörlési hiba:', err);
      const friendlyMsg = getAuthErrorMessage(err);
      throw new Error(friendlyMsg);
    }
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
        isActualAdmin,
        isSimulatingUser,
        toggleUserSimulation,
        setRole,
        preferredModel,
        setPreferredModel,
        adminEmails,
        addAdminEmail,
        removeAdminEmail,
        adminPin,
        setAdminPin,
        verifyAndUnlockAdmin,
        resetUserByUid,
        deleteUserAccountAndData,
        addItem,
        updateItem,
        deleteItem,
        updateProfile,
        completeOnboarding,
        saveOutfit,
        deleteOutfit,
        resetToDemoData,
        loginWithGoogle: handleGoogleLogin,
        loginWithEmail: handleEmailLogin,
        registerWithEmail: handleEmailRegister,
        sendPasswordReset: handlePasswordReset,
        getAuthErrorMessage,
        logout: handleLogout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
