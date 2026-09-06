import React, { useState, useRef } from 'react';
import { 
  Camera, Upload, Clipboard, Globe, Sparkles, Loader2, Check, ArrowRight, ArrowLeft, AlertCircle, Shirt 
} from 'lucide-react';
import { analyzeClothingImage } from '../../../services/gemini';
import { ensureBase64Image } from '../../../services/imageOptimizer';
import { parseWebshopUrlOrCode, findFirstWorkingImageUrl } from '../../../services/webshop';

export default function StepAddFirstItem({ formData, onAddItem, onNext, onBack, onSkip }) {
  const [activeInputType, setActiveInputType] = useState('photo'); // 'photo' | 'link'
  const [webshopInput, setWebshopInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStatus, setProcessStatus] = useState('');
  const [error, setError] = useState('');
  const [addedItem, setAddedItem] = useState(null);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // 1. Process Image from File or Camera
  const handleImageSelected = async (file) => {
    if (!file) return;
    setError('');
    setIsProcessing(true);
    setProcessStatus('Kép tömörítése és AI elemzés indítása...');

    try {
      const base64 = await ensureBase64Image(file, 640, 640, 0.75);
      setProcessStatus('A Gemini Vision elemzi a darab kategóriáját, színét és anyagát...');
      
      const aiResult = await analyzeClothingImage(base64, {}, formData);
      const garmentData = (aiResult && aiResult.item) ? aiResult.item : aiResult;
      
      if (garmentData && (garmentData.name || garmentData.category)) {
        const itemToSave = {
          ...garmentData,
          id: `item-${Date.now()}`,
          imageUrl: base64,
          createdAt: new Date().toISOString()
        };
        const saved = await onAddItem(itemToSave);
        setAddedItem(saved || itemToSave);
      } else {
        throw new Error('Nem sikerült azonosítani a ruhadarabot. Kérlek próbáld újra egy élesebb fotóval!');
      }
    } catch (err) {
      console.error('Ruhafelvitel hiba:', err);
      setError(err.message || 'Hiba történt a ruha feldolgozásakor.');
    } finally {
      setIsProcessing(false);
      setProcessStatus('');
    }
  };

  // 2. Process Webshop Link or SKU Code
  const handleWebshopSubmit = async (e) => {
    e?.preventDefault();
    if (!webshopInput.trim()) {
      setError('Kérlek illessz be egy webshop linket vagy cikkszámot!');
      return;
    }

    setError('');
    setIsProcessing(true);
    setProcessStatus('Webshop és termékkód feloldása...');

    try {
      const parsed = parseWebshopUrlOrCode(webshopInput.trim());
      setProcessStatus('Termékfotó ellenőrzése a CDN szervereken...');
      
      let imageUrl = '';
      if (parsed.possibleImageUrls && parsed.possibleImageUrls.length > 0) {
        imageUrl = await findFirstWorkingImageUrl(parsed.possibleImageUrls);
      }

      setProcessStatus('AI szabás- és anyagelemzés futtatása...');
      const aiResult = await analyzeClothingImage(imageUrl || null, parsed, formData);
      const garmentData = (aiResult && aiResult.item) ? aiResult.item : aiResult;

      if (garmentData && (garmentData.name || garmentData.category)) {
        const itemToSave = {
          ...garmentData,
          id: `item-${Date.now()}`,
          imageUrl: imageUrl || garmentData.imageUrl || '',
          productUrl: parsed.url || '',
          productCode: parsed.productCode || '',
          brand: parsed.brand || garmentData.brand || '',
          createdAt: new Date().toISOString()
        };
        const saved = await onAddItem(itemToSave);
        setAddedItem(saved || itemToSave);
      } else {
        throw new Error('Nem sikerült azonosítani a terméket.');
      }
    } catch (err) {
      console.error('Webshop feldolgozási hiba:', err);
      setError(err.message || 'Nem sikerült azonosítani a megadott terméket.');
    } finally {
      setIsProcessing(false);
      setProcessStatus('');
    }
  };

  // 3. Process Clipboard (Ctrl+V or Paste Button)
  const handlePasteFromClipboard = async () => {
    try {
      const items = await navigator.clipboard?.read();
      if (!items) {
        setError('A böngésző nem engedélyezte a vágólap elérését. Használd a Ctrl+V billentyűkombinációt!');
        return;
      }
      for (const item of items) {
        const imageType = item.types.find(t => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          await handleImageSelected(blob);
          return;
        }
      }
      // Check text
      const text = await navigator.clipboard.readText();
      if (text && (text.startsWith('http') || text.length < 50)) {
        setWebshopInput(text);
        setActiveInputType('link');
      }
    } catch (_) {
      setError('Nyomj Ctrl+V-t a másolt kép beillesztéséhez!');
    }
  };

  return (
    <div className="space-y-5 animate-slide-up">
      
      {/* Intro text */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="badge badge-gold text-[10px] uppercase tracking-wider font-bold">
            4. Lépés • Első Ruhadarab
          </span>
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-[var(--text-muted)] hover:text-amber-300 transition-colors underline cursor-pointer"
          >
            Kihagyás ⏭️
          </button>
        </div>
        <h3 className="text-xl sm:text-2xl font-serif font-bold text-white">
          Töltsd fel az első kedvenc darabodat!
        </h3>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          Készíts egy fotót, tölts fel egy képet, vagy illeszd be egy webshop linkjét (pl. Zara, Mango, Massimo Dutti, Next Direct).
        </p>
      </div>

      {/* Hidden file inputs */}
      <input 
        type="file" 
        id="onboarding-clothing-camera"
        accept="image/*" 
        capture="environment" 
        ref={cameraInputRef} 
        onChange={(e) => handleImageSelected(e.target.files?.[0])} 
        className="hidden" 
      />
      <input 
        type="file" 
        id="onboarding-clothing-file"
        accept="image/*" 
        ref={fileInputRef} 
        onChange={(e) => handleImageSelected(e.target.files?.[0])} 
        className="hidden" 
      />

      {/* SUCCESS STATE */}
      {addedItem ? (
        <div className="glass-card p-5 border-emerald-500/50 bg-emerald-950/20 rounded-2xl space-y-4 animate-slide-up">
          <div className="flex items-center gap-3.5">
            <div className="w-16 h-16 rounded-xl bg-black/50 border border-emerald-500/40 overflow-hidden shrink-0 flex items-center justify-center">
              {addedItem.imageUrl ? (
                <img src={addedItem.imageUrl} alt={addedItem.name} className="w-full h-full object-contain" />
              ) : (
                <Shirt className="w-8 h-8 text-emerald-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                <Check className="w-3.5 h-3.5" />
                Sikeresen hozzáadva a ruhatárhoz!
              </span>
              <h4 className="text-sm sm:text-base font-bold text-white truncate font-serif mt-0.5">
                {addedItem.name}
              </h4>
              <p className="text-xs text-[var(--text-secondary)]">
                {addedItem.color} • {addedItem.material || addedItem.category}
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-xs text-[var(--text-secondary)] leading-relaxed">
            ✨ Az első ruhád bekerült a digitális ruhatáradba! További darabokat a Gardrób fülön tudsz majd bármikor felvinni.
          </div>
        </div>
      ) : (
        /* INPUT OPTIONS */
        <div className="space-y-4">
          
          {/* Method selector tabs */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-black/40 border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => setActiveInputType('photo')}
              className={`py-2 px-3 rounded-lg font-medium transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                activeInputType === 'photo'
                  ? 'bg-[var(--accent-gold)] text-black font-semibold shadow-md'
                  : 'text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Fotó vagy Kép</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveInputType('link')}
              className={`py-2 px-3 rounded-lg font-medium transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                activeInputType === 'link'
                  ? 'bg-[var(--accent-gold)] text-black font-semibold shadow-md'
                  : 'text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Webshop Link / SKU</span>
            </button>
          </div>

          {/* Photo upload view */}
          {activeInputType === 'photo' && (
            <div className="p-5 rounded-2xl bg-black/30 border border-white/10 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={isProcessing}
                  className="p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[var(--border-gold)] text-center transition-all flex flex-col items-center justify-center gap-2 cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Camera className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-xs text-white">Fotó Készítése</span>
                  <span className="text-[10px] text-[var(--text-muted)]">Kamerával közvetlenül</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[var(--border-gold)] text-center transition-all flex flex-col items-center justify-center gap-2 cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-xs text-white">Feltöltés Galériából</span>
                  <span className="text-[10px] text-[var(--text-muted)]">JPEG, PNG vagy WebP</span>
                </button>
              </div>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  className="inline-flex items-center gap-1.5 text-xs text-[var(--accent-gold)] hover:underline cursor-pointer"
                >
                  <Clipboard className="w-3.5 h-3.5" />
                  <span>Kép beillesztése vágólapról (Ctrl+V)</span>
                </button>
              </div>
            </div>
          )}

          {/* Webshop link view */}
          {activeInputType === 'link' && (
            <form onSubmit={handleWebshopSubmit} className="p-5 rounded-2xl bg-black/30 border border-white/10 space-y-3.5">
              <label htmlFor="onboarding-webshop-input" className="block text-xs font-semibold text-white">
                Webshop terméklink vagy termékkód (SKU):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="onboarding-webshop-input"
                  value={webshopInput}
                  onChange={(e) => setWebshopInput(e.target.value)}
                  placeholder="pl. https://www.zara.com/... vagy AA6536"
                  disabled={isProcessing}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white placeholder-white/30 text-xs focus:outline-none focus:border-[var(--accent-gold)] transition-colors"
                />
                <button
                  type="submit"
                  disabled={isProcessing || !webshopInput.trim()}
                  className="btn-gold py-2.5 px-4 text-xs font-semibold shrink-0 cursor-pointer flex items-center gap-1.5"
                >
                  <span>Feldolgozás</span>
                </button>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                Támogatott: Next Direct, Zara, Mango, Massimo Dutti, Reserved, H&M és ASOS.
              </p>
            </form>
          )}

          {/* Loader status */}
          {isProcessing && (
            <div className="p-4 rounded-xl bg-black/60 border border-[var(--border-gold)] text-center text-xs text-amber-200 flex items-center justify-center gap-2.5 animate-pulse">
              <Loader2 className="w-4 h-4 text-[var(--accent-gold)] animate-spin" />
              <span>{processStatus || 'AI feldolgozás folyamatban...'}</span>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

        </div>
      )}

      {/* Action Footer */}
      <div className="pt-2 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="btn-secondary py-2.5 px-4 text-xs flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Vissza</span>
        </button>

        <div className="flex items-center gap-2">
          {!addedItem && (
            <button
              type="button"
              onClick={onSkip}
              className="btn-secondary py-2.5 px-4 text-xs text-[var(--text-muted)] hover:text-white cursor-pointer"
            >
              Kihagyás, irány a gardrób ⏭️
            </button>
          )}

          <button
            type="button"
            onClick={onNext}
            className="btn-gold py-2.5 px-5 text-xs font-semibold shadow-md flex items-center gap-2 cursor-pointer"
          >
            <span>{addedItem ? 'Tovább a Befejezéshez' : 'Tovább'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
}
