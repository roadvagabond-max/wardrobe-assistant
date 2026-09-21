import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Link as LinkIcon, Camera, Sparkles, Check, Image as ImageIcon, Loader2, AlertCircle, Plus, Heart, HelpCircle, Clipboard } from 'lucide-react';
import { analyzeClothingImage } from '../../services/gemini';
import { extractWebshopData } from '../../services/webshop';
import { ensureBase64Image, getSmartGarmentImage } from '../../services/imageOptimizer';
import { processGarmentPackshot } from '../../services/backgroundRemoval';
import { uploadGarmentImage } from '../../services/firebase';
import ColorPalettePicker from '../common/ColorPalettePicker';
import { useAuth } from '../../context/AuthContext';
import { getProfileDemographics, getDemographicTags, getDemographicArchetypes } from '../../services/demographics';

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
  const { profile, currentUser } = useAuth();
  const demographics = getProfileDemographics(profile);
  const demographicArchetypes = getDemographicArchetypes(demographics);
  const demographicTags = getDemographicTags(demographics);

  const [activeMode, setActiveMode] = useState('camera'); // 'camera', 'upload', 'link', 'clipboard'
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [availableImages, setAvailableImages] = useState([]);
  const [cleanPackshot, setCleanPackshot] = useState(null); // { dataUrl, blob }
  const [rawOriginalImage, setRawOriginalImage] = useState(null); // Normalized JPEG
  const [activeImageMode, setActiveImageMode] = useState('packshot'); // 'packshot' | 'original'
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [bgRemovalProgress, setBgRemovalProgress] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
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
  // Stores Gemini's detected garmentBox for packshot isolation (set async from triggerAIAnalysis)
  const garmentBoxRef = useRef(null);

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
    setCleanPackshot(null);
    setRawOriginalImage(null);
    setActiveImageMode('packshot');
    setIsRemovingBg(false);
    setBgRemovalProgress(null);
    setIsSaving(false);
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

  // Parallel Thread 2: Salient Object Segmentation + Autocrop Packshot
  // Reads garmentBoxRef (set asynchronously by triggerAIAnalysis) to isolate the garment
  // and remove non-garment body parts (socks below trousers, hands, etc.) on the server.
  const startBackgroundRemoval = async (source, garmentBox = null) => {
    if (!source) return;
    setIsRemovingBg(true);
    setBgRemovalProgress({ label: 'Háttéreltávolító motor indítása...', percent: 10 });
    try {
      const result = await processGarmentPackshot(source, {
        onProgress: (p) => setBgRemovalProgress(p),
        garmentBox: garmentBox || garmentBoxRef.current || null
      });
      if (result && result.success && (result.dataUrl || result.imageUrl)) {
        setCleanPackshot({ 
          dataUrl: result.dataUrl || result.imageUrl, 
          imageUrl: result.imageUrl, 
          storagePath: result.storagePath,
          blob: result.blob 
        });
        setImagePreview(result.dataUrl || result.imageUrl);
        setActiveImageMode('packshot');
        setBgRemovalProgress(null);
      } else {
        const errorMsg = result?.error || 'A neurális szegmentáció sikertelen';
        console.warn('Háttéreltávolítás sikertelen:', errorMsg);
        setBgRemovalProgress({ label: `⚠️ Packshot: ${errorMsg}`, percent: 0 });
        setTimeout(() => setBgRemovalProgress(null), 4000);
      }
    } catch (err) {
      console.warn('Háttéreltávolítás hiba, marad az eredeti fotó:', err);
      setBgRemovalProgress({ label: '⚠️ Packshot sikertelen, eredeti fotó megtartva', percent: 0 });
      setTimeout(() => setBgRemovalProgress(null), 4000);
    } finally {
      setIsRemovingBg(false);
    }
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
              // Thread 1: Fast client-side normalization to 640x640 JPEG (< 30ms)
              const normalized = await ensureBase64Image(file, 640, 640, 0.75);
              setImagePreview(normalized);
              setRawOriginalImage(normalized);
              setCleanPackshot(null);
              setActiveImageMode('packshot');
              setAvailableImages(prev => [normalized, ...prev.filter(x => x !== normalized)]);
              triggerAIAnalysis(normalized, { title: formData.name, brand: formData.brand });

              // Thread 2: Parallel background removal & autocrop with normalized 640x640 input
              startBackgroundRemoval(normalized);
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
          const normalized = await ensureBase64Image(cleanText, 640, 640, 0.75);
          const finalImg = normalized || cleanText;
          setImagePreview(finalImg);
          setRawOriginalImage(finalImg);
          setCleanPackshot(null);
          setActiveImageMode('packshot');
          setAvailableImages(prev => [finalImg, ...prev.filter(x => x !== finalImg)]);
          triggerAIAnalysis(finalImg, { title: formData.name, brand: formData.brand });
          startBackgroundRemoval(finalImg);
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
            const normalized = await ensureBase64Image(blob, 640, 640, 0.75);
            setImagePreview(normalized);
            setRawOriginalImage(normalized);
            setCleanPackshot(null);
            setActiveImageMode('packshot');
            setAvailableImages(prev => [normalized, ...prev.filter(x => x !== normalized)]);
            setIsFormReady(true);
            triggerAIAnalysis(normalized, { title: formData.name, brand: formData.brand });
            startBackgroundRemoval(normalized);
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
    setAnalysisError(null);
    try {
      setIsAnalyzing(true);
      // Thread 1: Fast client-side image normalization (640x640 @ 0.75 JPEG, < 30ms)
      const normalizedBase64 = await ensureBase64Image(file, 640, 640, 0.75);
      setImagePreview(normalizedBase64);
      setRawOriginalImage(normalizedBase64);
      setCleanPackshot(null);
      setActiveImageMode('packshot');
      setAvailableImages([normalizedBase64]);

      // Thread 1: Launch immediate Gemini Vision analysis
      triggerAIAnalysis(normalizedBase64);

      // Thread 2: Parallel background removal & autocrop with normalized 640x640 input
      startBackgroundRemoval(normalizedBase64);
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
        setRawOriginalImage(chosenImage);
        setCleanPackshot(null);
        setActiveImageMode('packshot');
        setAvailableImages([chosenImage]);
        // Convert to Base64 in background for permanent local persistence
        ensureBase64Image(chosenImage, 640, 640, 0.75).then(b64 => {
          if (b64 && b64.startsWith('data:')) {
            setImagePreview(b64);
            setRawOriginalImage(b64);
            setAvailableImages([b64]);
          }
        }).catch(() => {});
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
      const normalized = await ensureBase64Image(file, 640, 640, 0.75);
      setImagePreview(normalized);
      setRawOriginalImage(normalized);
      setCleanPackshot(null);
      setActiveImageMode('packshot');
      setAvailableImages([normalized]);
      // Parallel background removal & autocrop with normalized 640x640 input
      startBackgroundRemoval(normalized);
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
        // Store garmentBox from Gemini for packshot isolation
        if (aiResult.garmentBox && typeof aiResult.garmentBox === 'object') {
          garmentBoxRef.current = aiResult.garmentBox;
        } else {
          garmentBoxRef.current = null;
        }

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

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name || isSaving) return;

    setIsSaving(true);
    try {
      // 1. Determine selected image source (Packshot Storage URL / WebP vs Original Normalized vs URL)
      let chosenImage = imagePreview;
      let alreadyUploadedStorageUrl = null;

      if (activeImageMode === 'packshot' && cleanPackshot) {
        if (cleanPackshot.imageUrl) {
          alreadyUploadedStorageUrl = cleanPackshot.imageUrl;
        } else if (cleanPackshot.blob) {
          chosenImage = cleanPackshot.blob;
        } else if (cleanPackshot.dataUrl) {
          chosenImage = cleanPackshot.dataUrl;
        }
      } else if (activeImageMode === 'original' && rawOriginalImage) {
        chosenImage = rawOriginalImage;
      }

      if (!alreadyUploadedStorageUrl && !chosenImage) {
        chosenImage = getSmartGarmentImage(formData.category, formData.color, formData.subCategory);
      }

      // 2. Generate unique garment itemId
      const itemId = `garment_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

      // 3. Upload to Firebase Cloud Storage (WebP with 1-Year CDN Cache Headers)
      let finalImageUrl = alreadyUploadedStorageUrl || chosenImage;
      if (!alreadyUploadedStorageUrl && currentUser?.uid && (chosenImage instanceof Blob || (typeof chosenImage === 'string' && chosenImage.startsWith('data:')))) {
        try {
          const storageUrl = await uploadGarmentImage(chosenImage, currentUser.uid, itemId);
          if (storageUrl) {
            finalImageUrl = storageUrl;
          }
        } catch (uploadErr) {
          console.warn('Storage feltöltési hiba, fallback helyi formátumra:', uploadErr);
        }
      }

      // If remote HTTP URL from webshop and not uploaded, ensure Base64 persistence
      if (finalImageUrl && typeof finalImageUrl === 'string' && finalImageUrl.startsWith('http') && !finalImageUrl.includes('firebasestorage.googleapis.com')) {
        try {
          const b64 = await ensureBase64Image(finalImageUrl, 640, 640, 0.75);
          if (b64 && b64.startsWith('data:')) {
            finalImageUrl = b64;
          }
        } catch (_) {}
      }

      onAddClothing({
        ...formData,
        id: itemId,
        imageUrl: finalImageUrl
      });

      handleClose();
    } catch (err) {
      console.error('Mentési hiba:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 pt-4 sm:pt-6 bg-black/80 backdrop-blur-md overflow-y-auto overscroll-contain animate-fade-in"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-[#0a0e17] border border-slate-800 rounded-3xl shadow-2xl flex flex-col my-auto animate-scale-up max-h-[calc(100dvh-2rem)] sm:max-h-[88vh] overflow-hidden"
      >
        
        {/* Header matching Mix & Match and Buy or Skip style */}
        <div className="shrink-0 px-4 sm:px-6 py-3.5 border-b border-slate-800 bg-[#090d15]/95 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-1 rounded-xl bg-slate-200 text-slate-950 font-bold text-xs shadow-sm flex items-center gap-1.5">
              <span>🚪</span>
              <span>Wardrobe</span>
            </span>
            <h3 className="text-base sm:text-lg font-serif font-bold text-white">
              Új Ruhadarab Rögzítése
            </h3>
          </div>
          <button 
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-[#0d121c] border border-slate-800 transition-colors cursor-pointer"
            title="Bezárás"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Input Method Selector / Form */}
        {!isFormReady ? (
          <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
            
            {/* Helpful Onboarding & Best Practices Tip Card */}
            <div className="p-3.5 rounded-2xl bg-[#0f1420]/70 border border-slate-800 text-xs space-y-2">
              <div className="flex items-center gap-2 text-slate-200 font-bold font-serif text-xs">
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                <span>Tanácsok a ruhatárépítéshez:</span>
              </div>
              <ul className="space-y-1.5 pl-1 text-[11px] text-slate-300 leading-relaxed">
                <li className="flex items-start gap-1.5">
                  <span className="text-sky-400 font-bold shrink-0">🍂 1.</span>
                  <span><strong>Szezonális prioritás:</strong> Először az <em>aktuális évszakban hordott ruháidat</em> töltsd fel az azonnali szettkészítéshez.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-400 font-bold shrink-0">📏 2.</span>
                  <span><strong>Tökéletesen passzoló darabok:</strong> Csak olyan ruhát rögzíts, ami most is kényelmes és jó méretű.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-amber-400 font-bold shrink-0">✨ 3.</span>
                  <span><strong>Valós állapot:</strong> Ha a darab kopott, állítsd <em>Játszós</em> vagy <em>Lecserélendő</em> státuszra.</span>
                </li>
              </ul>
            </div>
            
            {/* Source Tabs: Strictly 1 single row on all mobile and desktop screens, matching Buy or Skip */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-[#090d15] rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveMode('camera')}
                className={`flex items-center justify-center gap-1 sm:gap-1.5 px-1 sm:px-2.5 py-2 rounded-xl text-[10px] xs:text-[11px] sm:text-xs font-semibold min-w-0 transition-all cursor-pointer ${
                  activeMode === 'camera' ? 'bg-slate-200 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Camera className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Fotózás</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMode('clipboard')}
                className={`flex items-center justify-center gap-1 sm:gap-1.5 px-1 sm:px-2.5 py-2 rounded-xl text-[10px] xs:text-[11px] sm:text-xs font-semibold min-w-0 transition-all cursor-pointer ${
                  activeMode === 'clipboard' ? 'bg-slate-200 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Clipboard className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Vágólap</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMode('upload')}
                className={`flex items-center justify-center gap-1 sm:gap-1.5 px-1 sm:px-2.5 py-2 rounded-xl text-[10px] xs:text-[11px] sm:text-xs font-semibold min-w-0 transition-all cursor-pointer ${
                  activeMode === 'upload' ? 'bg-slate-200 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Upload className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Feltöltés</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMode('link')}
                className={`flex items-center justify-center gap-1 sm:gap-1.5 px-1 sm:px-2.5 py-2 rounded-xl text-[10px] xs:text-[11px] sm:text-xs font-semibold min-w-0 transition-all cursor-pointer ${
                  activeMode === 'link' ? 'bg-slate-200 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Link / Kód</span>
              </button>
            </div>

            {/* Mode 1: Camera */}
            {activeMode === 'camera' && (
              <div 
                onClick={() => cameraInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-slate-500 rounded-2xl p-6 sm:p-8 text-center cursor-pointer bg-[#090d15]/50 flex flex-col items-center justify-center gap-3 transition-all"
              >
                <input 
                  type="file" 
                  id="add-clothing-camera-input"
                  name="clothingCamera"
                  aria-label="Fotó készítése kamerával"
                  accept="image/*" 
                  capture="environment" 
                  ref={cameraInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                />
                <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 shadow">
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Kattints a kamera megnyitásához</p>
                  <p className="text-xs text-slate-400 mt-1">Fotózd le a ruhát — az AI automatikusan kitisztítja a hátteret</p>
                </div>
              </div>
            )}

            {/* Mode 2: Clipboard Paste */}
            {activeMode === 'clipboard' && (
              <div 
                onClick={handleClipboardButtonClick}
                className="border-2 border-dashed border-slate-700 hover:border-slate-500 rounded-2xl p-6 sm:p-8 text-center cursor-pointer bg-[#090d15]/50 flex flex-col items-center justify-center gap-3 transition-all group"
              >
                <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 group-hover:scale-110 transition-transform shadow">
                  <Clipboard className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Kattints ide a vágólap beillesztéséhez</p>
                  <p className="text-xs text-slate-400 mt-1">Vagy nyomj <strong>Ctrl + V</strong>-t a billentyűzeten bárhol az ablakban</p>
                  <p className="text-[11px] text-slate-500 pt-1">
                    Jobb klikk a webshop fotóra ➔ <em>"Kép másolása"</em>
                  </p>
                </div>
              </div>
            )}

            {/* Mode 3: Upload */}
            {activeMode === 'upload' && (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-slate-500 rounded-2xl p-6 sm:p-8 text-center cursor-pointer bg-[#090d15]/50 flex flex-col items-center justify-center gap-3 transition-all"
              >
                <input 
                  type="file" 
                  id="add-clothing-file-input"
                  name="clothingFile"
                  aria-label="Fotó feltöltése galériából"
                  accept="image/*" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                />
                <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 shadow">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Válassz fotót a készülékedről</p>
                  <p className="text-xs text-slate-400 mt-1">Automatikusan eltávolítjuk a hátteret és kitisztítjuk a képet</p>
                </div>
              </div>
            )}

            {/* Mode 4: Webshop Link or Product Code */}
            {activeMode === 'link' && (
              <form onSubmit={handleLinkImport} className="space-y-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="add-clothing-webshop-input" className="block text-xs font-medium text-slate-300">
                    Webshop Terméklink VAGY Cikkszám / Termékkód (Next, Zara, Reserved stb.):
                  </label>
                  <span className="text-[10px] text-sky-400 font-medium">SKU Keresés Aktív</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="add-clothing-webshop-input"
                    name="clothingWebshopUrl"
                    aria-label="Webshop terméklink vagy cikkszám"
                    required
                    placeholder="pl. https://www.nextdirect.com/... VAGY csak cikkszám pl. AA6536"
                    value={webshopUrl}
                    onChange={(e) => {
                      setWebshopUrl(e.target.value);
                      if (analysisError) setAnalysisError(null);
                    }}
                    className="w-full bg-[#090d15] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-500 transition-colors"
                  />
                  <button 
                    type="submit" 
                    disabled={isAnalyzing || !webshopUrl.trim()}
                    className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-white text-slate-950 font-bold text-xs whitespace-nowrap flex items-center gap-1.5 shrink-0 shadow transition-colors cursor-pointer"
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
                      className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-white text-slate-950 font-bold text-[11px] shrink-0 flex items-center gap-1.5 justify-center self-end sm:self-auto shadow cursor-pointer transition-colors"
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
          <form onSubmit={handleSave} className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-5">
            <input 
              type="file" 
              accept="image/*" 
              ref={attachPhotoInputRef} 
              onChange={handleAttachPhoto} 
              className="hidden" 
            />
            
            {/* 1. Proportional Image Preview with Packshot Toggle */}
            <div className="space-y-2">
              <div className="relative aspect-square sm:aspect-[4/3] max-h-[360px] sm:max-h-[420px] w-full rounded-2xl overflow-hidden border border-slate-800 p-1.5 flex flex-col items-center justify-center" style={{ background: 'radial-gradient(circle at center, #2e3544 0%, #171b24 60%, #0a0c10 100%)' }}>
                {imagePreview ? (
                  <>
                    {/* View Mode Toggle: Packshot vs Eredeti fotó */}
                    {rawOriginalImage && cleanPackshot && (
                      <div className="absolute top-3 left-3 z-20 flex items-center bg-black/85 backdrop-blur-md rounded-xl p-1 border border-slate-700 shadow-xl animate-fade-in">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveImageMode('packshot');
                            setImagePreview(cleanPackshot.dataUrl);
                          }}
                          className={`py-1 px-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                            activeImageMode === 'packshot'
                              ? 'bg-slate-200 text-slate-950 font-bold shadow'
                              : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5 text-current" />
                          <span>✨ Packshot</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveImageMode('original');
                            setImagePreview(rawOriginalImage);
                          }}
                          className={`py-1 px-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                            activeImageMode === 'original'
                              ? 'bg-white/20 text-white font-bold shadow'
                              : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          <Camera className="w-3.5 h-3.5 text-current" />
                          <span>📷 Eredeti</span>
                        </button>
                      </div>
                    )}

                    {/* Background removal in progress badge or status feedback */}
                    {(isRemovingBg || (bgRemovalProgress && bgRemovalProgress.percent === 0)) && (
                      <div className={`absolute top-3 left-3 z-20 flex items-center gap-2 bg-black/85 backdrop-blur-md rounded-xl px-3 py-1.5 border ${
                        isRemovingBg ? 'border-sky-500/50 animate-pulse text-sky-300' : 'border-amber-500/50 text-amber-300'
                      } shadow-xl text-xs`}>
                        {isRemovingBg ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400 shrink-0" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        )}
                        <span className="font-medium">{bgRemovalProgress?.label || '✨ Háttér eltávolítása folyamatban...'}</span>
                      </div>
                    )}

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
                      className="w-full h-full object-contain rounded-xl shadow-lg transition-all" 
                    />
                    <div className="absolute bottom-3 right-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleClipboardButtonClick}
                        className="px-3 py-1.5 rounded-xl bg-black/80 hover:bg-black backdrop-blur-md border border-slate-700 text-[11px] flex items-center gap-1.5 text-slate-200 hover:text-white shadow-lg transition-colors cursor-pointer"
                        title="Kép beillesztése vágólapról (Ctrl+V)"
                      >
                        <Clipboard className="w-3.5 h-3.5" />
                        <span>Vágólap (Ctrl+V)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => attachPhotoInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-xl bg-black/80 hover:bg-black backdrop-blur-md border border-slate-700 text-[11px] flex items-center gap-1.5 text-slate-200 hover:text-white shadow-lg transition-colors cursor-pointer"
                        title="Saját fotó készítése vagy feltöltése"
                      >
                        <Camera className="w-3.5 h-3.5 text-sky-400" />
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
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-200 text-[10px] font-bold border border-slate-700 inline-block">Webshopból Kinyert Termék</span>
                    <h4 className="font-serif font-bold text-white text-sm sm:text-base max-w-md line-clamp-2">
                      {formData.name || 'Új Ruhadarab'}
                    </h4>
                    <p className="text-xs text-slate-300 font-medium">
                      {formData.brand || 'Next Direct'} • {formData.material || 'Természetes szálak'}
                    </p>
                    
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={handleClipboardButtonClick}
                        className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-white text-slate-950 font-bold text-[11px] flex items-center gap-1.5 shadow transition-colors cursor-pointer"
                      >
                        <Clipboard className="w-3.5 h-3.5" />
                        <span>Kép Beillesztése (Ctrl+V)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => attachPhotoInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-xl bg-[#0d121c] hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5 text-sky-400" />
                        <span>Saját fotó</span>
                      </button>
                    </div>
                  </div>
                )}
                
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 text-white rounded-2xl">
                    <Loader2 className="w-8 h-8 text-slate-200 animate-spin" />
                    <p className="text-xs font-medium tracking-wide">Az AI villámgyorsan elemzi a ruhadarabot...</p>
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

              {/* Multi-Image Selector — Only for genuine webshop multi-image imports */}
              {availableImages.length > 1 && activeMode === 'link' && (
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    További képek a termékoldalról (kattints a kiválasztáshoz):
                  </span>
                  <div className="flex items-center gap-2 overflow-x-auto py-1">
                    {availableImages.map((imgUrl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setImagePreview(imgUrl)}
                        className={`w-14 h-14 rounded-xl overflow-hidden bg-[#07090e] border p-0.5 shrink-0 transition-all cursor-pointer ${
                          imagePreview === imgUrl 
                            ? 'border-white ring-2 ring-slate-400 scale-105' 
                            : 'border-slate-800 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={imgUrl} alt={`Foto ${idx + 1}`} width="100" height="75" className="w-full h-full object-contain" />
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
              <label htmlFor="add-clothing-name-input" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Megnevezés:
              </label>
              <input
                type="text"
                id="add-clothing-name-input"
                name="clothingName"
                aria-label="Megnevezés"
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
                <label htmlFor="add-clothing-category-select" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Kategória:
                </label>
                <select
                  id="add-clothing-category-select"
                  name="clothingCategory"
                  aria-label="Kategória"
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
                <label htmlFor="add-clothing-formality-select" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Formalitási Szint (Dress Code):
                </label>
                <select
                  id="add-clothing-formality-select"
                  name="clothingFormality"
                  aria-label="Formalitási szint"
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
                <label htmlFor="add-clothing-brand-input" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Gyártó / Márka:
                </label>
                <input
                  type="text"
                  id="add-clothing-brand-input"
                  name="clothingBrand"
                  aria-label="Gyártó vagy Márka"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="custom-input text-xs"
                  placeholder="pl. Massimo Dutti, Zara, Boglioli, Eton, Incotex"
                />
              </div>

              <div>
                <label htmlFor="add-clothing-size-input" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Méret (Címke szerint):
                </label>
                <input
                  type="text"
                  id="add-clothing-size-input"
                  name="clothingSize"
                  aria-label="Méret címke szerint"
                  value={formData.size}
                  onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                  className="custom-input text-xs font-mono"
                  placeholder="pl. 50, M, L, 40 / 15.75, 32/32, 42.5"
                />
                <p className="text-[10px] text-[var(--text-muted)] mt-1">
                  📏 <em>Csak olyan ruhát tölts fel, ami most is tökéletesen passzol rád!</em>
                </p>
              </div>
            </div>

            {/* 4. Material & Curated Color Palette */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="add-clothing-material-input" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Anyagösszetétel & Szövés:
                </label>
                <input
                  type="text"
                  id="add-clothing-material-input"
                  name="clothingMaterial"
                  aria-label="Anyagösszetétel és szövés"
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
                <label htmlFor="add-clothing-styling-tip" className="block text-xs font-medium text-amber-300 mb-1">
                  💡 Mivel érdemes hordani (AI Ajánlás):
                </label>
                <textarea
                  id="add-clothing-styling-tip"
                  name="clothingStylingTip"
                  aria-label="Mivel érdemes hordani"
                  ref={stylingTipRef}
                  value={formData.stylingTip}
                  onChange={(e) => setFormData({ ...formData, stylingTip: e.target.value })}
                  rows={2}
                  className="custom-input text-xs resize-none overflow-hidden leading-relaxed text-amber-100 bg-amber-950/20 border-amber-500/30 focus:border-amber-400"
                  placeholder="Mivel kombinálható a legszebben..."
                />
              </div>

              <div>
                <label htmlFor="add-clothing-when-to-wear" className="block text-xs font-medium text-emerald-300 mb-1">
                  📅 Mikor és milyen alkalomra ajánlott:
                </label>
                <textarea
                  id="add-clothing-when-to-wear"
                  name="clothingWhenToWear"
                  aria-label="Mikor és milyen alkalomra ajánlott"
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
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-[var(--text-secondary)]">
                  Ruha Állapota:
                </label>
                <span className="text-[10px] text-amber-300">
                  ✨ Ha kopott, állítsd 'Játszós' vagy 'Lecserélendő'-re!
                </span>
              </div>
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
              <label htmlFor="add-clothing-style-archetype-select" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Stílusirányzat:
              </label>
              <select
                id="add-clothing-style-archetype-select"
                name="clothingStyleArchetype"
                aria-label="Stílusirányzat"
                value={formData.styleArchetype}
                onChange={(e) => setFormData({ ...formData, styleArchetype: e.target.value })}
                className="custom-input text-xs"
              >
                {demographicArchetypes.map(s => (
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
                {demographicTags.map(tag => {
                  const isSelected = formData.tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleTagToggle(tag)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-slate-200 text-slate-950 font-bold shadow-sm'
                          : 'bg-[#090d15] text-slate-400 hover:text-white border border-slate-800'
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
                  id="add-clothing-custom-tag-input"
                  name="clothingCustomTag"
                  aria-label="Egyedi címke hozzáadása"
                  placeholder="Egyedi címke hozzáadása..."
                  value={customTagInput}
                  onChange={(e) => setCustomTagInput(e.target.value)}
                  className="w-full bg-[#090d15] border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={handleAddCustomTag}
                  className="px-3 py-1.5 rounded-xl bg-[#0d121c] hover:bg-slate-800 border border-slate-800 text-xs text-slate-200 hover:text-white transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Hozzáadás</span>
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-3 border-t border-slate-800 flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 rounded-xl bg-[#0d121c] hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer flex-1 font-semibold"
              >
                Mégse
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-white text-slate-950 font-bold text-xs shadow flex items-center justify-center gap-2 transition-all cursor-pointer flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Feltöltés és Mentés...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Mentés a Ruhatárba</span>
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
