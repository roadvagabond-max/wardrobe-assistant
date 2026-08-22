import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, Upload, Link as LinkIcon, Sparkles, Check, Loader2, AlertCircle, Compass, Calendar, Tag, Plus, Image as ImageIcon } from 'lucide-react';
import { analyzeClothingImage } from '../../services/gemini';
import { extractWebshopData } from '../../services/webshop';
import { uploadGarmentImage } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import confetti from 'canvas-confetti';

const DEFAULT_FORM_DATA = {
  name: '',
  category: 'tops',
  subCategory: 'shirt',
  color: 'Sötétkék',
  colorHex: '#1e293b',
  material: '100% Pamut',
  qualityScore: 9.0,
  season: ['tavasz', 'nyar', 'osz', 'tel'],
  formality: 'Smart Casual',
  pattern: 'Egyszínű',
  brand: '',
  stylingTip: '',
  whenToWear: '',
  stylingAdvice: '',
  tags: ['alapdarab', 'smart casual']
};

const POPULAR_STYLE_TAGS = [
  'Elegáns',
  'Business',
  'Smart Casual',
  'Casual',
  'Sprezzatura',
  'Old Money',
  'Streetwear',
  'Minimalista',
  'Klasszikus',
  'Alapdarab',
  'Kényelmes',
  'Prémium'
];

export default function AddClothingModal({ isOpen, onClose }) {
  const { addItem, currentUser } = useAuth();

  const [activeMode, setActiveMode] = useState('camera'); // 'camera', 'upload', 'link'
  const [imagePreview, setImagePreview] = useState(null);
  const [availableImages, setAvailableImages] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [webshopUrl, setWebshopUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [customTagInput, setCustomTagInput] = useState('');

  // Form Fields
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const stylingTipRef = useRef(null);
  const whenToWearRef = useRef(null);

  // 1. Reset form on close or fresh open
  const resetForm = () => {
    setImagePreview(null);
    setAvailableImages([]);
    setSelectedFile(null);
    setWebshopUrl('');
    setIsAnalyzing(false);
    setIsSaving(false);
    setAnalysisError(null);
    setActiveMode('camera');
    setCustomTagInput('');
    setFormData(DEFAULT_FORM_DATA);
  };

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  // Auto-resize textareas
  useEffect(() => {
    if (stylingTipRef.current) {
      stylingTipRef.current.style.height = 'auto';
      stylingTipRef.current.style.height = `${Math.max(70, stylingTipRef.current.scrollHeight)}px`;
    }
    if (whenToWearRef.current) {
      whenToWearRef.current.style.height = 'auto';
      whenToWearRef.current.style.height = `${Math.max(70, whenToWearRef.current.scrollHeight)}px`;
    }
  }, [formData.stylingTip, formData.whenToWear]);

  if (!isOpen) return null;

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result;
      setImagePreview(base64);
      setAvailableImages([base64]);
      await triggerAIAnalysis(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleLinkImport = async (e) => {
    e.preventDefault();
    if (!webshopUrl.trim()) return;

    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const webshopData = await extractWebshopData(webshopUrl.trim());
      const chosenImage = webshopData.imageUrl || (webshopData.images && webshopData.images[0]) || '';
      
      setImagePreview(chosenImage);
      setAvailableImages(webshopData.images || [chosenImage].filter(Boolean));

      await triggerAIAnalysis(chosenImage, webshopData);
    } catch (err) {
      console.error('Webshop link hiba:', err);
      setAnalysisError(err.message || 'Nem sikerült kinyerni az adatokat a megadott webshop linkről. Próbáld közvetlen képcímmel vagy fotóval!');
      setIsAnalyzing(false);
    }
  };

  const triggerAIAnalysis = async (imgSource, webshopContext = {}) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const aiResult = await analyzeClothingImage(imgSource, webshopContext);
      if (aiResult) {
        setFormData(prev => ({
          ...prev,
          name: aiResult.name || webshopContext.title || prev.name || 'Új Ruhadarab',
          category: aiResult.category || prev.category,
          subCategory: aiResult.subCategory || prev.subCategory,
          color: aiResult.color || prev.color,
          colorHex: aiResult.colorHex || prev.colorHex,
          material: aiResult.material || webshopContext.description || prev.material,
          brand: aiResult.brand || webshopContext.brand || prev.brand,
          qualityScore: aiResult.qualityScore || prev.qualityScore,
          season: aiResult.season || prev.season,
          formality: aiResult.formality || prev.formality,
          pattern: aiResult.pattern || prev.pattern,
          stylingTip: aiResult.stylingTip || prev.stylingTip,
          whenToWear: aiResult.whenToWear || prev.whenToWear,
          stylingAdvice: aiResult.stylingAdvice || prev.stylingAdvice,
          tags: aiResult.tags && aiResult.tags.length > 0 ? aiResult.tags : prev.tags
        }));
      }
    } catch (err) {
      console.error('AI elemzési hiba:', err);
      setAnalysisError(err.message || 'Ismeretlen hiba történt az AI elemzés során.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSeasonToggle = (s) => {
    setFormData(prev => {
      const exists = prev.season.includes(s);
      return {
        ...prev,
        season: exists ? prev.season.filter(x => x !== s) : [...prev.season, s]
      };
    });
  };

  const handleTagToggle = (tagToToggle) => {
    const norm = tagToToggle.trim().toLowerCase();
    setFormData(prev => {
      const currentTags = prev.tags || [];
      const exists = currentTags.some(t => t.toLowerCase() === norm);
      return {
        ...prev,
        tags: exists 
          ? currentTags.filter(t => t.toLowerCase() !== norm)
          : [...currentTags, tagToToggle.trim()]
      };
    });
  };

  const handleAddCustomTag = (e) => {
    if (e) e.preventDefault();
    if (!customTagInput.trim()) return;

    const newTag = customTagInput.trim();
    if (!formData.tags.some(t => t.toLowerCase() === newTag.toLowerCase())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag]
      }));
    }
    setCustomTagInput('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!imagePreview) return;

    setIsSaving(true);
    try {
      let finalImageUrl = imagePreview;

      if (selectedFile) {
        finalImageUrl = await uploadGarmentImage(selectedFile, currentUser?.uid || 'demo-user');
      }

      await addItem({
        ...formData,
        imageUrl: finalImageUrl
      });

      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#d4af37', '#f3e5ab', '#ffffff']
        });
      } catch (_) {}

      handleClose();
    } catch (err) {
      console.error('Mentési hiba:', err);
      alert('Hiba történt a mentés során. Kérlek próbáld újra.');
    } finally {
      setIsSaving(false);
    }
  };

  const allAvailableTags = Array.from(new Set([
    ...POPULAR_STYLE_TAGS,
    ...(formData.tags || [])
  ]));

  return (
    <div className="modal-backdrop">
      <div className="glass-card max-w-xl w-full max-h-[92vh] overflow-y-auto p-5 sm:p-7 border-[var(--border-gold)] space-y-5 animate-slide-up">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-gold-glow)] flex items-center justify-center text-[var(--accent-gold)]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-white">Új Ruha Hozzáadása</h3>
              <p className="text-[11px] text-[var(--text-muted)]">AI felismerés, minősítés és stílustanácsadás</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input Source Tabs */}
        {!imagePreview && (
          <div className="grid grid-cols-3 gap-2 p-1 bg-black/40 rounded-xl border border-white/5">
            <button
              type="button"
              onClick={() => setActiveMode('camera')}
              className={`py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                activeMode === 'camera' ? 'bg-[var(--accent-gold)] text-black font-semibold shadow' : 'text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Fotózás</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMode('upload')}
              className={`py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                activeMode === 'upload' ? 'bg-[var(--accent-gold)] text-black font-semibold shadow' : 'text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Feltöltés</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMode('link')}
              className={`py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                activeMode === 'link' ? 'bg-[var(--accent-gold)] text-black font-semibold shadow' : 'text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              <LinkIcon className="w-4 h-4" />
              <span>Webshop Link</span>
            </button>
          </div>
        )}

        {/* Action Input Section */}
        {!imagePreview ? (
          <div className="space-y-4">
            
            {activeMode === 'camera' && (
              <div 
                onClick={() => cameraInputRef.current?.click()}
                className="border-2 border-dashed border-[var(--border-gold)] rounded-2xl p-8 text-center cursor-pointer hover:bg-white/5 transition-all group"
              >
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="w-14 h-14 rounded-full bg-[var(--accent-gold-glow)] text-[var(--accent-gold)] flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <Camera className="w-7 h-7" />
                </div>
                <h4 className="font-semibold text-white text-sm">Kattints a kamera megnyitásához</h4>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Fotózd le a ruhádat a gardróbodban vagy a próbafülkében!
                </p>
              </div>
            )}

            {activeMode === 'upload' && (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-white/15 rounded-2xl p-8 text-center cursor-pointer hover:border-[var(--accent-gold)] hover:bg-white/5 transition-all group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="w-14 h-14 rounded-full bg-white/5 text-[var(--text-secondary)] flex items-center justify-center mx-auto mb-3 group-hover:scale-110 group-hover:text-[var(--accent-gold)] transition-all">
                  <Upload className="w-7 h-7" />
                </div>
                <h4 className="font-semibold text-white text-sm">Kép kiválasztása a galériából vagy gépről</h4>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  PNG, JPG vagy WEBP formátum támogatott
                </p>
              </div>
            )}

            {activeMode === 'link' && (
              <form onSubmit={handleLinkImport} className="space-y-3">
                <label className="block text-xs font-medium text-[var(--text-secondary)]">
                  Webshop Termék URL (pl. Zara, Massimo Dutti, Reserved, Next, H&M):
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    required
                    placeholder="https://www.zara.com/hu/... vagy termékkép linkje"
                    value={webshopUrl}
                    onChange={(e) => setWebshopUrl(e.target.value)}
                    className="custom-input"
                  />
                  <button type="submit" className="btn-gold whitespace-nowrap">
                    Kinyerés
                  </button>
                </div>
              </form>
            )}

          </div>
        ) : (
          /* Preview and AI Result Form */
          <form onSubmit={handleSave} className="space-y-4">
            
            {/* 1. Proportional Image Preview (object-contain, uncropped) */}
            <div className="space-y-2">
              <div className="relative aspect-[4/3] sm:aspect-[16/9] w-full rounded-2xl overflow-hidden bg-[#07090e] border border-white/10 p-2 flex items-center justify-center">
                {imagePreview ? (
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    onError={() => {
                      const nextAvailable = availableImages.find(img => img !== imagePreview);
                      if (nextAvailable) {
                        setImagePreview(nextAvailable);
                      } else {
                        setAnalysisError('A kép közvetlen betöltése nem sikerült a webshop védelme miatt. Kérlek fotózd le vagy másold be közvetlenül a kép linkjét!');
                      }
                    }}
                    className="max-h-full max-w-full object-contain rounded-xl shadow-lg transition-all" 
                  />
                ) : (
                  <div className="text-center p-4 text-[var(--text-muted)] text-xs">
                    <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                    <p>Nincs érvényes termékkép kiválasztva.</p>
                  </div>
                )}
                
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 text-white rounded-2xl">
                    <Loader2 className="w-8 h-8 text-[var(--accent-gold)] animate-spin" />
                    <p className="text-xs font-medium tracking-wide">Gemini AI elemzi a terméket és a stílust...</p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setImagePreview(null);
                    setAvailableImages([]);
                  }}
                  className="absolute top-3 right-3 p-2 rounded-full bg-black/75 text-white hover:bg-black border border-white/10"
                  title="Másik kép választása"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Multi-Image Packshot Selector */}
              {availableImages.length > 1 && (
                <div className="space-y-1.5 pt-1">
                  <label className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                    <span>Válassz fotót a gardróbhoz (Kattints az izolált termékfotóra):</span>
                  </label>
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {availableImages.map((imgUrl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setImagePreview(imgUrl)}
                        className={`relative w-14 h-14 rounded-xl overflow-hidden bg-black/50 border shrink-0 transition-all ${
                          imagePreview === imgUrl
                            ? 'border-[var(--accent-gold)] ring-2 ring-[var(--accent-gold-glow)] scale-105'
                            : 'border-white/10 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={imgUrl} alt={`Foto ${idx + 1}`} className="w-full h-full object-contain" />
                        {imagePreview === imgUrl && (
                          <div className="absolute bottom-0 inset-x-0 bg-[var(--accent-gold)] text-black text-[8px] font-bold text-center py-0.2">
                            Aktív
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* AI Auto-filled notification badge */}
            {analysisError ? (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <div>
                  <span className="font-semibold">AI elemzés sikertelen:</span>{' '}
                  <span>{analysisError}</span>
                  <button
                    type="button"
                    onClick={() => triggerAIAnalysis(imagePreview)}
                    className="ml-2 underline hover:text-red-300"
                  >
                    Újra próbálom
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[var(--accent-gold-glow)] border border-[var(--border-gold)] text-xs text-[var(--accent-gold-light)]">
                <Sparkles className="w-4 h-4 text-[var(--accent-gold)] shrink-0" />
                <span>Az AI sikeresen azonosította a darabot és megírta a stílustanácsot!</span>
              </div>
            )}

            {/* 2. REORDERED FORM FIELDS: Megnevezés -> Kategória -> Anyag/Szín -> AI Ajánlások -> Szezonalitás -> Címkék */}
            <div className="space-y-4">
              
              {/* Field 1: Megnevezés */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Megnevezés</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="custom-input text-sm"
                />
              </div>

              {/* Field 2: Kategória & Formalitás */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Kategória</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="custom-input text-sm"
                  >
                    <option value="outerwear">Zakó & Kabát</option>
                    <option value="tops">Felső / Ing / Kötött</option>
                    <option value="bottoms">Nadrág</option>
                    <option value="shoes">Cipő & Lábbeli</option>
                    <option value="accessories">Kiegészítő</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Formalitási szint</label>
                  <select
                    value={formData.formality}
                    onChange={(e) => setFormData({ ...formData, formality: e.target.value })}
                    className="custom-input text-sm"
                  >
                    <option value="Casual">Casual (Laza)</option>
                    <option value="Smart Casual">Smart Casual</option>
                    <option value="Sprezzatura">Sprezzatura Olasz</option>
                    <option value="Business">Business / Formális</option>
                    <option value="Black Tie">Black Tie / Ünnepi</option>
                  </select>
                </div>
              </div>

              {/* Field 3: Anyag & Szín */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Anyag & Szövés</label>
                  <input
                    type="text"
                    value={formData.material}
                    onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                    className="custom-input text-sm"
                    placeholder="pl. 100% Gyapjú, Len"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Szín</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.colorHex}
                      onChange={(e) => setFormData({ ...formData, colorHex: e.target.value })}
                      className="w-8 h-8 rounded-lg bg-transparent border-0 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="custom-input text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Field 4: AI Ajánlások (Mivel hordd & Mikor hordd) - Elhelyezve a Szezonalitás ELŐTT! */}
              {(formData.stylingTip || formData.whenToWear) && (
                <div className="p-4 rounded-xl bg-black/50 border border-[var(--border-gold)] space-y-3.5 shadow-inner">
                  {formData.stylingTip && (
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[var(--accent-gold-light)] flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                        <span>Mivel érdemes hordani (AI Ajánlás):</span>
                      </label>
                      <textarea
                        ref={stylingTipRef}
                        value={formData.stylingTip}
                        onChange={(e) => {
                          setFormData({ ...formData, stylingTip: e.target.value });
                          e.target.style.height = 'auto';
                          e.target.style.height = `${e.target.scrollHeight}px`;
                        }}
                        className="custom-input text-xs leading-relaxed min-h-[70px] resize-none overflow-hidden"
                      />
                    </div>
                  )}

                  {formData.whenToWear && (
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Mikor és milyen alkalomra ajánlott:</span>
                      </label>
                      <textarea
                        ref={whenToWearRef}
                        value={formData.whenToWear}
                        onChange={(e) => {
                          setFormData({ ...formData, whenToWear: e.target.value });
                          e.target.style.height = 'auto';
                          e.target.style.height = `${e.target.scrollHeight}px`;
                        }}
                        className="custom-input text-xs leading-relaxed min-h-[70px] resize-none overflow-hidden"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Field 5: Seasons Selector */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Szezonalitás</label>
                <div className="flex gap-2">
                  {[
                    { id: 'tavasz', label: '🌸 Tavasz' },
                    { id: 'nyar', label: '☀️ Nyár' },
                    { id: 'osz', label: '🍂 Ősz' },
                    { id: 'tel', label: '❄️ Tél' }
                  ].map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSeasonToggle(s.id)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        formData.season.includes(s.id)
                          ? 'bg-[var(--accent-gold)] text-black border-[var(--accent-gold)] font-bold'
                          : 'bg-white/5 text-[var(--text-muted)] border-white/5 hover:text-white'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Field 6: Interactive Style Tags Selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                    <span>Stílus és alkalom címkék (Kattints a ki/bekapcsoláshoz):</span>
                  </label>
                  <span className="text-[10px] text-[var(--text-muted)]">{formData.tags?.length || 0} kiválasztva</span>
                </div>

                {/* Tag Pills */}
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {allAvailableTags.map((tag) => {
                    const isSelected = (formData.tags || []).some(t => t.toLowerCase() === tag.toLowerCase());
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleTagToggle(tag)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                          isSelected
                            ? 'bg-[var(--accent-gold)] text-black font-semibold shadow-sm'
                            : 'bg-white/5 text-[var(--text-muted)] hover:text-white hover:bg-white/10 border border-white/5'
                        }`}
                      >
                        <span>#{tag}</span>
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>

                {/* Add Custom Tag input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Egyedi címke hozzáadása (pl. 'vintage', 'old money')..."
                    value={customTagInput}
                    onChange={(e) => setCustomTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomTag();
                      }
                    }}
                    className="custom-input text-xs py-1.5"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomTag}
                    className="btn-secondary text-xs px-3 py-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Hozzáad</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Save Buttons */}
            <div className="flex items-center gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={handleClose}
                className="btn-secondary flex-1 text-xs"
              >
                Mégse
              </button>
              <button
                type="submit"
                disabled={isSaving || isAnalyzing}
                className="btn-gold flex-1 text-xs"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Mentés folyamatban...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Hozzáadás a Gardróbhoz</span>
                  </>
                )}
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
}
