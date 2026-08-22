import React, { useState, useRef } from 'react';
import { Camera, Upload, Link as LinkIcon, Sparkles, CheckCircle2, AlertTriangle, XCircle, ShoppingBag, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { analyzeClothingImage, evaluatePrePurchaseItem } from '../../services/gemini';
import { extractWebshopData } from '../../services/webshop';
import confetti from 'canvas-confetti';

export default function PurchaseAdvisorView() {
  const { wardrobe, profile } = useAuth();

  const [activeTab, setActiveTab] = useState('camera'); // 'camera', 'upload', 'link'
  const [imagePreview, setImagePreview] = useState(null);
  const [webshopUrl, setWebshopUrl] = useState('');
  const [webshopContext, setWebshopContext] = useState(null);
  const [itemName, setItemName] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState(null);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
      setWebshopContext(null);
      setEvaluationResult(null);
    };
    reader.readAsDataURL(file);
  };

  const handleLinkInput = async (e) => {
    e.preventDefault();
    if (!webshopUrl.trim()) return;

    setIsAnalyzing(true);
    try {
      const data = await extractWebshopData(webshopUrl.trim());
      setImagePreview(data.imageUrl);
      setWebshopContext(data);
      if (data.title && !itemName) {
        setItemName(data.title);
      }
      setEvaluationResult(null);
    } catch (err) {
      console.error('Webshop link hiba:', err);
      setImagePreview(webshopUrl.trim());
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRunEvaluation = async () => {
    if (!imagePreview && !webshopContext) return;

    setIsAnalyzing(true);
    try {
      // 1. Képelemzés & Szöveges elemzés (tulajdonságok kinyerése)
      const newItemAttributes = await analyzeClothingImage(imagePreview, webshopContext || {});
      if (itemName) newItemAttributes.name = itemName;

      // 2. 3-Outfit Szabály & Ruhatár Kompatibilitás Teszt
      const result = await evaluatePrePurchaseItem({
        newItem: { ...newItemAttributes, imageUrl: imagePreview },
        wardrobe,
        styleProfile: profile
      });

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
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setImagePreview(null);
    setEvaluationResult(null);
    setItemName('');
    setWebshopUrl('');
  };

  return (
    <div className="space-y-6 animate-slide-up">
      
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="badge badge-gold">Vásárlási Döntéstámogató</span>
          <span className="badge badge-emerald">3-Outfit Szabály</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold font-serif gold-gradient-text mt-1">
          Megvegyem ezt a ruhadarabot?
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Fotózd le a próbafülkében vagy másold be a webshop linket. Az AI azonnal ellenőrzi, hogy kijön-e belőle <strong>legalább 3 komplett szett</strong> a meglévő ruháiddal!
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
                <span>Terméklink</span>
              </button>
            </div>
          )}

          {/* Action Boxes */}
          {!imagePreview ? (
            <div className="space-y-4">
              
              {activeTab === 'camera' && (
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
                  <div className="w-16 h-16 rounded-full bg-[var(--accent-gold-glow)] text-[var(--accent-gold)] flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <Camera className="w-8 h-8" />
                  </div>
                  <h4 className="font-semibold text-white text-base">Fotózd le a ruhát a boltban vagy próbafülkében</h4>
                  <p className="text-xs text-[var(--text-muted)] mt-1 max-w-sm mx-auto">
                    A kamera automatikusan megnyílik. Készíts egy tiszta fotót a kiszemelt zakóról, ingről vagy cipőről!
                  </p>
                </div>
              )}

              {activeTab === 'upload' && (
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
                  <div className="w-16 h-16 rounded-full bg-white/5 text-[var(--text-secondary)] flex items-center justify-center mx-auto mb-3 group-hover:scale-110 group-hover:text-[var(--accent-gold)] transition-all">
                    <Upload className="w-8 h-8" />
                  </div>
                  <h4 className="font-semibold text-white text-base">Kép feltöltése a telefonodról / gépedről</h4>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Válassz ki egy lementett ruhafotót a galériádból!
                  </p>
                </div>
              )}

              {activeTab === 'link' && (
                <form onSubmit={handleLinkInput} className="space-y-3">
                  <label className="block text-xs font-medium text-[var(--text-secondary)]">
                    Webshop termék oldalának linkje:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      required
                      placeholder="https://www.mrporter.com/en-hu/mens/product/..."
                      value={webshopUrl}
                      onChange={(e) => setWebshopUrl(e.target.value)}
                      className="custom-input"
                    />
                    <button type="submit" className="btn-gold whitespace-nowrap">
                      Betöltés
                    </button>
                  </div>
                </form>
              )}

            </div>
          ) : (
            /* Image Preview & Run Analysis */
            <div className="space-y-4">
              <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-black/60 border border-[var(--border-gold)]">
                <img src={imagePreview} alt="Candidate Garment" className="w-full h-full object-cover" />
                <button
                  onClick={handleReset}
                  className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-black/80 text-white text-xs font-medium hover:bg-black"
                >
                  Másik kép
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Opcionális megnevezés / ár:
                </label>
                <input
                  type="text"
                  placeholder="pl. Massimo Dutti Tevebarna Gyapjú Kabát (65.000 Ft)"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="custom-input text-sm"
                />
              </div>

              <button
                onClick={handleRunEvaluation}
                disabled={isAnalyzing}
                className="btn-gold w-full py-3.5 text-base shadow-xl"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>AI elemzi a ruhatáradat és generálja a 3 szettet...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>3-Outfit Döntéstámogató Teszt Futtatása</span>
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

              <button
                onClick={handleReset}
                className="btn-secondary text-xs self-start sm:self-center"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Új ruha tesztelése</span>
              </button>
            </div>

            {/* Verdict summary */}
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              {evaluationResult.verdictSummary}
            </p>

            {/* Duplication Alert if exists */}
            {evaluationResult.duplicationWarning && (
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{evaluationResult.duplicationWarning}</span>
              </div>
            )}

            {/* Pros & Cons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
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

          {/* The 3 Outfits Generated from Existing Closet */}
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-serif font-bold gold-gradient-text">
                ✨ A 3 Garantált Outfit a Meglévő Ruhatáradból
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Így kombinálhatod azonnal a szekrényedben lévő darabjaiddal:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {evaluationResult.outfits?.map((outfit, idx) => (
                <div key={idx} className="glass-card p-4 space-y-3 flex flex-col justify-between border-white/10 hover:border-[var(--border-gold)]">
                  <div>
                    <span className="badge badge-gold text-[10px] mb-2 block w-max">
                      {outfit.occasion}
                    </span>
                    <h4 className="font-serif font-bold text-white text-base">
                      {outfit.title}
                    </h4>

                    {/* Outfit Components List */}
                    <div className="space-y-1.5 mt-3">
                      {outfit.items?.map((item, iIdx) => (
                        <div key={iIdx} className="flex items-center gap-2 text-xs text-[var(--text-secondary)] bg-white/5 p-2 rounded-lg">
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-gold)]"></span>
                          <span className="font-medium text-white truncate">{item.name}</span>
                        </div>
                      ))}
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
