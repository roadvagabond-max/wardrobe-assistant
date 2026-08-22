import React from 'react';
import { Layers, Sparkles, ShoppingBag, PlusCircle, UserCheck } from 'lucide-react';

export default function BottomNav({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'wardrobe', label: 'Gardróbom', icon: Layers },
    { id: 'stylist', label: 'AI Stylist', icon: Sparkles },
    { id: 'advisor', label: 'Megvegyem?', icon: ShoppingBag, badge: '3-Outfit' },
    { id: 'missing', label: 'Hiányzó darabok', icon: PlusCircle },
    { id: 'profile', label: 'Stílus DNA', icon: UserCheck }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden glass-panel border-t border-[var(--border-subtle)] pb-[var(--safe-bottom)] pt-2 px-2">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all relative ${
                isActive 
                  ? 'text-[var(--accent-gold-light)] font-semibold' 
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-115 text-[var(--accent-gold)]' : ''}`} />
                {tab.badge && (
                  <span className="absolute -top-1.5 -right-3 px-1 py-0.2 text-[8px] font-bold bg-[var(--accent-gold)] text-black rounded-full shadow-sm">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-1 tracking-tight ${isActive ? 'text-[var(--accent-gold-light)] font-bold' : ''}`}>
                {tab.label}
              </span>
              {isActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-gold)] mt-0.5 shadow-sm shadow-[var(--accent-gold)]"></div>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
