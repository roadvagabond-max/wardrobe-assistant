import React, { useState, useEffect } from 'react';
import Header from './components/layout/Header';
import OfflineBanner from './components/layout/OfflineBanner';
import DesktopTabs from './components/layout/DesktopTabs';
import BottomNav from './components/layout/BottomNav';
import OutfitsView from './components/outfits/OutfitsView';
import WardrobeView from './components/wardrobe/WardrobeView';
import AddClothingModal from './components/wardrobe/AddClothingModal';
import ItemDetailModal from './components/wardrobe/ItemDetailModal';
import PurchaseAdvisorView from './components/advisor/PurchaseAdvisorView';
import StylistView from './components/stylist/StylistView';
import StyleDNAView from './components/profile/StyleDNAView';
import AuthModal from './components/auth/AuthModal';
import SettingsModal from './components/settings/SettingsModal';
import HelpGuideModal from './components/common/HelpGuideModal';
import OnboardingModal from './components/onboarding/OnboardingModal';
import ErrorBoundary from './components/common/ErrorBoundary';
import { fetchCurrentWeather } from './services/weather';
import { useAuth } from './context/AuthContext';

const VALID_TABS = ['outfits', 'wardrobe', 'advisor', 'stylist', 'profile'];

const getInitialTab = () => {
  try {
    const hash = window.location.hash.replace('#', '').trim();
    if (VALID_TABS.includes(hash)) return hash;
    const saved = localStorage.getItem('sartorial_active_tab');
    if (VALID_TABS.includes(saved)) return saved;
  } catch (_) {}
  return 'outfits';
};

export default function App() {
  const { wardrobe, profile, currentUser, addItem, savedOutfits } = useAuth();
  const [activeTab, setActiveTabState] = useState(getInitialTab);
  const [weather, setWeather] = useState(null);

  const setActiveTab = (tab) => {
    if (!VALID_TABS.includes(tab)) return;
    setActiveTabState(tab);
    try {
      localStorage.setItem('sartorial_active_tab', tab);
      if (window.location.hash !== `#${tab}`) {
        window.history.replaceState(null, document.title, `#${tab}`);
      }
    } catch (_) {}
  };

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
  const [initialAnchorItem, setInitialAnchorItem] = useState(null);
  const [advisorPrefill, setAdvisorPrefill] = useState(null);

  // Stylist sub-mode & top bar states
  const [stylistMode, setStylistMode] = useState(() => {
    try {
      return localStorage.getItem('sartorial_stylist_mode') || 'manual-builder';
    } catch (_) {
      return 'manual-builder';
    }
  });
  const [isSavedOutfitsOpen, setIsSavedOutfitsOpen] = useState(false);
  const [showStylistGuide, setShowStylistGuide] = useState(false);

  // Sync hash changes (e.g. mobile back button or direct bookmark)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').trim();
      if (VALID_TABS.includes(hash)) {
        setActiveTabState(hash);
        try {
          localStorage.setItem('sartorial_active_tab', hash);
        } catch (_) {}
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Load weather initially & detect Web Share Target query params (?url=..., ?text=...)
  useEffect(() => {
    async function initWeather() {
      const data = await fetchCurrentWeather('Budapest');
      setWeather(data);
    }
    initWeather();

    // Check for incoming Web Share Target (e.g. from Mobile Browser or Facebook Share Sheet)
    try {
      const params = new URLSearchParams(window.location.search);
      const sharedUrl = params.get('url');
      const sharedText = params.get('text');
      const sharedTitle = params.get('title');

      let candidateUrl = '';
      if (sharedUrl && (sharedUrl.startsWith('http://') || sharedUrl.startsWith('https://'))) {
        candidateUrl = sharedUrl;
      } else if (sharedText) {
        // Extract URL from shared text (handles Facebook/Messenger share payloads)
        const urlMatch = sharedText.match(/https?:\/\/[^\s]+/i);
        if (urlMatch) {
          candidateUrl = urlMatch[0];
        }
      }

      if (candidateUrl) {
        setAdvisorPrefill({ url: candidateUrl, title: sharedTitle || '' });
        setActiveTab('advisor');

        // Clean up URL query params from address bar
        const cleanUrl = window.location.pathname + `#advisor`;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    } catch (e) {
      console.warn('Share target param feldolgozási figyelmeztetés:', e);
    }

    const handleOpenSettings = () => setIsSettingsModalOpen(true);
    const handleOpenHelp = () => setIsHelpModalOpen(true);
    const handleOpenAuth = () => setIsAuthModalOpen(true);
    const handleOpenOnboarding = () => setIsOnboardingModalOpen(true);

    window.addEventListener('open-settings', handleOpenSettings);
    window.addEventListener('open-help', handleOpenHelp);
    window.addEventListener('open-auth', handleOpenAuth);
    window.addEventListener('open-onboarding', handleOpenOnboarding);

    return () => {
      window.removeEventListener('open-settings', handleOpenSettings);
      window.removeEventListener('open-help', handleOpenHelp);
      window.removeEventListener('open-auth', handleOpenAuth);
      window.removeEventListener('open-onboarding', handleOpenOnboarding);
    };
  }, []);

  // Auto-open Onboarding Modal for newly authenticated users who haven't completed onboarding
  useEffect(() => {
    if (!currentUser) {
      setIsOnboardingModalOpen(false);
      return;
    }
    if (profile && profile.onboardingCompleted === false) {
      const skippedKey = `sartorial_onboarding_skipped_${currentUser.uid}`;
      if (!sessionStorage.getItem(skippedKey)) {
        setIsOnboardingModalOpen(true);
      }
    } else {
      setIsOnboardingModalOpen(false);
    }
  }, [currentUser?.uid, profile?.onboardingCompleted]);

  const handleTestInAdvisor = (gapItem) => {
    setAdvisorPrefill(gapItem);
    setActiveTab('advisor');
  };

  const handlePlanWithItem = (item) => {
    setInitialAnchorItem(item);
    setActiveTab('outfits');
  };

  return (
    <div className="min-h-screen flex flex-col">
      
      {/* Contextual Top Header (e.g. Mix & Match bar) */}
      <Header
        activeTab={activeTab}
        stylistMode={stylistMode}
        setStylistMode={setStylistMode}
        onOpenSavedOutfits={() => setIsSavedOutfitsOpen(true)}
        savedOutfitsCount={savedOutfits?.length || 0}
        showStylistGuide={showStylistGuide}
        onToggleStylistGuide={() => setShowStylistGuide(prev => !prev)}
      />

      {/* Discrete Offline & Network Status Banner */}
      <OfflineBanner />

      {/* Desktop Tabs */}
      <DesktopTabs activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area with BottomNav clearance padding */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 pb-28 sm:pb-24">
        <ErrorBoundary key={activeTab}>
          {activeTab === 'outfits' && (
            <OutfitsView
              weather={weather}
              setWeather={setWeather}
              initialAnchorItem={initialAnchorItem}
            />
          )}

          {activeTab === 'wardrobe' && (
            <WardrobeView
              onAddNewItem={() => setIsAddModalOpen(true)}
              onSelectItem={(item) => setSelectedItem(item)}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'advisor' && (
            <PurchaseAdvisorView
              weather={weather}
              prefillData={advisorPrefill}
              onClearPrefill={() => setAdvisorPrefill(null)}
            />
          )}

          {activeTab === 'stylist' && (
            <StylistView
              weather={weather}
              setWeather={setWeather}
              initialAnchorItem={initialAnchorItem}
              activeMode={stylistMode}
              setActiveMode={setStylistMode}
              isSavedOutfitsOpen={isSavedOutfitsOpen}
              setIsSavedOutfitsOpen={setIsSavedOutfitsOpen}
              showGuide={showStylistGuide}
              setShowGuide={setShowStylistGuide}
            />
          )}

          {activeTab === 'profile' && (
            <StyleDNAView
              onOpenSettings={() => setIsSettingsModalOpen(true)}
              onOpenHelp={() => setIsHelpModalOpen(true)}
              onOpenAuth={() => setIsAuthModalOpen(true)}
            />
          )}
        </ErrorBoundary>
      </main>

      {/* Mobile-First Bottom Navigation Bar */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Modals */}
      <AddClothingModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddClothing={(item) => addItem(item)}
      />

      {selectedItem && (
        <ItemDetailModal
          item={(wardrobe || []).find(w => w?.id === selectedItem?.id) || selectedItem}
          onClose={() => setSelectedItem(null)}
          onPlanWithItem={handlePlanWithItem}
        />
      )}

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />

      <HelpGuideModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />

      <OnboardingModal
        isOpen={isOnboardingModalOpen}
        onClose={() => {
          setIsOnboardingModalOpen(false);
          if (currentUser) {
            sessionStorage.setItem(`sartorial_onboarding_skipped_${currentUser.uid}`, 'true');
          }
        }}
        onFinish={(updatedProfile) => {
          setIsOnboardingModalOpen(false);
          setActiveTab('wardrobe');
        }}
      />

    </div>
  );
}

