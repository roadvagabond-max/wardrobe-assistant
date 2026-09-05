# **Sartorial AI PWA – Teljes Üzleti és Technikai Rendszerspecifikáció (v3.2)**

## **1\. Rendszer- és Termékáttekintés (Executive Summary)**

### **1.1. Célkitűzés és Termékfilozófia**

A **Sartorial AI PWA** egy zárt, determinisztikus, prémium szabászati döntéstámogató és digitális gardrób platform. A rendszer célja az öltözködési stílus fejlesztése, a ruhatári redundancia megszüntetése, a gyenge minőségű impulzusvásárlások csökkentése, valamint az alkalmi és napi öltözködési döntési fáradtság minimalizálása.

### **1.2. Alapelvek (Golden Rules)**

> 1. **Determinisztikus Szabályozás (Zero-Hallucination):** A rendszer nem generál általános tanácsokat. Minden szett- és vásárlási döntés szigorú anatómiai és szabászati szabályokon alapul.  
> 2. **Kizárólag Valós Ruhatári Elemek:** A szettajánlások kizárólag a felhasználó fizikai gardróbjában meglévő darabokból épülhetnek fel.  
> 3. **Zéró Mock és Valós Hibakezelés:** Bármilyen API- vagy hálózati hiba esetén transzparens hibaüzenet jelenik meg; nincsenek szimulált állapotok.  
> 4. **Kliensoldali Adatminimalizálás:** A képi adatfeldolgozás a kliens memóriájában történik (640×640 px, 35–50 KB), minimalizálva az API tokenköltségeket és a hálózati késleltetést.

## **2\. Rendszerarchitektúra Diagram**

                                \[ Mobil PWA Kliens \]  
                                         │  
        ┌────────────────────────────────┼────────────────────────────────┐  
        ▼                                ▼                                ▼  
\[ Offline & Hálózatkezelés \]    \[ Kliens Képfeldolgozás \]      \[ 5-Tab Ergonomikus UI \]  
 • navigator.onLine figyelés     • HTML5 Canvas 640×640 @0.75   • 1\. Szettek (Context Chips)  
 • Diszkrét felső státuszsáv     • \~35–50 KB tömörített Blob    • 2\. Gardrób (CRI \+ FAB felvitel)  
 • Firestore offline perziszt.   • Web Worker háttérmaszkolás   • 3\. Megvegyem? (Vásárlási Audit)  
 • IndexedDB gyorsítótár         • Fallback: eredeti fotó       • 4\. Stylist (Chat \+ Szettépítő)  
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

## **3\. Felhasználói Felület és Mobil Ergonómia (UI/UX)**

### **3.1. 5-Tabos Alsó Navigációs Rendszer**

┌──────────────────────────────────────────────────────────────────────────────────────────────────┐  
│   \[ 👔 SZETTEK \]     \[ 🚪 GARDRÓB \]    \[ 🛍️ MEGVEGYEM? \]    \[ 💬 STYLIST \]     \[ 🧬 STÍLUS DNS \]   │  
└──────────────────────────────────────────────────────────────────────────────────────────────────┘

#### **Tab 1: 👔 Szettek (Szöveges Szettkérő & Tanult Gyorsgombok)**

* **Bemenet:** Szabad szöveges mező (pl. *„Szerda esti kávérandi hűvös időben”*).  
* **Dinamikus Context Chips:** Felhasználói szokásokból tanult gyorsgombok (☕ Kávérandi, 💼 Smart Iroda, 🍽️ Vacsora, 🍸 Esti lezser, 🎵 Klub/Koncert).  
* **Kimenet:** 3 indokolt szett a gardróbból, darabok fotóival, culturalFitReasoning és layeringAdvice mezőkkel.

#### **Tab 2: 🚪 Gardrób (Vizuális Tár, Kapszula Audit & Felvitel)**

* **Kapszula Ruhatár Index (CRI) Sáv:** Kapszula egyensúly (0–100) és szezonális készenlét kiírása; lenyitható hiányelemzővel és keresőszintaxissal.  
* **Kategóriaszűrők:** Mind, Felsők, Kötöttáru, Zakók/Kabátok, Nadrágok, Lábbelik, Kiegészítők.  
* **2 Oszlopos Masonry Képrács:** Háttér-eltávolított fotók, finom kártyakerettel.  
* **Kiemelt Akciógomb (FAB):** Jobb alsó lebegő \[+ Ruha Hozzáadása\] gomb (kamera / galéria / webshop link).

#### **Tab 3: 🛍️ Megvegyem? (Önálló Vásárlási Döntéstámogató)**

* **Bemenet:** Próbafülkés fotó VAGY webshop link / cikkszám beillesztése.  
* **Döntési Banner:** 🟢 **MEGVEHETED** (85–100) | 🟡 **GONDOLD ÁT** (50–84) | 🔴 **KERÜLENDŐ** (\< 50).  
* **Audit Panelek:** Redundancia összevetés a szekrény rivális darabjával, anyagminőségi és műszál-elemzés, méretmátrix és fit eltérés.  
* **Kombinációs Teszt:** 3 jóváhagyott szettvariáció a felhasználó meglévő ruháival.

#### **Tab 4: 💬 Stylist (Master Stylist Chat & Manuális Szettépítő)**

* **Csevegőfelület:** Strukturált szerkesztőségi szöveges válaszok {{item:itemId}} kártyahivatkozásokkal.  
* **Lightbox:** Kártyára koppintva a ruha nagy felbontású nézete nyílik meg.  
* **Fejléc Akció:** Váltógomb a manuális 6-slotos szettépítő canvasra (Workflow 7).

#### **Tab 5: 🧬 Stílus DNS (Profil, Színtípus & Szabálytár)**

* **Profil Adatlap:** Színpaletta (5 legjobb szín, 2 tiltott árnyalat), testalkat és méretmátrix.  
* **Saját Szabályok Kezelője:** Egyéni tiltások azonnali felvitele és törlése (pl. \[✕ Nem hordok pólóinget\]).  
* **Sartorial DO / DON'T Kártyák:** A Google Search Groundinggal bányászott nemzetközi szabálytár transzparens böngészője forrásmegjelöléssel.

### **3.2. Mobil Ergonómia & Safe Area**

* **48×48 px Érintési Célpontok:** WCAG és Apple HIG kompatibilis gombok és szűrőchipek.  
* **Safe Area Támogatás:** padding-bottom: env(safe-area-inset-bottom) a rendszernavigációs sávok átfedése ellen.  
* **Lightbox & Bottom Sheet:** Kártyák és részletek alulról felcsúszó, egykezes paneleken jelennek meg; lefelé húzással zárhatók.

### **3.3. Offline Állapotjelzés**

* Hálózati kimaradás esetén a Safe Area alatt diszkrét, nem tolakodó sáv jelenik meg:  
  \[ ⚡ Nincs internetkapcsolat – a ruhatárad offline is böngészhető \]

* A korábban betöltött ruhatár, a mentett szettek és a szabálytár helyi gyorsítótárból (IndexedDB) böngészhető marad.  
* Az AI elemzést igénylő funkciók inaktívvá válnak; a kapcsolat helyreállásakor a sáv zöldre vált, majd automatikusan eltűnik.

## **4\. Nemzetközi Szabászati Kódex (Sartorial Rules)**

### **4.1. Gallér- és Ujj-Harmónia**

* **Kettős Gallér Tilalma:** Lehajtott galléros ing nem viselhető galléros ingdzseki (*shacket* / *overshirt*) alatt. Engedélyezett bázisrétegek: prémium kereknyakú póló, bordás atléta vagy garbó.  
* **Ujjhossz Szabályzat:** Strukturált zakó vagy blézer alatt tilos rövid ujjú inget viselni. A hosszú ujjú ing mandzsettájának 1–1.5 cm-re ki kell látszania a zakó ujjából.

### **4.2. Anatómiai Rétegrend**

* **Kötelező Bázisréteg (Base Layer):** Minden összeállítás kötelezően tartalmaz egy bőrön viselhető felsőt (tops: ing vagy prémium pamut póló).  
* **Csupasz Bőr Védelme:** Zakó, blézer vagy pulóver közvetlenül csupasz bőrre nem ajánlható (kivétel: önálló finomkötött garbó vagy kötött pólóing).  
* **Téli Rétegzés (\< 12°C):** Engedélyezett a strukturált rétegzés (ing $\\rightarrow$ zakó $\\rightarrow$ szövetkabát/nagykabát).

### **4.3. Szezonális Lábbeli- és Anyagkorlátok**

| Hőmérséklet | Szigorúan TILTOTT | Kizárólag ENGEDÉLYEZETT |
| :---- | :---- | :---- |
| **Meleg idő ($\\ge$ 19°C)** | Chelsea csizmák, őszi/téli bélelt bakancsok, vastag szövetkabátok, nehéz gyapjú garbók. | Penny/tassel loafer, mokaszin, bőr sneaker, nyári félcipő, könnyű len és pamut textíliák. |
| **Hűvös idő (\< 14°C)** | Nyitott saruk, szandálok, vékony vászoncipők, mezítlábas bokavillantás. | Chelsea csizmák, zárt bőrcipők, flanelnadrágok, rétegzett gyapjúkabátok. |

### **4.4. Férfi Szabályzat: Nadrághossz, Zokni és Kiegészítők**

* **Nadrágszár-törés (Break Matrix):**  
  * *No-Break:* Slim nadrágokhoz és loaferhez kötelező (a szár a cipő felső pereménél végződik).  
  * *Slight Break:* Hagyományos szövet- és flanelnadrágokhoz, oxford/derby cipőkhöz.  
  * *Full Break:* Modern összeállításokban szigorúan tiltott.  
* **Zokniprotokoll:** Loafer viselése melegben kizárólag kivágott, láthatatlan titokzoknival megengedett. Formális öltözetnél a zokninak vádli- vagy térdközépig kell érnie (üléskor sem villanhat ki csupasz bőr).  
* **Bőr- és Fémharmónia:** A lábbeli és az öv árnyalatának, valamint felületének egyeznie kell (barna bőrhöz barna bőr, velúrhoz velúr). A fém kiegészítők (övcsat, óratok) azonos fémcsaládba kell essenek (karikagyűrű kivétel).

### **4.5. Női Szabályzat: Sziluett, Boot Gap és Kiegészítők**

* **Volume Balance:** Bő szárú nadrághoz (Palazzo, Wide-leg) vagy A-vonalú szoknyához betűrt felső vagy derékhangsúlyos blézer kötelező. Oversized blézer alatt a belső réteg feszes és letisztult.  
* **Boot Gap Szabály:** Midi szoknya/ruha és csizma viselésekor tilos a vádlit kettévágó 2–5 cm-es hézag: a csizma szárának fel kell nyúlnia a szoknya alá, vagy boka alá vágott lábbeli viselendő harisnyával.  
* **Fehérnemű Bázisprotokoll:** Áttetsző fehér/világos blúzok és selyemingek alá testszínű (nude), varrásmentes camisole top kötelező (fehér alá fehér viselése stílushiba).  
* **Harisnyaprotokoll:** Nyitott lábbelihez orrvarrásos harisnya tilos. Hidegben szoknyához 50+ DEN matt harisnya javasolt.

## **5\. Moduláris AI Skill Rendszer (Agent Skills Engine)**

| Skill Megnevezése | Modell | Bemenet | Kimenet / Felelősség |
| :---- | :---- | :---- | :---- |
| **1\. Vision & SKU Ingestion** | gemini-3.5-flash-lite | Kép Blob (640×640) vagy URL | ClothingItem strukturált JSON, háttér-mentes metaadatok |
| **2\. Color & Seasonal DNA** | gemini-3.5-flash-lite | Portré fotó / Színkód | Évszaktípus besorolás, 5 előnyös szín, 2 tiltott árnyalat |
| **3\. Sartorial Guardrails** | gemini-3.7-flash | Szett-összeállítás \+ szabályok | Gallér-, ujj-, réteg- és szárhossz-audit (Pass/Fail) |
| **4\. Fabric & Quality Auditor** | gemini-3.7-flash | Szövetösszetétel / Címkefotó | fabricScore (0–100), műszál- és bolyhosodási kockázat |
| **5\. Capsule Gap & Market Search** | gemini-3.7-flash \+ Search | Gardróbleltár \+ Időjárás | Kapszula Ruhatár Index (CRI), keresőszintaxis hiánypótláshoz |
| **6\. Master Stylist Chat** | gemini-3.7-flash | Csevegési előzmények \+ Kérdés | Szöveges tanácsadás {{item:itemId}} kártyahivatkozásokkal |
| **7\. fit-intelligence-auditor** | gemini-3.7-flash | Szabásvonalak \+ Méretprofil | Sziluett-törés audit, nemzetközi méretkorrekciós javaslat |
| **8\. cultural-stylist-curator** | gemini-3.7-flash | Esemény leírás \+ Szabályok | Szubkulturális dress code (techno, rock, black tie), anchor item |
| **9\. mobile-ui-designer** | Kliens Framework | Felhasználói interakciók | 48px touch, Safe Area, Bottom Sheet, Lightbox |

## **6\. Rendszer Munkafolyamatok (Workflows 1–8)**

### **Workflow 1: Onboarding & Személyes Stílus-DNS**

* **Cél:** A profil és esztétikai paraméterek rögzítése.  
* **Lépések:**  
  1. Természetes fényben készült arckép feltöltése $\\rightarrow$ ColorAndSeasonalDNASkill meghatározza az évszaktípust, 5 előnyös színt és 2 kerülendő árnyalatot.  
  2. Testalkat, nem, magasság és bázis méretprofil rögzítése.  
  3. Egyéni szabályok felvétele (customUserRules: pl. *„Nem hordok szintetikus pulóvert”*).

### **Workflow 2: Ruhafelvitel a Gardróbba (VisionIngestionSkill)**

* **Cél:** Új ruha digitalizálása minimális adatforgalommal.  
* **Lépések:**  
  1. Fotó rögzítése kamerával vagy galériából.  
  2. Kliens Canvas átméretezi és tömöríti a képet (640×640 px @ 0.75 JPEG, \~40 KB).  
  3. Párhuzamos végrehajtás:  
     * A tömörített kép elindul a Gemini Vision API felé az adatok leolvasására.  
     * Web Workerben lefut a háttérmaszkolás (@imgly/background-removal).  
  4. Strukturált mezők előtöltése (kategória, szabás, anyag, formalitás, szín) jóváhagyásra. Felismerhetetlen fotó esetén kötelező az isUnknown: true jelzés.

### **Workflow 3: Kapszula Ruhatár Audit & Piaci Keresés**

* **Cél:** A gardrób strukturális hiányainak pótlása.  
* **Lépések:**  
  1. A rendszer átvizsgálja a leltárat, kiszámítja a Kapszula Ruhatár Indexet (CRI 0–100).  
  2. Alkalmazza a 3+ szabályt: minden 3 felsőre legalább 1 funkcionális alsónak kell jutnia.  
  3. Hiány észlelésekor szabásérzékeny keresőszintaxist generál:  
     \[Alapdarab\] \+ \[Szabás/Fit\] \+ \[Anyag\] \+ \[Színtípusnak megfelelő szín\]

### **Workflow 4: Vásárlás Előtti Szűrő („Megvegyem?”)**

* **Cél:** Impulzusvásárlások kivédése a próbafülkében vagy webshopon.  
* **Lépések:**  
  1. Fotó készítése a próbafülkében vagy terméklink beillesztése.  
  2. Anyagvizsgálat: szintetikus arány és minőségi kockázat elemzése (fabricScore).  
  3. Redundancia vizsgálat (aestheticOverlap): megkeresi a gardróbban lévő legközelebbi rokont, és indokolja az eltérést vagy feleslegességet.  
  4. Szabási audit: a felhasználó testalkatának és bázisszabásának ellenőrzése.  
  5. Döntési besorolás: MEGVEHETED / GONDOLD ÁT / KERÜLENDŐ, kiegészítve 3 teszt szettel a meglévő ruhákból.

### **Workflow 5: Szöveges Szettkérés és Tanult Gyorsgombok**

* **Cél:** Napi vagy eseményspecifikus öltözködési döntés másodpercek alatt.  
* **Lépések:**  
  1. Felhasználó megadja az alkalmat szövegesen vagy a tanult Context Chipre koppintva.  
  2. Determinisztikus szűrés: a modell kizárólag a meglévő darabokból válogat, betartva a gallér-, réteg- és szezonális szabályokat.  
  3. Eredmény: 3 komplett szett (ruhafélékként lebontva) culturalFitReasoning és layeringAdvice kíséretében.

### **Workflow 6: Szabad Szöveges Master Stylist Csevegés**

* **Cél:** Szakértői stíluskonzultáció.  
* **Lépések:**  
  1. A felhasználó szabad szöveges kérdést tesz fel.  
  2. A modell tömörített ruhatár-katalógust kap a promptban a tokenminimalizálás érdekében.  
  3. A válaszban a darabok {{item:itemId}} jelöléssel szerepelnek, melyek alatt interaktív kártyák jelennek meg Lightbox megnyitási lehetőséggel.

### **Workflow 7: Saját Szett Összeállítása & Audit (auditManualOutfit)**

* **Cél:** A felhasználó saját ötletének szakmai ellenőrzése.  
* **Lépések:**  
  1. A felhasználó a 6 vizuális slotba behúzza a darabjait (tops, knitwear, outerwear, bottoms, shoes, accessories).  
  2. AI audit lefutása 5 dimenzióban: esemény-összhang, 3-szín szabály, anyag- és textúraharmónia, anatómiai rétegrend, időjárási komfort.  
  3. 0–100% közötti pontszám, hibák listája és cserejavaslat a szekrényből.  
  4. Mentési lehetőség a kedvencekhez (savedOutfits).

### **Workflow 8: Autonóm Stílus-DNS Szabálykutató (Style-Grounded Rule Mining)**

* **Cél:** A rendszer tudásbázisának naprakészen tartása nemzetközi kódexek alapján.  
* **Lépések:**  
  1. A PWA indításakor vagy háttérfolyamatként lefut az időbélyegző ellenőrzése (checkAndAutoSyncSartorialRules).  
  2. Ha 7 napnál régebbi, Google Search Grounding fut le a felhasználó stílusfókuszai alapján (Savile Row, Pitti Uomo, Vogue, Permanent Style, Drake's).  
  3. Kinyert szabályok deduplikálása és mentése a Firestore minedRules gyűjteménybe DO / DON'T formátumban.  
  4. A kódexek azonnal érvényesülnek az összes döntési modulban.

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

* **Végrehajtási Menet:**  
  1. A bejövő képet a kliens HTML5 Canvas 2D kontextusa 640×640 px méretre skálázza le az arányok megőrzésével.  
  2. A tömörített 35–50 KB méretű JPEG azonnal átadásra kerül az AI híváshoz.  
  3. Egy Web Worker a háttérben levágja a hátteret; hiba vagy lassú hardver esetén a rendszer zökkenőmentesen visszaesik az eredeti tömörített képre CSS szegéllyel ellátva.

## **8\. Biztonsági Specifikáció (Security, XSS & Malware Protection)**

### **8.1. API Kulcs Kezelés és Backend Architektúra**

* A Gemini API mesterkulcsa nem exponálható a kliensoldali kódban.  
* Minden AI kérés HTTPS-alapú Firebase Cloud Functions (v2) végpontokon keresztül fut le.  
* Az API kulcs elérése kizárólag a **Google Cloud Secret Manager** (GEMINI\_API\_KEY) segítségével történik.

TypeScript  
// functions/src/index.ts  
import { onCall, HttpsError } from "firebase-functions/v2/https";  
import { defineSecret } from "firebase-functions/params";  
import { GoogleGenAI } from "@google/genai";

const geminiApiKey \= defineSecret("GEMINI\_API\_KEY");

export const generateDailyOutfit \= onCall(  
  { secrets: \[geminiApiKey\] },  
  async (request) \=\> {  
    if (\!request.auth) {  
      throw new HttpsError("unauthenticated", "Csak bejelentkezett felhasználó érheti el.");  
    }  
    const ai \= new GoogleGenAI({ apiKey: geminiApiKey.value() });  
    // Üzleti logika és modellhívás...  
    return { success: true };  
  }  
);

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

* **Zéró innerHTML Követelmény:** A PWA nem használ nyers HTML beillesztést (dangerouslySetInnerHTML tiltott). A szöveges mezők kizárólag strukturált UI komponensekben vagy DOMPurify által fertőtlenítve renderelődhetnek.  
* **SVG Kizárás:** Felhasználói SVG fájlok feltöltése tiltott; kizárólag raszteres állományok engedélyezettek.

### **8.3. Backend Szűrés, SSRF és Malware Védelem**

* **Webshop URL Validáció:** Kizárólag https:// protokoll fogadható el. A privát és belső hálózati IP címek (localhost, 127.0.0.1, 10.0.0.0/8, 192.168.0.0/16, felhő metaadat IP 169.254.169.254) azonnal blokkolásra kerülnek az SSRF támadások kizárására.  
* **Bináris Képellenőrzés (Magic Bytes):** A backend a beérkező képek első bájtjait ellenőrzi:  
  * JPEG: FF D8 FF  
  * PNG: 89 50 4E 47  
  * WebP: 52 49 46 46  
    A nem megfelelő bájtstruktúrájú, polyglot vagy beágyazott kódot tartalmazó állományokat a rendszer elutasítja.  
* **Prompt Injection Védelem:** A bemeneti felhasználói és külső webshop adatokat szeparált határolók zárják körül (\<user\_data\>...\</user\_data\>). A modell kötelezően Structured JSON kimenetet állít elő, kizárva a kódvégrehajtást.

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

A rendszer determinisztikus működését az alábbi automatizált tesztesetek ellenőrzik minden modellfrissítésnél:

| Teszt ID | Bemenet és Kontextus | Elvárt Eredmény | Sikertelenség Kritérium |
| :---- | :---- | :---- | :---- |
| **TC-1: Gallér-Harmónia** | Lehajtott galléros ing \+ galléros ingdzseki (shacket) | ❌ **FAIL / Blokk** | Kettős gallér hiba átengedése. |
| **TC-2: Nyári Lábbeli** | 22°C megadott hőmérséklet \+ Chelsea bokacsizma | ❌ **FAIL / Blokk** | $\\ge$ 19°C feletti zárt téli csizma jóváhagyása. |
| **TC-3: Bázis Felső Követelmény** | Gyapjú zakó javaslása közvetlenül alsó réteg nélkül | ❌ **FAIL / Blokk** | Anatómiai bázisréteg hiányának figyelmen kívül hagyása. |
| **TC-4: Szintetikus Szűrő** | 80% poliészter zakó auditja | ⚠️ **KERÜLENDŐ** | Erős műszáltartalom mellett 50 feletti pontszám adása. |
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
  * „Megvegyem?” vásárlási auditor képernyő és a Stylist chat nézet integrálása Lightbox megjelenítéssel.  
* **Sprint 4: Validáció, Offline Működés és Hardening**  
  * Offline állapotjelző és Service Worker gyorsítótárazás bekötése.  
  * A Golden Eval Suite (TC-1-től TC-6-ig) futtatása és finomhangolása.  
  * XSS, SSRF és Magic Bytes ellenőrzések biztonsági tesztelése.