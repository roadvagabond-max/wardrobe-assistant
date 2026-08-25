import React, { useState, useRef } from 'react';
import { Camera, Upload, Link as LinkIcon, Sparkles, CheckCircle2, AlertTriangle, XCircle, ShoppingBag, ArrowRight, Loader2, RefreshCw, Plus, Check, Heart, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { analyzeClothingImage, evaluatePrePurchaseItem } from '../../services/gemini';
import { extractWebshopData } from '../../services/webshop';
import { optimizeImageForUpload } from '../../services/imageOptimizer';
import confetti from 'canvas-confetti';

export default function PurchaseAdvisorView() {
  const { wardrobe, profile, addItem } = useAuth();

  const [activeTab, setActiveTab] = useState('camera'); // 'camera', 'upload', 'link'
  const [imagePreview, setImagePreview] = useState(null);
  const [webshopUrl, setWebshopUrl] = useState('');
  const [webshopContext, setWebshopContext] = useState(null);
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [addedToWardrobe, setAddedToWardrobe] = useState(false);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

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
      // 1. Image & Text attribute extraction
      const newItemAttributes = await analyzeClothingImage(imagePreview, webshopContext || {}, profile);
      if (itemName) newItemAttributes.name = itemName;

      // 2. 3-Outfit Rule & 3 Decision Pillars Test
      const result = await evaluatePrePurchaseItem({
        newItem: { ...newItemAttributes, imageUrl: imagePreview, price: itemPrice },
        wardrobe,
        styleProfile: profile
      });

      setEvaluationResult({
        ...result,
        extractedItem: { ...newItemAttributes, imageUrl: imagePreview }
      });

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
    setAnalysisError(null);
    setAddedToWardrobe(false);
  };

  return (
    <div className="space-y-6 animate-slide-up">
      
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="badge badge-gold">Vásárlási Döntéstámogató</span>
          <span className="badge badge-emerald">3 Döntési Pillér</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold font-serif gold-gradient-text mt-1">
          Megvegyem ezt a ruhadarabot?
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Fotózd le a próbafülkében vagy másold be a webshop linket. Az AI ellenőrzi a <strong>Kombinálhatóságot</strong>, a <strong>Változatosságot</strong> és a <strong>Személyes Illeszkedést</strong>!
        </p>
      </div>

      {/* Input Stage */}
      {!evaluationResult && (
        <div className="glass-card p-5 sm:p-6 space-y-5">
          
          {/* Source Tabs */}
          {!imagePreview && (
            <div className="grid grid-cols-3 gap-2 p-1 bg-black/40 rounded-xl border border-white/5">
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
                onClick={() => setActiveTab('upload')}
                className={`py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'upload' ? 'bg-[var(--accent-gold)] text-black font-semibold shadow' : 'text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>Kép Feltöltése</span>
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

          {/* Tab 2: Upload */}
          {activeTab === 'upload' && !imagePreview && (
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
                <p className="text-xs text-[var(--text-secondary)] mt-1">Elmentett fotó vagy képernyőkép</p>
              </div>
            </div>
          )}

          {/* Tab 3: Link */}
          {activeTab === 'link' && !imagePreview && (
            <form onSubmit={handleLinkInput} className="space-y-3">
              <label className="block text-xs font-medium text-[var(--text-secondary)]">
                Webshop termék oldalának linkje vagy közvetlen képcím:
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  required
                  placeholder="https://www.nextdirect.com/... vagy zara.com / reserved.com"
                  value={webshopUrl}
                  onChange={(e) => {
                    setWebshopUrl(e.target.value);
                    if (analysisError) setAnalysisError(null);
                  }}
                  className="custom-input"
                />
                <button 
                  type="submit" 
                  disabled={isAnalyzing}
                  className="btn-gold whitespace-nowrap flex items-center gap-1.5"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Betöltés...</span>
                    </>
                  ) : (
                    <span>Betöltés</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Error Message if any */}
          {analysisError && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>{analysisError}</span>
            </div>
          )}

          {/* Preview & Evaluation trigger */}
          {imagePreview && (
            <div className="space-y-4">
              <div className="relative aspect-[4/3] sm:aspect-[16/9] w-full rounded-2xl overflow-hidden bg-[#07090e] border border-white/10 p-2 flex items-center justify-center">
                <img src={imagePreview} alt="Preview" className="max-h-full max-w-full object-contain rounded-xl shadow-lg" />
                <button
                  type="button"
                  onClick={() => setImagePreview(null)}
                  className="absolute top-3 right-3 p-2 rounded-full bg-black/80 text-white hover:bg-black border border-white/10"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Megnevezés (opcionális):
                  </label>
                  <input
                    type="text"
                    placeholder="pl. Zöld Slim Fit Lenkeverék Zakó"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    className="custom-input text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Ár (opcionális):
                  </label>
                  <input
                    type="text"
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
                        const isCandidateItem = iIdx === 0;

                        return (
                          <div key={iIdx} className="space-y-1 group relative">
                            <div className={`aspect-[4/3] rounded-lg overflow-hidden bg-[#07090e] p-1 flex items-center justify-center border transition-all ${
                              isCandidateItem
                                ? 'border-[var(--accent-gold)] ring-1 ring-[var(--accent-gold-glow)]'
                                : 'border-white/10 group-hover:border-white/30'
                            }`}>
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="max-h-full max-w-full object-contain rounded"
                              />
                              {isCandidateItem && (
                                <span className="absolute top-1 left-1 bg-[var(--accent-gold)] text-black text-[9px] font-bold px-1 py-0.5 rounded shadow">
                                  ÚJ
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-[var(--text-secondary)] line-clamp-1 font-medium px-0.5">
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

    </div>
  );
}
