# 🗺️ Sartorial Wardrobe Assistant — Fejlesztési Útiterv & Feladatlista (Roadmap & Backlog)

Ez a dokumentum rögzíti az **AI Wardrobe Assistant** projekt javítandó feladatait, technikai adósságait, valamint a tervezett jövőbeli funkciókat és mérföldköveket.

---

## 📌 Jelenlegi Státusz
- **Aktuális Verzió:** `v1.7.0` (Production)
- **Architektúra:** React (Vite) + Tailwind CSS + Firebase Cloud Functions v2 (Node.js 22 Proxy) + Google Gemini 3.x + Google Cloud Secret Manager + Cloud Firestore + Firestore Persistent Offline Cache.
- **Éles URL:** [https://wardrobe-assistant-48e01.web.app/](https://wardrobe-assistant-48e01.web.app/)

---

## 🛠️ I. Javítandó Tételek & Technikai Finomhangolások (Tech Debt & Fixes)

### ✅ Lezárt Javítások (v1.5.4 – v1.7.0)
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
- [x] **Email & Jelszó Autentikáció (Firebase Email/Password Auth):** Standard Email + Jelszavas bejelentkezés, új fiók regisztráció (névvel és minimum 6 karakteres jelszóval), jelszó-visszaállító link küldése (`sendPasswordResetEmail`), valamint magyar nyelvű hibakezelés integrálva a Google OAuth alternatívájaként az `AuthModal.jsx`, `AuthContext.jsx` és `firebase.js` rétegekbe.

### 📋 Nyitott Tételek & Következő Sprint Feladatai
- [ ] **Az 5 lépéses kezdő segítség (Onboarding & Onboarding Guide) felülvizsgálata:**
  - Az interaktív varázsló (`OnboardingModal.jsx` és alkomponensei: `StepIdentity.jsx`, `StepColorSeason.jsx`, `StepStyles.jsx`, `StepAddFirstItem.jsx`, `StepSummaryLaunch.jsx`) és a felületi teendőlista (`OnboardingGuide.jsx`) átfogó auditja és felülvizsgálata.
  - A lépések egyszerűsítése, születési év (`birthYear`) és demográfiai harmónia ellenőrzése, redundanciák megszüntetése, valamint az első ruha felvitel folyamatának további optimalizálása.
- [ ] **„Megvegyem?” Átnevezés & „Audit” Szó Kivezetése a UI-ból:**
  - A korábbi „Vásárlási Döntésteszt / Audit” helyett emberközeli, világos megnevezés: **„Megvegyem? (Nézzük meg, mennyire érdemes megvenned a kiszemelt darabot!)”**.
  - Az „Audit” szó (Stílus Audit, Szabás Audit, Minőségi Audit stb.) teljes kivezetése a felhasználói felületről és gombokról; helyette természetes kifejezések: *Elemzés, Stílus-ellenőrzés, Szakértői vélemény, Összhang-vizsgálat*.
- [ ] **Felesleges Technikai Állapotjelzők és Címkék Eltávolítása:**
  - A felhasználói felület letisztítása a felesleges, zavaró technikai badge-ektől (pl. `PurchaseAdvisorView.jsx`-ben az *„Egyéni stílusszabály-ellenőrzés aktív (X)”* doboz, felesleges debug/státusz jelölők).
- [ ] **Magyarázó Blokkok Háttérbe Helyezése („Hogyan segít az AI...”, Edukációs Panelek):**
  - A nézeteken (Vásárlási Tanácsadó, Stylist, Kapszula Gap) közvetlenül helyet foglaló nagy magyarázó kártyák (pl. *„Hogyan segít az AI megelőzni a rossz vásárlási döntéseket?”*) átalakítása diszkrét, lenyitható („Tudj meg többet” / collapsible accordion vagy súgó modál) formátumba.
- [ ] **GCP Service Account Jogosultság (Firebase Rules Deploy):** A `roles/firebaserules.admin` hozzárendelése a CI/CD service accounthoz a Google Cloud konzolon, ha a jövőben a Firestore szabályok deployját is a CI/CD-re bíznánk.
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

*Utoljára frissítve: 2026-09-06 (v1.5.4)*
