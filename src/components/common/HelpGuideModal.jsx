import React, { useState } from 'react';
import { 
  X, Compass, Sparkles, Camera, Shirt, Sliders, CheckCircle2, 
  ShoppingBag, Layers, AlertCircle, Bookmark, Feather, ShieldCheck,
  ExternalLink, Smartphone, MessageSquare, BookOpen, RefreshCw, Scissors
} from 'lucide-react';

export default function HelpGuideModal({ isOpen, onClose, defaultTab = 'rules' }) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  if (!isOpen) return null;

  const tabs = [
    { id: 'rules', label: '🍂 Ruhatárépítés', icon: '🍂' },
    { id: 'dna', label: '📸 Színtípus & DNS', icon: '📸' },
    { id: 'upload', label: '⚡ Ruhafelvitel', icon: '⚡' },
    { id: 'stylist', label: '👔 AI Stylist', icon: '👔' },
    { id: 'advisor', label: '🛍️ Próbafülke / Vásárlás', icon: '🛍️' },
    { id: 'capsule', label: '🧩 Kapszula Audit', icon: '🧩' }
  ];

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
    >
      <div className="relative w-full max-w-3xl bg-[#0b0e14] border border-[var(--border-gold)] rounded-2xl shadow-2xl p-5 sm:p-7 space-y-6 my-auto animate-scale-up max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#d4af37] to-[#8a6b18] flex items-center justify-center text-black font-bold shadow-md shrink-0">
              <BookOpen className="w-5 h-5 text-[#07090e]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="badge badge-gold text-[10px] uppercase font-bold tracking-wider">
                  Sartorial Tudásbázis • v1.0 Build
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">Gemini 3.7 Flash AI</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-serif font-bold text-white mt-0.5">
                Használati Útmutató & Stílus Kódex
              </h3>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 rounded-full text-[var(--text-muted)] hover:text-white hover:bg-white/5 transition-colors"
            title="Bezárás"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin border-b border-white/5">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === t.id
                  ? 'bg-[var(--accent-gold)] text-black font-bold shadow-md'
                  : 'bg-white/5 text-[var(--text-secondary)] hover:bg-white/10 hover:text-white border border-white/5'
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Tab 1: Ruhatárépítés Aranyszabályai */}
        {activeTab === 'rules' && (
          <div className="space-y-4 text-xs text-[var(--text-secondary)] animate-fade-in">
            <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/15 to-transparent border border-amber-500/30 space-y-2">
              <h4 className="font-serif font-bold text-amber-200 text-sm flex items-center gap-2">
                <span>🍂</span>
                <span>1. Kezdd a mostani szezonális ruháiddal!</span>
              </h4>
              <p className="leading-relaxed">
                Nem szükséges egyszerre az egész szekrényt berögzítened. Kezdd azokkal a ruhadarabokkal, amelyeket az <strong>aktuális évszakban (pl. tavasz/nyár vagy ősz/tél) rendszeresen hordasz</strong>. Így az AI Stylist azonnal képes lesz a mai időjárásra tökéletes, hordható szetteket ajánlani.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
                <h4 className="font-serif font-bold text-white text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>2. Valós ruhaállapot beállítása</span>
                </h4>
                <p className="leading-relaxed">
                  Feltöltéskor vizsgáld meg a ruha állapotát:
                </p>
                <ul className="space-y-1 pl-1 text-[11px] list-disc list-inside text-white/90">
                  <li><strong>Vadonatúj / Megkímélt:</strong> elegáns és üzleti alkalmakra is beválogatja az AI.</li>
                  <li><strong>Játszós / Kopott:</strong> az AI csak otthoni vagy laza szettekhez veszi számításba.</li>
                  <li><strong>Lecserélendő:</strong> a Kapszula Elemző azonnal felveszi a pótlási listára!</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
                <h4 className="font-serif font-bold text-white text-sm flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-[var(--accent-gold)]" />
                  <span>3. Méret & Illeszkedés prioritás</span>
                </h4>
                <p className="leading-relaxed">
                  <strong>Csak olyan ruhát rögzíts, ami ma is jó rád!</strong> A kinőtt, kényelmetlen vagy előnytelen szabású darabokat ne vedd fel a rendszerbe, hogy a Stylist kizárólag olyan szetteket javasoljon, amelyekben magabiztosan érzed magad.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-black/50 border border-white/5 space-y-1.5">
              <h5 className="font-bold text-white text-xs">💡 Pro Tipp:</h5>
              <p className="text-[11px] leading-relaxed">
                Minden ruhához érdemes megadni a <strong>márkát</strong> és a <strong>méretet</strong> is (pl. <em>Boglioli - 50</em>, <em>Eton - 40</em>, <em>Incotex - 32/32</em>). A Stílus DNS ebből automatikusan felépíti a személyes mérettérképedet, ami új ruhák vásárlásakor megmondja a pontos ajánlott méretedet!
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: Színtípus & Stílus DNS */}
        {activeTab === 'dna' && (
          <div className="space-y-4 text-xs text-[var(--text-secondary)] animate-fade-in">
            <div className="p-4 rounded-xl bg-black/40 border border-[var(--border-gold)]/60 space-y-3">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-[var(--accent-gold)]" />
                <h4 className="font-serif font-bold text-white text-sm">
                  AI Színtípus Meghatározás Természetes Fényű Szelfiből
                </h4>
              </div>
              <p className="leading-relaxed">
                Készíts egy szelfit természetes ablakfényben (lehetőleg smink és erős napszemüveg nélkül). A <strong>Gemini 3.7 Flash</strong> multimodális neurális modell elemzi a bőröd alaptónusát (hideg/meleg), a szemed és hajad kontrasztját, és besorol a 12 évszakos színelméletbe (pl. <em>Meleg Ősz</em>, <em>Lágy Nyár</em>, <em>Sötét Tél</em>).
              </p>
              <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-[11px] text-amber-200">
                ✦ <strong>Automatikus integráció:</strong> A meghatározott ragyogó színpaletta automatikusan frissíti a kedvenc színeidet, és az AI Stylist előnyben részesíti ezeket a szettek összeállításakor!
              </div>
            </div>

            <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
              <h4 className="font-serif font-bold text-white text-sm flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-300" />
                <span>Egyéni Stílusszabályok (Szabad Szöveges Tanítás)</span>
              </h4>
              <p className="leading-relaxed">
                A Stílus DNS felületen szabadon megfogalmazhatsz bármilyen szabályt magyarul. Példák:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                <div className="p-2.5 rounded-lg bg-black/60 border border-rose-500/20 text-rose-300">
                  ❌ <em>"Nem szeretem a galléros pólóingeket"</em>
                </div>
                <div className="p-2.5 rounded-lg bg-black/60 border border-emerald-500/20 text-emerald-300">
                  ✅ <em>"Csak 100% természetes anyagok (gyapjú, len, pamut)"</em>
                </div>
                <div className="p-2.5 rounded-lg bg-black/60 border border-rose-500/20 text-rose-300">
                  ❌ <em>"Kerülöm a skinny, túl szűk nadrágokat"</em>
                </div>
                <div className="p-2.5 rounded-lg bg-black/60 border border-emerald-500/20 text-emerald-300">
                  ✅ <em>"Zakóhoz mindig hosszú ujjú inget hordok"</em>
                </div>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] pt-1">
                Az AI minden szettgenerálásnál, kapszula auditnál és vásárlási ellenőrzésnél azonnal érvényesíti ezeket a szabályokat!
              </p>
            </div>
          </div>
        )}

        {/* Tab 3: Ruhafelvitel */}
        {activeTab === 'upload' && (
          <div className="space-y-4 text-xs text-[var(--text-secondary)] animate-fade-in">
            <h4 className="font-serif font-bold text-white text-sm">
              4 Szupergyors Módszer Ruhák Rögzítésére:
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-1.5">
                <span className="font-bold text-white text-xs flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                  <span>1. Fotózás / Kamera</span>
                </span>
                <p className="text-[11px] leading-relaxed">
                  Fotózd le a ruhát terítve vagy vállfán, természetes fényben. Az AI másodpercek alatt felismeri a kategóriát, színt és anyagot.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-1.5">
                <span className="font-bold text-white text-xs flex items-center gap-1.5">
                  <span>📋</span>
                  <span>2. Vágólap (Ctrl+V)</span>
                </span>
                <p className="text-[11px] leading-relaxed">
                  Bármelyik webshopban jobb klikk a ruhafotóra ➔ <em>"Kép másolása"</em>, majd nyomj <kbd className="px-1 py-0.5 bg-white/10 rounded font-mono text-[10px] text-white">Ctrl + V</kbd>-t az appban!
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-1.5">
                <span className="font-bold text-white text-xs flex items-center gap-1.5">
                  <span>🔗</span>
                  <span>3. Webshop URL Link</span>
                </span>
                <p className="text-[11px] leading-relaxed">
                  Másold be a termék linkjét (Zara, Massimo Dutti, Reserved, H&M, Mango). A rendszer automatikusan letölti a gyári képet és leírást.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-1.5">
                <span className="font-bold text-white text-xs flex items-center gap-1.5">
                  <span>🏷️</span>
                  <span>4. Termékkód (SKU)</span>
                </span>
                <p className="text-[11px] leading-relaxed">
                  Pl. Next Direct termékkódok (pl. <em>AA6536</em>). A rendszer 0 másodperc alatt kikeresi a CDN képet a gyári szerverekről.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: AI Stylist & Rétegezés */}
        {activeTab === 'stylist' && (
          <div className="space-y-4 text-xs text-[var(--text-secondary)] animate-fade-in">
            <div className="p-4 rounded-xl bg-black/40 border border-[var(--border-gold)]/60 space-y-2">
              <h4 className="font-serif font-bold text-white text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--accent-gold)]" />
                <span>3-Módú AI Stylist & Dress Code Motor</span>
              </h4>
              <p className="leading-relaxed">
                Az AI nem véletlenszerű darabokat dobál össze, hanem valós szabászati kódexek (Savile Row, Pitti Uomo) és az aktuális városi időjárás alapján dolgozik.
              </p>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-1.5">
                <h5 className="font-bold text-white text-xs">👔 Sartorial Rétegezési Anatómia:</h5>
                <p className="text-[11px] leading-relaxed">
                  Minden szett kötelezően tartalmaz egy bőrön hordható bázisréteget (ing vagy pamut póló), amelyre a pulóver (köztes réteg), zakó és hideg időben a téli szövetkabát épül.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-1.5">
                <h5 className="font-bold text-white text-xs">🚫 Gallér- és Rétegharmónia Szabályok:</h5>
                <ul className="space-y-1 pl-1 text-[11px] list-disc list-inside">
                  <li><strong>Ingdzseki (Overshirt):</strong> Szigorúan pólóval vagy kereknyakú finomkötöttel hordandó (tilos alá galléros inget venni).</li>
                  <li><strong>Garbó:</strong> Önmagában képez bázist zakó vagy kabát alatt.</li>
                  <li><strong>Meleg idő (≥19°C):</strong> Az AI automatikusan kizárja a csizmákat, vastag télikabátokat és téli kötötteket.</li>
                </ul>
              </div>

              <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-1.5">
                <h5 className="font-bold text-white text-xs">💬 Master Stylist Chat & Kézi Audit:</h5>
                <p className="text-[11px] leading-relaxed">
                  Közvetlenül beszélgethetsz az AI-val, aki ismeri az összes ruhádat, vagy a <em>Saját Szett</em> fülön összeválogatott szettedre kérhetsz 0-100%-os harmónia pontszámot és stílustuningot.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Vásárlási Tanácsadó */}
        {activeTab === 'advisor' && (
          <div className="space-y-4 text-xs text-[var(--text-secondary)] animate-fade-in">
            <div className="p-4 rounded-xl bg-black/40 border border-[var(--border-gold)]/60 space-y-2">
              <h4 className="font-serif font-bold text-white text-sm flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-[var(--accent-gold)]" />
                <span>4-Pilléres Vásárlási Döntéstámogató a Próbafülkében</span>
              </h4>
              <p className="leading-relaxed">
                Mielőtt megvennél egy ruhát, fotózd le vagy illeszd be a linkjét. Az AI megvédi a pénztárcádat az impulzusvásárlásoktól:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
              <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-1">
                <strong className="text-white">1. Pillér: Kombinálhatóság</strong>
                <p className="text-[var(--text-secondary)]">Azonnal generál 3 komplett outfitet az új darabból a már meglévő ruhatárad elemeivel.</p>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-1">
                <strong className="text-white">2. Pillér: Duplikáció Audit</strong>
                <p className="text-[var(--text-secondary)]">Figyelmeztet, ha már van nagyon hasonló darabod (pl. másik sötétbarna loafer), és hiánypótló alternatívát javasol.</p>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-1">
                <strong className="text-white">3. Pillér: Szabás & Illeszkedés</strong>
                <p className="text-[var(--text-secondary)]">Összeveti a szabást a gardróbod domináns sziluettjével, és konkrét méretválasztási tanácsot ad.</p>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-1">
                <strong className="text-white">4. Pillér: Anyagminőség</strong>
                <p className="text-[var(--text-secondary)]">Kiszűri az olcsó műszálakat (100% poliészter, PU műbőr), és a természetes szálakat részesíti előnyben.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
              <h5 className="font-bold text-white text-xs flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Mobil Web Share & Facebook böngésző megosztás:</span>
              </h5>
              <p className="text-[11px] leading-relaxed">
                Mobilon egy webshopban vagy Facebook böngészőben járva egyszerűen nyomj a <strong>"Megosztás"</strong> gombra, és válaszd a <strong>Sartorial Assistantot</strong>. Az app automatikusan megnyílik a Tanácsadó nézetben, és azonnal futtatja a 4-pilléres tesztet!
              </p>
            </div>
          </div>
        )}

        {/* Tab 6: Kapszula Ruhatár Audit */}
        {activeTab === 'capsule' && (
          <div className="space-y-4 text-xs text-[var(--text-secondary)] animate-fade-in">
            <div className="p-4 rounded-xl bg-black/40 border border-[var(--border-gold)]/60 space-y-2">
              <h4 className="font-serif font-bold text-white text-sm flex items-center gap-2">
                <span>🧩</span>
                <span>Kapszula Ruhatár Index & Gap Elemzés</span>
              </h4>
              <p className="leading-relaxed">
                A kapszula ruhatár lényege: minimális számú, egymással maximálisan kombinálható, minőségi alapdarab birtoklása.
              </p>
            </div>

            <div className="space-y-2.5">
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-1">
                <strong className="text-white text-xs">Hogyan számolja az AI a hiányzó kulcsdarabokat?</strong>
                <p className="text-[11px] leading-relaxed">
                  Megvizsgálja a kategóriák lefedettségét és állapotát. Ha például 0 db őszi/téli cipőd van (nincs Chelsea csizma vagy meleg bőrlábbeli), azonnal <strong>1. prioritású kritikus hiányként</strong> jelöli meg.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-1">
                <strong className="text-white text-xs">Telítettségi Védelem (Category Saturation Guard):</strong>
                <p className="text-[11px] leading-relaxed">
                  Ha egy kategóriából (pl. fehér ingek) már több darabod van, az AI nem ajánl újabbat, amíg az alapkategóriák (pl. meleg nadrág, télikabát) nincsenek lefedve.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-1">
                <strong className="text-white text-xs">Közvetlen Teszt a Tanácsadóban:</strong>
                <p className="text-[11px] leading-relaxed">
                  A hiányzó darabok kártyáján lévő <em>"Tesztelés a Tanácsadóban"</em> gombra kattintva azonnal ellenőrizheted, hogyan illeszkedne a ruhatáradba a kiszemelt kulcsdarab.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs text-[var(--text-muted)]">
          <span>Sartorial Wardrobe Assistant • Gemini 3.7 Flash AI</span>
          <button
            onClick={onClose}
            className="btn-gold py-1.5 px-4 text-xs font-semibold"
          >
            Rendben, Megértettem
          </button>
        </div>

      </div>
    </div>
  );
}
