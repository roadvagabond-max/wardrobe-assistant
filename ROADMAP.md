# 🗺️ Sartorial Wardrobe Assistant — Fejlesztési Útiterv & Feladatlista (Roadmap & Backlog)

Ez a dokumentum rögzíti az **AI Wardrobe Assistant** projekt javítandó feladatait, technikai adósságait, valamint a tervezett jövőbeli funkciókat és mérföldköveket.

---

## 📌 Jelenlegi Státusz
- **Aktuális Verzió:** `v1.7.9` (Production Build)
- **Architektúra:** React (Vite) + Tailwind CSS + Firebase Cloud Functions v2 (Node.js 22 Proxy) + Google Gemini 3.x + Google Cloud Secret Manager + Cloud Firestore + Firestore Persistent Offline Cache.
- **Éles URL:** [https://wardrobe-assistant-48e01.web.app/](https://wardrobe-assistant-48e01.web.app/)

---

## 🛠️ I. Javítandó Tételek & Technikai Finomhangolások (Tech Debt & Fixes)

### ✅ Lezárt Javítások (v1.5.4 – v1.7.9)
- [x] **Mix & Match Képkeret Összeomlás Javítás, Időjárás Leválasztás & Közvetlen Szettmentés (v1.7.9):**
  - **Képkeret Összeomlás Megszüntetése:** A mobilos Flexboxban összeomló `aspect-square` kiváltása robusztus fix magasságú konténerrel (`h-56 sm:h-64` kártya, `h-36 sm:h-44 shrink-0` képkeret).
  - **Univerzális Hotlinking & Offline SVG Védelem:** `<meta name="referrer" content="no-referrer">` és `referrerPolicy="no-referrer"` bevezetése a harmadik feles CDN képeknél (Next, Zara), valamint 100%-ban helyi, hálózattól független dinamikus SVG helyettesítő ikon (`createGarmentSvgPlaceholder`) minden ruha típusra és színre.
  - **Időjárás Teljes Eltávolítása a Fejlécből:** A kilógó `Budapest, 21°C` panel eltávolítva a Mix & Match fejlécéből. A Mix & Match audit nem veszi figyelembe az időjárást alapértelmezetten, kizárólag ha a felhasználó kifejezetten megadja az esemény szövegében.
  - **Közvetlen Szettmentés (Konfetti Nélkül):** A vásznon és az értékelő sávon közvetlen `[ 💾 Mentés ]` gomb jelent meg, amely audit nélkül is azonnal elmenti a szettet Cloud Firestore-ba és LocalStorage-ba csendes luxus stílusú visszajelzéssel (zero confetti).
  - **Mentett Szettek Fiók & Betöltés:** A fejlécből elérhető a `[ 🔖 Mentett szettek ]` fiók, amely egyetlen kattintással visszatölti az összeállítást a vászonra (`ensembleSnapshot`).
- [x] **Mix & Match Lookbook Flatlay, Belső Webshop Képmentés & Tisztítás (v1.7.8):**
  - **Tiszta Fejléc & Jobb Felső Időjárás:** Felesleges címkék, nagyméretű cím és leírás törlése. Az időjárás widget a jobb felső sarokba került, mellette diszkrét `(i)` segítség-visszahívó gombbal.
  - **Stabil Módválasztó (Zero Jumping Toggle):** A `[ 🧩 Mix & Match ]` és `[ 💬 AI Stylist ]` gombok fixen a bal és jobb oldalon rögzítve, sosem ugrálnak át egymás pozíciójára.
  - **Webshop Képek Belső Base64 Mentése:** Linkes importáláskor a termékfotót a rendszer letölti, letömöríti (520×520 @ 0.72) és Base64-ként menti a Cloud Firestore-ba; megszűnt a külső webshop-link függőség a saját ruhatárban.
  - **Bemutató Képjavítás:** Az elavult Unsplash fehér ing link javítva aktív fotóra, minden képen univerzális `onError` fallbackkel.
  - **Kompakt Rétegezés:** Alapból egyetlen nagy kártya, további rétegekhez pedig csupán 1 db kompakt kis `[ + ]` gomb (nincsenek üres nagy mezők).
  - **Tiszta Lookbook Flatlay Élmény:** Szöveges zóna-fejlécek és képaláírások törölve, szűkített térközök (`gap-2`), a kezelőszervek pedig közvetlenül a fotón lévő lebegő sarok-ikonokká váltak (jobb felső `(×)`, jobb alsó `(🔄)`).
  - **„Sartorial” Szó Kiszűrése:** Az AI válaszaiból a kifejezés automatikusan törölve / magyarosítva.
  - **Pontszámsáv Túlcsordulás Javítása:** `shrink-0 whitespace-nowrap` rögzítés a `Részletek ▾` gombon, kizárva a keretből való kicsúszást.
- [x] **Mix & Match Anatómiai Sziluett Vászon & Minimalista Galéria (v1.7.7):**
  - **Obszidián & Titán-Ezüst Paletta:** Az arany színek teljes kivezetése a modulból, mélyfekete és pala háttérrel, platina és titán élfénnyel.
  - **Anatómiai Sziluett Vászon:** Vertikális testzónák (Felsőtest $\rightarrow$ Alsótest $\rightarrow$ Lábbeli) és horizontális rétegek (max. 4 felső réteg `[+ Réteg]` gombbal; Férfi vs Női sziluettek).
  - **Intelligens Egyberuha Integráció:** Női sziluettnél egyberuha kiválasztásakor automatikus felső- és alsótest integráció külön gombváltás nélkül.
  - **Kiegészítők & Zoknik Anatómiai Helye:** Karóra a felsőnél, Deréköv a deréknál, Táska az alsónál, Zokni/Harisnya a lábbeli mellett.
  - **`createPortal` Alapú Tiszta Fotóválasztó:** 2-oszlopos tiszta képrács közvetlenül a `document.body`-ra csatolva, véglegesen felszámolva a mobilos fejléc-levágási és görgetési hibákat.
  - **Opcionális Esemény & 1-Kattintásos Törlés:** `(×)` törlés és gyors chipek; ha üres, az AI a személyes Stílus DNS és az időjárás belső harmóniáját elemzi merev dress code nélkül.
  - **Dinamikus Élfénnyel Rendelkező Értékelő Sáv & Felcsúszó Fiók:** Smaragd zöld ($\ge 85\%$), borostyánsárga ($70-84\%$), korall-piros ($< 70\%$) sávos glow és felcsúszó Bottom Sheet a teljes szöveges indoklással és mentéssel.
  - **Nulla Natív Alert UX:** Böngészős felugrók helyett elegáns lebegő titán toast validáció előtagok nélkül.
- [x] **Felugró Ablakok Viewport Pozicionálása & Fejléc Levágás Megszüntetése (v1.7.6):**
  - Mobilon az összes felugró ablak (`ProfileEditModal`, `HelpGuideModal`, `AddClothingModal`, `OnboardingModal`, `ItemDetailModal`, `GarmentLightboxModal`, `OutfitsView` és `StylistView` modalok) külső wrapperén `items-start sm:items-center` és felső margó (`pt-4 sm:pt-6`), valamint `overflow-y-auto overscroll-contain` került bevezetésre.
  - A modal kártyák dinamikus `max-h-[calc(100dvh-2rem)] sm:max-h-[88vh]` magasságot kaptak fix, látható fejléccel (`shrink-0`) és önállóan gördülő belső tartalommal (`flex-1 overflow-y-auto overscroll-contain`).
  - Megszűnt a Flexbox Centering Scroll Trap jelenség: a fejléc, a cím és a bezáró `(X)` gomb bármilyen mobil kijelzőn és dinamikusan változó böngészős címsor mellett is azonnal, görgetés nélkül látható és kattintható.
- [x] **Tab 4 Átpozicionálás: 🧩 Mix & Match (Főképernyő) & Másodlagos Chat (v1.7.5):**
  - A 4. tab neve „Mix & Match” (`BottomNav.jsx` és `DesktopTabs.jsx`, ikon: `SlidersHorizontal`).
  - Alapértelmezett nézet a 6-slotos manuális szettépítő és valós idejű audit.
  - A fejlécből egyetlen kattintással elérhető a másodlagos Master Stylist Chat nézet és fordítva, a választott mód megőrzésével (`StylistView.jsx`).
- [x] **Tömör Decision Badges & Lenyitható Magyarázatok a Szettkártyákon (v1.7.5):**
  - Mobilon azonnal átlátható, egysoros döntési jelvény (`decisionBadge`) renderelése a kártyák tetején (`OutfitsView.jsx`).
  - A hosszú magyarázó szövegek (`culturalFitReasoning`, `layeringAdvice`) lenyitható harmonikába rendezése a mobilos képernyőterület kímélése érdekében.
  - A `decisionBadge` mentése a `SavedOutfit` rekordokba.
- [x] **„Quiet UI” Színvilág & Felugró Ablakok Viewport Pozicionálása (v1.7.5):**
  - A korábbi élénk sárga-arany tónusok tompítása visszafogott, elegáns pezsgő/homok aranyra (`#c5a880` / `#d4af37`), mély obszidián-pala háttér gradienssel (`#0a0e17`, `index.css`).
  - **Felugró ablakok viewport fókuszálása:** A `GarmentLightboxModal`, `ItemDetailModal`, `showAnchorModal`, `itemSwapModal` és `slotPickerModal` mobilon azonnal a képernyő fókuszába nyílnak meg (`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md overscroll-contain`), automatikus háttér-görgetés zárolással (`body overflow: hidden`), megszüntetve a fekete képernyőn való fel-le keresgélést.
- [x] **Női Ruha (Dress) Rétegezési Hiba & Egyberuha Szabályjavítás (v1.7.4):**
  - `isDress(item)` egyrészes ruhafelismerő az anatómiai motorban (`enforceAnatomicalOutfitLayers`, `gemini.js`).
  - Egyberuha esetén a külön alsórész (nadrág, szoknyanadrág, farmer, szoknya) és felesleges bázisfelső automatikus kizárása/eltávolítása; csak felöltő (blézer, kardigán, kabát), cipő és kiegészítők engedélyezettek.
  - Szigorú prompt tiltás a `generateEventOutfits` utasításban az egyberuha + alsórész társítására.
- [x] **Stylist Chat Vásárlási & Színválasztási Döntési Protokoll (Zero-Redundancy, v1.7.4):**
  - Kategória-szintű duplikáció szűrés (Zero-Redundancy Rule): létező kategória-színt (pl. bézs kötöttáru) tilos No. 1 helyre tenni új vásárlásnál.
  - Kromatikus űr elemzés (Color Gap): hiányzó színek (pl. Navy kötöttáru, ha 0 db van) maximális prioritása.
  - Döntési sorrend szigorítása: 1. Kategória Gap/Redundancia audit $\rightarrow$ 2. Színtípus $\rightarrow$ 3. Nadrág-kontraszt.
- [x] **Kliens Konfiguráció & API Kulcsok Tisztítása (v1.7.4):**
  - `VITE_GEMINI_API_KEY` sor eltávolítva a kliens `.env` és `.env.example` fájljaiból; a rendszer 100%-ban szerveroldali Firebase Cloud Functions v2 (`sartorialAiProxy`) proxy-t használ Secret Managerből védett mesterkulccsal.
- [x] **Golden Eval Suite (TC-1 – TC-6) Minőségbiztosítási Futtató (v1.7.4):**
  - Új [test_eval.mjs](file:///c:/Users/Attila/.gemini/antigravity-ide/scratch/wardrobe-assistant/test_eval.mjs) parancssori futtató és `"test:eval"` script a `package.json`-ban.
  - Interaktív, egykattintásos böngészős tesztgomb a Stílusprofil `SartorialKnowledgeHub` felületén.
- [x] **5-Lépéses Onboarding Varázsló & Kezdő Segítség Átfogó Felülvizsgálata (v1.7.3):**
  - Életkor alapú intelligens demográfiai profilozás, dinamikus korosztály-jelvény, gyermekeknél ($<13$ év) a felnőtt sziluettek elrejtése.
  - Varázsló sikeres befejezésekor arany-zöld konfetti animáció (`canvas-confetti`) és részletes összegzés.
  - Stílusprofil hivatkozás javítása a főoldali teendőlistában (`OnboardingGuide.jsx`).
- [x] **Súgó Redundanciák Megszüntetése (v1.7.3):**
  - A `PurchaseAdvisorView.jsx`-ből a duplikált modul-súgó kivezetve, helyette csak a lenyitható 4-pilléres harmonika maradt.
- [x] **Szigorú Szóhasználati Tisztítás (UI Terminology Sunset v1.7.3):**
  - A „Sartorial”, „Hub” és „Anatómiai” kifejezések teljes körű kivezetése a felhasználói felületről; helyettük tiszta és természetes magyar kifejezések: *AI Stílustanácsadó, AI Wardrobe Assistant, Szakértői Vélemény, Stílusszabályok, Kiegyensúlyozott rétegrend, Központ*.
- [x] **„Megvegyem?” Átnevezés, „Audit” Szó Kivezetése & UI Letisztítás (v1.7.2):**
  - A korábbi technikai „Vásárlási Döntésteszt / Audit” helyett emberközeli, világos megnevezés: **„Megvegyem? (Nézzük meg, mennyire érdemes megvenned a kiszemelt darabot!)”** és **„Megvegyem? Elemzés és Szett-ötletek Indítása”**.
  - Az „Audit” szó (Stílus Audit, Szabás Audit, Minőségi Audit stb.) teljes kivezetése a felhasználói felületről, a navigációs sávokról (`BottomNav.jsx`, `DesktopTabs.jsx`), a 6-slotos szettépítőről és a tudástárból; helyette természetes kifejezések: *Elemzés, Stílus-ellenőrzés, Szakértői vélemény, Összhang-vizsgálat, Kiértékelés*.
  - A belső technikai AI modellnevek („Gemini 3.7 Flash”, „Gemini 3.5 Flash”) elrejtése a felületi címkékből, helyettük tiszta *„Sartorial AI”*, *„AI Stylist”* és *„AI”* megnevezések.
- [x] **Felesleges Technikai Állapotjelzők és Címkék Eltávolítása (v1.7.2):**
  - A felhasználói felület letisztítása a felesleges, zavaró technikai badge-ektől (pl. `PurchaseAdvisorView.jsx`-ben az *„Egyéni stílusszabály-ellenőrzés aktív (X)”* nyers tömbdoboz törlése, a navigációs „Audit” badge-ek megszüntetése).
- [x] **Magyarázó Blokkok Lenyithatóvá Tétele (Collapsible Accordion v1.7.2):**
  - A `PurchaseAdvisorView.jsx`-ben lévő 4-pilléres edukációs kártya (*„Hogyan segít az AI megelőzni a rossz vásárlási döntéseket?”*) átalakítása modern, helytakarékos lenyitható harmonika (accordion) dobozzá, felszabadítva a mobilos képernyőterületet a közvetlen fotózáshoz és képbeillesztéshez.
- [x] **Stílusprofil Fekete Képernyő Javítása & Globális Error Boundary (v1.7.1):**
  - A `src/services/capsuleAnalytics.js` cipő szezonalitás vizsgálatában a tömb típusú `season` mező `.toLowerCase()` hibájának javítása (`Array.isArray(shoe.season) ? shoe.season.join(' ') : String(shoe.season || '')`).
  - Teljes null-safety és típusvédelem a `WardrobeAnalyticsCard`, `ProfileIdentityCard`, `StyleDNAView` és `SartorialKnowledgeHub` komponensekben.
  - Új React `ErrorBoundary` komponens (`src/components/common/ErrorBoundary.jsx`) bevezetése az `App.jsx` fő nézetei köré, ami garantálja, hogy egy esetleges renderelési hiba esetén se jelenhessen meg üres fekete képernyő.
- [x] **Firebase Fióktörlés & Re-autentikáció Javítása (GDPR Auth Sync v1.7.0):**
  - Kötelező jelszó-megerősítés (Re-authentication) vagy Google OAuth újrahitelesítés fióktörlés előtt, kizárva a Firebase `auth/requires-recent-login` hibát.
  - Tiszta műveleti sorrend: a Firestore adatok és az Authentication rekord csak sikeres újrahitelesítés után törlődnek, megszüntetve a későbbi `auth/email-already-in-use` árva fiók hibát.
  - Pontos, barátságos magyar nyelvű hibakezelés jelszóhiba vagy megszakítás esetén.
- [x] **4-Pilléres Kapszula Ruhatár Index & Új Értékelési Formula (`src/services/capsuleAnalytics.js`, v1.7.0):**
  - **1. Pillér (35 pont):** Alap Ruhatár Egyensúly (felsők, alsók, cipők és harmóniaarány).
  - **2. Pillér (25 pont):** Szezonális & Lábbeli Egészség (meleg vs hideg lábbelik megléte és rétegzési készültség).
  - **3. Pillér (20 pont):** Ruhaállapot & Hordhatóság (kiváló és jó állapotú ruhák aránya).
  - **4. Pillér (20 pont):** Anyagminőség (prémium természetes szálak és lélegző szövetek aránya).
  - Lenyitható 4-pilléres részletező fiók (`WardrobeAnalyticsCard.jsx`), színkódolt pontszámok és azonnali cselekvési tippek.
- [x] **Férfi Stílusszabályok Kategorizálása & 4-Dimenziós Szabálymátrix (`sartorialRules.js`, `SartorialKnowledgeHub.jsx`, v1.7.0):**
  - Külön `menswear_specific` („👔 Férfi Stílusszabályok”) kategória létrehozása és beépítése a Tudástárba.
  - 4D szabályszűrés (Nem, 5 Korosztály, Stílusarchetipusok, Egyéni Szabályok) valamennyi szabályon.
  - Új klasszikus férfi stílusszabályok (Hajtóka vs nyakkendő arány, nadrágtörés, nadrágtartó vs öv, zakó gombolási etika).
- [x] **Több-Felhasználós & Mobil Fiókváltási Adatizoláció (v1.7.0):**
  - Az Onboarding Varázsló (`OnboardingModal.jsx`) memóriaszivárgásának megszüntetése fiókváltáskor (tiszta form reset).
  - Felhasználó-specifikus LocalStorage kulcsok (`sartorial_guide_dismissed_${moduleId}_${uid}`, `sartorial_onboarding_*_${uid}`).
  - Automatikus állapotürítés és szinkronizáció kijelentkezéskor és fiókváltáskor a Stylist, Outfit, Gap Elemző és Chat nézetekben.
- [x] **Demográfiai Intelligencia, 5 Hivatalos Korosztály & Rugalmas Adaptív Stylist (v1.7.0):**
  - Központi demográfiai modul (`src/services/demographics.js`), dinamikus életkorszámítás születési év (`birthYear`) alapján.
  - Szigorúan két nemi kategória (`👔 Férfi` és `👗 Női`), nyers életkori címkék („kisiskolás”, „kamasz”) elrejtése a felhasználói felületről.
  - 5 hivatalos korosztály támogatása (Csecsemő/baba 0–2 év, Bölcsődés/óvodás 3–6 év, Kisiskolás 7–12 év, Kiskamasz/tini 13–18 év, Felnőtt 19+ év).
  - Felnőtteknél rugalmas & tanuló stílusmotor merev zakókényszer nélkül, laza/streetwear szetteknél sneaker + pamutfelső + nadrág teljes értékű kezelése.
  - Dinamikus stylist gyorsgombok és korosztály-függő esemény presetek a Stylist és Outfit modulokban.
  - Gemini AI motor (`gemini.js`) átfogó felkészítése a demográfiai szabályokra a Chat, Outfit Generátor, Manuális Audit, Gap Elemző és Vásárlási Tanácsadó rétegekben.
- [x] **Kanonizált Színintelligencia & 3-Szintű Színkezelési Logika (v1.6.1):**
  - Tiszta lap az új felhasználóknak (`favoriteColors: []` alapértelmezés).
  - Kanonizált szín-normalizáló és deduplikáló motor (`normalizeColorName`, `areColorsMatching`, `deduplicateColors`), amely megszünteti a zárójeles és magyar nevek álduplikációit (pl. `'Sötétkék (Navy)'` vs. `'Sötétkék'`).
  - Tiszta beállítás (Replace) az elszálló merge helyett AI fotóelemzéskor és évszaktípus választáskor.
  - Fókuszált 4–5 színű kapszula paletták (2–3 semleges bázis + 1–2 akcentus).
  - A feltöltött ruhák valós színkészletének (`Wardrobe Color Inventory`) világos elválasztása az egyéni kedvencektől (`DynamicColorPaletteCard.jsx`), egykattintásos `+` kedvenccé tétellel és $\ge 3$ darabos intelligens megjelenítési feltétellel.
  - Tiszta prompt formázás a `gemini.js`-ben fiktív beégetett színek nélkül.
- [x] **Onboarding Munkafolyamat & Kategória-Érzékeny Szettkészültségi Rendszer (v1.6.0):** 5-lépéses interaktív Onboarding Varázsló (`OnboardingModal.jsx`, `StepIdentity.jsx`, `StepColorSeason.jsx`, `StepStyles.jsx`, `StepAddFirstItem.jsx`, `StepSummaryLaunch.jsx`), kötelező Név/Nem validációval, teljes Skip lehetőséggel, női és férfi stílusarchetipusokkal, beépített 1. ruha felvitellel, valamint kategória-érzékeny szettkészlet ellenőrzéssel (min. 1 felső, 1 alsó, 1 cipő) és `ModuleFirstTimeGuide.jsx` modul-tájékoztatókkal.
- [x] **Stílusprofil Modul Átfogó Rendbetétele & Moduláris Felbontása (v1.5.9):** A korábbi 1280 soros monolitikus kód felbontása 8 tiszta alkomponensre (`ProfileIdentityCard`, `ProfileEditModal`, `ColorSeasonCard`, `DynamicColorPaletteCard`, `WardrobeAnalyticsCard`, `CustomRulesCard`, `SartorialKnowledgeHub`, `BrandSizingMatrixCard`). Szekcionált dashboard elrendezés (Opció B), Nem (Gender: Férfi/Női/Unisex) integráció, Hőtűrés áthelyezése a profilba, automatikus háttér-tanuló színpaletta, valamint az "Avatár", "DNS/DNA" és "Sartorial" kifejezések kivezetése a felületről.
- [x] **Firebase API kulcsok gomb eltávolítása:** Az `AuthModal.jsx`-ből törölve a felesleges, felhasználót zavaró API kulcs konfigurációs gomb (a kulcsot a szerveroldali Secret Manager védi).
- [x] **Demo Mód gomb eltávolítása:** A belépési felugró ablakból törölve a megtévesztő „Folytatás Helyi Demo Módban” gomb; helyette tiszta, egyértelmű Google Belépési felület működik.
- [x] **Vendég & Bejelentkezett Felhasználói Adatszeparáció:** Belépés nélkül kizárólag egy semleges, nem valós személyhez köthető bemutató minta kapszula (`SAMPLE_SHOWCASE_WARDROBE`) és általános vendégprofil (`DEFAULT_GUEST_PROFILE`) látható. A valós felhasználó privát adatai (profil, testméretek, egyedi szabályok, ruhatár) csak és kizárólag sikeres Google bejelentkezés után töltődnek be a Firestore-ból, és kijelentkezéskor automatikusan kiürülnek.
- [x] **Vendég Munkamenet LocalStorage Tisztítása & Szett/Profil Izoláció:** A `clearGuestSessionStorage` motorral kijelentkezéskor és demó resetkor a böngésző helyi tárolójából (`localStorage`) teljesen és automatikusan törlődnek a generált szettek (`sartorial_last_generated_outfits`, `saved_outfits`, `sartorial_last_anchor_items`, `sartorial_last_custom_event`, `stylist_chat_history`), garantálva a tiszta vendégállapotot.
- [x] **Minta Ruhatár (`SAMPLE_SHOWCASE_WARDROBE`) Ruha-Kép Egyezés & Jogtiszta Fotók:** A 12 db bemutató ruha és a fallback fotók auditálása és cseréje. A képeltérések (női ruha ➔ férfi nadrág, hátizsák ➔ öv, pufidzseki ➔ teveszínű kabát) megszűntek; a darabok 100%-ban jogtiszta, megegyező Unsplash divatfotókkal és valós, népszerű márkákkal (Massimo Dutti, Eton, SuitSupply, Zara, Mango Man, Berwick 1707) futnak.
- [x] **Modulokban Lévő Beégetett Adatok Kisöprése:** A `HelpGuideModal.jsx`, `StyleDNAView.jsx`, `sartorialEval.js` és `gemini.js` átfésülése és a tesztadatok, márkák, SKU kódok neutrális, professzionális mintákra cserélése.

### 📋 Nyitott Tételek & Következő Sprint Feladatai
- [ ] 🛍️ **„Megvegyem?” Modul Átnevezése ➔ „Buy or Skip”:**
  - **Cél:** A korábbi „Megvegyem?” vásárlási döntéstámogató modul nevének átnevezése **„Buy or Skip”** megnevezésre.
  - **Érintett komponensek:**
    - Alsó navigációs sáv (`BottomNav.jsx`): címke `Buy or Skip`.
    - Asztali navigációs sáv (`DesktopTabs.jsx`): fül `🛍️ Buy or Skip`.
    - Vásárlási modul (`PurchaseAdvisorView.jsx`): fejléc cím, akciógombok és CTA feliratok átírása.
    - Gardrób nézet (`WardrobeView.jsx`): kártya gyorsgomb átírása.
- [ ] 🎨 **Felugró Ablakok Teljes Minimalista Újratervezése (Minimalist Modal Redesign):**
  - **Cél:** Az alkalmazás összes felugró ablakának (profil szerkesztés, súgó, ruha hozzáadása, onboarding, szettrészletek, képnézegető) átfogó letisztítása: minimális vizuális zaj, szellős és prémium tipográfia, egyszerűsített kártyák és űrlapok.
  - **Irányelvek:** Felesleges vizuális elemek, túldíszített keretek és háttéreffektek tompítása; átláthatóbb mező-csoportosítás; egységes, kompakt és fix fejléc/lábléc struktúra; zavartalan fókusz a lényegi műveleteken és adatokon.
  - **Státusz:** Későbbi részletes átbeszélés és specifikáció után valósítandó meg.
- [ ] **Hangalapú Szettkérés (Web Speech API Mikrofon Integráció):**
  - Mikrofon gomb (`Mic` ikon) elhelyezése a szettkérő beviteli mezőben (`OutfitsView.jsx`).
  - Magyar nyelvű (`hu-HU`) böngészős beszédfelismerés pulzáló felvételi állapottal és automatikus mezőkitöltéssel.
- [ ] **Onboarding Áramvonalasítása (Kötelező Mezők Fókuszban):**
  - A Név, Nem (kötelező) és születési év (korosztály) megtartása a fókuszban.
  - A pontos cm méretek és az első ruha feltöltése halaszthatóvá tétele (átirányítás a Gardrób lebegő FAB gombjához).
- [ ] **Kliensoldali Háttérmaszkolás (`@imgly/background-removal`):**
  - `@imgly/background-removal` WASM csomag integrálása a háttérben futó párhuzamos pipeline-ba.
  - Azonnali Canvas 640×640 JPEG továbbítás az AI híváshoz (<100ms), háttérben WebP maszkolás 6 mp-es timeouttal és tiszta fallbackkel.
- [ ] **Nagy Ruhatárak Megjelenítési Optimalizálása (Virtual List):** 300–500+ darabos ruhatárak esetén `react-window` vagy CSS optimalizáció.
- [ ] **PWA Service Worker & Offline Kép Gyorsítótár:** Statikus assetek és teljes offline élmény biztosítása.

---

## 🚀 II. Jövőbeli Fejlesztési Mérföldkövek (Feature Milestones)

---

### 📦 Mérföldkő 1: Progressive Web App (PWA) & Natív Telepíthetőség
*Mobil-első felhasználói élmény és teljes offline funkcionalitás.*

- [ ] **PWA Manifest (`manifest.webmanifest`):** Arany luxus ikonok több méretben (192x192, 512x512, maszkolható), luxus témaszínek és Splash Screen konfiguráció iOS és Android eszközökre.
- [ ] **„Alkalmazás Telepítése” Gomb:** Intelligens telepítési banner és gomb a Beállítások menüben (PWA `beforeinstallprompt` kezelése).
- [ ] **Offline Működés Jelzés:** Letisztult, arany színű offline állapotjelző badge, ha a telefon elveszíti az internetkapcsolatot.

---

### 📊 Mérföldkő 2: Ruhaviselési Napló & Költség-per-Viselés (Wear Tracker & CPW)
*A ruhatár valós kihasználtságának mérése és a tudatos vásárlás támogatása.*

- [ ] **„Ma ezt vettem fel” Gyorsgomb:** Egyetlen érintéssel rögzíthető az aktuálisan viselt szett vagy egyedi ruhadarab.
- [ ] **Cost-Per-Wear (CPW) Kalkulátor:** Automatikus hordási költségszámítás a ruhadarab beszerzési ára és a valós hordások száma alapján (`Beszerzési Ár ÷ Hordások Száma`).
- [ ] **Kihasználtsági Hőtérkép & Alvó Darabok Detektálása:** Azon ruhadarabok intelligens kiemelése, amelyeket több mint 60–90 napja nem vettél fel (javaslat új szett-kombinációkra vagy szelektálásra).
- [ ] **Leggyakrabban Hordott Kedvencek:** Statisztikai összesítő a legtöbbet viselt kulcsdarabokról.

---

### 🧳 Mérföldkő 3: Kapszula Utazási Csomagoló Asszisztens (Trip Capsule Packer)
*Minimális darabszámú, maximális variációs bőrönd-összeállítás az úti cél időjárásához igazítva.*

- [ ] **Utazási Varázsló:** Úti cél, utazás hossza (pl. 4 nap), programok jellege (városnézés, vacsora, üzleti találkozó) és várható időjárás megadása.
- [ ] **AI Kapszula Generátor:** A meglévő ruhatárból kiválasztja az optimális 8–12 darabos mini kapszulát, amelyből az összes napra önazonos, variálható szettek építhetők.
- [ ] **Interaktív Digitális Csomagolólista:** Pipálható felület és egygombos nyomtatható HTML/PDF csomagolólista export.

---

### 📸 Mérföldkő 4: Inspirációs Kép Elemző & „Get the Look” Reprodukáló
*Pinterest / Instagram / Utcai fotók reprodukálása a saját meglévő ruhatárad darabjaiból.*

- [ ] **Inspirációs Kép Feltöltése:** Fotó feltöltése vagy beillesztése egy tetszőleges inspirációs szettről.
- [ ] **Multimodális Stíluselemzés:** A Gemini Vision felismeri az inspirációs fotó rétegeit, színeit, anyagait és stílusát.
- [ ] **Saját Ruhatár Párosítás:** Az AI a meglévő gardróbodból kiválasztja a legközelebbi egyezéseket, és összeállítja a hozzá leginkább passzoló önazonos szettet.

---

### 📅 Mérföldkő 5: Szett Naptár & Heti Eseménytervező (Outfit Calendar)
*Az öltözködés előre tervezése a naptárhoz és a heti időjárás-előrejelzéshez igazítva.*

- [ ] **Heti / Havi Naptár Nézet:** Szettek előre hozzárendelése a hét napjaihoz (pl. hétfői tárgyalás, szerdai smart casual iroda, pénteki randi).
- [ ] **Időjárás Változás Figyelmeztetés:** Ha az előrejelzés szerint lehűlés vagy eső várható, a rendszer javaslatot tesz a tervezett szett rétegezésének módosítására (pl. kabát/csizma hozzáadása).

---

### 🧪 Mérföldkő 6: Automatizált Tesztelési Rendszer (Vitest & E2E)
*A kritikus üzleti logikák automatikus védelme.*

- [ ] **Unit & Integrációs Tesztek:** Sartorial gallér- és ujj-harmónia mátrix, márkanév kanonizáció (`normalizeBrandName`), anatómiai rétegezési motor és webshop kód parser tesztelése Vitesttel.
- [ ] **GitHub Actions Test Step:** Automatikus tesztfuttatás minden commit és pull request során a deploy előtt.

---

*Utoljára frissítve: 2026-09-07 (v1.7.5)*
