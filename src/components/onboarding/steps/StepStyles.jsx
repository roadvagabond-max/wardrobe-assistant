import React from 'react';
import { Sparkles, ArrowRight, ArrowLeft, Check } from 'lucide-react';

const STYLE_ARCHETYPES = [
  // Női / Feminine fókusz
  { id: 'parisian_chic', name: 'Párizsi Chic / Feminine Chic', category: 'Női', desc: 'Könnyed nőies báj, minőségi blézerek, letisztult elegancia és finom részletek' },
  { id: 'business_formal', name: 'Elegáns Női Business', category: 'Női', desc: 'Szabott kosztümök, ceruzaszoknyák, selyemblúzok és magabiztos irodai szettek' },
  { id: 'bohemian_romantic', name: 'Bohemian & Romantikus', category: 'Női', desc: 'Lágy esésű anyagok, virágminták, természetes textúrák és kötetlen szabásvonalak' },
  { id: 'casual_chic', name: 'Casual Chic', category: 'Női', desc: 'Kényelmes, mégis rendezett és stílusos nappali összeállítások minőségi alapdarabokkal' },
  { id: 'athleisure', name: 'Athleisure & Sporty Luxe', category: 'Unisex', desc: 'Prémium sportos és utcai elemek keverése a maximális komfortért' },
  
  // Férfi / Menswear fókusz
  { id: 'italian_sprezzatura', name: 'Olasz Sprezzatura', category: 'Férfi', desc: 'Természetes olasz elegancia, strukturálatlan zakók, loafer cipők és könnyed sárm' },
  { id: 'old_money', name: 'Old Money & Quiet Luxury', category: 'Unisex', desc: 'Kasmír, finomgyapjú, len, logómentes visszafogott luxus és örökérvényű színek' },
  { id: 'classic_timeless', name: 'Klasszikus & Időtlen', category: 'Unisex', desc: 'Időtálló szabások, oxford ingek, flanelnadrágok és hagyományos szabászati kódex' },
  { id: 'smart_urban', name: 'Smart Urban', category: 'Unisex', desc: 'Modern városi letisztultság, overshirt ingdzsekik, minimalista bőr sneakerek' },
  
  // Univerzális
  { id: 'minimalist', name: 'Minimalista', category: 'Unisex', desc: 'Monokróm árnyalatok, geometrikus formák, felesleges díszítések nélküli tiszta vonalak' },
  { id: 'streetwear', name: 'Streetwear', category: 'Unisex', desc: 'Kortárs utcai divat, oversized sziluettek, statement kiegészítők' },
  { id: 'vintage_retro', name: 'Vintage & Retro', category: 'Unisex', desc: 'Klasszikus korszakok ihlette karakteres textúrák és formák' }
];

export default function StepStyles({ formData, setFormData, onNext, onBack, onSkip }) {
  const selectedStyles = formData.preferredStyles || [];

  const handleToggleStyle = (styleName) => {
    setFormData(prev => {
      const current = prev.preferredStyles || [];
      const exists = current.includes(styleName);
      return {
        ...prev,
        preferredStyles: exists ? current.filter(s => s !== styleName) : [...current, styleName]
      };
    });
  };

  // Re-order recommendations based on selected gender
  const isFemale = formData.gender === 'Női';
  const isMale = formData.gender === 'Férfi';

  const displayedStyles = [...STYLE_ARCHETYPES].sort((a, b) => {
    if (isFemale) {
      if (a.category === 'Női' && b.category !== 'Női') return -1;
      if (b.category === 'Női' && a.category !== 'Női') return 1;
    }
    if (isMale) {
      if (a.category === 'Férfi' && b.category !== 'Férfi') return -1;
      if (b.category === 'Férfi' && a.category !== 'Férfi') return 1;
    }
    return 0;
  });

  return (
    <div className="space-y-5 animate-slide-up">
      
      {/* Intro text */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="badge badge-gold text-[10px] uppercase tracking-wider font-bold">
            3. Lépés • Preferált Stílusirányzatok
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
          Milyen stílusvilág áll hozzád legközelebb?
        </h3>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          Válassz ki egy vagy több stílust! A Stylist és a vásárlási tanácsadó ezekhez az irányzatokhoz hangolja a szettjeidet.
        </p>
      </div>

      {/* Style Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[50vh] overflow-y-auto pr-1">
        {displayedStyles.map(style => {
          const isSelected = selectedStyles.includes(style.name);
          return (
            <button
              key={style.id}
              type="button"
              onClick={() => handleToggleStyle(style.name)}
              className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between gap-1.5 cursor-pointer ${
                isSelected
                  ? 'bg-[var(--accent-gold)]/20 border-[var(--border-gold)] text-white shadow-md'
                  : 'bg-black/30 border-white/10 hover:border-white/20 text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-bold text-xs sm:text-sm text-white block">
                    {style.name}
                  </span>
                  <span className="text-[10px] text-amber-400 font-semibold">
                    {style.category} stílus
                  </span>
                </div>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 transition-all ${
                  isSelected ? 'bg-[var(--accent-gold)] text-black font-bold' : 'bg-white/5 border border-white/10'
                }`}>
                  {isSelected ? <Check className="w-3.5 h-3.5" /> : null}
                </div>
              </div>

              <p className="text-[11px] text-[var(--text-muted)] leading-snug">
                {style.desc}
              </p>
            </button>
          );
        })}
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
            <span>Tovább az 1. Ruhához</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
}
