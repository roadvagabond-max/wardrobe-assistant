import React from 'react';
import { Layers, Sparkles, ShoppingBag, PlusCircle, UserCheck } from 'lucide-react';

export default function DesktopTabs({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'wardrobe', label: 'Ruhatáram', icon: Layers, desc: 'Katalógus & darabok' },
    { id: 'stylist', label: 'AI Outfit Stylist', icon: Sparkles, desc: 'Esemény & időjárás ajánló' },
    { id: 'advisor', label: 'Vásárlás Előtti Tanácsadó', icon: ShoppingBag, desc: '„Megvegyem?” 3-Outfit teszt', badge: 'Új' },
    { id: 'missing', label: 'Hiányzó Darabok', icon: PlusCircle, desc: 'Gardrób-gap elemzés' },
    { id: 'profile', label: 'Személyes Stílus DNA', icon: UserCheck, desc: 'Preferenciák & testalkat' }
  ];

  return (
    <div className="hidden lg:flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]/60 backdrop-blur-md px-8 py-2">
      <div className="max-w-7xl mx-auto w-full flex items-center gap-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-5 py-2.5 rounded-xl text-sm font-medium transition-all relative ${
                isActive
                  ? 'bg-white/10 text-white border border-[var(--border-gold)] shadow-md shadow-black/20'
                  : 'text-[var(--text-secondary)] hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[var(--accent-gold)]' : 'text-[var(--text-muted)]'}`} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-[var(--accent-gold)] text-black">
                  {tab.badge}
                </span>
              )}
              {isActive && (
                <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-[var(--accent-gold)] rounded-full"></span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
