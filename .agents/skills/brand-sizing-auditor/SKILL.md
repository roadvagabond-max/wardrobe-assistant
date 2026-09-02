---
name: brand-sizing-auditor
description: Brand sizing intelligence, canonical alias normalization, category base size mapping, and fit mismatch auditing skill.
---

# Brand Sizing Auditor & Fit Intelligence Skill

Ez a skill a gyártói méretek, szabások (Slim Tailored vs Regular vs Oversized) és a felhasználó testalkatának összehangolását, a márkanevek kanonizálását és a vásárlás előtti méretválasztási tanácsadást felügyeli.

---

## 📏 Fő Irányelvek és Szabályok:

### 1. 🏷️ Márka Névtér Konszolidáció (Canonical Brand Aliasing)
- **Automatikus Névtér-Összefűzés (`normalizeBrandName`):** A webáruházakból, linkekből és címkékből érkező eltérő formátumokat egységes, kanonikus márkanév alá fűzi:
  - Domain alapú címkék: `reserved.com` ➔ `Reserved`, `next.co.uk` ➔ `Next Direct`
  - Szövetgyártós jelölések: `Next (Nova Fides)` / `Next Signature` ➔ `Next Direct`
  - Albüntetők és almárkák: `Zara Man` / `Zara Studio` ➔ `Zara`, `Massimo Dutti Men` ➔ `Massimo Dutti`
  - Eltérő kis- és nagybetűk, elírások standardizálása.

---

### 2. 📐 Kategóriánkénti Bázisméret Profil (Category Base Sizing)
- A rendszer kategóriánként összesíti a gardróbban meglévő domináns méreteket:
  - **Zakó / Öltöny:** EU 48 / 50 / 52 (vagy UK/US 38 / 40 / 42)
  - **Ing / Bázis Felső:** Nyakméret (39 / 40 / 41) vagy Nemzetközi (S / M / L)
  - **Kötöttáru:** Nemzetközi méret (M / L)
  - **Nadrág:** Derék / Hossz (W31/L32, W32/L32)
  - **Cipő:** EU méret (42, 42.5, 43) és UK/US ekvivalens
- **Gyártói Illeszkedési Mátrix:** Nyilvántartja a márkaspecifikus eltéréseket (pl. *Boglioli: 50 (Olasz szűkített), Eton: 40 Slim, Incotex: 32/32, Next Direct: L / 50*).

---

### 3. ⚖️ Szabási Eltérések & Figyelmeztetés (Fit Mismatch Intelligence)
- **Szabásvizsgálat a Vásárlás Előtt (`evaluateAndExtractPrePurchaseItem`):**
  - Összeveti a kiszemelt új darab szabását (pl. *Relaxed / Oversized / Regular*) a felhasználó ruhatárában domináló szabásvonallal (pl. *Slim Tailored*).
  - Ha eltérést észlel, kiemelt figyelmeztetést generál (`fitMismatchWarning`):
    > *"⚠️ Szabási eltérés: A ruhatárad dominánsan Slim Tailored szabású, míg ez a termék Regular/Bővebb fazonú. A harmonikus sziluett érdekében érdemes egy mérettel kisebbet választani, vagy szabóval derékban igazítani."*

---

### 4. 💡 Konkrét Méretválasztási Javaslat (`sizingAdvice`)
- Minden vásárlás előtti értékelésnél kötelező egyértelmű, azonnal alkalmazható méretválasztási tanácsot adni a felhasználó bázisméretei és a gyártó méretezési sajátosságai alapján:
  - Pl. *Olasz márkák (Boglioli, Canali, Massimo Dutti)* esetén felhívja a figyelmet a szűkített mell- és vállszabásra.
  - Pl. *Amerikai / észak-európai márkák (Gant, Tommy Hilfiger, COS)* esetén felhívja a figyelmet a bővebb méretezésre (downsizing javaslat).
