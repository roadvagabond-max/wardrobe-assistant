import React, { useState, useRef, useEffect } from 'react';
import { X, Trash2, Sparkles, Tag, ShieldCheck, Calendar, Lightbulb, Edit3, Check, Camera, Upload } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ensureBase64Image } from '../../services/imageOptimizer';
import ColorPalettePicker from '../common/ColorPalettePicker';

const FORMALITY_LEVELS = [
  'Casual (Laza)',
  'Smart Casual',
  'Business Casual',
  'Business Formal',
  'Black Tie & Formal'
];

const STYLE_ARCHETYPES = [
  'Klasszikus & Időtlen',
  'Old Money & Quiet Luxury',
  'Smart Urban',
  'Streetwear',
  'Olasz Sprezzatura',
  'Minimalista',
  'Vintage & Retro'
];

const CONDITION_LEVELS = [
  { label: '✨ Vadonatúj / Kifogástalan', val: 'Vadonatúj / Kifogástalan' },
  { label: '👔 Megkímélt / Kiváló', val: 'Megkímélt / Kiváló' },
  { label: '🧸 Játszós / Kopott', val: 'Játszós / Kopott' },
  { label: '🧵 Javításra vár', val: 'Javításra vár' },
  { label: '🗑️ Lecserélendő', val: 'Lecserélendő' }
];

export default function ItemDetailModal({ item, onClose, onPlanWithItem }) {
  const { updateItem, deleteItem } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

  const [editData, setEditData] = useState({
    name: item?.name || '',
    category: item?.category || 'tops',
    subCategory: item?.subCategory || '',
    material: item?.material || '',
    brand: item?.brand || '',
    size: item?.size || '',
    color: item?.color || '',
    colorHex: item?.colorHex || '#ffffff',
    formality: item?.formality || 'Smart Casual',
    styleArchetype: item?.styleArchetype || 'Klasszikus & Időtlen',
    condition: item?.condition || 'Megkímélt / Kiváló',
    qualityScore: item?.qualityScore || 9.0,
    season: item?.season || ['tavasz', 'osz'],
    stylingTip: item?.stylingTip || '',
    whenToWear: item?.whenToWear || '',
    stylingAdvice: item?.stylingAdvice || '',
    tags: item?.tags || [],
    imageUrl: item?.imageUrl || ''
  });

  const photoInputRef = useRef(null);

  // Sync editData when item prop changes
  useEffect(() => {
    if (item) {
      setEditData({
        name: item.name || '',
        category: item.category || 'tops',
        subCategory: item.subCategory || '',
        material: item.material || '',
        brand: item.brand || '',
        size: item.size || '',
        color: item.color || '',
        colorHex: item.colorHex || '#ffffff',
        formality: item.formality || 'Smart Casual',
        styleArchetype: item.styleArchetype || 'Klasszikus & Időtlen',
        condition: item.condition || 'Megkímélt / Kiváló',
        qualityScore: item.qualityScore || 9.0,
        season: item.season || ['tavasz', 'osz'],
        stylingTip: item.stylingTip || '',
        whenToWear: item.whenToWear || '',
        stylingAdvice: item.stylingAdvice || '',
        tags: item.tags || [],
        imageUrl: item.imageUrl || ''
      });
    }
  }, [item]);

  if (!item) return null;

  const handleDelete = () => {
    if (window.confirm(`Biztosan törölni szeretnéd ezt a ruhadarabot (${item.name})?`)) {
      deleteItem(item.id);
      onClose();
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const optimized = await ensureBase64Image(file);
      setEditData(prev => ({ ...prev, imageUrl: optimized }));
    } catch (err) {
      console.error('Fotócsere hiba:', err);
    }
  };

  const handleSeasonToggle = (s) => {
    setEditData(prev => {
      const exists = prev.season.includes(s);
      return {
        ...prev,
        season: exists ? prev.season.filter(x => x !== s) : [...prev.season, s]
      };
    });
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    const fullUpdatedItem = {
      ...item,
      ...editData,
      imageUrl: editData.imageUrl || item.imageUrl
    };
    updateItem(item.id, fullUpdatedItem);
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative glass-card max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 border-[var(--border-gold)] space-y-5 my-auto animate-scale-up">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="badge badge-gold">
              {item.formality || 'Smart Casual'}
            </span>
            {item.condition && typeof item.condition === 'string' && (
              <span className={`badge ${
                item.condition.includes('Lecserélendő') || item.condition.includes('Javításra')
                  ? 'badge-rose'
                  : item.condition.includes('Játszós')
                  ? 'badge-subtle'
                  : 'badge-emerald'
              }`}>
                {item.condition}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="p-1.5 rounded-lg text-[var(--accent-gold)] hover:bg-white/10 transition-colors"
              title={isEditing ? 'Mégse' : 'Szerkesztés'}
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={handleDelete}
              className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Törlés a ruhatárból"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {isEditing ? (
          /* EDIT MODE FORM */
          <form onSubmit={handleSaveEdit} className="space-y-4">
            
            {/* Photo Replace */}
            <div className="space-y-2">
              <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-[#07090e] border border-white/10 p-2 flex items-center justify-center">
                <img 
                  src={editData.imageUrl || item.imageUrl} 
                  alt="Preview" 
                  className="max-h-full max-w-full object-contain rounded-lg" 
                />
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="absolute bottom-3 right-3 bg-black/80 text-white hover:text-[var(--accent-gold)] px-3 py-1.5 rounded-xl border border-white/20 text-xs flex items-center gap-1.5 shadow-xl"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Új fotó feltöltése</span>
                </button>
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={photoInputRef} 
                  onChange={handlePhotoUpload} 
                  className="hidden" 
                />
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Megnevezés:</label>
              <input
                type="text"
                required
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                className="custom-input text-sm"
              />
            </div>

            {/* Category & Formality */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Kategória:</label>
                <select
                  value={editData.category}
                  onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                  className="custom-input text-xs"
                >
                  <option value="outerwear">🧥 Zakó & Kabát</option>
                  <option value="knitwear">🧶 Pulóverek & Kötöttáru</option>
                  <option value="tops">👔 Ingek & Felsők</option>
                  <option value="bottoms">👖 Nadrágok</option>
                  <option value="shoes">👞 Cipők</option>
                  <option value="dresses">👗 Ruhák</option>
                  <option value="skirts">💃 Szoknyák</option>
                  <option value="accessories">⌚ Kiegészítők</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Formalitás:</label>
                <select
                  value={editData.formality}
                  onChange={(e) => setEditData({ ...editData, formality: e.target.value })}
                  className="custom-input text-xs"
                >
                  {FORMALITY_LEVELS.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Brand & Size */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Gyártó / Márka:</label>
                <input
                  type="text"
                  value={editData.brand}
                  onChange={(e) => setEditData({ ...editData, brand: e.target.value })}
                  className="custom-input text-xs"
                  placeholder="pl. Massimo Dutti, Zara"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Méret:</label>
                <input
                  type="text"
                  value={editData.size}
                  onChange={(e) => setEditData({ ...editData, size: e.target.value })}
                  className="custom-input text-xs font-mono"
                  placeholder="pl. 50, M, 32/32, 42.5"
                />
              </div>
            </div>

            {/* Color & Material */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Anyag:</label>
                <input
                  type="text"
                  value={editData.material}
                  onChange={(e) => setEditData({ ...editData, material: e.target.value })}
                  className="custom-input text-xs"
                />
              </div>

              <ColorPalettePicker
                selectedColor={editData.color}
                selectedHex={editData.colorHex}
                onSelectColor={(colName, hex) => {
                  setEditData(prev => ({ ...prev, color: colName, colorHex: hex }));
                }}
              />
            </div>

            {/* Condition */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Állapot:</label>
              <select
                value={editData.condition}
                onChange={(e) => setEditData({ ...editData, condition: e.target.value })}
                className="custom-input text-xs"
              >
                {CONDITION_LEVELS.map(c => (
                  <option key={c.val} value={c.val}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Seasonality */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Szezonalitás:</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'tavasz', label: '🌸 Tavasz' },
                  { id: 'nyar', label: '☀️ Nyár' },
                  { id: 'osz', label: '🍂 Ősz' },
                  { id: 'tel', label: '❄️ Tél' }
                ].map((s) => {
                  const isSelected = editData.season.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSeasonToggle(s.id)}
                      className={`py-1.5 px-1 rounded-lg text-xs font-medium border text-center transition-all ${
                        isSelected
                          ? 'bg-[var(--accent-gold)] text-black font-bold border-[var(--accent-gold)] shadow'
                          : 'bg-white/5 text-[var(--text-secondary)] border-white/5 hover:bg-white/10'
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-white/10 flex gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="btn-secondary flex-1 py-2 text-xs"
              >
                Mégse
              </button>
              <button
                type="submit"
                className="btn-gold flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Módosítások Mentése</span>
              </button>
            </div>

          </form>
        ) : (
          /* NORMAL VIEW DISPLAY */
          <>
            {/* Large Image (Uncropped, Proportional) */}
            <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-[#07090e] border border-white/10 p-2 flex items-center justify-center">
              <img src={item.imageUrl} alt={item.name} className="max-h-full max-w-full object-contain rounded-lg shadow-md" />
              {item.qualityScore && (
                <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-black/85 backdrop-blur-md border border-[var(--border-gold)] text-xs font-bold text-amber-300 flex items-center gap-1.5 shadow-lg">
                  <Sparkles className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                  <span>Minőség: {item.qualityScore} / 10</span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-bold font-serif text-white">{item.name}</h3>
                {item.stylingAdvice && (
                  <p className="text-xs text-[var(--text-secondary)] mt-1 italic">
                    "{item.stylingAdvice}"
                  </p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-xs bg-black/30 p-3.5 rounded-xl border border-white/5">
                {(item.brand || item.size) && (
                  <>
                    <div>
                      <span className="text-[var(--text-muted)] block mb-0.5">Gyártó / Márka:</span>
                      <span className="font-semibold text-[var(--accent-gold-light)]">{item.brand || 'Nincs megadva'}</span>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)] block mb-0.5">Méret:</span>
                      <span className="font-mono font-bold text-white bg-white/10 px-2 py-0.5 rounded inline-block">{item.size || 'Nincs megadva'}</span>
                    </div>
                  </>
                )}
                <div>
                  <span className="text-[var(--text-muted)] block mb-0.5">Anyag:</span>
                  <span className="font-medium text-white">{item.material || 'Természetes szálak'}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block mb-0.5">Szín:</span>
                  <div className="flex items-center gap-1.5">
                    {item.colorHex && (
                      <span className="w-3 h-3 rounded-full border border-white/40" style={{ backgroundColor: item.colorHex }} />
                    )}
                    <span className="font-medium text-white">{item.color}</span>
                  </div>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block mb-0.5">Stílusirányzat:</span>
                  <span className="font-medium text-white">{item.styleArchetype || 'Klasszikus & Időtlen'}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block mb-0.5">Állapot:</span>
                  <span className="font-medium text-emerald-400">{item.condition || 'Megkímélt / Kiváló'}</span>
                </div>
              </div>

              {/* AI Styling Tips */}
              {item.stylingTip && (
                <div className="p-3.5 rounded-xl bg-black/40 border border-amber-500/20 text-xs space-y-1">
                  <span className="font-bold text-amber-300 flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5" />
                    <span>Mivel érdemes hordani:</span>
                  </span>
                  <p className="text-[var(--text-secondary)] leading-relaxed">{item.stylingTip}</p>
                </div>
              )}

              {item.whenToWear && (
                <div className="p-3.5 rounded-xl bg-black/40 border border-emerald-500/20 text-xs space-y-1">
                  <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Mikor és milyen alkalomra:</span>
                  </span>
                  <p className="text-[var(--text-secondary)] leading-relaxed">{item.whenToWear}</p>
                </div>
              )}

              {/* Seasons */}
              <div>
                <span className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider block mb-1.5 font-bold">
                  Szezonalitás:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(Array.isArray(item.season) ? item.season : [item.season].filter(Boolean)).map((s, idx) => (
                    <span key={idx} className="badge badge-subtle capitalize text-[11px]">
                      {s === 'tavasz' ? '🌸 Tavasz' : s === 'nyar' ? '☀️ Nyár' : s === 'osz' ? '🍂 Ősz' : '❄️ Tél'}
                    </span>
                  ))}
                </div>
              </div>

              {/* Tags */}
              {item.tags && (
                <div>
                  <span className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider block mb-1.5 font-bold">
                    Címkék:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(Array.isArray(item.tags) ? item.tags : [item.tags].filter(Boolean)).map((tag, idx) => (
                      <span key={idx} className="badge badge-gold text-[10px]">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Anchor Button: Plan Outfit with this Item */}
              {onPlanWithItem && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onPlanWithItem(item);
                      onClose();
                    }}
                    className="btn-gold w-full py-2.5 text-xs font-bold flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>✨ Szett tervezése ezzel a ruhadarabbal</span>
                  </button>
                </div>
              )}

            </div>
          </>
        )}

      </div>
    </div>
  );
}
