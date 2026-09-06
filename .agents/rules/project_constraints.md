# 🚫 Projekt Fejlesztési Irányelvek & Szigorú Szabályok (Project Constraints)

Ez a dokumentum kötelező érvényű szabályokat tartalmaz az egész projektre vonatkozóan.

---

## 0. 🛑 Szigorúan Tilos Bármilyen Kódmódosítás Előzetes Tervezés és Kifejezett Felhasználói Jóváhagyás Nélkül
- **SEMMILYEN forráskódot, komponenst vagy konfigurációt NEM SZABAD módosítani a felhasználó előzetes jóváhagyása nélkül!**
- Minden feladatnál kötelező a tervezési folyamat:
  1. Hiba vagy feladat okának és összefüggéseinek alapos feltárása.
  2. Részletes `implementation_plan.md` készítése a tervezett változtatásokkal.
  3. **Megállás és a felhasználó kifejezett jóváhagyásának megvárása (`proceed`, `ok`, `jóváhagyom`).**
- Tilos a jóváhagyási lépést megkerülni, önhatalmúan fájlokat módosítani vagy "előre megjavítani" a kódot.

---

## 1. 🛑 Szigorúan Tilos Önhatalmú Funkció- és Logika-Módosítás
- **Kifejezett felhasználói kérés nélkül tilos bármilyen funkciót átalakítani, lecserélni vagy megváltoztatni!**
- **Tilos önhatalmúan heurisztikus, mock, szimulált vagy nem-AI alapú "fallback" megoldásokat építeni az alkalmazásba.**
- Ha egy funkció AI alapú (Gemini), annak **100%-ban kizárólag a valódi Gemini neurális modellen** kell futnia. Hiba esetén a valós hibát kell jelezni, soha nem szabad kamu vagy heurisztikus adatokat visszaadni.

---

## 2. 🤖 100% Tiszta Google Gemini AI Motor
- Minden funkció (Stylist szettgenerálás, Kapszula Ruhatár Gap elemzés, Mester Stylist Chat, Manuális Szett Audit, Képelemzés és Vásárlási Döntéstámogatás) kizárólag a Gemini API-n fut.
- Semmilyen körülmények között nem generálható mesterséges/heurisztikus pótszöveg vagy pótszett az AI helyett.

---

## 3. 🔑 AQ. Kezdetű és Bármely Érvényes API Kulcs Teljes Támogatása
- Az `AQ...` kezdetű kulcsok hivatalos, érvényes Google Antigravity / Gemini tokenek.
- Szigorúan tilos prefix-alapú szűrést (`startsWith('AIzaSy')`, `!startsWith('AQ.')`) vagy kulcstörlést bevezetni.
