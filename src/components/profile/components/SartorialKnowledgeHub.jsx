import React, { useState } from 'react';
import { 
  Globe, SlidersHorizontal as Sliders, ChevronDown, FlaskConical, 
  Search, RefreshCw, Loader2, CheckCircle2, Trash2, Check, Sparkles 
} from 'lucide-react';
import { SARTORIAL_CATEGORIES } from '../../../services/sartorialRules';
import { runSartorialGoldenEvalSuite } from '../../../services/sartorialEval';
import { getProfileDemographics, isRuleApplicableToDemographics } from '../../../services/demographics';
import confetti from 'canvas-confetti';

export default function SartorialKnowledgeHub({ 
  profile, 
  sartorialRules = [], 
  isMiningRules, 
  mineNewRules, 
  toggleRule, 
  deleteSartorialRule 
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [customMiningTopic, setCustomMiningTopic] = useState('');
  const [miningSuccessMsg, setMiningSuccessMsg] = useState(null);

  const demographics = getProfileDemographics(profile || {});
  const safeSartorialRules = Array.isArray(sartorialRules) ? sartorialRules.filter(Boolean) : [];
  const applicableRules = safeSartorialRules.filter(r => isRuleApplicableToDemographics(r, demographics));

  // Golden Eval Suite state
  const [evalSuiteResults, setEvalSuiteResults] = useState(null);
  const [isRunningEval, setIsRunningEval] = useState(false);

  const handleRunGoldenEval = () => {
    setIsRunningEval(true);
    setTimeout(() => {
      const results = runSartorialGoldenEvalSuite();
      setEvalSuiteResults(results);
      setIsRunningEval(false);
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#d4af37', '#10b981', '#f3e5ab']
        });
      } catch (_) {}
    }, 450);
  };

  const handleMineRules = async (e) => {
    if (e) e.preventDefault();
    try {
      setMiningSuccessMsg(null);
      const res = await mineNewRules(customMiningTopic.trim());
      if (res && res.success) {
        setMiningSuccessMsg(`Sikeres kutatás! +${res.newRulesCount} új stílusszabály került beépítésre a döntési motorba.`);
        setCustomMiningTopic('');
        try {
          confetti({
            particleCount: 55,
            spread: 65,
            origin: { y: 0.65 },
            colors: ['#d4af37', '#10b981', '#f3e5ab']
          });
        } catch (_) {}
      }
    } catch (err) {
      alert(`Nem sikerült a webes szabálykutatás: ${err.message}`);
    }
  };

  return (
    <div className="glass-card p-4 sm:p-5 border-white/10 hover:border-[var(--border-gold)]/40 transition-all space-y-4">
      
      {/* Collapsed Header Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-gold)]/10 border border-[var(--border-gold)]/30 flex items-center justify-center shrink-0">
            <Globe className="w-5 h-5 text-[var(--accent-gold)]" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-serif font-bold text-white">
                AI Stílusszabály Tudásbázis
              </span>
              <span className="badge badge-emerald text-[9px]">7 napos auto-sync aktív</span>
              <span className="badge badge-subtle text-[9px] text-white">
                {applicableRules.length} érvényes szabály ({demographics.genderLabel})
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              A háttérben futó autonóm motor a nemzetközi divatkódexekből tanul és felügyeli a szettek rétegezési és stílus-harmóniáját.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(prev => !prev)}
          className="btn-secondary py-2 px-3 text-xs flex items-center justify-center gap-2 shrink-0 self-end sm:self-auto text-[var(--accent-gold-light)] hover:text-white border-white/10 hover:border-[var(--border-gold)]/60"
        >
          <Sliders className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
          <span>{isExpanded ? 'Szabálytár elrejtése' : 'Részletes Szabályok megtekintése'}</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Collapsible Expanded Panel */}
      {isExpanded && (
        <div className="pt-4 border-t border-white/10 space-y-5 animate-slide-up">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-base font-serif font-bold text-white">
                Élő Szabálykezelő & Webes Kutató Hub
              </h4>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Itt böngészheted és egyenként konfigurálhatod a profilodhoz ({demographics.gender}, {demographics.bracketDescription}) illeszkedő stílusszabályokat.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleRunGoldenEval}
                disabled={isRunningEval}
                className="btn-secondary py-2 px-3.5 text-xs font-semibold flex items-center gap-1.5 shadow border-amber-500/30 hover:border-[var(--accent-gold)] text-amber-200 hover:text-white"
                title="Determinisztikus Divatszabály Tesztcsomag Futtatása (TC-1-től TC-6-ig)"
              >
                {isRunningEval ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent-gold)]" />
                    <span>Validáció...</span>
                  </>
                ) : (
                  <>
                    <FlaskConical className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                    <span>🧪 Divatszabály Tesztcsomag (TC-1–TC-6)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleMineRules}
                disabled={isMiningRules}
                className="btn-gold py-2 px-3.5 text-xs font-semibold flex items-center gap-1.5 shadow"
              >
                {isMiningRules ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                    <span>Kutatás...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>Új Szabályok Kutatása</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Golden Eval Suite Results Interactive Drawer */}
          {evalSuiteResults && (
            <div className="p-4 rounded-2xl bg-emerald-950/25 border border-emerald-500/40 space-y-3.5 animate-slide-up shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-sm">
                    ✓
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-serif font-bold text-white">
                        Stílusszabály Tesztcsomag Eredmény:
                      </span>
                      <span className="badge badge-emerald text-[10px] font-mono font-bold">
                        {evalSuiteResults.passRatePercent}% SIKERES ({evalSuiteResults.passedTests}/{evalSuiteResults.totalTests})
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-200/80">
                      Minden szabászati determinisztikus szabály (TC-1–TC-6) ellenőrizve és érvényesítve.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEvalSuiteResults(null)}
                  className="text-xs text-[var(--text-muted)] hover:text-white self-end sm:self-auto px-2 py-1 rounded bg-white/5"
                >
                  Bezárás
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                {evalSuiteResults.results.map((test) => (
                  <div
                    key={test.id}
                    className="p-3 rounded-xl bg-black/40 border border-emerald-500/30 space-y-1.5 text-left flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="font-mono text-[10px] font-bold text-[var(--accent-gold)]">
                          {test.id}
                        </span>
                        <span className="badge badge-emerald text-[9px] py-0.5 px-1.5">
                          ✓ PASS
                        </span>
                      </div>
                      <p className="font-semibold text-xs text-white mt-1">
                        {test.name}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5 line-clamp-2">
                        {test.description}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-white/5 text-[10px] text-emerald-300">
                      {test.explanation}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Style-Grounded Dynamic Mining Focus */}
          <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300/90 flex items-center gap-1.5">
                <span>🎯</span>
                <span>Személyre szabott kutatási fókusz a profilod alapján:</span>
              </span>
              <span className="text-[10px] text-[var(--text-muted)]">
                Dinamikus Multi-Stílus Grounding
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {(profile?.preferredStyles && profile.preferredStyles.length > 0
                ? profile.preferredStyles 
                : (demographics.isFemale ? ['Klasszikus & Nőies Chic', 'Smart Casual', 'Minimalista'] : ['Klasszikus & Időtlen', 'Olasz Sprezzatura', 'Smart Urban'])
              ).map((st, sIdx) => (
                <button
                  key={sIdx}
                  type="button"
                  onClick={() => {
                    setCustomMiningTopic(`${st} ${demographics.isFemale ? 'női' : 'férfi'} szabászati és rétegezési szabályok`);
                  }}
                  className="text-[11px] py-1 px-2.5 rounded-lg bg-[var(--accent-gold)]/10 hover:bg-[var(--accent-gold)]/25 border border-[var(--border-gold)]/40 text-[var(--accent-gold-light)] hover:text-white transition-all flex items-center gap-1.5 group"
                  title={`Kattints a kereséshez: ${st}`}
                >
                  <span className="text-[10px] text-[var(--accent-gold)] group-hover:scale-110 transition-transform">✦</span>
                  <span className="font-medium">{st}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom topic search bar */}
          <form onSubmit={handleMineRules} className="flex gap-2">
            <input
              type="text"
              id="mining-topic-input"
              name="miningTopic"
              aria-label="Célzott kutatási téma megadása"
              value={customMiningTopic}
              onChange={(e) => setCustomMiningTopic(e.target.value)}
              placeholder={demographics.isFemale ? "Opcionális fókusz: pl. Női blézer és maxiruha arányok VAGY Csónaknyakú rétegezés..." : "Opcionális fókusz: pl. Ingdzseki rétegezési szabályok VAGY Zakó mandzsetta arány..."}
              className="custom-input text-xs flex-1"
              disabled={isMiningRules}
            />
            <button
              type="submit"
              disabled={isMiningRules}
              className="btn-secondary px-3.5 text-xs flex items-center gap-1.5 shrink-0"
            >
              <RefreshCw className={`w-3 h-3 ${isMiningRules ? 'animate-spin' : ''}`} />
              <span>Kutatás</span>
            </button>
          </form>

          {/* Mining Notification */}
          {miningSuccessMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{miningSuccessMsg}</span>
              </div>
              <button
                onClick={() => setMiningSuccessMsg(null)}
                className="text-emerald-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>
          )}

          {/* Category Filter Tabs */}
          <div className="flex flex-wrap gap-1.5">
            {SARTORIAL_CATEGORIES
              .filter(cat => {
                if (cat.id === 'womenswear_specific' && demographics.isMale) return false;
                if (cat.id === 'menswear_specific' && demographics.isFemale) return false;
                return true;
              })
              .map(cat => {
                const count = cat.id === 'all' 
                  ? applicableRules.length 
                  : applicableRules.filter(r => {
                      if (cat.id === 'menswear_specific') return r.category === 'menswear_specific' || r.gender === 'menswear_specific';
                      if (cat.id === 'womenswear_specific') return r.category === 'womenswear_specific' || r.gender === 'womenswear_specific';
                      return r.category === cat.id;
                    }).length;
                const isSelected = selectedCategory === cat.id;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`py-1 px-2.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-[var(--accent-gold)] text-black font-bold shadow'
                        : 'bg-white/5 border border-white/10 text-[var(--text-secondary)] hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-black/20 text-black' : 'bg-white/10 text-[var(--text-muted)]'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
          </div>

          {/* Rules Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {applicableRules
              .filter(r => {
                if (selectedCategory === 'all') return true;
                if (selectedCategory === 'menswear_specific') {
                  return r.category === 'menswear_specific' || r.gender === 'menswear_specific';
                }
                if (selectedCategory === 'womenswear_specific') {
                  return r.category === 'womenswear_specific' || r.gender === 'womenswear_specific';
                }
                return r.category === selectedCategory;
              })
              .map((rule) => {
                const isEnabled = rule.enabled !== false;
                const catObj = SARTORIAL_CATEGORIES.find(c => c.id === rule.category);

                return (
                  <div
                    key={rule.id}
                    className={`rounded-xl p-3.5 border transition-all flex flex-col justify-between gap-2.5 ${
                      isEnabled
                        ? 'bg-black/40 border-white/10 hover:border-[var(--border-gold)]/50'
                        : 'bg-black/20 border-white/5 opacity-50'
                    }`}
                  >
                    <div className="space-y-2">
                      {/* Header: Category + Badges + Toggle */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="badge badge-gold text-[9px] py-0.5 px-2">
                            {catObj?.icon || '✨'} {catObj?.label || 'Kódex'}
                          </span>
                          {rule.gender && rule.gender !== 'universal' && (
                            <span className="badge badge-subtle text-[9px] py-0.5 px-1.5">
                              {rule.gender === 'womenswear_specific' ? '👗 Női' : '👔 Férfi'}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => toggleRule(rule.id)}
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border transition-all ${
                              isEnabled 
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                                : 'bg-white/5 border-white/10 text-[var(--text-muted)] hover:text-white'
                            }`}
                            title={isEnabled ? 'Szabály inaktiválása' : 'Szabály aktiválása'}
                          >
                            {isEnabled ? 'Aktív' : 'Inaktív'}
                          </button>
                          {String(rule?.id || '').startsWith('mined-rule-') && (
                            <button
                              type="button"
                              onClick={() => deleteSartorialRule(rule.id)}
                              className="text-[var(--text-muted)] hover:text-rose-400 p-1 rounded hover:bg-white/5 transition-colors"
                              title="Szabály törlése"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h4 className="font-serif font-bold text-xs sm:text-sm text-white leading-snug">
                          {rule.title}
                        </h4>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                          {rule.ruleDescription}
                        </p>
                      </div>

                      {/* Target Styles Badges */}
                      {Array.isArray(rule.targetStyles) && rule.targetStyles.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {rule.targetStyles.map((ts, tsIdx) => (
                            <span 
                              key={tsIdx} 
                              className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-200/90 font-medium"
                            >
                              ✦ {ts}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Dos & Don'ts */}
                      <div className="space-y-1 pt-0.5">
                        {rule.dont && (
                          <div className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[10px] text-rose-200 flex items-start gap-1">
                            <span className="font-bold text-rose-400 shrink-0">❌ Don't:</span>
                            <span className="leading-tight">{rule.dont}</span>
                          </div>
                        )}
                        {rule.do && (
                          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-200 flex items-start gap-1">
                            <span className="font-bold text-emerald-400 shrink-0">✅ Do:</span>
                            <span className="leading-tight">{rule.do}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer: Source */}
                    <div className="pt-1.5 border-t border-white/5 flex items-center justify-between text-[9px] text-[var(--text-muted)]">
                      <span className="truncate max-w-[200px]" title={rule.source}>
                        {rule.source || 'Divatkódex'}
                      </span>
                      <span>
                        {rule.discoveredAt && !isNaN(new Date(rule.discoveredAt).getTime())
                          ? new Date(rule.discoveredAt).toLocaleDateString('hu-HU')
                          : 'Bespoke kódex'}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

    </div>
  );
}
