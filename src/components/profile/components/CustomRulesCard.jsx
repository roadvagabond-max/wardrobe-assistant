import React, { useState } from 'react';
import { Sparkles, Plus, Check, X } from 'lucide-react';
import { getProfileDemographics, getDemographicPresetRules } from '../../../services/demographics';

export default function CustomRulesCard({ 
  profile, 
  onUpdateProfile 
}) {
  const [newRuleInput, setNewRuleInput] = useState('');

  const demographics = getProfileDemographics(profile);
  const presetRules = getDemographicPresetRules(demographics);

  const currentRules = Array.isArray(profile?.customStylingRules) 
    ? profile.customStylingRules 
    : [];

  const handleAddRule = async (ruleToAdd) => {
    const text = (ruleToAdd || newRuleInput).trim();
    if (!text) return;
    if (currentRules.includes(text)) {
      setNewRuleInput('');
      return;
    }
    const updatedRules = [...currentRules, text];
    await onUpdateProfile({
      ...profile,
      customStylingRules: updatedRules
    });
    setNewRuleInput('');
  };

  const handleRemoveRule = async (indexToRemove) => {
    const updatedRules = currentRules.filter((_, idx) => idx !== indexToRemove);
    await onUpdateProfile({
      ...profile,
      customStylingRules: updatedRules
    });
  };

  return (
    <div className="glass-card p-6 sm:p-7 border-[var(--border-gold)] space-y-5">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="badge badge-gold text-[10px]">AI Betanítás & Preferenciák</span>
            <span className="badge badge-emerald text-[10px]">
              {currentRules.length} aktív stílusszabály
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-serif font-bold text-white mt-1">
            Személyes AI Stylist Tanítása & Egyéni Szabályok
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Tanítsd meg az AI-nak a saját szabályaidat és tiltásaidat szabad szöveggel (pl. <em>"Nem szeretem a pólóingeket"</em>, <em>"Csak természetes anyagok"</em>). A Stylist szettajánló, a Kapszula hiányelemző és a Vásárlási döntéstámogató azonnal és szigorúan alkalmazza őket!
          </p>
        </div>
      </div>

      {/* Input bar */}
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          handleAddRule();
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          id="new-styling-rule-input"
          name="newStylingRule"
          aria-label="Új személyes stílusszabály megadása"
          value={newRuleInput}
          onChange={(e) => setNewRuleInput(e.target.value)}
          placeholder="pl. Nem szeretem a pólóingeket VAGY Csak rejtett gombolású ingeket hordok..."
          className="custom-input text-xs sm:text-sm flex-1"
        />
        <button
          type="submit"
          disabled={!newRuleInput.trim()}
          className="btn-gold px-4 text-xs sm:text-sm flex items-center gap-1.5 shrink-0 shadow"
        >
          <Plus className="w-4 h-4" />
          <span>Szabály Mentése</span>
        </button>
      </form>

      {/* Quick Presets */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-semibold text-[var(--accent-gold)] uppercase tracking-wider block">
          Gyakori tanítási javaslatok (Kattints a hozzáadáshoz):
        </span>
        <div className="flex flex-wrap gap-1.5">
          {presetRules.map((preset, pIdx) => {
            const isAdded = currentRules.includes(preset);
            return (
              <button
                key={pIdx}
                type="button"
                onClick={() => !isAdded && handleAddRule(preset)}
                disabled={isAdded}
                className={`text-[11px] py-1 px-2.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                  isAdded
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 cursor-default opacity-80'
                    : 'bg-white/5 border-white/10 text-[var(--text-secondary)] hover:border-[var(--border-gold)] hover:text-white hover:bg-white/10'
                }`}
              >
                {isAdded ? <Check className="w-3 h-3 text-emerald-400" /> : <Plus className="w-3 h-3 text-[var(--accent-gold)]" />}
                <span>{preset}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Rules Grid */}
      <div className="space-y-2 pt-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-white block">
          Betanított Aktív Szabályaid:
        </span>

        {currentRules.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {currentRules.map((rule, idx) => (
              <div 
                key={idx} 
                className="bg-black/40 border border-white/10 hover:border-[var(--border-gold)]/60 rounded-xl p-3 flex items-start justify-between gap-2.5 transition-all group shadow-sm"
              >
                <div className="flex items-start gap-2 min-w-0">
                  <Sparkles className="w-3.5 h-3.5 text-[var(--accent-gold)] shrink-0 mt-0.5" />
                  <span className="text-xs text-white leading-relaxed font-medium">
                    {rule}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveRule(idx)}
                  className="text-[var(--text-muted)] hover:text-rose-400 p-1 rounded hover:bg-white/5 transition-colors shrink-0"
                  title="Szabály törlése"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-black/20 border border-white/5 text-center text-xs text-[var(--text-muted)]">
            Még nincs egyéni szabályod rögzítve. Írj be saját preferenciákat vagy válassz a fenti javaslatokból!
          </div>
        )}
      </div>

      {/* Info notice */}
      <div className="p-3 rounded-xl bg-[var(--accent-gold-glow)]/40 border border-[var(--border-gold)]/40 text-[11px] text-[var(--accent-gold-light)] flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-[var(--accent-gold)] shrink-0" />
        <span>
          <strong>Valós idejű szinkron:</strong> A szabályok mentés után azonnal beépülnek az esemény-stylist, a kapszula-gap és a vásárlási döntéstámogató motorba.
        </span>
      </div>

    </div>
  );
}
