# 🎩 Sartorial Wardrobe Assistant — AI Agent Architecture & Workflows

Ez a dokumentum rögzíti az **AI Wardrobe Assistant** alkalmazás agent architektúráját, munkafolyamatait (workflows), fejlesztési irányelveit és a beépített intelligens skilleket.

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
3. **Kötelező Bázisréteg & Anatómiai Rétegezés (Sartorial Blueprint):**
   - **Bázisréteg (Base Layer):** Minden szett kötelezően tartalmaz egy bőrön hordható felsőt (`tops`: ing vagy prémium pamut póló). Szigorúan tilos pulóvert vagy zakót bázis felső nélkül ajánlani! Zakóhoz kötelező galléros ing.
   - **Köztes & Külső Réteg (Mid & Outer Layers):** A pulóver (`knitwear`) és zakó (`outerwear`) az ingre rétegződik.
   - **Téli / Hideg Idő (< 12°C):** Kettős külső réteg engedélyezett és támogatott: a zakó (`blazer`) fölé rétegződhet a téli szövetkabát / nagykabát (`overcoat` / `coat`).
4. **Időjárás & Hőmérsékleti Dinamika (Moduláris rétegek):**
   - Felkészít a beltéri fűtésre/klímára és az esti lehűlésre: a felső réteg levehető, és az alatta lévő ing/póló önmagában is elegáns és önazonos megjelenést biztosít. Részletes rétegezési tanácsot ad (`layeringAdvice`).
   - 20°C felett a vastag téli kabát és meleg kötött pulóver szigorúan tiltott.
5. **3 Hiteles Szettvariáció:**
   - Generál 3 komplett szettet (ing + nadrág + lábbeli + rétegek), és a kártyákon megjeleníti az esemény-összhang indoklását (`culturalFitReasoning`) és a rétegezési útmutatót.

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

## 🧰 Beépített Skillek (Custom Skills)

### 1. `garment-vision-analyzer`
- **Cél:** Képek feldolgozása, vizuális textúra, anyag és szín felismerése.
- **Fő fájlok:** `src/services/gemini.js`, `src/services/imageOptimizer.js`
- **Szabályok:** 640×640 @ 0.75 JPEG, Base64 pixel továbbítás, null-safe hibakezelés.

### 2. `cultural-stylist-curator`
- **Cél:** Kulturális, zenei és esemény-specifikus szettek összeállítása a felhasználó Stílus DNS-ével harmonizálva.
- **Fő fájlok:** `src/services/gemini.js`, `src/components/stylist/StylistView.jsx`
- **Szabályok:** Szubkulturális dress code tiltólisták, önazonos adaptáció, kötelező kulcsdarab (anchor item) támogatás.

### 3. `fit-intelligence-auditor`
- **Cél:** Szabási eltérések detektálása (Slim vs Regular vs Oversized), testalkati arányok és gyártói méretmátrix kezelése.
- **Fő fájlok:** `src/services/gemini.js`, `src/components/advisor/PurchaseAdvisorView.jsx`, `src/components/profile/StyleDNAView.jsx`

### 4. `webshop-sku-engine`
- **Cél:** Termékkódok (Next Direct, Zara, Reserved, Massimo Dutti, H&M) felismerése, élő CDN képérvényesítés és metadata kinyerés.
- **Fő fájlok:** `src/services/webshop.js`
- **Szabályok:** Fast-path közvetlen kódoknál (0 ms felesleges scraping), párhuzamos lekérés 1.8s timeouttal.

### 5. `cloud-state-synchronizer`
- **Cél:** Real-time szinkronizáció a mobil és asztali böngésző között, automatikus háttér-optimalizálás.
- **Fő fájlok:** `src/context/AuthContext.jsx`, `src/services/firebase.js`
- **Szabályok:** `onSnapshot` real-time listeners, `setDoc(..., { merge: true })`, idle-time képtömörítés a meglévő darabokra.

---

## ⚡ Minőségi & Sebesség-szabályok
1. **Modellek:** Kizárólag a hivatalos 2026-os Gemini 3.x modelleket használjuk (`gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`, `gemini-3.7-flash`, `gemini-3.6-flash`).
2. **Késleltetés:** Maximum 5.0–7.0 mp-es abort timeout per kérés, adaptív modellválasztás (Fast-Lite modellek webshop linkekhez és képazonosításhoz, Deep Reasoning modellek stylist szettekhez), aktív gyors modell megjegyzése (`activeFastModel`).
3. **Képméret:** Minden feltöltött kép 640×640-re tömörítve fut át, megőrizve a 100%-os vizuális élességet és az AI pontosságot.
4. **Biztonság & Hibatűrés:** Minden méret, márka és webshop adat null-safe, üres adatok esetén nem akadhat el a kód.

---
*Készült a Google Antigravity Agentic Framework segítségével.*
