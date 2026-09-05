# 🗺️ Sartorial Wardrobe Assistant — Fejlesztési Útiterv & Feladatlista (Roadmap & Backlog)

Ez a dokumentum rögzíti az **AI Wardrobe Assistant** projekt javítandó feladatait, technikai adósságait, valamint a tervezett jövőbeli funkciókat és mérföldköveket.

---

## 📌 Jelenlegi Státusz
- **Aktuális Verzió:** `v1.5.3` (Production)
- **Architektúra:** React (Vite) + Tailwind CSS + Firebase Cloud Functions v2 (Node.js 22 Proxy) + Google Gemini 3.x + Google Cloud Secret Manager + Cloud Firestore + Firestore Persistent Offline Cache.
- **Éles URL:** [https://wardrobe-assistant-48e01.web.app/](https://wardrobe-assistant-48e01.web.app/)

---

## 🛠️ I. Javítandó Tételek & Technikai Finomhangolások (Tech Debt & Fixes)

### 1. 🛡️ GCP Service Account Jogosultság (Firebase Rules Deploy)
- **Leírás:** A GitHub Actions CI/CD service accountja (`FIREBASE_SERVICE_ACCOUNT_WARDROBE_ASSISTANT_48E01`) jelenleg a Cloud Functionst és a Hostingot telepíti automatikusan. A `firestore.rules` közvetlen CI/CD deployjához a Google Cloud IAM konzolon a service accounthoz hozzárendelhető a `roles/firebaserules.admin` (Firebase Rules Admin) szerepkör.
- **Prioritás:** Alacsony / Opcionális (A jelenlegi Firestore szabályok stabilak, kézzel vagy admin fiókkal is élesíthetők).

### 2. 🧹 Nagy Ruhatárak Megjelenítési Optimalizálása (Virtual List / Infinite Scroll)
- **Leírás:** 300–500+ ruhadarab feletti ruhatár esetén a DOM méretének optimalizálása érdekében érdemes bevezetni virtuális listázást (pl. `react-window` vagy CSS `content-visibility: auto`).
- **Prioritás:** Közepes.

### 3. 🌐 PWA Service Worker & Offline Kép Gyorsítótár
- **Leírás:** Bár a Firestore adatbázis már rendelkezik `persistentLocalCache` offline támogatással, a statikus frontend assetekhez (ikonok, betűtípusok, HTML/JS bundle) érdemes egy teljes értékű Service Worker gyorsítótárat és PWA telepíthetőséget készíteni.
- **Prioritás:** Magas.

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

*Utoljára frissítve: 2026-09-05 (v1.5.3)*
