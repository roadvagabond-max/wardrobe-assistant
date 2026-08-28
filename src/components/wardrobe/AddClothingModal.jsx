import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Link as LinkIcon, Camera, Sparkles, Check, Image as ImageIcon, Loader2, AlertCircle, Plus, Heart, HelpCircle, Clipboard } from 'lucide-react';
import { analyzeClothingImage } from '../../services/gemini';
import { extractWebshopData } from '../../services/webshop';
import { ensureBase64Image, getSmartGarmentImage } from '../../services/imageOptimizer';
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

  const [activeMode, setActiveMode] = useState('camera'); // 'camera', 'upload', 'link', 'clipboard'
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [availableImages, setAvailableImages] = useState([]);
  const [webshopUrl, setWebshopUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFormReady, setIsFormReady] = useState(false);
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
  const attachPhotoInputRef = useRef(null);
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

  // Global window paste & escape listener when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    const handleWindowPaste = (e) => {
      const target = e.target;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
      const hasImageFile = Array.from(e.clipboardData?.items || []).some(item => item.type && item.type.startsWith('image/'));

      if (!isInput || hasImageFile) {
        const handled = handlePastedData(e.clipboardData?.items, e.clipboardData?.getData('text'));
        if (handled && hasImageFile) {
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('paste', handleWindowPaste);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('paste', handleWindowPaste);
    };
  }, [isOpen, formData.name, formData.brand]);

  const handleClose = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setAvailableImages([]);
    setWebshopUrl('');
    setAnalysisError(null);
    setIsAnalyzing(false);
    setIsFormReady(false);
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

  // High-performance clipboard processor (Handles direct image blobs and image URLs)
  const handlePastedData = async (items, textData) => {
    // 1. Check for binary image blob in clipboard (e.g. Right click -> Copy Image)
    if (items && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type && items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            setIsAnalyzing(true);
            setIsFormReady(true);
            setAnalysisError(null);
            try {
              const optimized = await ensureBase64Image(file);
              setImagePreview(optimized);
              setAvailableImages(prev => [optimized, ...prev.filter(x => x !== optimized)]);
              await triggerAIAnalysis(optimized, { title: formData.name, brand: formData.brand });
            } catch (err) {
              console.error('Vágólap kép hiba:', err);
              setAnalysisError('A vágólapon lévő kép optimalizálása nem sikerült.');
            } finally {
              setIsAnalyzing(false);
            }
            return true;
          }
        }
      }
    }

    // 2. Check for direct image URL in clipboard text
    const cleanText = (textData || '').trim();
    if (cleanText && (cleanText.startsWith('http://') || cleanText.startsWith('https://') || cleanText.startsWith('data:image/'))) {
      if (/\.(jpeg|jpg|png|webp|avif)($|\?)/i.test(cleanText) || cleanText.includes('images') || cleanText.includes('cdn') || cleanText.includes('static') || cleanText.startsWith('data:image/')) {
        setIsAnalyzing(true);
        setIsFormReady(true);
        setAnalysisError(null);
        try {
          const optimized = await ensureBase64Image(cleanText);
          const finalImg = optimized || cleanText;
          setImagePreview(finalImg);
          setAvailableImages(prev => [finalImg, ...prev.filter(x => x !== finalImg)]);
          await triggerAIAnalysis(finalImg, { title: formData.name, brand: formData.brand });
        } catch (err) {
          console.error('Vágólap link hiba:', err);
        } finally {
          setIsAnalyzing(false);
        }
        return true;
      }
    }
    return false;
  };

  const handleClipboardButtonClick = async () => {
    try {
      setIsAnalyzing(true);
      setAnalysisError(null);

      // Try reading binary image from clipboard API
      if (navigator.clipboard && navigator.clipboard.read) {
        const clipboardItems = await navigator.clipboard.read();
        for (const item of clipboardItems) {
          const imageType = item.types.find(type => type.startsWith('image/'));
          if (imageType) {
            const blob = await item.getType(imageType);
            const optimized = await ensureBase64Image(blob);
            setImagePreview(optimized);
            setAvailableImages(prev => [optimized, ...prev.filter(x => x !== optimized)]);
            setIsFormReady(true);
            await triggerAIAnalysis(optimized, { title: formData.name, brand: formData.brand });
            setIsAnalyzing(false);
            return;
          }
        }
      }
      
      // Fallback: Try reading image URL text
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          const handled = await handlePastedData(null, text);
          if (handled) {
            setIsAnalyzing(false);
            return;
          }
        }
      }

      setIsAnalyzing(false);
      setAnalysisError('Nem található kép a vágólapon. Kattints jobb gombbal a webshop fotóra ➔ "Kép másolása", majd nyomj Ctrl+V-t!');
    } catch (err) {
      console.warn('Vágólap olvasási engedély/hiba:', err);
      setIsAnalyzing(false);
      setAnalysisError('Kattints az ablakra és nyomj Ctrl + V-t a billentyűzeten a másolt kép beillesztéséhez!');
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsFormReady(true);
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
    setIsFormReady(true);
    setAnalysisError(null);
    try {
      const webshopData = await extractWebshopData(webshopUrl.trim());
      const chosenImage = webshopData.imageUrl || (webshopData.images && webshopData.images[0]) || '';
      
      if (chosenImage) {
        setImagePreview(chosenImage);
        setAvailableImages([chosenImage]);
      }

      // Pre-set extracted metadata immediately
      if (webshopData.title) {
        setFormData(prev => ({
          ...prev,
          name: webshopData.title,
          brand: webshopData.brand || prev.brand
        }));
      }

      await triggerAIAnalysis(chosenImage || null, webshopData);
    } catch (err) {
      console.error('Webshop link hiba:', err);
      setAnalysisError(err.message || 'Nem sikerült minden adatot kinyerni. A terméket fotóval vagy kézi kitöltéssel is rögzítheted!');
      setIsAnalyzing(false);
    }
  };

  const handleAttachPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsAnalyzing(true);
      const optimized = await ensureBase64Image(file);
      setImagePreview(optimized);
      setAvailableImages([optimized]);
    } catch (err) {
      console.error('Fotó csatolási hiba:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const triggerAIAnalysis = async (imgSource, webshopContext = {}) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const aiResult = await analyzeClothingImage(imgSource, webshopContext, profile);
      if (aiResult) {
        // Intelligent image assignment: Grounded Google Search image -> Smart category packshot
        if (aiResult.imageUrl && typeof aiResult.imageUrl === 'string' && aiResult.imageUrl.startsWith('http')) {
          setImagePreview(aiResult.imageUrl);
          setAvailableImages([aiResult.imageUrl]);
        } else if (!imgSource) {
          const autoImg = getSmartGarmentImage(aiResult.category, aiResult.color, aiResult.subCategory);
          setImagePreview(autoImg);
          setAvailableImages([autoImg]);
        }

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
      setIsFormReady(true);
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
      imageUrl: imagePreview || getSmartGarmentImage(formData.category, formData.color, formData.subCategory)
    });

    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
    >
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
        {!isFormReady ? (
          <div className="space-y-6">
            
            {/* Mode Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1 bg-black/40 rounded-xl border border-white/5">
              <button
                type="button"
                onClick={() => setActiveMode('camera')}
                className={`py-2.5 px-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                  activeMode === 'camera' 
                    ? 'bg-[var(--accent-gold)] text-black font-semibold shadow' 
                    : 'text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>Fotózás</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMode('clipboard')}
                className={`py-2.5 px-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                  activeMode === 'clipboard' 
                    ? 'bg-[var(--accent-gold)] text-black font-semibold shadow' 
                    : 'text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                <Clipboard className="w-4 h-4" />
                <span>Vágólap (Ctrl+V)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMode('upload')}
                className={`py-2.5 px-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                  activeMode === 'upload' 
                    ? 'bg-[var(--accent-gold)] text-black font-semibold shadow' 
                    : 'text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>Feltöltés</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMode('link')}
                className={`py-2.5 px-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                  activeMode === 'link' 
                    ? 'bg-[var(--accent-gold)] text-black font-semibold shadow' 
                    : 'text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                <LinkIcon className="w-4 h-4" />
                <span>Webshop Link</span>
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

            {/* Mode 2: Clipboard Paste */}
            {activeMode === 'clipboard' && (
              <div 
                onClick={handleClipboardButtonClick}
                className="border-2 border-dashed border-[var(--border-gold)] rounded-2xl p-8 text-center cursor-pointer hover:bg-white/5 transition-all flex flex-col items-center justify-center gap-3 bg-[var(--accent-gold-glow)] group"
              >
                <div className="w-14 h-14 rounded-full bg-[var(--accent-gold)]/20 flex items-center justify-center text-[var(--accent-gold)] group-hover:scale-110 transition-transform">
                  <Clipboard className="w-7 h-7" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <p className="text-sm font-semibold text-white">
                    Kattints ide a vágólap beillesztéséhez
                  </p>
                  <p className="text-xs text-[var(--accent-gold-light)] font-medium">
                    Vagy egyszerűen nyomj <kbd className="px-1.5 py-0.5 rounded bg-black border border-white/20 text-white font-mono text-[11px]">Ctrl + V</kbd>-t bárhol az ablakban!
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] pt-1">
                    Jobb klikk a webshop ruhafotóra ➔ <em>"Kép másolása"</em> vagy <em>"Képhivatkozás másolása"</em>
                  </p>
                </div>
              </div>
            )}

            {/* Mode 3: Upload */}
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

            {/* Mode 4: Webshop Link or Product Code */}
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
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 animate-slide-up">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold block mb-0.5">Nem sikerült a webes kép beolvasása:</span>
                        <span>{analysisError}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleClipboardButtonClick}
                      className="btn-gold py-1.5 px-3 text-[11px] shrink-0 flex items-center gap-1.5 justify-center self-end sm:self-auto shadow"
                    >
                      <Clipboard className="w-3.5 h-3.5" />
                      <span>Kép Beillesztése (Ctrl+V)</span>
                    </button>
                  </div>
                )}
              </form>
            )}

          </div>
        ) : (
          /* Preview and AI Result Form */
          <form onSubmit={handleSave} className="space-y-5">
            <input 
              type="file" 
              accept="image/*" 
              ref={attachPhotoInputRef} 
              onChange={handleAttachPhoto} 
              className="hidden" 
            />
            
            {/* 1. Proportional Image Preview or Recognized Item Card */}
            <div className="space-y-2">
              <div className="relative aspect-[4/3] sm:aspect-[16/9] w-full rounded-2xl overflow-hidden bg-[#07090e] border border-white/10 p-4 flex flex-col items-center justify-center">
                {imagePreview ? (
                  <>
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      onError={() => {
                        setAvailableImages(prev => {
                          const remaining = prev.filter(img => img !== imagePreview);
                          setImagePreview(remaining.length > 0 ? remaining[0] : null);
                          return remaining;
                        });
                      }}
                      className="max-h-full max-w-full object-contain rounded-xl shadow-lg transition-all" 
                    />
                    <div className="absolute bottom-3 right-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleClipboardButtonClick}
                        className="btn-secondary py-1.5 px-3 text-[11px] flex items-center gap-1.5 bg-black/80 backdrop-blur-md hover:bg-black border border-white/20 shadow-lg text-[var(--accent-gold)]"
                        title="Kép beillesztése vágólapról (Ctrl+V)"
                      >
                        <Clipboard className="w-3.5 h-3.5" />
                        <span>Vágólap (Ctrl+V)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => attachPhotoInputRef.current?.click()}
                        className="btn-secondary py-1.5 px-3 text-[11px] flex items-center gap-1.5 bg-black/80 backdrop-blur-md hover:bg-black border border-white/20 shadow-lg"
                        title="Saját fotó készítése vagy feltöltése"
                      >
                        <Camera className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                        <span>Saját fotó</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-4 space-y-2">
                    <div 
                      className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center border border-white/20 shadow-xl"
                      style={{ backgroundColor: formData.colorHex || '#1e293b' }}
                    >
                      <span className="text-2xl">
                        {formData.category === 'outerwear' ? '🧥' : formData.category === 'knitwear' ? '🧶' : formData.category === 'tops' ? '👔' : formData.category === 'bottoms' ? '👖' : formData.category === 'shoes' ? '👞' : '✨'}
                      </span>
                    </div>
                    <span className="badge badge-gold text-[10px]">Webshopból Kinyert Termék</span>
                    <h4 className="font-serif font-bold text-white text-sm sm:text-base max-w-md line-clamp-2">
                      {formData.name || 'Új Ruhadarab'}
                    </h4>
                    <p className="text-xs text-[var(--accent-gold-light)] font-medium">
                      {formData.brand || 'Next Direct'} • {formData.material || 'Természetes szálak'}
                    </p>
                    
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={handleClipboardButtonClick}
                        className="btn-gold py-1.5 px-3 text-[11px] flex items-center gap-1.5 shadow-lg"
                      >
                        <Clipboard className="w-3.5 h-3.5" />
                        <span>Kép Beillesztése Vágólapról (Ctrl+V)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => attachPhotoInputRef.current?.click()}
                        className="btn-secondary py-1.5 px-3 text-[11px] flex items-center gap-1.5"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Saját fotó</span>
                      </button>
                    </div>
                  </div>
                )}
                
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 text-white rounded-2xl">
                    <Loader2 className="w-8 h-8 text-[var(--accent-gold)] animate-spin" />
                    <p className="text-xs font-medium tracking-wide">Gemini 3.5 Flash AI villámgyorsan elemzi a terméket...</p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIsFormReady(false);
                    setImagePreview(null);
                    setAvailableImages([]);
                  }}
                  className="absolute top-3 right-3 p-2 rounded-full bg-black/75 text-white hover:bg-black border border-white/10"
                  title="Másik kép vagy link választása"
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
