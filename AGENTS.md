# 🎩 Sartorial Wardrobe Assistant — AI Agent Architecture & Workflows

Ez a dokumentum rögzíti az **AI Wardrobe Assistant** alkalmazás agent architektúráját, munkafolyamatait (workflows), fejlesztési irányelveit és a beépített intelligens skilleket.

---

## 🛑 KÖTELEZŐ ÉRVÉNYŰ SZABÁLYOK AZ EGÉSZ PROJEKTRE (GOLDEN RULES)

1. **Szigorúan Tilos Önhatalmú Funkció- és Logika-Módosítás:**
   - **Kifejezett felhasználói utasítás nélkül TILOS bármilyen meglévő funkciót átalakítani, lecserélni vagy megváltoztatni!**
   - **Szigorúan TILOS heurisztikus, mock, szimulált vagy nem-AI alapú "fallback" megoldásokat építeni az alkalmazásba.**
   - Minden elemzésnek és generálásnak **100%-ban valódi Google Gemini neurális modellen** kell futnia.

2. **Tiszta Hibakezelés (Zero Mock Guarantee):**
   - Ha egy API hívás sikertelen (pl. lejárt kulcs, hálózati hiba, 401 Auth Error), a rendszer a valós hibát jelzi a felhasználónak. Szigorúan tilos a háttérben kamu szetteket vagy kitalált válaszokat generálni az AI helyett!

3. **AQ. Kezdetű Kulcsok Teljes Jogúsága:**
   - Az `AQ...` formátumú Google Antigravity / Gemini kulcsok a rendszer hivatalos kulcsai. Tilos bármilyen prefix-szűrést (`startsWith('AIzaSy')`, `!startsWith('AQ.')`) vagy kulcstörlést alkalmazni.

---

## 🏛️ Rendszer Áttekintés & Architektúra

A **Sartorial Wardrobe Assistant** egy modern, mesterséges intelligenciával támogatott személyes stílustanácsadó és ruhatár-menedzsment rendszer. Az alkalmazás célja az önazonos, kifinomult öltözködés támogatása, a kapszula ruhatár tudatos építése és az impulzusvásárlások megelőzése.

### 🛠️ Technológiai Stack:
- **Frontend Keretrendszer:** React (Vite, TailwindCSS + Luxury Gold Glassmorphism Design System)
- **AI Modell Motor:** Google Gemini 3.x (`gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`, `gemini-3.7-flash`, `gemini-3.6-flash`)
- **Adatperzisztencia & Szinkronizáció:** Firebase Authentication & Cloud Firestore (Valós idejű kétirányú `onSnapshot` szinkronizáció Mobile ➔ Webapp)
- **Képfeldolgozó Pipeline:** Kliens oldali Canvas & Blob motor (640×640 @ 0.75 JPEG, ~35–50 KB)
- **Webshop & SKU Motor:** Multi-CDN képkinyerő és mikroadat parser (Next Direct, Zara, Reserved, Massimo Dutti, H&M, Mango, ASOS)

---

## 🤖 Agent Szerepkörök & Felelősségek

1. **Sartorial Style Director & Master Stylist:**
   - Felelős a felhasználó Személyes Stílus DNS-ének (Style DNA) megőrzéséért és az önazonos esemény-specifikus szettek összeállításáért.
   - Kezeli a kulturális, zenei és geográfiai dress code normákat (pl. techno klub, toszkánai esküvő, üzleti tárgyalás).

2. **Computer Vision & Fabric Specialist:**
   - Multimodális képelemzéssel azonosítja a ruhadarab kategóriáját, anyagát (pamut, len, gyapjú, selyem, bőr), színét, mintázatát és szabását.

3. **Fit Intelligence & Size Auditor:**
   - Felügyeli a testalkathoz (V-alak, trapéz, magasság, testsúly) és a gardróbban meglévő szabásokhoz (Slim tailored vs Regular vs Oversized) való illeszkedést.
   - Karbantartja a márkánkénti méretprofil térképet (Brand Sizing Intelligence).

4. **Purchase Decision Analyst:**
   - 3 Döntési Pillér alapján értékeli a kiszemelt új ruhadarabokat (Kombinálhatóság 3 outfittel, Duplikáció vs Csere, Személyes illeszkedés).

---

## 🔄 Részletes Munkafolyamatok (Workflows)

### 📸 Workflow 1: Ruhafelvitel & Multimodális AI Vision Elemzés
```mermaid
sequenceDiagram
    participant User as Felhasználó
    participant App as AddClothingModal
    participant Opt as ImageOptimizer
    participant WS as WebshopEngine
    participant AI as Gemini 3.7 Flash
    participant DB as Firestore Cloud

    alt Fotó / Képfeltöltés
        User->>App: Kép készítése vagy kiválasztása
        App->>Opt: Kép átméretezése (520x520 @ 0.72 JPEG)
    else Vágólap (Ctrl+V / Kép beillesztése)
        User->>App: Böngészőből jobb klikk -> Kép másolása -> Ctrl+V
        App->>Opt: Vágólap kép Blob/URL konvertálása Base64-be
    else Webshop Link vagy Termékkód (SKU)
        User->>App: Beilleszti a linket vagy termékkódot (pl. Next AA6536)
        App->>WS: parseWebshopUrlOrCode + findFirstWorkingImageUrl
        WS-->>App: CDN kép URL + Cikkszám kontextus
        App->>Opt: CDN kép konvertálása Base64-be
    end

    App->>AI: analyzeClothingImage(base64Image, webshopContext, userProfile)
    AI-->>App: Strukturált JSON (Kategória, Anyag, Szín, Márka, Méret, Szabás, Stílustippek)
    Note over AI,App: Szigorú Anti-Hallucináció: ha nincs fotó és nem azonosítható a link, nem talál ki fantomruhát
    App->>User: Form előtöltése és szerkesztési lehetőség
    User->>App: Mentés gomb
    App->>DB: setDoc(users/{uid}/wardrobe/{id}, itemData)
```

---

### 🛍️ Workflow 2: Vásárlás Előtti 4-Pilléres Döntéstámogatás, Stilisztikai Lefedettség & Szabás-ellenőrzés
1. **Input:** A felhasználó fotót készít a próbafülkében, vagy beilleszt egy webshop linket / termékkódot.
2. **Szigorú Anti-Hallucinációs Garancia:**
   - Ha a link alapján vagy a fotó hiányában a termék nem azonosítható 100%-os bizonyossággal, az AI **szigorúan tilos, hogy fantom ruhát találjon ki**. Helyette jelzi az azonosítás hiányát (`isUnknown: true`), és megkéri a felhasználót a valós kép vagy név megadására.
3. **Stilisztikai Lefedettség & Redundancia Audit (`aestheticOverlap`):**
   - Ha a ruhatárban már van hasonló megjelenésű/szerepkörű darab (pl. másik sötétkék zakó vagy sötétbarna loafer), az AI megnevezi a meglévő darabot (`existingItemName`), figyelmeztet a felesleges funkcionális duplikációra, és valódi hiánypótló alternatívát javasol (`alternativeRecommendation`).
4. **Strukturált Előnyök & Hátrányok (`pros` & `cons`):**
   - Részletes vásárlási érveket és megfontolandó szempontokat generál, valamint személyre szabott testalkati és színtípus szakvéleményt ad (`personalFitVerdict`).
5. **Szabás & Testalkat vizsgálat (Fit Mismatch Intelligence):**
   - Az AI összeveti a termék szabását (pl. Regular Fit) a ruhatárban lévő darabok domináns szabásával (pl. Slim Tailored) és a felhasználó testalkatával.
   - Ha eltérést észlel, kiemelt figyelmeztetést generál (`fitMismatchWarning`), és konkrét méretválasztási javaslatot ad (`sizingAdvice`).
6. **Anyagösszetétel & Műszál Auditor (Fabric & Synthetic Intelligence):**
   - A meglévő prémium természetes gardrób (gyapjú, kasmír, pamut, len, selyem, bőr) és stílusprofil alapján szigorúan ellenőrzi az anyagösszetételt.
   - Ha a termék gyenge, nem lélegző műszálból (100% poliészter, akril, műbőr/PU) készült, kiemelt figyelmeztetést generál (`fabricWarning`), alacsonyabb minőségi pontszámot ad (`fabricScore`, `qualityScore`), és a döntést 'Gondold Át' vagy 'Kerülendő' státuszra állítja.
7. **4 Döntési Pillér Szintézise:**
   - **1. Pillér:** 3 komplett outfit generálása a meglévő gardrób elemeivel kombinálva (kötelező anatómiai rétegezéssel, hidegben zakó + télikabát támogatással).
   - **2. Pillér:** Változatosság, Duplikáció & Stilisztikai Lefedettség vizsgálat.
   - **3. Pillér:** Személyes illeszkedés, szabás és egyéni szabályok harmóniája.
   - **4. Pillér:** Anyagminőség és természetes szál integritás.
8. **Hozzáadás:** Egyetlen kattintással átemelhető a ruhatárba (`handleAddToWardrobe`).

---

### 🎭 Workflow 3: Esemény- és Kulturális Dress Code Hangolt AI Stylist & Rétegezési Motor
1. **Esemény Dekódolás:** A beírt esemény jellegének, helyszínének és kulturális normáinak értelmezése (pl. underground klub, gála, nyári randi).
2. **Kulturális Tiltólisták Alkalmazása:**
   - Techno / Rave / Club esetén: Szigorúan kizárja a formális zakókat, nyakkendőket és öltönynadrágokat.
   - Formális esemény esetén: Kizárja a lezser sportos és játszós/kopott darabokat.
3. **👔 Sartorial Gallér- és Ujj-Harmónia Rendszer (Collar & Sleeve Layering Matrix):**
   - **Ingdzseki (Shacket / Overshirt):** Szigorúan tilos alá hagyományos galléros inget rétegezni (kettős inggallér és kettős gombsor stílushiba). Kizárólag prémium pamut pólóval, vékony finomkötött kereknyakúval vagy merinó garbóval viselendő!
   - **Állógalléros ing (Mandarin / Band / Grandad / Mao):** Szigorúan tilos zárt kötött pulóverrel (Crewneck/V-neck) vagy hagyományos hajtókás zakóval párosítani! Kizárólag önmagában vagy nyitott kardigánnal / gallér nélküli dzsekivel viselhető.
   - **Garbó (Turtleneck):** Sosem veszünk alá inget; a garbó önmagában képez bázist zakó vagy kabát alatt.
   - **Rövid ujjú kötöttáru (Short sleeve knitwear):** Szigorúan tilos alá rövid ujjú pólót rétegezni (kettős ujjvég és gyűrődés megelőzése). Bőrön vagy ujjatlan bázissal hordandó.
   - **Kötött mellény (Sweater vest):** Alá kizárólag hosszú ujjú felső vagy ing illik.
   - **Zakó / Blézer:** Kötelező a hosszú ujjú ing a mandzsetta kilátszódásához és a belső béléskomforthoz.
4. **⚖️ Sziluett, Térfogat & Női/Férfi Arányok (Volume Balance):**
   - Bő felsőhöz szűkített alsó; bő alsóhoz vagy A-vonalú szoknyához feszes, betűrt felső és deréköv.
   - Női ruhák (Midi/Maxi): derékban szabott/rövidített (Cropped) blézerrel és derékövvel rétegezendők.
5. **Kötelező Bázisréteg & Anatómiai Rétegezés (Sartorial Blueprint):**
   - **Bázisréteg (Base Layer):** Minden szett kötelezően tartalmaz egy bőrön hordható felsőt (`tops`: ing vagy prémium pamut póló; garbó vagy kötött póló esetén az maga a bázis). Szigorúan tilos pulóvert vagy zakót bázis felső nélkül ajánlani!
   - **Köztes & Külső Réteg (Mid & Outer Layers):** A pulóver (`knitwear`) és zakó (`outerwear`) az ingre rétegződik.
   - **Téli / Hideg Idő (< 12°C):** Kettős külső réteg engedélyezett és támogatott: a zakó (`blazer`) fölé rétegződhet a téli szövetkabát / nagykabát (`overcoat` / `coat`).
6. **Időjárás & Hőmérsékleti Dinamika (Szezonális Lábbeli és Réteg Védelem):**
   - **Meleg időben (>= 19°C / Nyári meleg):**
     * **Szigorúan KIZÁRT:** Őszi/téli bokacipők, bokacsizmák, Chelsea csizmák, Chukka, bélelt bakancsok, vastag télikabátok és vastag téli garbók.
     * **Kizárólag engedélyezett lábbelik:** Bőr penny/tassel loafer, mokaszin, szellős tiszta bőr sneaker, elegáns derbi/oxford félcipő.
     * A rendszer mind az AI promptban, mind a gardrób szűrésben és az anatómiai rétegezési motorban (`enforceAnatomicalOutfitLayers`) szigorúan kizárja a meleg lábbeliket.
   - **Hűvös/hideg időben (< 14°C):**
     * Csizmák, chelsea csizmák, bélelt elegáns lábbelik, téli szövetkabátok és flanelnadrágok támogatottak.
   - Felkészít a beltéri fűtésre/klímára és az esti lehűlésre: a felső réteg levehető, és az alatta lévő ing/póló önmagában is elegáns és önazonos megjelenést biztosít. Részletes rétegezési tanácsot ad (`layeringAdvice`).
7. **3 Hiteles Szettvariáció:**
   - Generál 3 komplett szettet (ing + nadrág + lábbeli + öv + opc. rétegek), és a kártyákon megjeleníti az esemény-összhang indoklását (`culturalFitReasoning`) és a rétegezési útmutatót.

---

### 🧩 Workflow 4: Kapszula Ruhatár Gap Elemzés & Intelligens Szezonális Audit
1. **Szezonális Lábbeli & Funkciós Audit (1. Számú Prioritás):**
   - Ha a ruhatárban 0 db őszi/téli cipő van (nincs Chelsea csizma, Chukka vagy téli elegáns bőrlábbeli), a rendszer azonnal 1. prioritású kritikus hiányként jelöli meg.
2. **Kategória Telítettségi Stop (Category Saturation Guard):**
   - Ha egy felső kategóriából (pl. ingek, pamut felsők) már van 2+ jó állapotú darab, tilos újabb hasonlót ajánlani, amíg az alapkategóriák (pl. téli cipő, meleg nadrág, téli kabát) nincsenek lefedve.
3. **Kapszula Ruhatár Index Számítása:** Figyelembe veszi a kategória-lefedettséget és állapotarányokat.
4. **Szabásérzékeny Ajánlások & Keresőkifejezések:**
   - A hiányzó darabok nevébe és a `searchKeywords` mezőbe beépíti a preferált szabást (pl. *"Slim Fit Sötétkék Olasz Gyapjú Zakó"*).

---

### 📏 Workflow 5: Gyártói Méretprofil & Illeszkedési Mátrix
1. **Méretek rögzítése:** Minden ruha rendelkezik opcionális `brand` és `size` mezővel.
2. **Márka Névtér Konszolidáció (Brand Aliasing & Canonical Mapping):**
   - A rendszer a `normalizeBrandName` motorral automatikusan egyetlen kanonikus márkanév alá fűzi a domain alapú (pl. `reserved.com` ➔ `Reserved`, `next.co.uk` ➔ `Next Direct`), kelmefabrikos (pl. `Next (Nova Fides)` ➔ `Next Direct`), illetve eltérő kis- és nagybetűs elnevezéseket.
3. **Dinamikus Aggregáció & Megjelenítés:**
   - A `StyleDNAView` automatikusan összesíti a kategóriánkénti bázisméreteket (Zakó: 50, Ing: 40/M, Nadrág: 32/32, Cipő: 42.5).
   - Gyártói Illeszkedési Mátrixot épít (pl. Boglioli ➔ 50, Eton ➔ 40, Incotex ➔ 32/32, Next Direct ➔ L / 50), feltüntetve az összefűzött aliasokat, ami vásárláskor azonnal segít a méretválasztásban.

---

### 🧠 Workflow 6: Szabad Szöveges AI Stylist Tanítás & Egyéni Szabályrendszer
1. **Szabályok rögzítése szabad szöveggel:**
   - A felhasználó a `StyleDNAView` felületen szabadon megadhatja személyes öltözködési szabályait és tiltásait (pl. *"Nem szeretem a pólóingeket"*, *"Csak 100% természetes anyagok"*, *"Kerülöm a skinny szabást"*).
2. **Keresztfunkciós Szabályalkalmazás:**
   - **Stylist Motor (`generateEventOutfits`):** Szigorúan kizárja a tiltott darabokat/kombinációkat még lezser alkalmak esetén is, és a szettek leírásában (`culturalFitReasoning`) indokolja a szabályoknak való megfelelést.
   - **Kapszula Gap Elemző (`analyzeWardrobeGaps`):** Sosem ajánl olyan hiányzó kulcsdarabot, amit a felhasználó kizárt.
   - **Vásárlási Döntéstámogató (`evaluateAndExtractPrePurchaseItem`):** Automatikusan ellenőrzi az új terméket az egyéni szabályok ellenében. Ha ütközést észlel (pl. pólóing kiszemelésekor), azonnali kiemelt figyelmeztetést generál (`fitMismatchWarning`: *"⚠️ Személyes szabály ütközés: Nem szereted a pólóingeket!"*), a döntést pedig 'Gondold Át' vagy 'Kerülendő' státuszra állítja.

---

### 👔 Workflow 7: Saját Szett Összeállítása & Sartorial AI Audit
1. **Interaktív Szettépítő Slotok:**
   - A felhasználó kategóriánként válogathatja össze a darabjait (Felső, Pulóver, Zakó/Kabát, Nadrág, Cipő, Öv/Kiegészítő).
2. **AI Stílus- és Összhang Audit (`auditManualOutfit`):**
   - **Dress Code & Esemény Összhang:** Illik-e a választott szett az esemény kulturális és formai elvárásaihoz.
   - **Színharmónia & Kontraszt:** Árnyalatok, 3-szín szabály, hideg/meleg tónusok.
   - **Anyagok & Textúrák Találkozása:** Természetes szálak és textúrák egymásra hatása (pl. gyapjú flanel + len ing + sima bőrcipő).
   - **Rétegezés & Időjárási Dinamika:** Anatómiai bázisréteg ellenőrzése és hőmérsékleti komfort a helyi időjáráshoz.
   - **Strengths & Suggestions:** Konkrét erősségek és azonnal alkalmazható stílustuning / cserejavaslatok pontszámmal (0-100%).
3. **Mentés:** Az auditált szett egyetlen kattintással elmenthető a kedvencekhez.

---

### 💬 Workflow 8: Szabad Szöveges Személyes AI Stylist Csevegés (Master Stylist Chat)
1. **Teljes Kontextus-Ismeret:**
   - A Gemini 3.x modell közvetlen beszélgetésben áll a felhasználóval, és **teljes mélységében ismeri** a ruhatár összes darabját, a Stílus DNS-t, a kedvenc színeket, testalkatot, méreteket, egyéni szabályokat és az aktuális időjárást.
2. **Sartorial Tanácsadás & Képi Hivatkozások:**
   - Bármilyen stíluskérdésre (pl. alkalmi viselet, rétegezés, hiányzó kulcsdarab, szett-ötlet) személyre szabott választ ad, a ruhatár darabjaira pontos névvel hivatkozva.
   - Az említett ruhák automatikusan interaktív kártyaként jelennek meg a válasz alatt, és kattintásra megnyílnak a Lightboxban.

---

### 📱 Workflow 9: Mobil Web Share Target & Facebook In-App Browser Vásárlási Check
1. **Web Share Target API:**
   - Mobilon (Chrome, Safari, Android rendszer-megosztás) és Facebook In-App Browserből a webshop oldalán a „Megosztás” gombra kattintva a **Wardrobe Assistant** közvetlenül megjelenik célalkalmazásként.
2. **Azonnali Elemzés Indítása:**
   - Az app megnyitáskor automatikusan kiszűri a terméklinket (Facebook előtagok és szövegek közül is), átvált a Vásárlási Tanácsadó (`advisor`) nézetre, és azonnal elindítja a 4-pilléres vásárlási döntési tesztet.

---

### 🌐 Workflow 10: Autonóm Sartorial Tudásbázis & 7-Napos Periodikus Webes Szabálykutató
1. **Google Search Grounding Kutató Motor (`mineSartorialRulesFromWeb`):**
   - A rendszer nemzetközi divatkódexekből és szabászati stílusirányzatokból (Savile Row, Pitti Uomo, Vogue, Permanent Style, Die Workwear) kinyeri az autentikus rétegezési, gallér-, ujj- és sziluettszabályokat.
2. **7-Napos Ciklikus Háttér-Szinkronizáció (`checkAndAutoSyncSartorialRules`):**
   - 7 naponta automatikusan lefut a háttérben anélkül, hogy a felhasználói felületet lassítaná.
   - Intelligensen deduplikál és frissíti a felhő/helyi szabálytárat.
3. **Keresztfunkciós Alkalmazás:**
   - Minden kutatott szabály azonnal beépül az összes döntési modulba (Outfit Generátor, Manuális Audit, Vásárlási Tanácsadó, Master Stylist Chat).
4. **UI Szabálytár Hub (`StyleDNAView.jsx`):**
   - Részletes szabálykártyák (❌ Don't / ✅ Do, forrás, dátum), kategóriaszűrés és manuális kutatásindítás fókuszált témákkal.

---

### 🔍 Univerzális Kép- és Ruha Lightbox Betekintő (`GarmentLightboxModal`)
- Minden szettkártyán és csevegésben lévő kisméretű ruhafotóra kattintva egy nagyfelbontású, arany-üveg keretes felugró ablak nyílik meg.
- Teljes lapozási támogatás (⬅️ / ➡️ nyilak, billentyűzet, swipe), ruha-metaadatok és egygombos Lookbook magazin-áttekintő nézet.

---

## 🧰 Beépített Skillek (Custom Skills)

### 1. `garment-vision-analyzer`
- **Cél:** Képek feldolgozása, vizuális textúra, anyag és szín felismerése.
- **Fő fájlok:** `src/services/gemini.js`, `src/services/imageOptimizer.js`
- **Szabályok:** 640×640 @ 0.75 JPEG, Base64 pixel továbbítás, null-safe hibakezelés.

### 2. `cultural-stylist-curator`
- **Cél:** Kulturális, zenei és esemény-specifikus szettek összeállítása a felhasználó Stílus DNS-ével harmonizálva.
- **Fő fájlok:** `src/services/gemini.js`, `src/components/stylist/StylistView.jsx`, `src/components/stylist/StylistChatView.jsx`
- **Szabályok:** Szubkulturális dress code tiltólisták, önazonos adaptáció, kötelező kulcsdarab (anchor item) támogatás.

### 3. `fit-intelligence-auditor`
- **Cél:** Szabási eltérések detektálása (Slim vs Regular vs Oversized), testalkati arányok és gyártói méretmátrix kezelése.
- **Fő fájlok:** `src/services/gemini.js`, `src/components/advisor/PurchaseAdvisorView.jsx`, `src/components/profile/StyleDNAView.jsx`

### 4. `sartorial-rule-miner`
- **Cél:** Autonóm internetes szabálykutatás Google Search Groundinggal, 7 napos háttér-szinkronizáció, strukturált gallér-, ujj- és sziluettszabályok kezelése.
- **Fő fájlok:** `src/services/sartorialRules.js`, `src/context/AuthContext.jsx`, `src/components/profile/StyleDNAView.jsx`

### 5. `webshop-sku-engine`
- **Cél:** Termékkódok (Next Direct, Zara, Reserved, Massimo Dutti, H&M) felismerése, élő CDN képérvényesítés és metadata kinyerés.
- **Fő fájlok:** `src/services/webshop.js`
- **Szabályok:** Fast-path közvetlen kódoknál (0 ms felesleges scraping), párhuzamos lekérés 1.8s timeouttal.

### 6. `cloud-state-synchronizer`
- **Cél:** Real-time szinkronizáció a mobil és asztali böngésző között, automatikus háttér-optimalizálás.
- **Fő fájlok:** `src/context/AuthContext.jsx`, `src/services/firebase.js`
- **Szabályok:** `onSnapshot` real-time listeners, `setDoc(..., { merge: true })`, idle-time képtömörítés a meglévő darabokra.

### 7. `mobile-ui-designer`
- **Cél:** Mobil-első (Mobile-First) felhasználói élmény, érintésbarát ergonómia (touch targets >= 40px), Gold Glassmorphism design system, flexbox `min-w-0` túlcsordulás-védelem és lebegő navigációs margók.
- **Fő fájlok:** `.agents/skills/mobile-ui-designer/SKILL.md`, `src/App.jsx`, `src/components/layout/BottomNav.jsx`, `src/components/stylist/StylistView.jsx`
- **Szabályok:** `stopPropagation` kártyagomboknál, `pb-28` lebegő alsó margó, `min-w-0` a flexbox szövegeknél, uncropped `aspect-[4/3]` képarányok.

### 8. `brand-sizing-auditor`
- **Cél:** Márkánkénti méretprofil, kanonikus márka-alias összefűzés, kategóriánkénti bázisméretek és vásárlás előtti méretválasztási tanácsadás (Fit & Sizing Intelligence).
- **Fő fájlok:** `.agents/skills/brand-sizing-auditor/SKILL.md`, `src/services/webshop.js`, `src/services/gemini.js`, `src/components/profile/StyleDNAView.jsx`, `src/components/advisor/PurchaseAdvisorView.jsx`
- **Szabályok:** Kanonizált márkanévtér (`normalizeBrandName`), szabási eltérések detektálása (`fitMismatchWarning`), konkrét méretválasztási javaslat (`sizingAdvice`).

---

## ⚡ Minőségi & Sebesség-szabályok
1. **Modellek:** Kizárólag a hivatalos 2026-os Gemini 3.x modelleket használjuk (`gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`, `gemini-3.7-flash`, `gemini-3.6-flash`).
2. **Késleltetés:** Maximum 5.0–7.0 mp-es abort timeout per kérés, adaptív modellválasztás (Fast-Lite modellek webshop linkekhez és képazonosításhoz, Deep Reasoning modellek stylist szettekhez), aktív gyors modell megjegyzése (`activeFastModel`).
3. **Képméret:** Minden feltöltött kép 640×640-re tömörítve fut át, megőrizve a 100%-os vizuális élességet és az AI pontosságot.
4. **Biztonság & Hibatűrés:** Minden méret, márka és webshop adat null-safe, üres adatok esetén nem akadhat el a kód.

---
*Készült a Google Antigravity Agentic Framework segítségével.*

