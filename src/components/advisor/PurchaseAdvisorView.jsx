import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Link as LinkIcon, Sparkles, CheckCircle2, AlertTriangle, XCircle, ShoppingBag, ArrowRight, Loader2, RefreshCw, Plus, Check, Heart, Clipboard, Feather, ShieldAlert, Layers, Compass, Maximize2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { evaluateAndExtractPrePurchaseItem } from '../../services/gemini';
import { extractWebshopData } from '../../services/webshop';
import { optimizeImageForUpload, getSmartGarmentImage, ensureBase64Image } from '../../services/imageOptimizer';
import confetti from 'canvas-confetti';
import GarmentLightboxModal from '../common/GarmentLightboxModal';

export default function PurchaseAdvisorView({ prefillData, onClearPrefill }) {
  const { wardrobe, profile, addItem } = useAuth();

  const [activeTab, setActiveTab] = useState('camera'); // 'camera', 'clipboard', 'upload', 'link'
  const [imagePreview, setImagePreview] = useState(null);
  const [webshopUrl, setWebshopUrl] = useState('');
  const [webshopContext, setWebshopContext] = useState(null);
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [addedToWardrobe, setAddedToWardrobe] = useState(false);

  // Lightbox Modal State
  const [lightboxData, setLightboxData] = useState({
    isOpen: false,
    items: [],
    initialIndex: 0,
    outfitTitle: '',
    defaultView: 'lookbook'
  });

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Handle prefill data from missing pieces view or mobile share target
  useEffect(() => {
    if (prefillData) {
      if (typeof prefillData === 'string' && (prefillData.startsWith('http://') || prefillData.startsWith('https://'))) {
        setWebshopUrl(prefillData);
        setActiveTab('link');
        handleDirectLinkAnalysis(prefillData);
      } else if (prefillData.url || prefillData.sharedUrl) {
        const targetUrl = prefillData.url || prefillData.sharedUrl;
        setWebshopUrl(targetUrl);
        setActiveTab('link');
        handleDirectLinkAnalysis(targetUrl);
      } else {
        setItemName(prefillData.title || prefillData.name || '');
        setItemPrice(prefillData.estimatedPrice || '');
        setEvaluationResult(null);
        setAnalysisError(null);
        setAddedToWardrobe(false);
      }
    }
  }, [prefillData]);

  const handleDirectLinkAnalysis = async (url) => {
    if (!url) return;
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const data = await extractWebshopData(url.trim());
      const chosenImg = data.imageUrl || (data.images && data.images[0]) || '';
      setImagePreview(chosenImg);
      setWebshopContext(data);
      if (data.title) setItemName(data.title);
      if (data.price) setItemPrice(data.price);
    } catch (err) {
      console.warn('Webshop link auto-kinyerés hiba:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Global window paste listener for Advisor View
  useEffect(() => {
    const handleWindowPaste = (e) => {
      const target = e.target;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
      const hasImageFile = Array.from(e.clipboardData?.items || []).some(item => item.type && item.type.startsWith('image/'));

      if (!isInput || hasImageFile) {
        handlePastedData(e.clipboardData?.items, e.clipboardData?.getData('text'));
        if (hasImageFile) {
          e.preventDefault();
        }
      }
    };

    window.addEventListener('paste', handleWindowPaste);
    return () => window.removeEventListener('paste', handleWindowPaste);
  }, []);

  const handlePastedData = async (items, textData) => {
    if (items && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type && items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            setIsAnalyzing(true);
            setAnalysisError(null);
            try {
              const optimized = await ensureBase64Image(file);
              setImagePreview(optimized);
              setEvaluationResult(null);
            } catch (err) {
              console.error('Vágólap kép hiba:', err);
              setAnalysisError('Nem sikerült a vágólapon lévő kép beolvasása.');
            } finally {
              setIsAnalyzing(false);
            }
            return true;
          }
        }
      }
    }

    const cleanText = (textData || '').trim();
    if (cleanText && (cleanText.startsWith('http://') || cleanText.startsWith('https://') || cleanText.startsWith('data:image/'))) {
      if (/\.(jpeg|jpg|png|webp|avif)($|\?)/i.test(cleanText) || cleanText.includes('images') || cleanText.includes('cdn') || cleanText.includes('static') || cleanText.startsWith('data:image/')) {
        setIsAnalyzing(true);
        setAnalysisError(null);
        try {
          const optimized = await ensureBase64Image(cleanText);
          setImagePreview(optimized || cleanText);
          setEvaluationResult(null);
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

      if (navigator.clipboard && navigator.clipboard.read) {
        const clipboardItems = await navigator.clipboard.read();
        for (const item of clipboardItems) {
          const imageType = item.types.find(type => type.startsWith('image/'));
          if (imageType) {
            const blob = await item.getType(imageType);
            const optimized = await ensureBase64Image(blob);
            setImagePreview(optimized);
            setEvaluationResult(null);
            setIsAnalyzing(false);
            return;
          }
        }
      }

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
      setAnalysisError('Nem található kép a vágólapon. Kattints jobb gombbal a fotóra ➔ "Kép másolása", majd nyomj Ctrl+V-t!');
    } catch (err) {
      console.warn('Vágólap olvasási hiba:', err);
      setIsAnalyzing(false);
      setAnalysisError('Nyomj Ctrl + V-t a billentyűzeten a kép beillesztéséhez!');
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsAnalyzing(true);
      const optimized = await optimizeImageForUpload(file);
      setImagePreview(optimized);
      setWebshopContext(null);
      setEvaluationResult(null);
      setAnalysisError(null);
    } catch (err) {
      console.error('Képfeltöltési hiba:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLinkInput = async (e) => {
    e.preventDefault();
    if (!webshopUrl.trim()) return;

    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const data = await extractWebshopData(webshopUrl.trim());
      const chosenImg = data.imageUrl || (data.images && data.images[0]) || '';
      setImagePreview(chosenImg);
      setWebshopContext(data);
      if (data.title && !itemName) {
        setItemName(data.title);
      }
      setEvaluationResult(null);
    } catch (err) {
      console.error('Webshop link hiba:', err);
      setAnalysisError(err.message || 'A link feldolgozása nem sikerült. Próbáld közvetlen képcímmel vagy fotóval!');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRunEvaluation = async () => {
    if (!imagePreview && !webshopContext) return;

    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      // Single unified fast 1-shot Gemini 3.7 evaluation & extraction
      const result = await evaluateAndExtractPrePurchaseItem({
        imageBase64OrUrl: imagePreview,
        webshopContext: webshopContext || {},
        itemName,
        itemPrice,
        wardrobe,
        styleProfile: profile
      });

      if (result?.item) {
        if (!imagePreview && !result?.isUnknown) {
          const autoImg = getSmartGarmentImage(result.item.category, result.item.color, result.item.subCategory);
          setImagePreview(autoImg);
          result.item.imageUrl = autoImg;
        }
      }

      setEvaluationResult(result);

      if (result.compatibilityScore >= 80) {
        try {
          confetti({
            particleCount: 60,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#d4af37', '#10b981', '#ffffff']
          });
        } catch (_) {}
      }
    } catch (e) {
      console.error('Hiba az értékelés során:', e);
      setAnalysisError(e.message || 'Hiba történt a döntéstámogató futtatása közben.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddToWardrobe = () => {
    if (!evaluationResult?.extractedItem) return;
    addItem(evaluationResult.extractedItem);
    setAddedToWardrobe(true);
  };

  const handleReset = () => {
    setImagePreview(null);
    setEvaluationResult(null);
    setItemName('');
    setItemPrice('');
    setWebshopUrl('');
    setWebshopContext(null);
    setAnalysisError(null);
    setAddedToWardrobe(false);
    if (onClearPrefill) onClearPrefill();
  };

  return (
    <div className="space-y-6 animate-slide-up">
      
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="badge badge-gold">Vásárlási Tanácsadó</span>
          <span className="badge badge-emerald">4 Döntési Pillér</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold font-serif gold-gradient-text mt-1">
          Vásárlási Döntésteszt
        </h2>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
          Fotózd le a próbafülkében vagy illeszd be a webshop linket a kombinálhatósági és minőségi auditáláshoz.
        </p>
        {profile.customStylingRules && profile.customStylingRules.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <span className="text-[10px] text-[var(--accent-gold-light)] bg-[var(--accent-gold-glow)] px-2.5 py-1 rounded-lg border border-[var(--border-gold)]/40 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[var(--accent-gold)] shrink-0" />
              <span className="truncate max-w-xl">
                <strong>Egyéni stílusszabály-ellenőrzés aktív ({profile.customStylingRules.length}):</strong> {profile.customStylingRules.join(' • ')}
              </span>
            </span>
          </div>
        )}
      </div>

      {/* Helpful 4-Pillar Guidance Banner */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-amber-500/15 via-black/40 to-transparent border border-amber-500/30 text-xs space-y-2">
        <div className="flex items-center gap-2 text-amber-200 font-serif font-bold text-xs">
          <Sparkles className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
          <span>Hogyan segít az AI megelőzni a rossz vásárlási döntéseket?</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px] text-[var(--text-secondary)]">
          <div className="p-2 rounded-lg bg-black/40 border border-white/5">
            <strong className="text-white block">1. 3 komplett szett:</strong>
            <span>Megmutatja, hogyan tudod viselni a már meglévő darabjaiddal.</span>
          </div>
          <div className="p-2 rounded-lg bg-black/40 border border-white/5">
            <strong className="text-white block">2. Duplikáció szűrés:</strong>
            <span>Figyelmeztet, ha már van hasonló darabod a ruhatáradban.</span>
          </div>
          <div className="p-2 rounded-lg bg-black/40 border border-white/5">
            <strong className="text-white block">3. Szabás & Méret:</strong>
            <span>Ellenőrzi a méretet és szabást (pl. Slim vs Regular).</span>
          </div>
          <div className="p-2 rounded-lg bg-black/40 border border-white/5">
            <strong className="text-white block">4. Anyagminőség:</strong>
            <span>Kiszűri a rossz műszálakat (100% poliészter, PU műbőr).</span>
          </div>
        </div>
      </div>

      {/* Input Stage */}
      {!evaluationResult && (
        <div className="glass-card p-5 sm:p-6 space-y-5">
          
          {/* Source Tabs */}
          {!imagePreview && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1 bg-black/40 rounded-xl border border-white/5">
              <button
                type="button"
                onClick={() => setActiveTab('camera')}
                className={`py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'camera' ? 'bg-[var(--accent-gold)] text-black font-semibold shadow' : 'text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>Próbafülke Fotó</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('clipboard')}
                className={`py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'clipboard' ? 'bg-[var(--accent-gold)] text-black font-semibold shadow' : 'text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                <Clipboard className="w-4 h-4" />
                <span>Vágólap (Ctrl+V)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'upload' ? 'bg-[var(--accent-gold)] text-black font-semibold shadow' : 'text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>Feltöltés</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('link')}
                className={`py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'link' ? 'bg-[var(--accent-gold)] text-black font-semibold shadow' : 'text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                <LinkIcon className="w-4 h-4" />
                <span>Webshop Link</span>
              </button>
            </div>
          )}

          {/* Tab 1: Camera */}
          {activeTab === 'camera' && !imagePreview && (
            <div
              onClick={() => cameraInputRef.current?.click()}
              className="border-2 border-dashed border-[var(--border-gold)] rounded-2xl p-8 text-center cursor-pointer hover:bg-white/5 transition-all flex flex-col items-center justify-center gap-3 bg-[var(--accent-gold-glow)]"
            >
              <input
                type="file"
                id="advisor-camera-input"
                name="advisorCamera"
                aria-label="Fotó készítése próbafülkében"
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
                <p className="text-sm font-semibold text-white">Fotózd le a ruhát a tükörben vagy a próbafülkében</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">Azonnali elemzés és ruhatár-összevetés</p>
              </div>
            </div>
          )}

          {/* Tab 2: Clipboard Paste */}
          {activeTab === 'clipboard' && !imagePreview && (
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
                  Vagy nyomj <kbd className="px-1.5 py-0.5 rounded bg-black border border-white/20 text-white font-mono text-[11px]">Ctrl + V</kbd>-t bárhol!
                </p>
                <p className="text-[11px] text-[var(--text-muted)] pt-1">
                  Másold ki a termékfotót a webshopból (Jobb klikk ➔ Kép másolása) és illeszd be ide!
                </p>
              </div>
            </div>
          )}

          {/* Tab 3: Upload */}
          {activeTab === 'upload' && !imagePreview && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/10 rounded-2xl p-8 text-center cursor-pointer hover:border-[var(--border-gold)] hover:bg-white/5 transition-all flex flex-col items-center justify-center gap-3"
            >
              <input
                type="file"
                id="advisor-file-input"
                name="advisorFile"
                aria-label="Fotó feltöltése galériából"
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
                <p className="text-xs text-[var(--text-secondary)] mt-1">Elmentett fotó vagy képernyőkép</p>
              </div>
            </div>
          )}

          {/* Tab 4: Link or Product Code */}
          {activeTab === 'link' && !imagePreview && (
            <form onSubmit={handleLinkInput} className="space-y-3">
              <div className="flex items-center justify-between">
                <label htmlFor="advisor-webshop-url-input" className="block text-xs font-medium text-[var(--text-secondary)]">
                  Webshop terméklink VAGY Cikkszám / Termékkód (Next, Zara, Reserved stb.):
                </label>
                <span className="text-[10px] text-[var(--accent-gold)] font-medium">SKU Keresés Aktív</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="advisor-webshop-url-input"
                  name="advisorWebshopUrl"
                  aria-label="Webshop terméklink vagy cikkszám"
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
                      <span>Betöltés</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                💡 <em>Tipp: Akár csak a ruha termékkódját is megadhatod (pl. <strong>AA6536</strong>, <strong>SU458397</strong>, <strong>512HR-09M</strong>), az AI megkeresi a képet és az adatokat a neten!</em>
              </p>
            </form>
          )}

          {/* Error Message if any */}
          {analysisError && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 animate-slide-up">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{analysisError}</span>
              </div>
              <button
                type="button"
                onClick={handleClipboardButtonClick}
                className="btn-gold py-1 px-2.5 text-[11px] shrink-0 flex items-center gap-1.5 self-end sm:self-auto shadow"
              >
                <Clipboard className="w-3.5 h-3.5" />
                <span>Kép Beillesztése (Ctrl+V)</span>
              </button>
            </div>
          )}

          {/* Preview & Evaluation trigger */}
          {(imagePreview || webshopContext) && (
            <div className="space-y-4">
              {imagePreview ? (
                <div className="relative aspect-[4/3] sm:aspect-[16/9] w-full rounded-2xl overflow-hidden bg-[#07090e] border border-white/10 p-2 flex items-center justify-center">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    width="400"
                    height="300"
                    onError={() => setImagePreview(null)}
                    className="max-h-full max-w-full object-contain rounded-xl shadow-lg" 
                  />
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleClipboardButtonClick}
                      className="p-2 rounded-full bg-black/80 text-[var(--accent-gold)] hover:bg-black border border-white/10"
                      title="Kép cseréje vágólapról (Ctrl+V)"
                    >
                      <Clipboard className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setImagePreview(null)}
                      className="p-2 rounded-full bg-black/80 text-white hover:bg-black border border-white/10"
                      title="Kép törlése"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-[var(--accent-gold-glow)] border border-[var(--border-gold)] text-center space-y-2">
                  <span className="badge badge-gold text-[11px]">Webshop Termék / SKU Felismerve</span>
                  <h4 className="font-serif font-bold text-white text-base">
                    {itemName || webshopContext?.title || webshopContext?.productCode || 'Kiszemelt Termék'}
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {webshopContext?.brand ? `Márka: ${webshopContext.brand}` : ''} {webshopContext?.productCode ? `• SKU: ${webshopContext.productCode}` : ''}
                  </p>
                  
                  <div className="pt-2 flex justify-center">
                    <button
                      type="button"
                      onClick={handleClipboardButtonClick}
                      className="btn-gold py-1.5 px-3 text-xs flex items-center gap-1.5 shadow"
                    >
                      <Clipboard className="w-4 h-4" />
                      <span>Fotó Beillesztése Vágólapról (Ctrl+V)</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="advisor-item-name-input" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Megnevezés (opcionális):
                  </label>
                  <input
                    type="text"
                    id="advisor-item-name-input"
                    name="advisorItemName"
                    aria-label="Megnevezés"
                    placeholder="pl. Zöld Slim Fit Lenkeverék Zakó"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    className="custom-input text-xs"
                  />
                </div>

                <div>
                  <label htmlFor="advisor-item-price-input" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Ár (opcionális):
                  </label>
                  <input
                    type="text"
                    id="advisor-item-price-input"
                    name="advisorItemPrice"
                    aria-label="Ár"
                    placeholder="pl. 38 000 Ft"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                    className="custom-input text-xs"
                  />
                </div>
              </div>

              <button
                onClick={handleRunEvaluation}
                disabled={isAnalyzing}
                className="btn-gold w-full py-3.5 text-sm font-bold shadow-xl flex items-center justify-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Gemini 3.7 Flash elemzi a 3 Döntési Pillért és szetteket épít...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>3 Döntési Pillér & Outfit Teszt Futtatása</span>
                  </>
                )}
              </button>
            </div>
          )}

        </div>
      )}

      {/* Result Presentation */}
      {evaluationResult && (
        <div className="space-y-6">
          
          {/* Main Verdict Card */}
          <div className="glass-card p-6 sm:p-7 border-[var(--border-gold)] space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
              
              <div className="flex items-center gap-3">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl shadow-lg ${
                  evaluationResult.compatibilityScore >= 80
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-emerald-500/10'
                    : evaluationResult.compatibilityScore >= 65
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                }`}>
                  {evaluationResult.compatibilityScore}%
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">Döntési Javaslat:</span>
                    <span className={`badge ${
                      evaluationResult.compatibilityScore >= 80 ? 'badge-emerald' : 'badge-gold'
                    }`}>
                      {evaluationResult.verdict}
                    </span>
                  </div>
                  <h3 className="text-xl font-serif font-bold text-white mt-0.5">
                    Ruhatár-Kompatibilitási Eredmény
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center">
                <button
                  onClick={handleReset}
                  className="btn-secondary text-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Új teszt</span>
                </button>

                {addedToWardrobe ? (
                  <span className="badge badge-emerald py-2 px-3 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    <span>Hozzáadva a Gardróbhoz</span>
                  </span>
                ) : (
                  <button
                    onClick={handleAddToWardrobe}
                    className="btn-gold text-xs py-2 px-3 font-bold flex items-center gap-1.5 shadow-lg"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Hozzáadás a Gardróbhoz</span>
                  </button>
                )}
              </div>
            </div>

            {/* Verdict summary */}
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              {evaluationResult.verdictSummary}
            </p>

            {/* 3 Pillars Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              
              {/* Pillar 1: Combinability */}
              <div className="bg-black/30 p-3.5 rounded-xl border border-white/5 space-y-1">
                <span className="text-[11px] font-bold uppercase text-[var(--accent-gold)] block">
                  1. Kombinálhatóság
                </span>
                <p className="text-xs text-[var(--text-secondary)]">
                  Garantált 3 komplett outfit a meglévő ruháiddal.
                </p>
              </div>

              {/* Pillar 2: Versatility & Upgrade */}
              <div className="bg-black/30 p-3.5 rounded-xl border border-white/5 space-y-1">
                <span className="text-[11px] font-bold uppercase text-sky-400 block">
                  2. Változatosság & Csere
                </span>
                <p className="text-xs text-[var(--text-secondary)]">
                  {evaluationResult.duplicationWarning || 'Új szín és fazon kombinációkat hoz a ruhatáradba.'}
                </p>
              </div>

              {/* Pillar 3: Personal Fit */}
              <div className="bg-black/30 p-3.5 rounded-xl border border-white/5 space-y-1">
                <span className="text-[11px] font-bold uppercase text-emerald-400 block">
                  3. Személyes Illeszkedés
                </span>
                <p className="text-xs text-[var(--text-secondary)]">
                  {evaluationResult.personalFitVerdict || 'Harmonizál a bőrtónusoddal és a testalkatoddal.'}
                </p>
              </div>

            </div>

            {/* Fit & Silhouette Mismatch / Sizing Alert Box */}
            {evaluationResult.fitMismatchWarning && (
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-black/40 border border-amber-500/30 text-xs space-y-2 animate-slide-up">
                <div className="flex items-center gap-2 text-amber-300 font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Szabás & Testalkat Illeszkedési Elemzés (Fit Intelligence):</span>
                </div>
                <p className="text-[var(--text-secondary)] leading-relaxed">
                  {evaluationResult.fitMismatchWarning}
                </p>
                {evaluationResult.sizingAdvice && (
                  <div className="pt-2 border-t border-amber-500/20 text-[11px] text-amber-200 font-medium flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[var(--accent-gold)] shrink-0" />
                    <span><strong>Méretválasztási javaslat:</strong> {evaluationResult.sizingAdvice}</span>
                  </div>
                )}
              </div>
            )}

            {/* Fabric & Material Intelligence (Műszál / Anyagösszetétel Figyelmeztetés) */}
            {evaluationResult.fabricWarning && (
              <div className={`p-4 rounded-xl border text-xs space-y-2 animate-slide-up ${
                evaluationResult.isSynthetic || (evaluationResult.fabricScore && evaluationResult.fabricScore < 7)
                  ? 'bg-gradient-to-r from-rose-500/15 via-rose-950/20 to-black/40 border-rose-500/40 text-rose-200'
                  : 'bg-gradient-to-r from-emerald-500/15 via-emerald-950/20 to-black/40 border-emerald-500/40 text-emerald-200'
              }`}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className={`flex items-center gap-2 font-bold ${
                    evaluationResult.isSynthetic || (evaluationResult.fabricScore && evaluationResult.fabricScore < 7)
                      ? 'text-rose-300'
                      : 'text-emerald-300'
                  }`}>
                    {evaluationResult.isSynthetic || (evaluationResult.fabricScore && evaluationResult.fabricScore < 7) ? (
                      <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                    ) : (
                      <Feather className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                    <span>Anyagösszetétel & Anyagminőség Elemzés (Fabric Intelligence):</span>
                  </div>
                  {evaluationResult.item?.material && (
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${
                      evaluationResult.isSynthetic || (evaluationResult.fabricScore && evaluationResult.fabricScore < 7)
                        ? 'bg-rose-500/20 border-rose-500/30 text-rose-300'
                        : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                    }`}>
                      {evaluationResult.item.material}
                    </span>
                  )}
                </div>
                <p className="text-[var(--text-secondary)] leading-relaxed">
                  {evaluationResult.fabricWarning}
                </p>
              </div>
            )}

            {/* Aesthetic Role & Redundancy Overlap Box */}
            {evaluationResult.aestheticOverlap && (
              <div className={`p-4 rounded-xl border text-xs space-y-2 animate-slide-up ${
                evaluationResult.aestheticOverlap.isRedundant
                  ? 'bg-gradient-to-r from-amber-500/15 via-amber-950/20 to-black/40 border-amber-500/40 text-amber-200'
                  : 'bg-gradient-to-r from-emerald-500/10 to-black/40 border-emerald-500/30 text-emerald-200'
              }`}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <Compass className="w-4 h-4 text-[var(--accent-gold)] shrink-0" />
                    <span>Stilisztikai Lefedettség & Kapszula Skála:</span>
                  </div>
                  {evaluationResult.aestheticOverlap.isRedundant ? (
                    <span className="badge badge-gold text-[10px]">
                      ⚠️ Lefedett Stílusszerepkör
                    </span>
                  ) : (
                    <span className="badge badge-emerald text-[10px]">
                      ✨ Új Stílusdimenzió
                    </span>
                  )}
                </div>

                <p className="text-[var(--text-secondary)] leading-relaxed">
                  {evaluationResult.aestheticOverlap.reason || 
                    (evaluationResult.aestheticOverlap.isRedundant
                      ? `A ruhatáradban lévő '${evaluationResult.aestheticOverlap.existingItemName}' már teljes mértékben lefedi ezt a megjelenést.`
                      : 'Ez a darab valóban új stíluslehetőségeket és kombinációkat nyit meg a ruhatáradban.')}
                </p>

                {evaluationResult.aestheticOverlap.alternativeRecommendation && (
                  <div className="pt-2 border-t border-white/10 text-[11px] text-[var(--accent-gold-light)] flex items-start gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[var(--accent-gold)] shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white">Mit érdemes inkább venni helyette?</strong> {evaluationResult.aestheticOverlap.alternativeRecommendation}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Pros & Cons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-2 bg-black/30 p-4 rounded-xl border border-white/5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Miért éri meg megvenni:</span>
                </h4>
                <ul className="space-y-1 text-xs text-[var(--text-secondary)] list-disc list-inside">
                  {evaluationResult.pros?.map((pro, idx) => (
                    <li key={idx}>{pro}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2 bg-black/30 p-4 rounded-xl border border-white/5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Gondold át:</span>
                </h4>
                <ul className="space-y-1 text-xs text-[var(--text-secondary)] list-disc list-inside">
                  {evaluationResult.cons?.map((con, idx) => (
                    <li key={idx}>{con}</li>
                  ))}
                </ul>
              </div>
            </div>

          </div>

          {/* VISUAL FLAT-LAY OUTFIT COLLAGE OF 3 GUARANTEED OUTFITS */}
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-serif font-bold gold-gradient-text">
                ✨ A 3 Garantált Outfit a Meglévő Ruhatáradból (Képi Kollázs)
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Így kombinálhatod azonnal a szekrényedben lévő minőségi darabjaiddal:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {evaluationResult.outfits?.map((outfit, idx) => (
                <div key={idx} className="glass-card p-4 space-y-3 flex flex-col justify-between border-white/10 hover:border-[var(--border-gold)] transition-all">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="badge badge-gold text-[10px]">
                        {outfit.styleType || 'Klasszikus & Kifinomult'}
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)]">
                        {outfit.occasion}
                      </span>
                    </div>

                    <h4 className="font-serif font-bold text-white text-base mb-3">
                      {outfit.title}
                    </h4>

                    {/* Visual Flat-lay Photo Grid */}
                    <div className="grid grid-cols-2 gap-2 p-2 rounded-xl bg-black/50 border border-white/5">
                      {outfit.items?.map((item, iIdx) => {
                        const isCandidateItem = item.id === 'candidate-item' || item.name === evaluationResult.extractedItem?.name;

                        return (
                          <div 
                            key={iIdx} 
                            onClick={() => setLightboxData({
                              isOpen: true,
                              items: outfit.items || [],
                              initialIndex: iIdx,
                              outfitTitle: outfit.title || 'Vásárlási Outfit Teszt'
                            })}
                            className="space-y-1 group relative cursor-pointer"
                          >
                            <div className={`aspect-[4/3] rounded-lg overflow-hidden bg-[#07090e] p-1 flex items-center justify-center border relative transition-all ${
                              isCandidateItem
                                ? 'border-[var(--accent-gold)] ring-1 ring-[var(--accent-gold-glow)] shadow-md shadow-[var(--accent-gold)]/10'
                                : 'border-white/10 group-hover:border-[var(--accent-gold)]'
                            }`}>
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                loading="lazy"
                                decoding="async"
                                width="160"
                                height="120"
                                style={{ aspectRatio: '4 / 3' }}
                                className="w-full h-full object-contain rounded group-hover:scale-105 transition-transform duration-300"
                              />
                              {isCandidateItem && (
                                <span className="absolute top-1 right-1 bg-[var(--accent-gold)] text-black text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                                  ÚJ
                                </span>
                              )}
                              <span className="absolute bottom-1 left-1 text-[8px] bg-black/80 backdrop-blur-sm px-1.5 py-0.5 rounded text-white/90 font-medium border border-white/10">
                                {item.subCategory === 'belt' || item.name?.toLowerCase().includes('öv') ? '🎗️ Öv' : item.category === 'tops' ? '👔 Bázis' : item.category === 'knitwear' ? '🧶 Köztes' : (item.subCategory === 'overcoat' || item.subCategory === 'coat' || item.name?.toLowerCase().includes('kabát')) ? '🧥 Nagykabát' : item.category === 'outerwear' ? '🧥 Zakó' : item.category === 'bottoms' ? '👖 Alsó' : item.category === 'shoes' ? '👞 Cipő' : '✦ Kiegészítő'}
                              </span>
                            </div>
                            <p className="text-[10px] text-[var(--text-secondary)] line-clamp-1 font-medium px-0.5 group-hover:text-white transition-colors">
                              {item.name}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/5 text-[11px] text-[var(--text-muted)] italic">
                    💡 {outfit.stylingTip}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Universal Garment Lightbox Modal */}
      <GarmentLightboxModal
        isOpen={lightboxData.isOpen}
        onClose={() => setLightboxData(prev => ({ ...prev, isOpen: false }))}
        items={lightboxData.items}
        initialIndex={lightboxData.initialIndex}
        outfitTitle={lightboxData.outfitTitle}
        defaultView={lightboxData.defaultView}
      />

    </div>
  );
}

