---
name: sartorial-rule-miner
description: Autonomous web-grounded sartorial intelligence and rule mining skill with 7-day background sync.
---

# Sartorial Rule Miner & Intelligence Engine Skill

Ez a skill a sartorial stílusszabályok, rétegezési normák, szín- és fémtónus-harmóniák, nadrágtörések és szabászati elvek autonóm internetes felkutatását, karbantartását és alkalmazását végzi.

---

## 🏛️ Források és Szakmai Kódexek:
1. **Bespoke Szabászati Műhelyek:** *Savile Row Bespoke Tailoring Guidelines*, *Milanese & Neapolitan Tailoring Code (Rubinacci)*.
2. **Klasszikus Stílustanulmányok:** *Permanent Style (Simon Crompton)*, *Die, Workwear! (Derek Guy)*, *Alan Flusser (Dressing the Man)*, *Parisian Gentleman (Hugo Jacomet)*.
3. **Prémium Lábbeli & Bőrművesség:** *Crockett & Jones Bespoke Guide*, *Edward Green*, *John Lobb Sartorial Etiquette*.
4. **Anyag & Szövés Kódexek:** *Loro Piana Fabric Guide*, *Vitale Barberis Canonico (VBC)*, *Dormeuil*.
5. **Kiegészítő & Gombolási Etika:** *Drake's London*, *Pitti Uomo Standards*.
6. **Női Viselet & Sziluett-Arányok:** *Vogue Styling Masterclass*, *Harper's Bazaar*, *French Chic Guidelines*.

---

## 📐 Szabálykategóriák és Területek:
1. **👔 Gallérok & Nyakkivágások (`collar_harmony`):** Állógallér és zárt pulóver ütközése, hajtóka-kompatibilitás, garbó bázisréteg, csónaknyak, pussy-bow blúz, shacket/overshirt kettős gallér megelőzése.
2. **👕 Ujjak & Rétegek (`sleeve_hierarchy`):** Kötöttáru ujj-hierarchia, kötött mellény hosszú ujjal, zakó 1–1.5 cm mandzsetta kilógás.
3. **⚖️ Sziluettek & Arányok (`silhouette_balance`):** Térfogat-egyensúly (bő felsőhöz szűk alsó; bő nadrághoz betűrt felső), midi ruhák rövidített blézerrel.
4. **🧵 Anyagok & Textúrák (`fabric_synergy`):** Rusztikus vs finom selyemfényű szövetek, fényes Super 120s+ zakó vs farmer összeférhetetlensége, lenvászon nyári integritása, velúrbőr és esős időjárás védelme.
5. **🎨 Színharmónia & Kontraszt (`color_and_contrast`):** 3-Színes alapszabály (Three-Color Rule), arc-kontraszt arány (magas vs lágy kontrasztos rétegezés).
6. **👞 Lábbelik & Hossz (`footwear_and_proportions`):** Trouser Break arányok (No Break loaferhez, Half Break oxfordhoz), zokni színetika (nadrághoz igazodó tónus, fehér zokni tiltása öltönynél, láthatatlan titokzokni nyáron).
7. **🎗️ Bőrök & Fémek (`leather_and_metals`):** Cipő és öv bőrtónus egyezése, óratok/csat/mandzsettagomb fém-harmóniája, fekete és barna bőr szétválasztása.
8. **🎩 Gombolás & Kiegészítők (`finishing_touches`):** Zakó gombolási illemkódex (kétgombosnál felső gomb zárva, alsó sosem), díszzsebkendő függetlensége a nyakkendő mintájától.
9. **👗 Női Stílusszabályok (`womenswear_specific`):** Dekoltázs-vonalak, derékhangsúlyos rétegezés.

---

## 🔄 Munkafolyamatok:
1. **Google Search Grounding Kutatás (`mineSartorialRulesFromWeb`):**
   - A Gemini 3.x `tools: [{ googleSearch: {} }]` motorjával élőben kutat fel új, autentikus szabályokat strukturált JSON formátumban (❌ TILTOTT / ✅ HELYES, indoklás, forrás).
2. **7-Napos Ciklikus Háttér-Szinkronizáció (`checkAndAutoSyncSartorialRules`):**
   - 7 naponta automatikusan lefut a háttérben, intelligensen deduplikál, és frissíti a Cloud Firestore / LocalStorage szabálytárat.
3. **Keresztfunkciós Alkalmazás:**
   - Minden aktív szabály azonnal beépül az Outfit Generátorba, a Manuális Auditba, a Vásárlási Döntéstámogatóba és a Master Stylist Chatbe.
