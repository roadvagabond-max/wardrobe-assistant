import React from 'react';
import { Layers, Sparkles, ShoppingBag, PlusCircle, UserCheck } from 'lucide-react';

export default function DesktopTabs({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'wardrobe', label: 'Gardróbom', icon: Layers },
    { id: 'stylist', label: 'Outfit Stylist', icon: Sparkles },
    { id: 'advisor', label: 'Vásárlási Tanácsadó', icon: ShoppingBag, badge: '3-Outfit' },
    { id: 'missing', label: 'Kapszula Elemzés', icon: PlusCircle },
    { id: 'profile', label: 'Stílus Profil', icon: UserCheck }
  ];

  return (
    <div className="hidden lg:flex items-center justify-between border-b border-[var(--border-subtle)] bg-[#171411]/70 backdrop-blur-md px-8 py-2">
      <div className="max-w-7xl mx-auto w-full flex items-center justify-center gap-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 px-5 py-2 rounded-xl text-xs font-medium tracking-wide transition-all relative ${
                isActive
                  ? 'bg-white/10 text-white border border-[var(--border-gold)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[var(--accent-gold)]' : 'text-[var(--text-muted)]'}`} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="px-1.5 py-0.2 text-[8px] font-bold rounded-full bg-[var(--accent-gold)] text-black">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
