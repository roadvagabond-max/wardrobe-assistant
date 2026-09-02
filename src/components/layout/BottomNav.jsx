import React from 'react';
import { Layers, Sparkles, ShoppingBag, PlusCircle, UserCheck } from 'lucide-react';

export default function BottomNav({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'wardrobe', label: 'Gardrób', icon: Layers },
    { id: 'stylist', label: 'Stylist', icon: Sparkles },
    { id: 'advisor', label: 'Tanácsadó', icon: ShoppingBag, badge: '3-Outfit' },
    { id: 'missing', label: 'Hiányok', icon: PlusCircle },
    { id: 'profile', label: 'Stílus DNA', icon: UserCheck }
  ];

  return (
    <div className="fixed bottom-3 sm:bottom-5 left-0 right-0 z-40 flex justify-center px-3 pointer-events-none">
      <nav className="pointer-events-auto bg-[#101b30]/95 backdrop-blur-2xl border border-[var(--border-gold)]/45 rounded-full p-1.5 sm:p-2 shadow-[0_12px_40px_rgba(0,0,0,0.7),0_0_24px_var(--accent-gold-glow)] flex items-center gap-1 sm:gap-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 sm:gap-2 py-2 px-3 sm:px-4 rounded-full transition-all duration-300 relative select-none ${
                isActive 
                  ? 'bg-[var(--accent-gold)] text-[#080e1a] font-bold shadow-md shadow-[var(--accent-gold)]/35 scale-102' 
                  : 'text-[var(--text-secondary)] hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon className={`w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {tab.badge && !isActive && (
                  <span className="absolute -top-1.5 -right-2 px-1 py-0.2 text-[8px] font-bold bg-[var(--accent-gold)] text-black rounded-full shadow-sm">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-xs tracking-tight ${isActive ? 'inline-block' : 'hidden md:inline-block'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
