import React, { useState, useEffect } from 'react';
import Header from './components/layout/Header';
import DesktopTabs from './components/layout/DesktopTabs';
import BottomNav from './components/layout/BottomNav';
import WardrobeView from './components/wardrobe/WardrobeView';
import AddClothingModal from './components/wardrobe/AddClothingModal';
import ItemDetailModal from './components/wardrobe/ItemDetailModal';
import StylistView from './components/stylist/StylistView';
import PurchaseAdvisorView from './components/advisor/PurchaseAdvisorView';
import MissingPiecesView from './components/missing/MissingPiecesView';
import StyleDNAView from './components/profile/StyleDNAView';
import AuthModal from './components/auth/AuthModal';
import SettingsModal from './components/settings/SettingsModal';
import { fetchCurrentWeather } from './services/weather';
import { useAuth } from './context/AuthContext';

const VALID_TABS = ['wardrobe', 'stylist', 'advisor', 'missing', 'profile'];

const getInitialTab = () => {
  try {
    const hash = window.location.hash.replace('#', '').trim();
    if (VALID_TABS.includes(hash)) return hash;
    const saved = localStorage.getItem('sartorial_active_tab');
    if (VALID_TABS.includes(saved)) return saved;
  } catch (_) {}
  return 'wardrobe';
};

export default function App() {
  const { wardrobe, addItem } = useAuth();
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
  const [initialAnchorItem, setInitialAnchorItem] = useState(null);
  const [advisorPrefill, setAdvisorPrefill] = useState(null);

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
    window.addEventListener('open-settings', handleOpenSettings);

    return () => {
      window.removeEventListener('open-settings', handleOpenSettings);
    };
  }, []);

  const handleTestInAdvisor = (gapItem) => {
    setAdvisorPrefill(gapItem);
    setActiveTab('advisor');
  };

  const handlePlanWithItem = (item) => {
    setInitialAnchorItem(item);
    setActiveTab('stylist');
  };

  return (
    <div className="min-h-screen flex flex-col">
      
      {/* Top Header */}
      <Header
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        weather={weather}
      />

      {/* Desktop Tabs */}
      <DesktopTabs activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area with BottomNav clearance padding */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 pb-28 sm:pb-24">
        {activeTab === 'wardrobe' && (
          <WardrobeView
            onAddNewItem={() => setIsAddModalOpen(true)}
            onSelectItem={(item) => setSelectedItem(item)}
          />
        )}

        {activeTab === 'stylist' && (
          <StylistView
            weather={weather}
            setWeather={setWeather}
            initialAnchorItem={initialAnchorItem}
          />
        )}

        {activeTab === 'advisor' && (
          <PurchaseAdvisorView
            prefillData={advisorPrefill}
            onClearPrefill={() => setAdvisorPrefill(null)}
          />
        )}

        {activeTab === 'missing' && (
          <MissingPiecesView onTestInAdvisor={handleTestInAdvisor} />
        )}

        {activeTab === 'profile' && (
          <StyleDNAView />
        )}
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

    </div>
  );
}
