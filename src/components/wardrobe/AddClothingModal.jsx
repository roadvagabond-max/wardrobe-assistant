import React, { useState, useRef } from 'react';
import { X, Camera, Upload, Link as LinkIcon, Sparkles, Check, Loader2, AlertCircle, Compass, Calendar } from 'lucide-react';
import { analyzeClothingImage } from '../../services/gemini';
import { uploadGarmentImage } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import confetti from 'canvas-confetti';

export default function AddClothingModal({ isOpen, onClose }) {
  const { addItem, currentUser } = useAuth();

  const [activeMode, setActiveMode] = useState('camera'); // 'camera', 'upload', 'link'
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [webshopUrl, setWebshopUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);

  // Form Fields (Auto-filled by AI)
  const [formData, setFormData] = useState({
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
    tags: ['stílusos', 'alapdarab']
  });

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result;
      setImagePreview(base64);
      await triggerAIAnalysis(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleLinkImport = async (e) => {
    e.preventDefault();
    if (!webshopUrl) return;

    setIsAnalyzing(true);
    // Webshop sample preview
    const sampleImage = 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=800&q=80';
    setImagePreview(sampleImage);

    // AI analysis
    await triggerAIAnalysis(sampleImage);
  };

  const triggerAIAnalysis = async (imgSource) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const aiResult = await analyzeClothingImage(imgSource);
      if (aiResult) {
        setFormData(prev => ({
          ...prev,
          name: aiResult.name || prev.name || 'Új Ruhadarab',
          category: aiResult.category || prev.category,
          subCategory: aiResult.subCategory || prev.subCategory,
          color: aiResult.color || prev.color,
          colorHex: aiResult.colorHex || prev.colorHex,
          material: aiResult.material || prev.material,
          qualityScore: aiResult.qualityScore || prev.qualityScore,
          season: aiResult.season || prev.season,
          formality: aiResult.formality || prev.formality,
          pattern: aiResult.pattern || prev.pattern,
          stylingTip: aiResult.stylingTip || prev.stylingTip,
          whenToWear: aiResult.whenToWear || prev.whenToWear,
          stylingAdvice: aiResult.stylingAdvice || prev.stylingAdvice,
          tags: aiResult.tags || prev.tags
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

  const handleSave = async (e) => {
    e.preventDefault();
    if (!imagePreview) return;

    setIsSaving(true);
    try {
      let finalImageUrl = imagePreview;

      // Ha van valós fájl és bejelentkezett felhasználó, feltöltjük a Firebase Storage-be
      if (selectedFile) {
        finalImageUrl = await uploadGarmentImage(selectedFile, currentUser?.uid || 'demo-user');
      }

      await addItem({
        ...formData,
        imageUrl: finalImageUrl
      });

      // Sikeres konfetti animáció
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#d4af37', '#f3e5ab', '#ffffff']
        });
      } catch (_) {}

      onClose();
    } catch (err) {
      console.error('Mentési hiba:', err);
      alert('Hiba történt a mentés során. Kérlek próbáld újra.');
    } finally {
      setIsSaving(false);
    }
  };

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
            onClick={onClose}
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
                  Webshop Termék URL (pl. Zara, Massimo Dutti, Mr Porter):
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    required
                    placeholder="https://www.massimodutti.com/hu/..."
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
            
            {/* Image Preview with AI Status */}
            <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden bg-black/60 border border-white/10">
              <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              
              {isAnalyzing && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 text-white">
                  <Loader2 className="w-8 h-8 text-[var(--accent-gold)] animate-spin" />
                  <p className="text-xs font-medium tracking-wide">Gemini Vision elemzi a darabot és megírja a stílustanácsot...</p>
                </div>
              )}

              <button
                type="button"
                onClick={() => setImagePreview(null)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-black"
                title="Másik kép választása"
              >
                <X className="w-4 h-4" />
              </button>
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
                <span>Az AI elemezte a darabot és elkészítette a személyre szabott stílusajánlást!</span>
              </div>
            )}

            {/* AI Styling Recommendation Box (Mivel és Mikor hordd) */}
            {(formData.stylingTip || formData.whenToWear) && (
              <div className="p-4 rounded-xl bg-black/50 border border-[var(--border-gold)] space-y-3 shadow-inner">
                {formData.stylingTip && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[var(--accent-gold-light)] flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                      <span>Mivel érdemes hordani (AI Ajánlás):</span>
                    </label>
                    <textarea
                      rows={2}
                      value={formData.stylingTip}
                      onChange={(e) => setFormData({ ...formData, stylingTip: e.target.value })}
                      className="custom-input text-xs leading-relaxed"
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
                      rows={2}
                      value={formData.whenToWear}
                      onChange={(e) => setFormData({ ...formData, whenToWear: e.target.value })}
                      className="custom-input text-xs leading-relaxed"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Editable Fields */}
            <div className="space-y-3">
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

              {/* Seasons */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Szezonalitás</label>
                <div className="flex gap-2">
                  {[
                    { id: 'tavasz', label: 'Tavasz' },
                    { id: 'nyar', label: 'Nyár' },
                    { id: 'osz', label: 'Ősz' },
                    { id: 'tel', label: 'Tél' }
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

            </div>

            {/* Save Buttons */}
            <div className="flex items-center gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setImagePreview(null)}
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
