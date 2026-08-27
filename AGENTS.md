# 🎩 Sartorial Wardrobe Assistant — AI Agent Architecture & Workflows

Ez a dokumentum rögzíti az **AI Wardrobe Assistant** alkalmazás agent architektúráját, munkafolyamatait (workflows), fejlesztési irányelveit és a beépített intelligens skilleket.

---

## 🏛️ Rendszer Áttekintés & Architektúra

A **Sartorial Wardrobe Assistant** egy modern, mesterséges intelligenciával támogatott személyes stílustanácsadó és ruhatár-menedzsment rendszer. Az alkalmazás célja az önazonos, kifinomult öltözködés támogatása, a kapszula ruhatár tudatos építése és az impulzusvásárlások megelőzése.

### 🛠️ Technológiai Stack:
- **Frontend Keretrendszer:** React (Vite, TailwindCSS + Luxury Gold Glassmorphism Design System)
- **AI Modell Motor:** Google Gemini 3.x (`gemini-3.7-flash`, `gemini-3.6-flash`, `gemini-3.1-flash-lite`)
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
        App->>Opt: Kép átméretezése (640x640 @ 0.75 JPEG)
    else Webshop Link vagy Termékkód (SKU)
        User->>App: Beilleszti a linket vagy termékkódot (pl. Next AA6536)
        App->>WS: parseWebshopUrlOrCode + findFirstWorkingImageUrl
        WS-->>App: CDN kép URL + Cikkszám kontextus
        App->>Opt: CDN kép konvertálása Base64-be
    end

    App->>AI: analyzeClothingImage(base64Image, webshopContext, userProfile)
    AI-->>App: Strukturált JSON (Kategória, Anyag, Szín, Márka, Méret, Szabás, Stílustippek)
    App->>User: Form előtöltése és szerkesztési lehetőség
    User->>App: Mentés gomb
    App->>DB: setDoc(users/{uid}/wardrobe/{id}, itemData)
```

---

### 🛍️ Workflow 2: Vásárlás Előtti 3-Outfit Döntéstámogatás & Szabás-ellenőrzés
1. **Input:** A felhasználó fotót készít a próbafülkében, vagy beilleszt egy webshop linket / termékkódot.
2. **Szabás & Testalkat vizsgálat (Fit Mismatch Intelligence):**
   - Az AI összeveti a termék szabását (pl. Regular Fit) a ruhatárban lévő darabok domináns szabásával (pl. Slim Tailored) és a felhasználó testalkatával.
   - Ha eltérést észlel, kiemelt figyelmeztetést generál (`fitMismatchWarning`), és konkrét méretválasztási javaslatot ad (`sizingAdvice`).
3. **3 Döntési Pillér Szintézise:**
   - **1. Pillér:** 3 komplett outfit generálása a meglévő gardrób elemeivel kombinálva.
   - **2. Pillér:** Duplikáció vs Csere vizsgálat (ha van kopott hasonló darab, kifejezetten ajánlja cserére).
   - **3. Pillér:** Bőrtónus és testalkat harmónia ellenőrzése.
4. **Hozzáadás:** Egyetlen kattintással átemelhető a ruhatárba (`handleAddToWardrobe`).

---

### 🎭 Workflow 3: Esemény- és Kulturális Dress Code Hangolt AI Stylist
1. **Esemény Dekódolás:** A beírt esemény jellegének, helyszínének és kulturális normáinak értelmezése (pl. underground klub, gála, nyári randi).
2. **Kulturális Tiltólisták Alkalmazása:**
   - Techno / Rave / Club esetén: Szigorúan kizárja a formális zakókat, nyakkendőket és öltönynadrágokat.
   - Formális esemény esetén: Kizárja a lezser sportos darabokat.
3. **Önazonos Stílus-Adaptáció:**
   - A felhasználó saját stílusfilozófiáját és preferált színeit/anyagait (Style DNA) adaptálja az esemény keretei közé.
4. **3 Hiteles Szettvariáció:**
   - Generál 3 szettet, és a kártyákon megjeleníti az esemény-összhang indoklását (`culturalFitReasoning`).

---

### 🧩 Workflow 4: Kapszula Ruhatár Gap Elemzés & Intelligens Csere
1. **Kapszula Ruhatár Index Számítása:** Figyelembe veszi a kategória-lefedettséget (zakó, ing, kötött, nadrág, cipő) és az állapotarányokat.
2. **Telítettségi & Redundancia Szűrő:**
   - Ha egy kategóriából (pl. fonott övek, fehér pólók) már van 2+ jó állapotú darab, nem ajánlja a kopottabb pótlását, mert funkcionálisan lefedett.
3. **Szabásérzékeny Ajánlások & Keresőkifejezések:**
   - A hiányzó darabok nevébe és a `searchKeywords` mezőbe beépíti a preferált szabást (pl. *"Slim Fit Sötétkék Olasz Gyapjú Zakó"*).

---

### 📏 Workflow 5: Gyártói Méretprofil & Illeszkedési Mátrix
1. **Méretek rögzítése:** Minden ruha rendelkezik opcionális `brand` és `size` mezővel.
2. **Dinamikus Aggregáció:**
   - A `StyleDNAView` automatikusan összesíti a kategóriánkénti bázisméreteket (Zakó: 50, Ing: 40/M, Nadrág: 32/32, Cipő: 42.5).
   - Gyártói Illeszkedési Mátrixot épít (pl. Boglioli ➔ 50, Eton ➔ 40, Incotex ➔ 32/32), amely vásárláskor azonnal segít a méretválasztásban.

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
1. **Modellek:** Kizárólag a hivatalos 2026-os Gemini 3.x modelleket használjuk (`gemini-3.7-flash`, `gemini-3.6-flash`, `gemini-3.1-flash-lite`).
2. **Késleltetés:** Maximum 5.5 mp-es abort timeout per kérés, aktív gyors modell megjegyzése (`activeFastModel`).
3. **Képméret:** Minden feltöltött kép 640×640-re tömörítve fut át, megőrizve a 100%-os vizuális élességet és az AI pontosságot.
4. **Biztonság & Hibatűrés:** Minden méret, márka és webshop adat null-safe, üres adatok esetén nem akadhat el a kód.

---
*Készült a Google Antigravity Agentic Framework segítségével.*
