import React, { useRef } from 'react';
import { Sparkles, Camera, Upload, Loader2, Check } from 'lucide-react';

export default function ColorSeasonCard({ 
  isAnalyzingPhoto, 
  colorSeasonResult, 
  onPhotoUpload 
}) {
  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);

  return (
    <div className="glass-card p-5 sm:p-6 border-[var(--border-gold)]/60 bg-gradient-to-r from-black/60 via-[#161b26]/70 to-[var(--accent-gold-glow)]/10 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--accent-gold)]" />
            <h3 className="font-serif font-bold text-white text-base sm:text-lg">
              Portré Fotó alapú AI Színtípus & Bőrtónus Elemző
            </h3>
          </div>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Készíts egy fotót természetes fényben! Az <strong>AI Wardrobe Assistant</strong> meghatározza az arcbőröd tónusát (hideg/meleg), a 12 évszakos színtípusodat és a hozzád legjobban passzoló színpalettát, amit a Stylist azonnal beépít a szettjeidbe.
          </p>
          <div className="flex items-center gap-2 text-[11px] text-amber-300/90 pt-0.5">
            <span>💡</span>
            <span><strong>Tipp a legpontosabb eredményhez:</strong> Természetes nappali fényben (ablak felé fordulva), smink és napszemüveg nélkül fotózz!</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <input 
            type="file" 
            id="portrait-camera-input"
            name="portraitCamera"
            aria-label="Portré fotó készítése kamerával"
            accept="image/*" 
            capture="user" 
            ref={cameraInputRef} 
            onChange={onPhotoUpload} 
            className="hidden" 
          />
          <input 
            type="file" 
            id="portrait-file-input"
            name="portraitFile"
            aria-label="Portré fotó feltöltése fájlból"
            accept="image/*" 
            ref={fileInputRef} 
            onChange={onPhotoUpload} 
            className="hidden" 
          />

          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={isAnalyzingPhoto}
            className="btn-gold text-xs py-2.5 px-3.5 flex items-center gap-1.5 shadow"
          >
            <Camera className="w-4 h-4" />
            <span>Fotó Készítése</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isAnalyzingPhoto}
            className="btn-secondary text-xs py-2.5 px-3.5 flex items-center gap-1.5"
          >
            <Upload className="w-4 h-4" />
            <span>Kép Feltöltése</span>
          </button>
        </div>
      </div>

      {isAnalyzingPhoto && (
        <div className="p-4 rounded-xl bg-black/50 border border-[var(--border-gold)] text-center text-xs text-amber-200 flex items-center justify-center gap-2.5">
          <Loader2 className="w-4 h-4 text-[var(--accent-gold)] animate-spin" />
          <span>Az AI Wardrobe Assistant elemzi a bőrtónust, szemszínt és a színtípust...</span>
        </div>
      )}

      {colorSeasonResult && (
        <div className="p-4 rounded-xl bg-black/40 border border-emerald-500/30 space-y-2 animate-slide-up text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-emerald-300 text-sm flex items-center gap-1.5">
              <Check className="w-4 h-4" />
              <span>Meghatározott Színtípus: {colorSeasonResult.seasonName}</span>
            </span>
          </div>
          <p className="text-[var(--text-secondary)] leading-relaxed">{colorSeasonResult.description}</p>
          
          <div className="pt-2">
            <span className="text-[11px] font-semibold text-white block mb-1">Ragyogó, legjobban álló színeid:</span>
            <div className="flex flex-wrap gap-1.5">
              {colorSeasonResult.recommendedPalette?.map((c, i) => (
                <span key={i} className="badge badge-gold text-[10px]">
                  ✦ {c}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
