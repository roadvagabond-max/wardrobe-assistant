# **Sartorial AI PWA – Teljes Üzleti és Technikai Rendszerspecifikáció (v4.0)**

## **1\. Rendszer- és Termékáttekintés (Business & Product Core)**

### **1.1. Termékpozicionálás és Filozófia**

A **Sartorial AI PWA** egy zéró kognitív terhelésű stílus-operációs rendszer és determinisztikus pre-purchase döntési szűrő. A termék célja a reggeli döntési fáradtság megszüntetése, a ruhatári kihasználatlanság felszámolása, valamint az impulzív, rossz minőségű vagy redundáns ruhavásárlások megakadályozása közvetlenül a próbafülkében és a webshopok felületén.  
A rendszer szakít a generatív „kérdezz-felelek” divat-chatbotok modelljével: az AI láthatatlan döntési rétegként (**Ambient AI**) működik a háttérben. Az azonnali, kattintásmentes vagy minimális interakciót igénylő döntésekre fókuszál, szigorúan a nemzetközi szabászati kódexek (Savile Row, Permanent Style) szabályai szerint.

### **1.2. Alapelvek (Golden Rules)**

> 1. **Zéró Döntési Késleltetés (Time-to-Value \< 3 másodperc):** A reggeli szettkiválasztás és a próbafülkés vásárlási audit azonnali, sallangmentes vizuális választ ad.  
> 2. **Kizárólag Fizikailag Létező Ruhatár:** A rendszer soha nem hallucinál vagy ajánl a felhasználó szekrényében nem létező darabot a szettek összeállításakor.  
> 3. **Determinisztikus Szabályozás (Zero-Hallucination):** A döntéseket szigorú anatómiai és szabászati szabályok diktálják, amelyeket Structured Outputs JSON sémák kényszerítenek ki.  
> 4. **Zéró Mock és Transzparens Hibatűrés:** Nincsenek szimulált állapotok. Hálózati vagy API hiba esetén diszkrét offline jelzés és helyi gyorsítótár lép életbe.  
> 5. **Kliensoldali Adatminimalizálás:** Minden kép a kliens memóriájában tömörül (640×640 px, 35–50 KB), minimalizálva a felhőköltséget és a késleltetést.

## **2\. Termékmetrikák és Üzleti Modell (Metrics & Monetization)**

### **2.1. Rendszerszintű Észak-Csillag Mutatók (North Star KPIs)**

* **Weekly Active Decisions (WAD):** Hány reggeli szettet választottak ki és hagytak jóvá \< 10 másodperc alatt egy héten.  
* **Próbafülke Megtakarítási Érték (Purchase Shield ROI):** Az elutasított gyenge minőségű, magas szintetikus tartalmú vagy redundáns darabok összesített pénzügyi értéke.  
* **Gardrób Kihasználtsági Arány (Wardrobe Utilization Rate):** A feltöltött ruhák legalább 75%-ának bevonása a havi szettrotációba (szekrény mélyén felejtett ruhák eliminálása).  
* **Deprecált Metrikák:** Az alkalmazásban töltött idő (Session Duration) és az elküldött chatüzenetek száma kifejezetten csökkentendő értékek, mivel az Ambient UX világában ezek a felhasználói bizonytalanság és a lassú döntések tünetei.

### **2.2. Monetizációs Csomagok (Feature Gating)**

| Funkciócsoport | Free Tier (Kapszula Alap) | Sartorial Club (Előfizetés) |
| :---- | :---- | :---- |
| **Gardrób Kapacitás** | Maximum 25 ruhadarab | Korlátlan darabszám |
| **Napi Szettkérő** | 1 napi szettjavaslat Context Chips-szel | Korlátlan, napszak- és esemény-érzékeny szettek |
| **Pre-Purchase Auditor** | 3 próba audit összesen | Korlátlan próbafülke- és webshop-audit |
| **CRI & Hiányelemző** | Alap index (0–100) | Részletes hiányelemzés \+ Google Shopping szintaxis |
| **Szettépítő & Audit** | Csak megtekintés | Teljes 5-dimenziós audit és cseredarab javaslatok |
| **Stílus-DNS Szabálytár** | Alapértelmezett szabályok | Heti autonóm Search Grounding kódexbányászat |
| **Árazás** | Ingyenes | Havi / Éves előfizetés (pl. 9.99 EUR / hó) |

## **3\. Rendszerarchitektúra Diagram**

                                \[ Mobil PWA Kliens \]  
                                         │  
        ┌────────────────────────────────┼────────────────────────────────┐  
        ▼                                ▼                                ▼  
\[ Offline & Hálózatkezelés \]    \[ Kliens Képfeldolgozás \]      \[ 5-Tab Ergonomikus UI \]  
 • window.onLine figyelés        • HTML5 Canvas 640×640 @0.75   • 1\. Szettek (Context Chips)  
 • Diszkrét felső sáv            • \~35–50 KB tömörített Blob    • 2\. Gardrób (CRI \+ FAB felvitel)  
 • Firestore offline perziszt.   • Web Worker háttérmaszkolás   • 3\. Megvegyem? (Vásárlási Audit)  
 • IndexedDB gyorsítótár         • Fallback: eredeti fotó       • 4\. Szettépítő (Slotok \+ Chat)  
                                                                • 5\. Stílus DNS (DO/DON'T Hub)  
                                         │  
                                         ▼ \[HTTPS Callable Cloud Functions v2 \+ Auth JWT\]  
                        ┌─────────────────────────────────┐  
                        │      Firebase Backend Réteg     │  
                        │ • Google Cloud Secret Manager   │  
                        │ • SSRF & Magic Bytes szűrés     │  
                        │ • Cloud Firestore & Storage     │  
                        │ • Security Rules (uid zárolás)  │  
                        └────────────────┬────────────────┘  
                                         │  
                                         ▼ \[Structured Outputs / JSON Schema\]  
                        ┌─────────────────────────────────┐  
                        │   Moduláris Gemini AI Skillek   │  
                        │ • gemini-3.5-flash-lite         │  
                        │ • gemini-3.7-flash (Reasoning)  │  
                        │ • Search Grounding (7 napos)    │  
                        └─────────────────────────────────┘

## **4\. Felhasználói Felület és Mobil Ergonómia (UI/UX)**

A felület a **„Quiet UI”** elveit követi: nincsenek felesleges animációk, dekoratív elemek vagy többszintű menük. Minden művelet a hüvelykujj-zónában történik, közvetlen visszajelzéssel.

### **4.1. 5-Tabos Alsó Navigációs Rendszer**

┌──────────────────────────────────────────────────────────────────────────────────────────────────┐  
│   \[ 👔 SZETTEK \]     \[ 🚪 GARDRÓB \]    \[ 🛍️ MEGVEGYEM? \]    \[ 🧩 ÉPÍTŐ \]       \[ 🧬 STÍLUS DNS \]   │  
└──────────────────────────────────────────────────────────────────────────────────────────────────┘

#### **Tab 1: 👔 Szettek (Azonnali Szettkérő & Context Chips)**

* **Bemenet:** Szöveges igénybeviteli mező mikrofonnal (pl. *„Szerda esti kávérandi hűvös időben”*).  
* **Context Chips:** Napszak- és rutinérzékeny gombok (☕ Kávérandi, 💼 Smart Iroda, 🍽️ Vacsora, 🍸 Esti lezser, 🎵 Klub/Koncert).  
* **Kimenet:** 3 indokolt szett a fizikai ruhatárból fotókkal és tömör **Decision Badges** jelölőkkel:  
  * ✓ Sötétkék zakó \+ kőbézs chino: Klasszikus smart casual kontraszt.  
  * 🌡️ 16°C: Zárt ingdzseki kint, kigombolt bent.  
  * A részletes indoklás csak koppintásra, lenyitható panelben jelenik meg.

#### **Tab 2: 🚪 Gardrób (Vizuális Tár, CRI & Felvitel)**

* **Kapszula Ruhatár Index (CRI) Sáv:** 0–100 pontszám és szezonális készültségi arány. Lenyitva konkrét hiánypótlási javaslat másolható Google Shopping szintaxissal.  
* **Kategóriaszűrők:** Mind, Felsők, Kötöttáru, Zakók/Kabátok, Nadrágok, Lábbelik, Kiegészítők.  
* **2 Oszlopos Masonry Rács:** Háttér-eltávolított fotók, minimális felirattal (Név, Anyag, Fit).  
* **Lebegő Akciógomb (FAB):** Jobb alsó \[+ Ruha Hozzáadása\] gomb (Kamera / Galéria / Link).

#### **Tab 3: 🛍️ Megvegyem? (Pre-Purchase Decision Shield)**

* **Bemenet:** Próbafülkés fotó készítése VAGY webshop link beillesztése.  
* **Azonnali Döntési Banner:** 🟢 **MEGVEHETED** (85–100) | 🟡 **GONDOLD ÁT** (50–84) | 🔴 **KERÜLENDŐ** (\< 50).  
* **Audit Panelek:**  
  * *Redundancia kártya:* Egymás mellé állítja a gardróbban lévő legközelebbi rokont és az eltéréseket.  
  * *Anyagösszetétel kártya:* Szintetikus tartalom és tartóssági kockázat (fabricScore).  
  * *Fit-mismatch kártya:* Méreteltérési és szabásvonal-figyelmeztetés.  
* **3 Jóváhagyott Kombináció:** Hogyan illeszthető a kiszemelt darab a már meglévő ruhákhoz.

#### **Tab 4: 🧩 Építő (Manuális Szettépítő & Másodlagos Stylist Chat)**

* **Elsődleges Felület:** 6 interaktív vizuális slot (tops, knitwear, outerwear, bottoms, shoes, accessories).  
* **Valós Idejű Audit:** 5 dimenziós értékelés (Esemény, 3-szín szabály, textúraharmónia, rétegrend, időjárás), konkrét cseredarab-javaslatokkal.  
* **Másodlagos Chat Gomb:** Fejléc ikon a Master Stylist szöveges konzultáció megnyitásához ({{item:itemId}} kártyahivatkozásokkal).

#### **Tab 5: 🧬 Stílus DNS (Profil, Szabályok & Kódexek)**

* **Profil Kártya:** Évszaktípus színpaletta (5 legjobb szín, 2 tiltott árnyalat), testalkat és méretek.  
* **Egyéni Szabályok:** Felhasználói tiltások egy kattintásos kezelése (\[✕ Nem hordok poliésztert\]).  
* **Sartorial DO / DON'T Kártyák:** A heti Search Groundinggal bányászott nemzetközi szabálytár kártyanézete.

### **4.2. Progressive Disclosure Onboarding**

A felhasználó nem tölt ki hosszas kérdőívet:

> 1. **1\. lépés (10 mp):** Nem megadása és opcionális portréfotó az évszaktípushoz.  
> 2. **2\. lépés (Folyamat közben):** A testalkat, méretek és egyéni szabályok az első ruhák feltöltésekor vagy az első vásárlási audit során kerülnek be rögzítésre.

### **4.3. Offline Állapotjelzés & Touch Ergonómia**

* **Diszkrét Fejléc:** Hálózatvesztéskor a képernyő tetején finom sáv jelenik meg:  
  \[ ⚡ Nincs internetkapcsolat – a ruhatárad offline is böngészhető \]

* **48×48 px Célpontok:** Megfelelés az érintési szabványoknak a teljes felületen.  
* **Safe Area Támogatás:** padding-bottom: env(safe-area-inset-bottom) a rendszergombok védelmére.

## **5\. Nemzetközi Szabászati Kódex (Sartorial Guardrails)**

### **5.1. Gallér- és Ujj-Harmónia**

* **Kettős Gallér Tilalma:** Lehajtott galléros ing nem hordható lehajtott galléros ingdzseki (*shacket* / *overshirt*) alatt. Megengedett: prémium pamut póló, atléta vagy finom garbó.  
* **Ujjhossz Szabály:** Strukturált zakó alá rövid ujjú ing viselése tilos. A mandzsettának 1–1.5 cm-re ki kell látszania.

### **5.2. Anatómiai Rétegrend**

* **Kötelező Bázis:** Minden szettnek kötelező része egy közvetlenül bőrön hordható felső (tops: pamut póló vagy ing).  
* **Csupasz Bőr Védelme:** Zakó, pulóver vagy blézer csupasz bőrre nem ajánlható.  
* **Téli Rétegzés (\< 12°C):** Engedélyezett a tripla réteg (bázis $\\rightarrow$ zakó/pulóver $\\rightarrow$ szövetkabát).

### **5.3. Szezonális Anyag- és Lábbelikorlátok**

| Hőmérséklet | Szigorúan TILTOTT | Kizárólag ENGEDÉLYEZETT |
| :---- | :---- | :---- |
| **Meleg ($\\ge$ 19°C)** | Chelsea csizmák, őszi/téli bakancsok, vastag szövetkabátok, nehéz garbók. | Penny/tassel loafer, mokaszin, nyári sneaker, len és könnyű pamut textíliák. |
| **Hűvös (\< 14°C)** | Nyitott lábbelik, vékony vászoncipők, mezítlábas bokavillantás. | Chelsea csizmák, zárt bőrcipők, flanelnadrágok, rétegzett gyapjúkabátok. |

### **5.4. Férfi Kódex (Break, Zokni, Fémek)**

* **Nadrághossz (Break):** Slim fazonhoz és loaferhez kizárólag No-Break szárhossz engedélyezett. Klasszikus nadrághoz Slight Break. Full Break tiltott.  
* **Zokniprotokoll:** Loafer melegben csak láthatatlan titokzoknival hordható. Öltönynél kötelező a vádliig érő, felvillanásmentes zokni.  
* **Bőr- és Fémharmónia:** A cipő és az öv árnyalatának egyeznie kell. A fém kiegészítők azonos fémcsaládból származnak (ezüst-ezüst, arany-arany).

### **5.5. Női Kódex (Sziluett, Boot Gap, Fehérnemű)**

* **Volume Balance:** Bő nadrághoz vagy szoknyához betűrt felső vagy cropped blézer kötelező. Oversized zakó alá letisztult belső réteg tartozik.  
* **Boot Gap:** Midi ruhánál a csizma szárának fel kell nyúlnia a ruha alá (a 2–5 cm-es vádlihézag tilos), vagy boka alá vágott lábbeli választandó.  
* **Fehérnemű Bázis:** Világos selyemblúzok alá testszínű (nude) varrásmentes camisole top kötelező (fehér alá fehér viselése tilos).

## **6\. Moduláris AI Skill Rendszer (Agent Skills Engine)**

| Skill Megnevezése | Modell | Bemenet | Kimenet / Felelősség |
| :---- | :---- | :---- | :---- |
| **1\. Vision & SKU Ingestion** | gemini-3.5-flash-lite | Kép Blob (640×640) / URL | ClothingItem strukturált JSON metaadatok |
| **2\. Color & Seasonal DNA** | gemini-3.5-flash-lite | Portré fotó / Kódok | Évszaktípus besorolás, színpaletta |
| **3\. Sartorial Guardrails** | gemini-3.7-flash | Szett \+ Szabályok | Gallér-, ujj-, réteg- és törésaudit |
| **4\. Fabric & Quality Auditor** | gemini-3.7-flash | Címkefotó / Anyagadat | fabricScore (0–100), műszál- és tartóssági kockázat |
| **5\. Capsule Gap & Search** | gemini-3.7-flash \+ Search | Gardróbleltár \+ Időjárás | Kapszula Ruhatár Index (CRI), Google Shopping szintaxis |
| **6\. Master Stylist Dialogue** | gemini-3.7-flash | Előzmények \+ Kérdés | Szöveges válasz {{item:itemId}} kártyahivatkozásokkal |
| **7\. fit-intelligence-auditor** | gemini-3.7-flash | Szabásvonalak \+ Méret | Szabás-összeférhetetlenség és méretkorrekciós tippek |
| **8\. cultural-stylist-curator** | gemini-3.7-flash | Esemény leírása | Szubkulturális dress code (techno, rock, black tie) |
| **9\. mobile-ui-designer** | Kliens Framework | Felhasználói interakciók | 48px touch, Safe Area, Bottom Sheet |

## **7\. Képfeldolgozási és Költségoptimalizálási Pipeline**

TypeScript  
export interface ImageProcessingConfig {  
  compression: {  
    targetResolution: { width: 640, height: 640 };  
    mimeType: 'image/jpeg';  
    quality: 0.75;  
    expectedSizeBytes: '35KB \- 50KB';  
    engine: 'HTML5 Canvas 2D Context \+ toBlob';  
  };  
  backgroundRemoval: {  
    strategy: 'client\_web\_worker\_wasm';  
    engineLibrary: '@imgly/background-removal';  
    inputSource: 'compressed\_canvas\_blob';  
    outputFormat: 'image/webp';  
    fallbackOnFailure: 'store\_original\_compressed\_jpeg';  
  };  
}

* **Pipeline Menet:**  
  1. A beérkező fotót a böngésző HTML5 Canvas 2D kontextusa 640×640 px-re méretezi (arányok megőrzésével).  
  2. A tömörített 35–50 KB méretű JPEG azonnal elindul az AI elemzésre.  
  3. Egy Web Worker a háttérben levágja a hátteret; hiba vagy lassulás esetén a rendszer automatikusan az eredeti tömörített képet használja fel finom CSS kártyakerettel.

## **8\. Biztonsági Specifikáció (Security, XSS & Malware Protection)**

### **8.1. API Kulcs Kezelés és Backend Architektúra**

* A Gemini API mesterkulcsa nem exponálható a frontend kódjában.  
* Minden AI kérés HTTPS-alapú Firebase Cloud Functions (v2) végpontokon keresztül fut le.  
* Az API kulcs elérése kizárólag a **Google Cloud Secret Manager** (GEMINI\_API\_KEY) segítségével történik.

### **8.2. XSS és Kliensoldali Injection Védelem**

* **Szigorú Content Security Policy (firebase.json):**  
  JSON  
  {  
    "hosting": {  
      "headers": \[  
        {  
          "source": "/\*\*",  
          "headers": \[  
            {  
              "key": "Content-Security-Policy",  
              "value": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://firebasestorage.googleapis.com; connect-src 'self' https://\*.cloudfunctions.net https://identitytoolkit.googleapis.com https://firestore.googleapis.com;"  
            },  
            { "key": "X-Content-Type-Options", "value": "nosniff" },  
            { "key": "X-Frame-Options", "value": "DENY" },  
            { "key": "X-XSS-Protection", "value": "1; mode=block" },  
            { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }  
          \]  
        }  
      \]  
    }  
  }

* **Zéró innerHTML Követelmény:** Felhasználói adat és AI válasz nem renderelhető nyers HTML-ként. Kizárólag biztonságos szöveges csomópontok és DOMPurify fertőtlenítés engedélyezett.  
* **SVG Kizárás:** Felhasználói SVG fájlok feltöltése tiltott; kizárólag raszteres állományok fogadhatók el.

### **8.3. Backend Szűrés, SSRF és Malware Védelem**

* **Webshop URL Validáció:** Kizárólag https:// protokoll fogadható el. A privát és belső hálózati IP címek (localhost, 127.0.0.1, 10.0.0.0/8, 192.168.0.0/16, felhő metaadat IP 169.254.169.254) azonnal blokkolásra kerülnek az SSRF támadások kivédésére.  
* **Bináris Képellenőrzés (Magic Bytes):** A backend ellenőrzi a képek első bájtjait (JPEG: FF D8 FF, PNG: 89 50 4E 47, WebP: 52 49 46 46), kiszűrve a polyglot vagy álcázott bináris fájlokat.  
* **Prompt Injection Védelem:** A bemeneti külső adatokat szeparált határolók zárják körül (\<user\_data\>...\</user\_data\>). A modell kötelezően Structured JSON kimenetet állít elő, kizárva a kódvégrehajtást.

## **9\. Firestore Adatbázis-Sémarendszer és Biztonsági Szabályok**

### **9.1. Adatmodellek (TypeScript)**

TypeScript  
export interface UserProfile {  
  uid: string;  
  gender: 'male' | 'female';  
  bodyType: string;  
  heightCm: number;  
  baseSizeProfile: {  
    tops: string;  
    bottoms: string;  
    shoes: string;  
  };  
  styleDNA: {  
    seasonalType: string;  
    dominantArchetypes: string\[\];  
    bestColors: string\[\];  
    avoidColors: string\[\];  
  };  
  customUserRules: string\[\];  
  isSubscribed: boolean;  
  savingsTotalHuf: number;  
  createdAt: string;  
}

export interface ClothingItem {  
  id: string;  
  userId: string;  
  name: string;  
  category: 'tops' | 'knitwear' | 'outerwear' | 'bottoms' | 'shoes' | 'accessories';  
  subcategory: string;  
  fit: 'slim' | 'regular' | 'oversized';  
  dominantColor: string;  
  secondaryColor?: string;  
  hexCode: string;  
  fabricComposition: Record\<string, number\>;  
  formalityLevel: 1 | 2 | 3 | 4 | 5;  
  season: ('spring' | 'summer' | 'autumn' | 'winter')\[\];  
  imageUrl: string;  
  isSyntheticHeavy: boolean;  
  styleArchetype: string\[\];  
  createdAt: string;  
}

export interface SavedOutfit {  
  id: string;  
  userId: string;  
  name: string;  
  formalityLevel: number;  
  eventContext: string;  
  itemIds: {  
    topId: string;  
    knitwearId?: string;  
    outerId?: string;  
    bottomId: string;  
    shoeId: string;  
    accessoryId?: string;  
  };  
  decisionBadge: string;  
  culturalFitReasoning: string;  
  layeringAdvice: string;  
  savedAt: string;  
}

export interface SartorialRule {  
  id: string;  
  userId: string;  
  ruleTitle: string;  
  ruleType: 'DO' | 'DONT';  
  description: string;  
  targetStyles: string\[\];  
  appliesToCategories: ('tops' | 'knitwear' | 'outerwear' | 'bottoms' | 'shoes' | 'accessories')\[\];  
  sourceName: string;  
  sourceUrl?: string;  
  minedAt: string;  
  isActive: boolean;  
}

### **9.2. Firestore és Storage Hozzáférési Szabályzat**

JavaScript  
// firestore.rules  
rules\_version \= '2';  
service cloud.firestore {  
  match /databases/{database}/documents {  
    match /users/{userId}/{document\=\*\*} {  
      allow read, write: if request.auth \!= null && request.auth.uid \== userId;  
    }  
  }  
}

// storage.rules  
rules\_version \= '2';  
service firebase.storage {  
  match /b/{bucket}/o {  
    match /users/{userId}/{allPaths=\*\*} {  
      allow read: if request.auth \!= null && request.auth.uid \== userId;  
      allow write: if request.auth \!= null   
                   && request.auth.uid \== userId  
                   && request.resource.size \< 2 \* 1024 \* 1024  
                   && request.resource.contentType.matches('image/(jpeg|webp|png)');  
    }  
  }  
}

## **10\. Költség-, Token- és Csevegés-Menedzsment**

### **10.1. Tömörített Ruhatár Katalógus (Compressed Inventory Format)**

A teljes JSON objektumok helyett a csevegési és szettépítési promptok egy kompakt TSV-szerű blokkot kapnak, ami akár 70%-kal csökkenti a felhasznált bemeneti tokeneket:

Kódrészlet  
\[CATALOG\]  
ID:w1 | Olasz Gyapjú Zakó | outer | sötétkék | 100% gyapjú | fit:slim | form:4 | sz:ősz,tél  
ID:w2 | Prémium Pamut Póló | top | törtfehér | 100% pamut | fit:slim | form:2 | sz:egész év  
ID:w3 | Slim Chino Nadrág | bottom | kőbézs | 98% pamut, 2% elasztán | fit:slim | form:3 | sz:tavasz,nyár,ősz  
ID:w4 | Bőr Penny Loafer | shoes | sötétbarna | borjúbőr | fit:regular | form:3 | sz:tavasz,nyár,kora\_ősz  
\[/CATALOG\]

### **10.2. Konverzációs Memória Korlátai**

* A konverzációs prompt csak az utolsó **6–8 üzenetváltást** tartja aktívan a memóriában.  
* A csevegés során felismert preferenciák azonnal a Firestore UserProfile dokumentumba perzisztálódnak, így a modell kontextusablaka tiszta marad.

## **11\. Sartorial Tesztelési & Validációs Csomag (Golden Eval Suite)**

| Teszt ID | Bemenet és Kontextus | Elvárt Eredmény | Sikertelenség Kritérium |
| :---- | :---- | :---- | :---- |
| **TC-1: Gallér-Harmónia** | Lehajtott galléros ing \+ galléros ingdzseki (shacket) | ❌ **FAIL / Blokk** | Kettős gallér hiba átengedése. |
| **TC-2: Nyári Lábbeli** | 22°C megadott hőmérséklet \+ Chelsea bokacsizma | ❌ **FAIL / Blokk** | $\\ge$ 19°C feletti zárt téli csizma jóváhagyása. |
| **TC-3: Bázis Felső Követelmény** | Gyapjú zakó javaslása közvetlenül alsó réteg nélkül | ❌ **FAIL / Blokk** | Anatómiai bázisréteg hiányának figyelmen kívül hagyása. |
| **TC-4: Szintetikus Szűrő** | 80% poliészter zakó vásárlási auditja | ⚠️ **KERÜLENDŐ** | Erős műszáltartalom mellett 50 feletti pontszám adása. |
| **TC-5: Férfi Loafer Break** | Slim nadrág \+ bőr penny loafer | ✅ **PASS: No-Break** | Nem no-break hosszúság előírása szűk szárnál. |
| **TC-6: Női Boot Gap** | Midi szoknya \+ lábszárközépig érő csizma | ❌ **FAIL / Blokk** | A 2–5 cm-es lábszár-elvágó hézag engedélyezése. |

## **12\. Megvalósítási Sprintterv (Implementation Roadmap)**

* **Sprint 1: Alapinfrastruktúra & Biztonság**  
  * Firebase projekt beállítása, Cloud Functions v2 környezet, Google Cloud Secret Manager konfigurálása.  
  * Firestore adatbázis sémák és Security Rules élesítése.  
  * Kliensoldali Canvas 2D képtömörítő (640×640 px) és Web Worker háttérmaszkoló implementálása.  
* **Sprint 2: Skillek és Modell Integráció**  
  * gemini-3.5-flash-lite bekötése termékadat-kinyeréshez és portréanalízishez.  
  * gemini-3.7-flash Structured Outputs integrációja a determinisztikus sartorial guardrail szabályokkal.  
  * Google Search Grounding szabálybányász rutin (Workflow 8\) felállítása.  
* **Sprint 3: Mobil PWA UI/UX és Munkafolyamatok**  
  * Az 5-tabos navigáció felépítése, Safe Area és 48px touch ergonómia implementálása.  
  * Szettkérő (Context Chips) és Gardrób (CRI sáv \+ Masonry rács) felületek elkészítése.  
  * „Megvegyem?” vásárlási auditor képernyő és a Szettépítő felület integrálása Lightbox megjelenítéssel.  
* **Sprint 4: Validáció, Offline Működés és Hardening**  
  * Offline állapotjelző és Service Worker gyorsítótárazás bekötése.  
  * A Golden Eval Suite (TC-1-től TC-6-ig) futtatása és finomhangolása.  
  * XSS, SSRF és Magic Bytes ellenőrzések biztonsági tesztelése.