import React, { useState, useRef, useEffect } from 'react';
import { Palette, Check, X } from 'lucide-react';

export const CURATED_FASHION_COLORS = [
  { name: 'Sötétkék (Navy)', hex: '#1b2a4a' },
  { name: 'Fekete (Black)', hex: '#111111' },
  { name: 'Fehér (Crisp White)', hex: '#ffffff' },
  { name: 'Törtfehér / Krém', hex: '#f5f2eb' },
  { name: 'Homokbézs / Nude', hex: '#d8c3a5' },
  { name: 'Teveszín (Camel)', hex: '#c19a6b' },
  { name: 'Dohánybarna / Espresso', hex: '#4a3525' },
  { name: 'Olívazöld (Olive)', hex: '#556b2f' },
  { name: 'Zsályazöld (Sage)', hex: '#8a9a86' },
  { name: 'Erdőzöld (Forest)', hex: '#23442a' },
  { name: 'Világoskék (Sky Blue)', hex: '#87ceeb' },
  { name: 'Királykék / Kobalt', hex: '#27408b' },
  { name: 'Világosszürke (Light Grey)', hex: '#d1d5db' },
  { name: 'Antracitszürke (Charcoal)', hex: '#374151' },
  { name: 'Bordó / Burgundi (Wine)', hex: '#6b1d2f' },
  { name: 'Terrakotta / Rozsda', hex: '#b7410e' }
];

export default function ColorPalettePicker({ selectedColor, selectedHex, onSelectColor }) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handlePick = (col) => {
    onSelectColor(col.name, col.hex);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={popoverRef}>
      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
        Szín & Árnyalat:
      </label>
      
      {/* Trigger Button / Input display */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="custom-input flex-1 flex items-center justify-between gap-2 text-left cursor-pointer hover:border-[var(--accent-gold)] transition-colors"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="w-5 h-5 rounded-full border border-white/20 shadow-inner shrink-0"
              style={{ backgroundColor: selectedHex || '#ffffff' }}
            />
            <span className="text-sm font-medium text-white truncate">
              {selectedColor || 'Válassz színt...'}
            </span>
          </div>
          <Palette className="w-4 h-4 text-[var(--accent-gold)] shrink-0" />
        </button>
      </div>

      {/* Popover Color Grid */}
      {isOpen && (
        <div className="absolute z-50 bottom-full mb-2 left-0 w-72 sm:w-80 p-3 rounded-2xl bg-[#0f121d] border border-[var(--border-gold)] shadow-2xl backdrop-blur-xl animate-scale-up">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
            <span className="text-xs font-serif font-bold text-white flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
              <span>Kurált Ruhatári Színpaletta</span>
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 text-[var(--text-muted)] hover:text-white rounded-lg"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5 max-h-60 overflow-y-auto scrollbar-thin pr-1">
            {CURATED_FASHION_COLORS.map((col, idx) => {
              const isSelected = selectedHex?.toLowerCase() === col.hex.toLowerCase() || selectedColor === col.name;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handlePick(col)}
                  className={`flex items-center gap-2 p-1.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-[var(--accent-gold-glow)] border-[var(--accent-gold)] ring-1 ring-[var(--accent-gold)]'
                      : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full border border-white/30 shrink-0 shadow"
                    style={{ backgroundColor: col.hex }}
                  />
                  <span className="text-[11px] font-medium text-white truncate flex-1">
                    {col.name}
                  </span>
                  {isSelected && <Check className="w-3 h-3 text-[var(--accent-gold)] shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
