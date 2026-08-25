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

export default function App() {
  const { addItem } = useAuth();
  const [activeTab, setActiveTab] = useState('wardrobe');
  const [weather, setWeather] = useState(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [initialAnchorItem, setInitialAnchorItem] = useState(null);

  // Load weather initially
  useEffect(() => {
    async function initWeather() {
      const data = await fetchCurrentWeather('Budapest');
      setWeather(data);
    }
    initWeather();
  }, []);

  const handleTestInAdvisor = (gapItem) => {
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

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
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
          <PurchaseAdvisorView />
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

      <ItemDetailModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onPlanWithItem={handlePlanWithItem}
      />

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
