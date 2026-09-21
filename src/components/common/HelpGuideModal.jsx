import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Compass, Sparkles, Camera, Shirt, Sliders, CheckCircle2, 
  ShoppingBag, Layers, AlertCircle, Bookmark, Feather, ShieldCheck,
  ExternalLink, Smartphone, MessageSquare, BookOpen, RefreshCw, Scissors
} from 'lucide-react';
import AppLogo from './AppLogo';

export default function HelpGuideModal({ isOpen, onClose, defaultTab = 'rules' }) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  if (!isOpen) return null;

  const tabs = [
    { id: 'rules', label: '🍂 Ruhatárépítés', icon: '🍂' },
    { id: 'dna', label: '📸 Színtípus & DNS', icon: '📸' },
    { id: 'upload', label: '⚡ Ruhafelvitel', icon: '⚡' },
    { id: 'stylist', label: '👔 AI Stylist', icon: '👔' },
    { id: 'advisor', label: '🛍️ Próbafülke / Vásárlás', icon: '🛍️' },
    { id: 'capsule', label: '🧩 Hiányzó Darabok', icon: '🧩' }
  ];

  return createPortal(
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-[#0a0e17] border border-slate-800 rounded-3xl shadow-2xl flex flex-col my-auto max-h-[85vh] overflow-hidden"
      >
        
        {/* Sticky Header & Tabs */}
        <div className="shrink-0 p-4 sm:p-6 pb-3 border-b border-slate-800 bg-[#0a0e17] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AppLogo className="w-9 h-9 shrink-0 shadow-md" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                    Stílustanácsadó Tudásbázis
                  </span>
                  <span className="text-[10px] text-slate-400">AI Stílustanácsadó</span>
                </div>
                <h3 className="text-lg sm:text-xl font-serif font-bold text-white mt-0.5">
                  Használati Útmutató & Stílus Kódex
                </h3>
              </div>
            </div>

            <button 
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-[#0d121c] border border-slate-800 transition-colors cursor-pointer"
              title="Bezárás"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === t.id
                    ? 'bg-slate-200 text-slate-950 font-bold shadow'
                    : 'bg-[#0d121c] text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Tab Content Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4 scrollbar-thin">

          {/* Tab 1: Ruhatárépítés Aranyszabályai */}
          {activeTab === 'rules' && (
            <div className="space-y-4 text-xs text-slate-300 animate-fade-in">
              <div className="p-4 rounded-2xl bg-[#0d121c] border border-amber-500/30 space-y-2">
                <h4 className="font-serif font-bold text-amber-300 text-sm flex items-center gap-2">
                  <span>🍂</span>
                  <span>1. Kezdd a mostani szezonális ruháiddal!</span>
                </h4>
                <p className="leading-relaxed text-slate-300">
                  Nem szükséges egyszerre az egész szekrényt berögzítened. Kezdd azokkal a ruhadarabokkal, amelyeket az <strong>aktuális évszakban (pl. tavasz/nyár vagy ősz/tél) rendszeresen hordasz</strong>. Így az AI Stylist azonnal képes lesz a mai időjárásra tökéletes, hordható szetteket ajánlani.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-[#0d121c] border border-slate-800 space-y-2">
                  <h4 className="font-serif font-bold text-white text-sm flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>2. Valós ruhaállapot beállítása</span>
                  </h4>
                  <p className="leading-relaxed text-slate-400">
                    Feltöltéskor vizsgáld meg a ruha állapotát:
                  </p>
                  <ul className="space-y-1 pl-1 text-[11px] list-disc list-inside text-slate-300">
                    <li><strong>Vadonatúj / Megkímélt:</strong> elegáns és üzleti alkalmakra is beválogatja az AI.</li>
                    <li><strong>Játszós / Kopott:</strong> az AI csak otthoni vagy laza szettekhez veszi számításba.</li>
                    <li><strong>Lecserélendő / Javításra vár:</strong> az AI figyelembe veszi a pótlási listán!</li>
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-[#0d121c] border border-slate-800 space-y-2">
                  <h4 className="font-serif font-bold text-white text-sm flex items-center gap-2">
                    <Scissors className="w-4 h-4 text-amber-400" />
                    <span>3. Méret & Illeszkedés prioritás</span>
                  </h4>
                  <p className="leading-relaxed text-slate-400">
                    <strong>Csak olyan ruhát rögzíts, ami ma is jó rád!</strong> A kinőtt, kényelmetlen darabokat ne vedd fel, hogy a Stylist kizárólag olyan szetteket javasoljon, amelyekben magabiztosan érzed magad.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#0d121c] border border-slate-800 space-y-1.5">
                <h5 className="font-bold text-white text-xs">💡 Pro Tipp:</h5>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Minden ruhához érdemes megadni a <strong>márkát</strong> és a <strong>méretet</strong> is (pl. <em>Massimo Dutti - 50 / M</em>, <em>Eton - 40</em>, <em>Zara - 32/32</em>). A Stílus DNS ebből automatikusan felépíti a személyes mérettérképedet, ami új ruhák vásárlásakor megmondja a pontos ajánlott méretedet!
                </p>
              </div>
            </div>
          )}

          {/* Tab 2: Színtípus & Stílus DNS */}
          {activeTab === 'dna' && (
            <div className="space-y-4 text-xs text-slate-300 animate-fade-in">
              <div className="p-4 rounded-2xl bg-[#0d121c] border border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-amber-400" />
                  <h4 className="font-serif font-bold text-white text-sm">
                    AI Színtípus Meghatározás Természetes Fényű Szelfiből
                  </h4>
                </div>
                <p className="leading-relaxed text-slate-300">
                  Készíts egy szelfit természetes ablakfényben (smink és napszemüveg nélkül). A <strong>fejlett látás- és színelemző AI</strong> elemzi a bőröd alaptónusát (hideg/meleg), a szemed és hajad kontrasztját, és besorol a 12 évszakos színelméletbe (pl. <em>Meleg Ősz</em>, <em>Lágy Nyár</em>, <em>Sötét Tél</em>).
                </p>
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200">
                  ✦ <strong>Automatikus integráció:</strong> A meghatározott színpaletta automatikusan frissíti a kedvenc színeidet, és az AI Stylist előnyben részesíti ezeket a szettek összeállításakor!
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#0d121c] border border-slate-800 space-y-2">
                <h4 className="font-serif font-bold text-white text-sm flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  <span>Egyéni Stílusszabályok (Szabad Szöveges Tanítás)</span>
                </h4>
                <p className="leading-relaxed text-slate-400">
                  A Stílus DNS felületen szabadon megfogalmazhatsz bármilyen szabályt magyarul:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                  <div className="p-2.5 rounded-xl bg-[#070a12] border border-rose-500/30 text-rose-300">
                    ❌ <em>"Nem szeretem a galléros pólóingeket"</em>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#070a12] border border-emerald-500/30 text-emerald-300">
                    ✅ <em>"Csak 100% természetes anyagok (gyapjú, len, pamut)"</em>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#070a12] border border-rose-500/30 text-rose-300">
                    ❌ <em>"Kerülöm a túl szűk nadrágokat"</em>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#070a12] border border-emerald-500/30 text-emerald-300">
                    ✅ <em>"Zakóhoz mindig hosszú ujjú inget hordok"</em>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 pt-1">
                  Az AI minden szettgenerálásnál és vásárlási ellenőrzésnél azonnal érvényesíti ezeket a szabályokat!
                </p>
              </div>
            </div>
          )}

          {/* Tab 3: Ruhafelvitel */}
          {activeTab === 'upload' && (
            <div className="space-y-4 text-xs text-slate-300 animate-fade-in">
              <h4 className="font-serif font-bold text-white text-sm">
                4 Szupergyors Módszer Ruhák Rögzítésére:
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-[#0d121c] border border-slate-800 space-y-1.5">
                  <span className="font-bold text-white text-xs flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-amber-400" />
                    <span>1. Fotózás / Kamera</span>
                  </span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Fotózd le a ruhát terítve vagy vállfán, természetes fényben. Az AI másodpercek alatt felismeri a kategóriát, színt és anyagot.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#0d121c] border border-slate-800 space-y-1.5">
                  <span className="font-bold text-white text-xs flex items-center gap-1.5">
                    <span>📋</span>
                    <span>2. Vágólap (Ctrl+V)</span>
                  </span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Bármelyik webshopban jobb klikk a ruhafotóra ➔ <em>"Kép másolása"</em>, majd nyomj <kbd className="px-1 py-0.5 bg-slate-800 rounded font-mono text-[10px] text-white">Ctrl + V</kbd>-t az appban!
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#0d121c] border border-slate-800 space-y-1.5">
                  <span className="font-bold text-white text-xs flex items-center gap-1.5">
                    <span>🔗</span>
                    <span>3. Webshop URL Link</span>
                  </span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Másold be a termék linkjét (Zara, Massimo Dutti, Reserved, H&M, Mango). A rendszer automatikusan letölti a gyári képet és leírást.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#0d121c] border border-slate-800 space-y-1.5">
                  <span className="font-bold text-white text-xs flex items-center gap-1.5">
                    <span>🏷️</span>
                    <span>4. Next Direct Termékkód</span>
                  </span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Írd be a 6 jegyű kódot (pl. <code className="text-amber-400 font-bold">AA6536</code>). A rendszer másodperc-töredék alatt betölti a nagyfelbontású CDN fotót.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: AI Stylist */}
          {activeTab === 'stylist' && (
            <div className="space-y-4 text-xs text-slate-300 animate-fade-in">
              <div className="p-4 rounded-2xl bg-[#0d121c] border border-slate-800 space-y-2">
                <h4 className="font-serif font-bold text-white text-sm flex items-center gap-2">
                  <Shirt className="w-4 h-4 text-amber-400" />
                  <span>Alkalomhoz és Időjáráshoz Hangolt Szettgenerálás</span>
                </h4>
                <p className="leading-relaxed text-slate-300">
                  Az AI Stylist a helyi hőmérséklet, a napszak és az esemény kulturális elvárásai szerint válogatja össze a darabjaidat:
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="p-3.5 rounded-2xl bg-[#0d121c] border border-slate-800 space-y-1">
                  <strong className="text-white text-xs flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-400" />
                    <span>Kötelező Bázisréteg & Anatómiai Rétegzés:</span>
                  </strong>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Minden szett tartalmaz egy bőrön hordható felsőt (ing vagy prémium pamut póló). Erre rétegződik a pulóver, majd a zakó vagy kabát.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#0d121c] border border-slate-800 space-y-1">
                  <strong className="text-white text-xs">🔒 Fixált Kulcsdarab Tervezés:</strong>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Kiválaszthatsz egy meglévő kedvenc darabot (pl. egy új zakót), és az AI garantáltan köré építi fel mind a 3 szettvariációt.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 5: Vásárlási Tanácsadó */}
          {activeTab === 'advisor' && (
            <div className="space-y-4 text-xs text-slate-300 animate-fade-in">
              <div className="p-4 rounded-2xl bg-[#0d121c] border border-slate-800 space-y-2">
                <h4 className="font-serif font-bold text-white text-sm flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-amber-400" />
                  <span>Vásárlás Előtti 4-Pilléres Döntéstámogatás</span>
                </h4>
                <p className="leading-relaxed text-slate-300">
                  Fotózz a próbafülkében vagy illessz be egy webshop linket! Az AI elemzi:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-[#0d121c] border border-slate-800 space-y-1">
                  <span className="font-bold text-white text-xs">1. Kombinálhatóság (3 Szett)</span>
                  <p className="text-[11px] text-slate-400">Összeállít 3 komplett szettet a meglévő gardróboddal.</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#0d121c] border border-slate-800 space-y-1">
                  <span className="font-bold text-white text-xs">2. Duplikáció & Lefedettség</span>
                  <p className="text-[11px] text-slate-400">Figyelmeztet, ha már van hasonló darabod.</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#0d121c] border border-slate-800 space-y-1">
                  <span className="font-bold text-white text-xs">3. Személyes Szabályok & Illeszkedés</span>
                  <p className="text-[11px] text-slate-400">Összeveti a stílusszabályaiddal és szabási preferenciáiddal.</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#0d121c] border border-slate-800 space-y-1">
                  <span className="font-bold text-white text-xs">4. Anyagminőség & Műszál Audit</span>
                  <p className="text-[11px] text-slate-400">Kiszűri a nem lélegző műszálakat.</p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 6: Hiányzó Darabok */}
          {activeTab === 'capsule' && (
            <div className="space-y-4 text-xs text-slate-300 animate-fade-in">
              <div className="p-4 rounded-2xl bg-[#0d121c] border border-slate-800 space-y-2">
                <h4 className="font-serif font-bold text-white text-sm flex items-center gap-2">
                  <span>🧩</span>
                  <span>Hiánylista & Stratégiai Kulcsdarabok</span>
                </h4>
                <p className="leading-relaxed text-slate-300">
                  A cél: minimális számú, egymással maximálisan kombinálható, minőségi alapdarab birtoklása.
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="p-3.5 rounded-2xl bg-[#0d121c] border border-slate-800 space-y-1">
                  <strong className="text-white text-xs">Hogyan számolja az AI a hiányzó kulcsdarabokat?</strong>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Megvizsgálja a kategóriák lefedettségét és állapotát. Ha például 0 db őszi/téli cipőd van, azonnal <strong>1. prioritású kritikus hiányként</strong> jelöli meg.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#0d121c] border border-slate-800 space-y-1">
                  <strong className="text-white text-xs">Telítettségi Védelem (Category Saturation Guard):</strong>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Ha egy kategóriából (pl. fehér ingek) már több darabod van, az AI nem ajánl újabbat, amíg az alapkategóriák nincsenek lefedve.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#0d121c] border border-slate-800 space-y-1">
                  <strong className="text-white text-xs">Közvetlen Teszt a Tanácsadóban:</strong>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    A hiányzó darabok kártyáján lévő <em>"Tesztelés a Tanácsadóban"</em> gombra kattintva azonnal ellenőrizheted, hogyan illeszkedne a ruhatáradba a kiszemelt kulcsdarab.
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Sticky Footer */}
        <div className="shrink-0 p-4 sm:p-6 pt-3 border-t border-slate-800 bg-[#0a0e17] flex items-center justify-between text-xs text-slate-400">
          <span>AI Wardrobe Assistant</span>
          <button
            onClick={onClose}
            className="bg-slate-200 hover:bg-white text-slate-950 font-bold py-1.5 px-4 text-xs rounded-xl shadow transition-colors cursor-pointer"
          >
            Rendben, Megértettem
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
