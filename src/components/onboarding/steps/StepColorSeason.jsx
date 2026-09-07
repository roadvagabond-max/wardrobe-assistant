import React, { useState, useRef } from 'react';
import { Sparkles, Camera, Upload, Loader2, Check, ArrowRight, ArrowLeft, RefreshCw, X, AlertCircle } from 'lucide-react';
import { analyzeColorSeason } from '../../../services/gemini';
import { ensureBase64Image } from '../../../services/imageOptimizer';
import { normalizeColorName, deduplicateColors } from '../../common/ColorPalettePicker';

const SEASON_PRESETS = [
  { name: 'Meleg Ősz (Warm Autumn)', skinTone: 'Meleg arany / olíva altónus', palette: ['Sötétkék', 'Dohánybarna', 'Olívazöld', 'Törtfehér'] },
  { name: 'Sötét Ősz (Dark Autumn)', skinTone: 'Mély meleg tónus', palette: ['Espresso barna', 'Mély smaragdzöld', 'Sötétkék', 'Mustársárga'] },
  { name: 'Világos Tavasz (Light Spring)', skinTone: 'Világos meleg barackos tónus', palette: ['Világoskék', 'Homokbézs', 'Korall', 'Meleg fehér'] },
  { name: 'Meleg Tavasz (Warm Spring)', skinTone: 'Aranyló meleg tónus', palette: ['Tevebarna', 'Élénk kék', 'Meleg zöld', 'Krémfehér'] },
  { name: 'Hideg Tél (Cool Winter)', skinTone: 'Hideg kontrasztos tónus', palette: ['Fekete', 'Hófehér', 'Királykék', 'Smaragdzöld'] },
  { name: 'Sötét Tél (Dark Winter)', skinTone: 'Mély hideg tónus', palette: ['Antracitszürke', 'Éjfekete', 'Bordó', 'Kobaltkék'] },
  { name: 'Lágy Nyár (Soft Summer)', skinTone: 'Lágy füstös hideg tónus', palette: ['Palakék', 'Zsályazöld', 'Középszürke', 'Mályva'] },
  { name: 'Hideg Nyár (Cool Summer)', skinTone: 'Rózsás hideg tónus', palette: ['Tengerkék', 'Levendula', 'Finomszürke', 'Málnapiros'] }
];

export default function StepColorSeason({ formData, setFormData, onNext, onBack, onSkip }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisError, setAnalysisError] = useState('');
  const [showManualPicker, setShowManualPicker] = useState(false);

  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalysisError('');
    setIsAnalyzing(true);

    try {
      // 1. Client-side Canvas optimizer (512x512 @ 0.8 JPEG)
      const base64 = await ensureBase64Image(file, 512, 512, 0.8);
      
      // Update avatar immediately
      setFormData(prev => ({
        ...prev,
        avatarUrl: base64
      }));

      // 2. Multimodal Gemini Vision AI Analysis
      const result = await analyzeColorSeason(base64);
      setAnalysisResult(result);

      if (result) {
        // Clean, focused capsule palette (max 4-5 canonicalized colors)
        const rawRecommended = Array.isArray(result.recommendedPalette) ? result.recommendedPalette : [];
        const cleanPalette = deduplicateColors(rawRecommended).slice(0, 5);

        setFormData(prev => ({
          ...prev,
          avatarUrl: base64,
          skinTone: `${result.seasonName} - ${result.skinTone}`,
          favoriteColors: cleanPalette.length > 0 ? cleanPalette : ['Sötétkék', 'Törtfehér', 'Dohánybarna'],
          avoidColors: Array.isArray(result.avoidPalette) ? deduplicateColors(result.avoidPalette) : []
        }));
      }
    } catch (err) {
      console.warn('AI Színtípus elemzési figyelmeztetés:', err);
      setAnalysisError('Nem sikerült kiértékelni a fotót. Próbálj meg egy tisztább, természetes fényű képet készíteni, vagy válassz alább egy típust manuálisan!');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSelectPreset = (preset) => {
    setFormData(prev => ({
      ...prev,
      skinTone: `${preset.name} - ${preset.skinTone}`,
      favoriteColors: preset.palette
    }));
    setShowManualPicker(false);
  };

  const hasSelectedColorSeason = Boolean(formData.skinTone && formData.skinTone.trim().length > 0 && formData.skinTone !== '—');

  return (
    <div className="space-y-5 animate-slide-up">
      
      {/* Intro text */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="badge badge-gold text-[10px] uppercase tracking-wider font-bold">
            2. Lépés • AI Színtípus & Bőrtónus
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
          Ismerd meg a legragyogóbb színeidet!
        </h3>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          Készíts egy szelfit természetes nappali fényben! Az AI meghatározza a 12 évszakos színtípusodat és a hozzád legjobban passzoló színpalettát.
        </p>
      </div>

      {/* Photo Uploader Card */}
      <div className="glass-card p-5 border-[var(--border-gold)]/60 bg-gradient-to-r from-black/60 via-[#151c27]/70 to-[var(--accent-gold-glow)]/10 space-y-4">
        <input 
          type="file" 
          id="onboarding-portrait-camera"
          accept="image/*" 
          capture="user" 
          ref={cameraInputRef} 
          onChange={handlePhotoUpload} 
          className="hidden" 
        />
        <input 
          type="file" 
          id="onboarding-portrait-file"
          accept="image/*" 
          ref={fileInputRef} 
          onChange={handlePhotoUpload} 
          className="hidden" 
        />

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="w-24 h-24 rounded-2xl bg-black/40 border border-white/10 overflow-hidden flex items-center justify-center shrink-0 shadow-inner relative group">
            {portraitPreview ? (
              <img src={portraitPreview} alt="Portré" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center p-2 text-[var(--text-muted)] flex flex-col items-center gap-1">
                <Sparkles className="w-6 h-6 text-[var(--accent-gold)]/60" />
                <span className="text-[10px]">Nincs fotó</span>
              </div>
            )}
          </div>

          <div className="space-y-2 flex-1 text-center sm:text-left">
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <span className="badge badge-gold text-[10px]">✨ 100% Automatikus</span>
              <span className="badge badge-emerald text-[10px]">Privát & Helyi</span>
            </div>
            <p className="text-xs text-white font-medium">
              Fotózd le magad ablak felé fordulva vagy válassz egy jó szelfit a galériádból!
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={isAnalyzing}
            className="btn-gold py-2.5 px-4 text-xs font-bold flex items-center justify-center gap-2 shadow-lg"
          >
            <Camera className="w-4 h-4" />
            <span>Szelfi Készítése</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isAnalyzing}
            className="btn-secondary py-2.5 px-4 text-xs font-semibold flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4" />
            <span>Kép Feltöltése</span>
          </button>
        </div>

        {/* Loader state */}
        {isAnalyzing && (
          <div className="p-4 rounded-xl bg-black/60 border border-[var(--border-gold)] text-center text-xs text-amber-200 flex items-center justify-center gap-2.5 animate-pulse">
            <Loader2 className="w-4 h-4 text-[var(--accent-gold)] animate-spin" />
            <span>Az AI elemzi a bőrtónust, szemszínt és a 12 évszakos típust...</span>
          </div>
        )}

        {/* Error message */}
        {analysisError && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{analysisError}</span>
          </div>
        )}

        {/* Successful Analysis Result */}
        {(analysisResult || hasSelectedColorSeason) && (
          <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 space-y-3 animate-slide-up text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-300 text-sm flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Színtípus: {analysisResult?.seasonName || formData.skinTone}</span>
              </span>
              {formData.avatarUrl && (
                <img 
                  src={formData.avatarUrl} 
                  alt="Portré" 
                  className="w-8 h-8 rounded-full object-cover border border-emerald-500/40"
                />
              )}
            </div>

            {analysisResult?.description && (
              <p className="text-[var(--text-secondary)] leading-relaxed">
                {analysisResult.description}
              </p>
            )}

            {/* Recommended palette chips */}
            {formData.favoriteColors && formData.favoriteColors.length > 0 && (
              <div>
                <span className="text-[11px] font-semibold text-white block mb-1">
                  Legelőnyösebb ragyogó színeid:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {formData.favoriteColors.map((c, i) => (
                    <span key={i} className="badge badge-gold text-[10px]">
                      ✦ {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Manual Selection Fallback Drawer */}
      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-white">
            Nem szeretnél most fotót készíteni?
          </span>
          <button
            type="button"
            onClick={() => setShowManualPicker(prev => !prev)}
            className="text-xs text-[var(--accent-gold)] hover:underline cursor-pointer font-medium"
          >
            {showManualPicker ? 'Elrejtés' : 'Válassz típust listából ▾'}
          </button>
        </div>

        {showManualPicker && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 animate-fade-in">
            {SEASON_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className="p-2.5 rounded-xl bg-black/40 hover:bg-black/70 border border-white/5 hover:border-[var(--border-gold)]/60 text-left transition-all space-y-1 cursor-pointer"
              >
                <div className="font-bold text-xs text-amber-200">{preset.name}</div>
                <div className="text-[10px] text-[var(--text-muted)]">{preset.skinTone}</div>
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {preset.palette.slice(0, 3).map((p, i) => (
                    <span key={i} className="text-[9px] px-1.5 py-0.2 rounded bg-white/5 text-zinc-300">
                      {p}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

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
          <button
            type="button"
            onClick={onSkip}
            className="btn-secondary py-2.5 px-4 text-xs text-[var(--text-muted)] hover:text-white cursor-pointer"
          >
            Kihagyás ⏭️
          </button>

          <button
            type="button"
            onClick={onNext}
            className="btn-gold py-2.5 px-5 text-xs font-semibold shadow-md flex items-center gap-2 cursor-pointer"
          >
            <span>Tovább a Stílusokhoz</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
}
