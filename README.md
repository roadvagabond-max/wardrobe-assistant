# 👔 Wardrobe Assistant – AI Intelligens Gardrób & Stylist

Prémium minőségű, **Mobile-First** okosgardrób és személyes stílustanácsadó webes és mobil alkalmazás.

---

## 🌟 Fő Funkciók

1. **Digitális Gardrób & AI Ruhafelismerés**:
   - Közvetlen telefonos fotózás (kamera megnyitása a gardróbban vagy a próbafülkében), galéria feltöltés, vagy webshop terméklink beillesztése.
   - **Google Gemini Vision AI**: automatikusan felismeri a ruhadarab kategóriáját, színét, anyagát, szezonalitását, formalitási szintjét és minőségi pontszámát.
2. **AI Outfit Stylist & Valós Idejű Időjárás**:
   - Eseményválasztó (üzleti tárgyalás, esti randevú, esküvő, hétvégi kötetlen nap).
   - **Open-Meteo API**: valós idejű helyi időjárás és hőmérséklet.
   - Kizárólag a **meglévő saját ruhatáradból** állít össze komplett, harmonikus szetteket stílustippekkel és viselési tanácsokkal.
3. **Vásárlás Előtti Döntéstámogató („Megvegyem?” 3-Outfit Szabály)**:
   - Még a próbafülkében vagy webes nézelődéskor készíts fotót / add meg a linket.
   - Az AI azonnal összeállít **3 komplett szettet a meglévő ruháidból** az új darabbal, ellenőrzi a duplikációkat, és 0-100% kompatibilitási pontszámot ad.
4. **Személyes Stílus DNA**:
   - Bőrtónus, színtípus, testalkat, magasság, sprezzatura & klasszikus elegancia preferenciák.
5. **Hiányzó Kulcsdarabok Elemzése (Wardrobe Gap Analyzer)**:
   - Feltárja a ruhatárad stratégiai hiányosságait a maximális variálhatóság eléréséhez.

---

## 🚀 Futtatás a Saját Gépeden (3 lépés)

1. **Függőségek telepítése**:
   ```bash
   cd wardrobe-assistant
   npm install
   ```
2. **Alkalmazás elindítása**:
   ```bash
   npm run dev
   ```
   Az app azonnal megnyílik a böngésződben (általában a `http://localhost:3000` címen).

---

## 📱 Használat a Telefonodon (1 Kattintásos Telepítés)

Az alkalmazás **PWA (Progressive Web App)** formátumban készült, így közvetlenül a telefonodra telepíthető:
- **iPhone (iOS Safari)**: Nyisd meg az oldalt Safariban -> Nyomj a **Megosztás** gombra -> Válaszd a **„Főképernyőhöz adás”** (Add to Home Screen) opciót.
- **Android (Chrome)**: Nyomj a jobb felső 3 pontra -> **„Alkalmazás telepítése”** / „Hozzáadás a kezdőképernyőhöz”.

Ezután teljes képernyőn, alkalmazásként indul el, és közvetlenül használhatja a telefonod kameráját!

---

## 🔐 Firebase & Google Bejelentkezés Bekötése

1. Nyisd meg a [Firebase Console-t](https://console.firebase.google.com/) és hozz létre egy új projektet.
2. Kapcsold be az **Authentication** (Google bejelentkezés), a **Cloud Firestore** és a **Storage** szolgáltatásokat.
3. A Web App regisztrációjakor kapott kulcsokat másold be:
   - Vagy az alkalmazáson belül a **Jobb felső Fogaskerék (Beállítások)** menüpontban,
   - Vagy hozz létre egy `.env` fájlt a `.env.example` alapján.

---

## 🐙 Git / GitHub / Bitbucket Feltöltés

A forráskódod felhőbe mentéséhez futtasd a terminálban:
```bash
git init
git add .
git commit -m "Initial commit: Wardrobe Assistant full app"
git branch -M main
git remote add origin https://github.com/FELHASZNALONEV/wardrobe-assistant.git
git push -u origin main
```
