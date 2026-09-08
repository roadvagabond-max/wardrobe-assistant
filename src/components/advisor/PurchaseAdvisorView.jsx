import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Camera, Image, Link as LinkIcon, Sparkles, CheckCircle2, AlertTriangle, 
  Loader2, RefreshCw, Plus, Check, Clipboard, Feather, ShieldAlert, 
  Layers, Compass, CloudSun, Info
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { evaluateAndExtractPrePurchaseItem } from '../../services/gemini';
import { extractWebshopData } from '../../services/webshop';
import { optimizeImageForUpload, getSmartGarmentImage, ensureBase64Image } from '../../services/imageOptimizer';
import confetti from 'canvas-confetti';
import GarmentLightboxModal from '../common/GarmentLightboxModal';
import ModuleFirstTimeGuide from '../common/ModuleFirstTimeGuide';

function cleanSartorialText(text) {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/\bsartorial\s+szempontb[oó]l\b/gi, 'stílusszempontból')
    .replace(/\bsartorial\s+eleganci[aá][t]?\b/gi, 'klasszikus eleganciát')
    .replace(/\bsartorialis\b/gi, 'stílusos')
    .replace(/\bsartoriális\b/gi, 'stílusos')
    .replace(/\bsartorial\b/gi, 'stílusos')
    .replace(/\bSartorial\b/gi, 'Stílus');
}

export default function PurchaseAdvisorView({ weather, prefillData, onClearPrefill }) {
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
  const [showGuide, setShowGuide] = useState(false);

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
      setAnalysisError('Nem sikerült automatikusan kinyerni a képet a linkből. Kérlek másold be a fotót vágólapról (Clipboard) vagy fotózd le!');
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
      setAnalysisError(err.message || 'A link feldolgozása nem sikerült. Próbáld vágólapról vagy fotóval!');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRunEvaluation = async () => {
    if (!imagePreview && !webshopContext) return;

    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const result = await evaluateAndExtractPrePurchaseItem({
        imageBase64OrUrl: imagePreview,
        webshopContext: webshopContext || {},
        itemName,
        itemPrice,
        wardrobe,
        styleProfile: profile,
        targetSeason: 'auto',
        weather
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
            colors: ['#e2e8f0', '#10b981', '#d4af37']
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

  // Strip candidate-item ID so Firestore generates a unique timestamp-based ID
  const handleAddToWardrobe = () => {
    if (!evaluationResult?.extractedItem) return;
    const { id, ...itemToSave } = evaluationResult.extractedItem;
    addItem(itemToSave);
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

  // Score badge configuration matching the Mix & Match design system
  const scoreBadgeConfig = useMemo(() => {
    if (!evaluationResult) return null;
    const s = evaluationResult.compatibilityScore;
    if (s >= 80) {
      return {
        glowClass: 'score-glow-emerald border-emerald-500/50 bg-[#061810]/95 text-emerald-300',
        badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        icon: '✨',
        title: evaluationResult.verdict || 'Erősen Ajánlott'
      };
    }
    if (s >= 65) {
      return {
        glowClass: 'score-glow-amber border-amber-500/50 bg-[#1a1408]/95 text-amber-300',
        badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        icon: '🟡',
        title: evaluationResult.verdict || 'Érdemes Megfontolni'
      };
    }
    return {
      glowClass: 'score-glow-rose border-rose-500/50 bg-[#1a080c]/95 text-rose-300',
      badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      icon: '⚠️',
      title: evaluationResult.verdict || 'Gondold Át'
    };
  }, [evaluationResult]);

  return (
    <div className="space-y-3 pb-32 animate-fade-in">
      
      {/* ========================================================================= */}
      {/* 1. TOP HEADER BAR: EXACT 1-ROW MIX & MATCH HEADER DESIGN (STICKY TOP-0) */}
      {/* ========================================================================= */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-3 sm:px-4 py-2.5 rounded-2xl bg-[#090d15]/95 border border-slate-800 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-slate-200 text-slate-950 font-bold text-xs shadow-sm flex items-center gap-1.5">
            <span>🛍️</span>
            <span>Buy or Skip</span>
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          className={`p-2 rounded-xl border transition-colors cursor-pointer shrink-0 ${
            showGuide
              ? 'bg-slate-200 text-slate-900 border-white'
              : 'bg-[#0d121c] text-slate-400 hover:text-white border-slate-800'
          }`}
          title="Súgó / Információ"
          aria-label="Információ"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 2. REFINED MODULE FIRST TIME GUIDE (OPENED BY INFO BUTTON) */}
      {/* ========================================================================= */}
      {showGuide && (
        <ModuleFirstTimeGuide
          moduleId="buy_or_skip"
          title="Hogyan működik a Buy or Skip?"
          subtitle="Vásárlási döntéstámogató és ruhatár-összhang teszt"
          description="Mielőtt megvennél egy új ruhát a próbafülkében vagy egy webshopban, teszteld le, hogy mennyire illik a saját gardróbodba! A Wardrobe Assistant segít megelőzni a felesleges impulzusvásárlásokat és a melléfogásokat."
          points={[
            "1. Kombinálhatóság: Azonnal kapsz 3 komplett szettet a saját, már meglévő ruháidból összeállítva.",
            "2. Stilisztikai lefedettség: Figyelmeztet, ha már van hasonló stílusú vagy szerepkörű darabod a szekrényben.",
            "3. Szabás & Illeszkedés: Összeveti a ruha szabását a testalkatoddal és a meglévő darabjaid fazonjaival.",
            "4. Anyagminőség: Elemzi a szövetet, és őszintén jelzi, ha a darab nem jó minőségű anyagból készült."
          ]}
          forceOpen={true}
          onClose={() => setShowGuide(false)}
        />
      )}

      {/* Small Wardrobe Info note if wardrobe has few items */}
      {wardrobe.length < 3 && (
        <div className="p-3 rounded-2xl bg-[#0f1420]/70 border border-slate-800 flex items-center gap-2.5 text-xs text-slate-300">
          <Info className="w-4 h-4 text-sky-400 shrink-0" />
          <span>
            A ruhatáradban jelenleg <strong>{wardrobe.length} db</strong> ruha van. A 3 komplett szett építéséhez érdemes még néhány alapdarabot rögzíteni a Gardrób menüpontban!
          </span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. INPUT STAGE: 4-TAB SINGLE-ROW RESPONSIVE SELECTOR */}
      {/* ========================================================================= */}
      {!evaluationResult && (
        <div className="p-3 sm:p-4 rounded-3xl bg-[#0a0e17] border border-slate-800 space-y-3 shadow-2xl">
          
          {/* Source Tabs: Strictly 1 single row on all mobile and desktop screens! */}
          {!imagePreview && (
            <div className="grid grid-cols-4 gap-1 p-1 bg-[#090d15] rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('camera')}
                disabled={isAnalyzing}
                className={`flex items-center justify-center gap-1 sm:gap-1.5 px-1 sm:px-2.5 py-2 rounded-xl text-[10px] xs:text-[11px] sm:text-xs font-semibold min-w-0 transition-all cursor-pointer ${
                  activeTab === 'camera' ? 'bg-slate-200 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="truncate">Camera</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('clipboard')}
                disabled={isAnalyzing}
                className={`flex items-center justify-center gap-1 sm:gap-1.5 px-1 sm:px-2.5 py-2 rounded-xl text-[10px] xs:text-[11px] sm:text-xs font-semibold min-w-0 transition-all cursor-pointer ${
                  activeTab === 'clipboard' ? 'bg-slate-200 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Clipboard className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="truncate">Clipboard</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                disabled={isAnalyzing}
                className={`flex items-center justify-center gap-1 sm:gap-1.5 px-1 sm:px-2.5 py-2 rounded-xl text-[10px] xs:text-[11px] sm:text-xs font-semibold min-w-0 transition-all cursor-pointer ${
                  activeTab === 'upload' ? 'bg-slate-200 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Image className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="truncate">Picture</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('link')}
                disabled={isAnalyzing}
                className={`flex items-center justify-center gap-1 sm:gap-1.5 px-1 sm:px-2.5 py-2 rounded-xl text-[10px] xs:text-[11px] sm:text-xs font-semibold min-w-0 transition-all cursor-pointer ${
                  activeTab === 'link' ? 'bg-slate-200 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="truncate">Link</span>
              </button>
            </div>
          )}

          {/* Tab 1: Camera */}
          {activeTab === 'camera' && !imagePreview && (
            <div
              onClick={() => cameraInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-slate-500 rounded-2xl p-7 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2.5 bg-[#070a12] group"
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
              <div className="w-12 h-12 rounded-full bg-slate-800/90 group-hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-all">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-slate-100">Készíts fotót a próbafülkében</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Azonnali ruhatár-összevetés és szettelemzés</p>
              </div>
            </div>
          )}

          {/* Tab 2: Clipboard */}
          {activeTab === 'clipboard' && !imagePreview && (
            <div
              onClick={handleClipboardButtonClick}
              className="border-2 border-dashed border-slate-700 hover:border-slate-500 rounded-2xl p-7 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 bg-[#070a12] group"
            >
              <div className="w-12 h-12 rounded-full bg-slate-800/90 group-hover:bg-slate-700 flex items-center justify-center text-slate-300 group-hover:scale-105 transition-transform">
                <Clipboard className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-semibold text-slate-100">
                  Kattints ide a vágólap beillesztéséhez
                </p>
                <p className="text-[11px] text-slate-400">
                  Vagy nyomj <kbd className="px-1.5 py-0.5 rounded bg-black border border-slate-700 text-slate-200 font-mono text-[10px]">Ctrl + V</kbd>-t bárhol!
                </p>
              </div>
            </div>
          )}

          {/* Tab 3: Picture (File Upload) */}
          {activeTab === 'upload' && !imagePreview && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-slate-500 rounded-2xl p-7 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2.5 bg-[#070a12] group"
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
              <div className="w-12 h-12 rounded-full bg-slate-800/90 group-hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-all">
                <Image className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-slate-100">Válassz fotót a galériádból</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Elmentett termékfotó vagy képernyőkép</p>
              </div>
            </div>
          )}

          {/* Tab 4: Link (Clean, Minimalist, No Clutter) */}
          {activeTab === 'link' && !imagePreview && (
            <form onSubmit={handleLinkInput} className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  id="advisor-webshop-url-input"
                  name="advisorWebshopUrl"
                  aria-label="Webshop terméklink vagy cikkszám"
                  required
                  disabled={isAnalyzing}
                  placeholder="Webshop link (vagy Next termékkód)..."
                  value={webshopUrl}
                  onChange={(e) => {
                    setWebshopUrl(e.target.value);
                    if (analysisError) setAnalysisError(null);
                  }}
                  className="flex-1 bg-[#0a0e17] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-slate-400"
                />
                <button 
                  type="submit" 
                  disabled={isAnalyzing || !webshopUrl.trim()}
                  className="px-4 sm:px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-white text-slate-900 font-bold text-xs flex items-center gap-1.5 shrink-0 transition-all disabled:opacity-50 cursor-pointer shadow-md"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span className="hidden xs:inline">Kinyerés...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Betöltés</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Error Message if any */}
          {analysisError && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 animate-slide-up">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{analysisError}</span>
              </div>
              <button
                type="button"
                onClick={handleClipboardButtonClick}
                className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1.5 self-end sm:self-auto border border-slate-700 transition-colors"
              >
                <Clipboard className="w-3.5 h-3.5" />
                <span>Kép Beillesztése (Ctrl+V)</span>
              </button>
            </div>
          )}

          {/* Preview & Evaluation Launch */}
          {(imagePreview || webshopContext) && (
            <div className="space-y-3 animate-fade-in">
              
              {/* Photo Card with Floating Actions */}
              {imagePreview ? (
                <div className="relative aspect-[4/3] sm:aspect-[16/9] w-full rounded-2xl overflow-hidden bg-[#070a12] border border-slate-700 p-2 flex items-center justify-center shadow-lg">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    onError={() => setImagePreview(null)}
                    className="max-h-full max-w-full object-contain rounded-xl" 
                  />
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleClipboardButtonClick}
                      disabled={isAnalyzing}
                      className="p-2 rounded-full bg-black/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 backdrop-blur-sm transition-colors cursor-pointer"
                      title="Kép cseréje vágólapról (Ctrl+V)"
                    >
                      <Clipboard className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setImagePreview(null)}
                      disabled={isAnalyzing}
                      className="p-2 rounded-full bg-black/80 hover:bg-rose-600 text-slate-300 hover:text-white border border-slate-700 backdrop-blur-sm transition-colors cursor-pointer"
                      title="Kép törlése"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-[#070a12] border border-slate-700 text-center space-y-1.5">
                  <h4 className="font-serif font-bold text-slate-100 text-sm sm:text-base">
                    {itemName || webshopContext?.title || webshopContext?.productCode || 'Kiszemelt Termék'}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    {webshopContext?.brand ? `Márka: ${webshopContext.brand}` : ''} {webshopContext?.productCode ? `• Kód: ${webshopContext.productCode}` : ''}
                  </p>
                  <button
                    type="button"
                    onClick={handleClipboardButtonClick}
                    disabled={isAnalyzing}
                    className="mt-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
                  >
                    <Clipboard className="w-3.5 h-3.5" />
                    <span>Fotó Beillesztése Vágólapról</span>
                  </button>
                </div>
              )}

              {/* Optional Name & Price inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <input
                    type="text"
                    id="advisor-item-name-input"
                    name="advisorItemName"
                    aria-label="Megnevezés"
                    disabled={isAnalyzing}
                    placeholder="Megnevezés (opcionális, pl. Lenkeverék Zakó)..."
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    className="w-full bg-[#0a0e17] border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <input
                    type="text"
                    id="advisor-item-price-input"
                    name="advisorItemPrice"
                    aria-label="Ár"
                    disabled={isAnalyzing}
                    placeholder="Ár (opcionális, pl. 38 000 Ft)..."
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                    className="w-full bg-[#0a0e17] border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              {/* Primary Evaluation Trigger Button */}
              <button
                type="button"
                onClick={handleRunEvaluation}
                disabled={isAnalyzing}
                className="w-full py-3.5 px-5 rounded-2xl bg-slate-200 hover:bg-white text-slate-900 font-serif font-bold text-xs sm:text-sm shadow-2xl transition-all flex items-center justify-center gap-2 score-glow-titanium disabled:opacity-50 cursor-pointer"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-900" />
                    <span>Az AI elemzi a 4 Döntési Pillért és szetteket épít...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-slate-900" />
                    <span>Buy or Skip — Elemzés és Szett-ötletek Indítása</span>
                  </>
                )}
              </button>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. ANTI-HALLUCINATION WARNING STATE: Unknown Product */}
      {/* ========================================================================= */}
      {evaluationResult && evaluationResult.isUnknown && (
        <div className="p-5 sm:p-6 rounded-3xl bg-[#0a0e17] border border-amber-500/40 space-y-3 shadow-2xl animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-amber-400 font-semibold">Anti-Hallucináció Védelem</span>
              <h3 className="text-base font-serif font-bold text-slate-100">Nem azonosítható ruhadarab</h3>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            {evaluationResult.unknownReason || 'A megadott fotó vagy link alapján nem sikerült egyértelműen beazonosítani egy valós ruházati cikket.'} A Wardrobe Assistant a valós adatok elvét követi: szigorúan nem talál ki fantomruhákat.
          </p>

          <div className="pt-1">
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-white text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Újrapróbálás egyértelmű fotóval vagy névvel</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. RESULT PRESENTATION: MIX & MATCH HERO SCORE BAR + DETAILS */}
      {/* ========================================================================= */}
      {evaluationResult && !evaluationResult.isUnknown && scoreBadgeConfig && (
        <div className="space-y-4 animate-slide-up">
          
          {/* Main Hero Card */}
          <div className="p-4 sm:p-6 rounded-3xl bg-[#0a0e17] border border-slate-800 space-y-4 shadow-2xl">
            
            {/* Top Row: Score + Verdict + Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex flex-col items-center justify-center font-bold font-serif shadow-2xl shrink-0 border ${scoreBadgeConfig.glowClass}`}>
                  <span className="text-xl sm:text-2xl leading-none">{evaluationResult.compatibilityScore}%</span>
                  <span className="text-[8px] uppercase font-mono tracking-wider opacity-80 mt-1">Pont</span>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-semibold">Döntési Javaslat:</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${scoreBadgeConfig.badgeClass}`}>
                      {scoreBadgeConfig.title}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-serif font-bold text-slate-100 truncate mt-0.5">
                    {evaluationResult.item?.name || itemName || 'Ruhatár-Kompatibilitási Eredmény'}
                  </h3>
                  <span className="text-[11px] text-slate-400 block truncate">
                    {evaluationResult.item?.brand ? `${evaluationResult.item.brand} • ` : ''}
                    {evaluationResult.item?.material ? `${evaluationResult.item.material} • ` : ''}
                    {evaluationResult.item?.fit ? evaluationResult.item.fit : ''}
                  </span>
                </div>
              </div>

              {/* Actions Right */}
              <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Új teszt</span>
                </button>

                {addedToWardrobe ? (
                  <span className="px-3.5 py-2 rounded-xl bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Hozzáadva</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleAddToWardrobe}
                    className="px-3.5 py-2 rounded-xl bg-slate-200 hover:bg-white text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Hozzáadás</span>
                  </button>
                )}
              </div>
            </div>

            {/* Verdict Summary Text */}
            <p className="text-xs text-slate-300 leading-relaxed">
              {cleanSartorialText(evaluationResult.verdictSummary)}
            </p>

            {/* 3 Pillars Overview Tiles */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1">
              <div className="p-3 rounded-2xl bg-[#070a12] border border-slate-800 space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
                  1. Kombinálhatóság
                </span>
                <p className="text-xs text-slate-200 font-medium">
                  3 garantált outfit a meglévő darabjaiddal.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-[#070a12] border border-slate-800 space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 block font-mono">
                  2. Változatosság & Csere
                </span>
                <p className="text-xs text-slate-300">
                  {cleanSartorialText(evaluationResult.duplicationWarning || 'Új kombinációkat hoz a ruhatáradba.')}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-[#070a12] border border-slate-800 space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block font-mono">
                  3. Személyes Illeszkedés
                </span>
                <p className="text-xs text-slate-300">
                  {cleanSartorialText(evaluationResult.personalFitVerdict || 'Harmonizál a stílus DNS-eddel és színeiddel.')}
                </p>
              </div>
            </div>

            {/* Structured Analysis Cards */}
            <div className="space-y-2 pt-1 text-xs">

              {/* 1. Stilisztikai Lefedettség & Redundancia Overlap */}
              {evaluationResult.aestheticOverlap && (
                <div className={`p-3.5 rounded-2xl border space-y-1.5 ${
                  evaluationResult.aestheticOverlap.isRedundant
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                    : 'bg-[#070a12] border-slate-800 text-slate-300'
                }`}>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 font-bold text-slate-200">
                      <Compass className="w-4 h-4 text-slate-300" />
                      <span>Stilisztikai Lefedettség & Kapszula Skála:</span>
                    </div>
                    {evaluationResult.aestheticOverlap.isRedundant ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        ⚠️ Lefedett Stílusszerepkör
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        ✨ Új Stílusdimenzió
                      </span>
                    )}
                  </div>

                  <p className="leading-relaxed text-slate-300">
                    {cleanSartorialText(evaluationResult.aestheticOverlap.reason || 
                      (evaluationResult.aestheticOverlap.isRedundant
                        ? `A ruhatáradban lévő '${evaluationResult.aestheticOverlap.existingItemName}' már lefedi ezt a szerepkört.`
                        : 'Ez a darab valóban új kombinációkat nyit meg a ruhatáradban.'))}
                  </p>

                  {evaluationResult.aestheticOverlap.alternativeRecommendation && (
                    <div className="pt-1.5 border-t border-white/10 text-[11px] text-slate-200 flex items-start gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-white">Mit érdemes venni helyette?</strong> {cleanSartorialText(evaluationResult.aestheticOverlap.alternativeRecommendation)}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 2. Anyagminőség & Szövet Elemzés */}
              {evaluationResult.fabricWarning && (
                <div className={`p-3.5 rounded-2xl border space-y-1.5 ${
                  evaluationResult.isSynthetic || (evaluationResult.fabricScore && evaluationResult.fabricScore < 7)
                    ? 'bg-[#150e0a] border-amber-500/30 text-amber-200'
                    : 'bg-[#070a12] border-emerald-500/30 text-emerald-200'
                }`}>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className={`flex items-center gap-1.5 font-bold ${
                      evaluationResult.isSynthetic || (evaluationResult.fabricScore && evaluationResult.fabricScore < 7)
                        ? 'text-amber-300'
                        : 'text-emerald-300'
                    }`}>
                      {evaluationResult.isSynthetic || (evaluationResult.fabricScore && evaluationResult.fabricScore < 7) ? (
                        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                      ) : (
                        <Feather className="w-4 h-4 text-emerald-400 shrink-0" />
                      )}
                      <span>Anyagösszetétel & Szövetminőség:</span>
                    </div>

                    {evaluationResult.item?.material && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${
                        evaluationResult.isSynthetic || (evaluationResult.fabricScore && evaluationResult.fabricScore < 7)
                          ? 'bg-amber-500/20 border-amber-500/30 text-amber-300'
                          : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                      }`}>
                        {evaluationResult.item.material}
                      </span>
                    )}
                  </div>

                  <p className="leading-relaxed text-slate-300">
                    {cleanSartorialText(evaluationResult.fabricWarning)}
                  </p>
                </div>
              )}

              {/* 3. Szabás & Testalkat Illeszkedés */}
              {evaluationResult.fitMismatchWarning && (
                <div className="p-3.5 rounded-2xl bg-[#070a12] border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-slate-200">
                    <Layers className="w-4 h-4 text-slate-300" />
                    <span>⚖️ Szabás & Testalkat Illeszkedés (Fit Intelligence):</span>
                  </div>
                  <p className="leading-relaxed text-slate-300">
                    {cleanSartorialText(evaluationResult.fitMismatchWarning)}
                  </p>
                  {evaluationResult.sizingAdvice && (
                    <div className="pt-1.5 border-t border-slate-800 text-[11px] text-slate-200 font-medium flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span><strong>Méretválasztási javaslat:</strong> {cleanSartorialText(evaluationResult.sizingAdvice)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* 4. Szezonális Dinamika */}
              {evaluationResult.targetSeason && (
                <div className="p-3.5 rounded-2xl bg-[#070a12] border border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-200">
                    <CloudSun className="w-4 h-4 text-slate-300" />
                    <span>Szezonális Hordhatóság:</span>
                  </div>
                  <p className="leading-relaxed text-slate-400">
                    ✨ Automatikusan felismert jelleg: <strong>{evaluationResult.targetSeason}</strong>. Az összeállítások ennek megfelelő rétegezéssel készültek a ruhatáradból.
                  </p>
                </div>
              )}

              {/* 5. Pros & Cons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                  <h4 className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Miért éri meg megvenni:</span>
                  </h4>
                  <ul className="space-y-1 text-xs text-emerald-200/90 list-disc list-inside">
                    {evaluationResult.pros?.map((pro, idx) => (
                      <li key={idx}>{cleanSartorialText(pro)}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1">
                  <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>Gondold át:</span>
                  </h4>
                  <ul className="space-y-1 text-xs text-amber-200/90 list-disc list-inside">
                    {evaluationResult.cons?.map((con, idx) => (
                      <li key={idx}>{cleanSartorialText(con)}</li>
                    ))}
                  </ul>
                </div>
              </div>

            </div>

          </div>

          {/* ========================================================================= */}
          {/* 6. 3 GUARANTEED OUTFITS FLAT-LAY CANVASES (MIX & MATCH LOOKBOOK STYLE) */}
          {/* ========================================================================= */}
          <div className="space-y-3 pt-1">
            <div>
              <h3 className="text-base sm:text-lg font-serif font-bold text-slate-100">
                ✨ A 3 Garantált Outfit a Ruhatáradból
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Így kombinálhatod azonnal a szekrényedben lévő minőségi darabjaiddal:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {evaluationResult.outfits?.map((outfit, idx) => (
                <div 
                  key={idx} 
                  className="p-3.5 sm:p-4 rounded-3xl bg-[#0a0e17] border border-slate-800 shadow-2xl flex flex-col justify-between space-y-2.5"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 border border-slate-700 text-slate-300">
                        {outfit.styleType || 'Klasszikus'}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium truncate">
                        {outfit.occasion}
                      </span>
                    </div>

                    <h4 className="font-serif font-bold text-slate-100 text-sm sm:text-base">
                      {outfit.title}
                    </h4>

                    {/* Visual Flat-lay Garment Grid */}
                    <div className="grid grid-cols-2 gap-2 p-2 rounded-2xl bg-[#070a12] border border-slate-800">
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
                            <div className={`relative aspect-[4/3] rounded-xl overflow-hidden bg-[#0a0e17] p-1 flex items-center justify-center border transition-all ${
                              isCandidateItem
                                ? 'border-amber-400/80 ring-1 ring-amber-400/40 shadow-lg shadow-amber-400/10'
                                : 'border-slate-800 group-hover:border-slate-600'
                            }`}>
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                loading="lazy"
                                decoding="async"
                                className="w-full h-full object-contain p-1 rounded-lg group-hover:scale-105 transition-transform duration-300"
                              />
                              {isCandidateItem && (
                                <span className="absolute top-1 right-1 bg-amber-400 text-black text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                                  ÚJ
                                </span>
                              )}
                              <span className="absolute bottom-1 left-1 text-[8px] bg-black/80 backdrop-blur-sm px-1.5 py-0.5 rounded text-slate-200 font-medium border border-white/10">
                                {item.subCategory === 'belt' || item.name?.toLowerCase().includes('öv') 
                                  ? '🎗️ Öv' 
                                  : item.category === 'tops' 
                                    ? '👔 Bázis' 
                                    : item.category === 'knitwear' 
                                      ? '🧶 Köztes' 
                                      : (item.subCategory === 'overcoat' || item.subCategory === 'coat' || item.name?.toLowerCase().includes('kabát')) 
                                        ? '🧥 Kabát' 
                                        : item.category === 'outerwear' 
                                          ? '🧥 Zakó' 
                                          : item.category === 'bottoms' 
                                            ? '👖 Alsó' 
                                            : item.category === 'shoes' 
                                              ? '👞 Cipő' 
                                              : '✦ Kieg'}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 line-clamp-1 font-medium px-0.5 group-hover:text-slate-200 transition-colors">
                              {item.name}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {outfit.stylingTip && (
                    <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 italic">
                      💡 {cleanSartorialText(outfit.stylingTip)}
                    </div>
                  )}
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
