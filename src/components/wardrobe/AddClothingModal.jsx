import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Link as LinkIcon, Camera, Sparkles, Check, Image as ImageIcon, Loader2, AlertCircle, Plus } from 'lucide-react';
import { analyzeClothingImage } from '../../services/gemini';
import { extractWebshopData } from '../../services/webshop';
import { ensureBase64Image } from '../../services/imageOptimizer';
import ColorPalettePicker from '../common/ColorPalettePicker';
import { useAuth } from '../../context/AuthContext';

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

const STYLE_TAG_SUGGESTIONS = [
  'Elegáns',
  'Business',
  'Smart Casual',
  'Sprezzatura',
  'Old Money',
  'Quiet Luxury',
  'Streetwear',
  'Minimalista',
  'Időtlen',
  'Olasz szabás',
  'Nyári laza',
  'Alapdarab'
];

export default function AddClothingModal({ isOpen, onClose, onAddClothing }) {
  const { profile } = useAuth();

  const [activeMode, setActiveMode] = useState('camera'); // 'camera', 'upload', 'link'
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [availableImages, setAvailableImages] = useState([]);
  const [webshopUrl, setWebshopUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [customTagInput, setCustomTagInput] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    category: 'tops',
    subCategory: 'shirt',
    brand: '',
    size: '',
    color: 'Sötétkék (Navy)',
    colorHex: '#1b2a4a',
    material: '',
    qualityScore: 9.0,
    season: ['tavasz', 'nyar', 'osz'],
    formality: 'Smart Casual',
    styleArchetype: 'Klasszikus & Időtlen',
    condition: 'Megkímélt / Kiváló',
    pattern: 'Egyszínű',
    stylingTip: '',
    whenToWear: '',
    stylingAdvice: '',
    colorHarmony: '',
    bodyFitAdvice: '',
    tags: ['alapdarab', 'elegáns']
  });

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const stylingTipRef = useRef(null);
  const whenToWearRef = useRef(null);

  // Auto-resize dynamic textareas
  useEffect(() => {
    if (stylingTipRef.current) {
      stylingTipRef.current.style.height = 'auto';
      stylingTipRef.current.style.height = `${Math.max(stylingTipRef.current.scrollHeight, 72)}px`;
    }
  }, [formData.stylingTip, imagePreview]);

  useEffect(() => {
    if (whenToWearRef.current) {
      whenToWearRef.current.style.height = 'auto';
      whenToWearRef.current.style.height = `${Math.max(whenToWearRef.current.scrollHeight, 72)}px`;
    }
  }, [formData.whenToWear, imagePreview]);

  const handleClose = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setAvailableImages([]);
    setWebshopUrl('');
    setAnalysisError(null);
    setIsAnalyzing(false);
    setCustomTagInput('');
    setFormData({
      name: '',
      category: 'tops',
      subCategory: 'shirt',
      brand: '',
      size: '',
      color: 'Sötétkék (Navy)',
      colorHex: '#1b2a4a',
      material: '',
      qualityScore: 9.0,
      season: ['tavasz', 'nyar', 'osz'],
      formality: 'Smart Casual',
      styleArchetype: 'Klasszikus & Időtlen',
      condition: 'Megkímélt / Kiváló',
      pattern: 'Egyszínű',
      stylingTip: '',
      whenToWear: '',
      stylingAdvice: '',
      colorHarmony: '',
      bodyFitAdvice: '',
      tags: ['alapdarab', 'elegáns']
    });
    onClose();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    try {
      setIsAnalyzing(true);
      // Fast client-side image compression & robust base64 conversion
      const optimizedBase64 = await ensureBase64Image(file);
      setImagePreview(optimizedBase64);
      setAvailableImages([optimizedBase64]);
      await triggerAIAnalysis(optimizedBase64);
    } catch (err) {
      console.error('Képfeltöltési hiba:', err);
      setAnalysisError('Nem sikerült a kép optimalizálása.');
      setIsAnalyzing(false);
    }
  };

  const handleLinkImport = async (e) => {
    e.preventDefault();
    if (!webshopUrl.trim()) return;

    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const webshopData = await extractWebshopData(webshopUrl.trim());
      const chosenImage = webshopData.imageUrl || (webshopData.images && webshopData.images[0]) || '';
      
      // Convert remote webshop image to robust Base64 data so it never fails or goes blank
      const base64Img = chosenImage ? await ensureBase64Image(chosenImage) : '';

      setImagePreview(base64Img || chosenImage);
      setAvailableImages(webshopData.images || [chosenImage].filter(Boolean));

      // Pre-set extracted metadata immediately
      if (webshopData.title) {
        setFormData(prev => ({
          ...prev,
          name: webshopData.title,
          brand: webshopData.brand || prev.brand
        }));
      }

      await triggerAIAnalysis(base64Img || chosenImage, webshopData);
    } catch (err) {
      console.error('Webshop link hiba:', err);
      setAnalysisError(err.message || 'Nem sikerült kinyerni az adatokat a megadott webshop linkről. Kérlek fotózd le vagy töltsd fel a képet!');
      setIsAnalyzing(false);
    }
  };

  const triggerAIAnalysis = async (imgSource, webshopContext = {}) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const aiResult = await analyzeClothingImage(imgSource, webshopContext, profile);
      if (aiResult) {
        setFormData(prev => ({
          ...prev,
          name: aiResult.name || webshopContext.title || prev.name || 'Új Ruhadarab',
          category: aiResult.category || prev.category,
          subCategory: aiResult.subCategory || prev.subCategory,
          brand: aiResult.brand || webshopContext.brand || prev.brand,
          size: aiResult.size || prev.size,
          color: aiResult.color || prev.color,
          colorHex: aiResult.colorHex || prev.colorHex,
          material: aiResult.material || webshopContext.description || prev.material,
          qualityScore: aiResult.qualityScore || prev.qualityScore,
          season: aiResult.season || prev.season,
          formality: aiResult.formality || prev.formality,
          styleArchetype: aiResult.styleArchetype || prev.styleArchetype,
          condition: aiResult.condition || prev.condition,
          pattern: aiResult.pattern || prev.pattern,
          stylingTip: aiResult.stylingTip || prev.stylingTip,
          whenToWear: aiResult.whenToWear || prev.whenToWear,
          colorHarmony: aiResult.colorHarmony || prev.colorHarmony,
          bodyFitAdvice: aiResult.bodyFitAdvice || prev.bodyFitAdvice,
          stylingAdvice: aiResult.stylingAdvice || prev.stylingAdvice,
          tags: aiResult.tags && aiResult.tags.length > 0 ? aiResult.tags : prev.tags
        }));
      }
    } catch (err) {
      console.warn('AI elemzési hiba/figyelmeztetés:', err);
      // Ensure defaults stay intact even if AI fails
      setFormData(prev => ({
        ...prev,
        name: prev.name || webshopContext.title || 'Új Ruhadarab',
        brand: prev.brand || webshopContext.brand || ''
      }));
      setAnalysisError('Az AI automatikus kitöltése nem fejeződött be, de a képet és a mezőket manuálisan is szerkesztheted és elmentheted.');
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

  const handleTagToggle = (tag) => {
    setFormData(prev => {
      const exists = prev.tags.includes(tag);
      return {
        ...prev,
        tags: exists ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag]
      };
    });
  };

  const handleAddCustomTag = () => {
    const cleanTag = customTagInput.trim().replace(/^#/, '');
    if (cleanTag && !formData.tags.includes(cleanTag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, cleanTag]
      }));
      setCustomTagInput('');
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.name) return;

    onAddClothing({
      ...formData,
      imageUrl: imagePreview || 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=800&q=80'
    });

    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#0b0e14] border border-[var(--border-gold)] rounded-2xl shadow-2xl p-5 sm:p-7 space-y-6 my-auto animate-scale-up max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <span className="badge badge-gold">Digitális Ruhatár Bővítés</span>
            <h3 className="text-xl sm:text-2xl font-serif font-bold text-white mt-1">
              Új Ruhadarab Hozzáadása
            </h3>
          </div>
          <button 
            onClick={handleClose}
            className="p-2 rounded-full text-[var(--text-muted)] hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input Method Selector / Form */}
        {!imagePreview ? (
          <div className="space-y-6">
            
            {/* Mode Tabs */}
            <div className="grid grid-cols-3 gap-2 p-1 bg-black/40 rounded-xl border border-white/5">
              <button
                type="button"
                onClick={() => setActiveMode('camera')}
                className={`py-2.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                  activeMode === 'camera' 
                    ? 'bg-[var(--accent-gold)] text-black font-semibold shadow' 
                    : 'text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>Fotó Készítése</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMode('upload')}
                className={`py-2.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                  activeMode === 'upload' 
                    ? 'bg-[var(--accent-gold)] text-black font-semibold shadow' 
                    : 'text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>Kép Feltöltése</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMode('link')}
                className={`py-2.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                  activeMode === 'link' 
                    ? 'bg-[var(--accent-gold)] text-black font-semibold shadow' 
                    : 'text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                <LinkIcon className="w-4 h-4" />
                <span>Webshop Link / Cikkszám</span>
              </button>
            </div>

            {/* Mode 1: Camera */}
            {activeMode === 'camera' && (
              <div 
                onClick={() => cameraInputRef.current?.click()}
                className="border-2 border-dashed border-[var(--border-gold)] rounded-2xl p-8 text-center cursor-pointer hover:bg-white/5 transition-all flex flex-col items-center justify-center gap-3 bg-[var(--accent-gold-glow)]"
              >
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  ref={cameraInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                />
                <div className="w-14 h-14 rounded-full bg-[var(--accent-gold)]/20 flex items-center justify-center text-[var(--accent-gold)]">
                  <Camera className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Kattints a kamera megnyitásához</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">Fotózd le a ruhát (lehetőleg terítve vagy fogason)</p>
                </div>
              </div>
            )}

            {/* Mode 2: Upload */}
            {activeMode === 'upload' && (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-white/10 rounded-2xl p-8 text-center cursor-pointer hover:border-[var(--border-gold)] hover:bg-white/5 transition-all flex flex-col items-center justify-center gap-3"
              >
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                />
                <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center text-[var(--text-secondary)]">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Válassz fotót a galériádból</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">JPG, PNG, WEBP formátum támogatott</p>
                </div>
              </div>
            )}

            {/* Mode 3: Webshop Link or Product Code */}
            {activeMode === 'link' && (
              <form onSubmit={handleLinkImport} className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-[var(--text-secondary)]">
                    Webshop Terméklink VAGY Cikkszám / Termékkód (Next, Zara, Reserved stb.):
                  </label>
                  <span className="text-[10px] text-[var(--accent-gold)] font-medium">SKU Keresés Aktív</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="pl. https://www.nextdirect.com/... VAGY csak cikkszám pl. AA6536"
                    value={webshopUrl}
                    onChange={(e) => {
                      setWebshopUrl(e.target.value);
                      if (analysisError) setAnalysisError(null);
                    }}
                    className="custom-input text-xs"
                  />
                  <button 
                    type="submit" 
                    disabled={isAnalyzing || !webshopUrl.trim()}
                    className="btn-gold px-5 text-xs whitespace-nowrap flex items-center gap-1.5 shrink-0"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Kinyerés...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Beolvasás</span>
                      </>
                    )}
                  </button>
                </div>
                {/* Error Box in Link Mode */}
                {analysisError && (
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 animate-slide-up">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold block mb-0.5">Sikertelen linkkinyerés:</span>
                      <span>{analysisError}</span>
                    </div>
                  </div>
                )}
              </form>
            )}

          </div>
        ) : (
          /* Preview and AI Result Form */
          <form onSubmit={handleSave} className="space-y-5">
            
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
                    <p className="text-xs font-medium tracking-wide">Gemini 3.7 Flash AI elemzi a terméket...</p>
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
                          <div className="absolute inset-0 bg-[var(--accent-gold)]/20 flex items-center justify-center">
                            <Check className="w-3.5 h-3.5 text-[var(--accent-gold)] drop-shadow" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Error Message if any */}
            {analysisError && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block mb-0.5">Figyelmeztetés:</span>
                  <span>{analysisError}</span>
                </div>
              </div>
            )}

            {/* 2. Item Name */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Megnevezés:
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="custom-input text-base font-medium"
                placeholder="pl. Zöld Slim Fit Olasz Lenkeverék Zakó"
              />
            </div>

            {/* 3. Category & Formality */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Kategória:
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="custom-input"
                >
                  <option value="outerwear">🧥 Zakó & Kabát (Outerwear)</option>
                  <option value="knitwear">🧶 Pulóverek & Kötöttáru (Knitwear)</option>
                  <option value="tops">👔 Ingek & Felsők (Tops)</option>
                  <option value="bottoms">👖 Nadrágok & Farmerek (Bottoms)</option>
                  <option value="shoes">👞 Cipők & Lábbelik (Shoes)</option>
                  <option value="dresses">👗 Ruhák & Egyrészesek (Dresses)</option>
                  <option value="skirts">💃 Szoknyák (Skirts)</option>
                  <option value="accessories">⌚ Kiegészítők (Accessories)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Formalitási Szint (Dress Code):
                </label>
                <select
                  value={formData.formality}
                  onChange={(e) => setFormData({ ...formData, formality: e.target.value })}
                  className="custom-input"
                >
                  {FORMALITY_LEVELS.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 4. Brand & Size (Gyártmány & Méret) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Gyártó / Márka:
                </label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="custom-input text-xs"
                  placeholder="pl. Massimo Dutti, Zara, Boglioli, Eton, Incotex"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Méret (Címke szerint):
                </label>
                <input
                  type="text"
                  value={formData.size}
                  onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                  className="custom-input text-xs font-mono"
                  placeholder="pl. 50, M, L, 40 / 15.75, 32/32, 42.5"
                />
              </div>
            </div>

            {/* 4. Material & Curated Color Palette */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Anyagösszetétel & Szövés:
                </label>
                <input
                  type="text"
                  value={formData.material}
                  onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                  className="custom-input"
                  placeholder="pl. 100% Olasz Lenvászon"
                />
              </div>

              <ColorPalettePicker
                selectedColor={formData.color}
                selectedHex={formData.colorHex}
                onSelectColor={(colName, hex) => {
                  setFormData(prev => ({ ...prev, color: colName, colorHex: hex }));
                }}
              />
            </div>

            {/* 5. AI Recommendations: Mivel hordd & Mikor hordd */}
            <div className="space-y-3 p-4 rounded-2xl bg-black/40 border border-[var(--border-gold)]/40 shadow-inner">
              <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                <Sparkles className="w-4 h-4 text-[var(--accent-gold)]" />
                <span className="text-xs font-serif font-bold text-white">AI Stylist Elemzés & Ajánlások</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-amber-300 mb-1">
                  💡 Mivel érdemes hordani (AI Ajánlás):
                </label>
                <textarea
                  ref={stylingTipRef}
                  value={formData.stylingTip}
                  onChange={(e) => setFormData({ ...formData, stylingTip: e.target.value })}
                  rows={2}
                  className="custom-input text-xs resize-none overflow-hidden leading-relaxed text-amber-100 bg-amber-950/20 border-amber-500/30 focus:border-amber-400"
                  placeholder="Mivel kombinálható a legszebben..."
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-emerald-300 mb-1">
                  📅 Mikor és milyen alkalomra ajánlott:
                </label>
                <textarea
                  ref={whenToWearRef}
                  value={formData.whenToWear}
                  onChange={(e) => setFormData({ ...formData, whenToWear: e.target.value })}
                  rows={2}
                  className="custom-input text-xs resize-none overflow-hidden leading-relaxed text-emerald-100 bg-emerald-950/20 border-emerald-500/30 focus:border-emerald-400"
                  placeholder="Milyen eseményre, hőmérsékletre ajánlott..."
                />
              </div>

              {/* Personal Harmony Notes */}
              {formData.colorHarmony && (
                <div className="text-[11px] text-[var(--text-secondary)] italic pt-1 flex items-start gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                  <span><strong>Színharmónia:</strong> {formData.colorHarmony}</span>
                </div>
              )}
            </div>

            {/* 6. Seasonality Toggle */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[var(--text-secondary)]">
                Szezonalitás (Mely évszakokban hordható):
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'tavasz', label: '🌸 Tavasz' },
                  { id: 'nyar', label: '☀️ Nyár' },
                  { id: 'osz', label: '🍂 Ősz' },
                  { id: 'tel', label: '❄️ Tél' }
                ].map((s) => {
                  const isSelected = formData.season.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSeasonToggle(s.id)}
                      className={`py-2 px-2 rounded-xl text-xs font-medium border text-center transition-all ${
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

            {/* 7. Garment Condition (5 levels) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[var(--text-secondary)]">
                Ruha Állapota:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CONDITION_LEVELS.map(c => {
                  const isSelected = formData.condition === c.val;
                  return (
                    <button
                      key={c.val}
                      type="button"
                      onClick={() => setFormData({ ...formData, condition: c.val })}
                      className={`py-2 px-2.5 rounded-xl text-[11px] font-medium border text-left truncate transition-all ${
                        isSelected
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 ring-1 ring-emerald-400'
                          : 'bg-white/5 text-[var(--text-secondary)] border-white/5 hover:bg-white/10'
                      }`}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 8. Style Archetype (7 directions) */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Stílusirányzat:
              </label>
              <select
                value={formData.styleArchetype}
                onChange={(e) => setFormData({ ...formData, styleArchetype: e.target.value })}
                className="custom-input text-xs"
              >
                {STYLE_ARCHETYPES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* 9. Interactive Style Tags */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-[var(--text-secondary)]">
                Stílus Címkék (Kattints a be/kikapcsoláshoz):
              </label>
              
              <div className="flex flex-wrap gap-1.5">
                {STYLE_TAG_SUGGESTIONS.map(tag => {
                  const isSelected = formData.tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleTagToggle(tag)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-[var(--accent-gold)] text-black font-semibold shadow-sm'
                          : 'bg-white/5 text-[var(--text-muted)] hover:bg-white/10 hover:text-white border border-white/5'
                      }`}
                    >
                      #{tag}
                    </button>
                  );
                })}
              </div>

              {/* Custom tag add */}
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Egyedi címke hozzáadása..."
                  value={customTagInput}
                  onChange={(e) => setCustomTagInput(e.target.value)}
                  className="custom-input text-xs py-1.5"
                />
                <button
                  type="button"
                  onClick={handleAddCustomTag}
                  className="btn-secondary text-xs px-3 whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Hozzáadás</span>
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-3 border-t border-white/10 flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="btn-secondary flex-1 py-3"
              >
                Mégse
              </button>
              <button
                type="submit"
                className="btn-gold flex-1 py-3 text-sm font-bold shadow-xl flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Mentés a Gardróbba</span>
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
}
