---
name: mobile-ui-designer
description: Mobile-first luxury UI/UX design, touch optimization, responsive layout patterns, and Gold Glassmorphism design system skill for Sartorial Wardrobe Assistant.
---

# Mobile UI Designer & Touch Ergonomics Skill

Ez a skill a **Sartorial Wardrobe Assistant** mobil-első (Mobile-First) felhasználói élményét, érintésbarát ergonómiáját, luxus Gold Glassmorphism dizájnrendszerét és reszponzív komponens-architektúráját felügyeli.

---

## 📱 Fő Tervezési Irányelvek és Szabályok:

### 1. 👆 Érintésbarát Ergonómia (Touch Targets & Interaction Isolation)
- **Minimális Érintési Felület:** Minden interaktív gomb és kattintható felület minimális mérete legalább **36×36px – 44×44px** legyen, vagy megfelelő belső margóval (`p-2`, `p-2.5`) és arany szegéllyel rendelkezzen a kényelmes hüvelykujjas kezeléshez.
- **Esemény-Izoláció (`stopPropagation`):** Kártyákon és fotókon elhelyezett akciógomboknál (`Csere`, `Törlés`, `Mentés`) kötelező a `e.stopPropagation()` és mobilon az `onTouchEnd={(e) => e.stopPropagation()}` alkalmazása, hogy a kattintás ne nyissa meg véletlenül a szülő elemhez tartozó Lightboxot vagy részletes modált.
- **Tapintási Visszajelzés (Haptic & Micro-animations):** Aktív gombállapotoknál kötelező az `active:scale-95` vagy `active:scale-98` és a `transition-all duration-200` használata az azonnali vizuális visszajelzés érdekében.

---

### 2. 📐 Flexbox & Túlcsordulás Biztonság (Flexbox Min-Width Safety)
- **`min-w-0` Szabály Flexbox Elemeknél:** Hosszú szöveges mezők (pl. ruhanevek, márkanevek, anyagösszetétel) és szomszédos gombok esetén a flex gyerek elemen kötelező a `min-w-0` és a `truncate` (vagy `line-clamp-1`).
  ```jsx
  /* ✅ HELYES: A szöveg elegánsan levágódik, a gomb mindig látható és kattintható marad */
  <div className="flex items-center justify-between px-0.5 gap-1.5 min-w-0">
    <p className="text-[10px] text-[var(--text-secondary)] truncate font-medium flex-1 min-w-0">
      {item.name}
    </p>
    <button className="px-1.5 py-0.5 rounded bg-[var(--accent-gold)]/20 text-[var(--accent-gold)] text-[9px] font-bold shrink-0">
      Csere
    </button>
  </div>
  ```

---

### 3. 🛡️ Lebegő Navigáció (BottomNav) Margó & Clearance
- **Alsó Margó Garancia:** A fix lebegő alsó menüsáv (`BottomNav`, ~70px) miatt minden scrollolható főoldalon és konténerben kötelező a `pb-28 sm:pb-24` alsó margó, hogy a képernyő legalsó gombjai, input mezői és kártyái sose szoruljanak a menüsáv alá.

---

### 4. ✨ Luxury Gold Glassmorphism Design System
- **Színpaletta:**
  - Háttér: Mély éjkék-fekete (`#080e1a`, `#101b30`, `#0b0e14`)
  - Arany Akcentusok: `var(--accent-gold)` (#d4af37), `var(--accent-gold-light)` (#f3e5ab), `var(--accent-gold-glow)` (rgba(212, 175, 55, 0.15))
  - Siker & Értékelés: Smaragd zöld (`badge-emerald`, #10b981)
  - Figyelmeztetés & Szintetikus szál: Borostyán (#f59e0b) és Rózsa (#f43f5e)
- **Glassmorphism Panelek:** `backdrop-blur-xl`, `bg-black/40` vagy `bg-[#101b30]/90`, 1px-es finom aranyszegélyekkel (`border-[var(--border-gold)]/40`).

---

### 5. 🖼️ Vizuális Integritás & Képarányok (Uncropped Visuals)
- **Képarány:** Minden ruhadarab és szett fotókonténer fix `aspect-[4/3]` képaránnyal és `object-contain` illesztéssel jelenik meg sötét háttéren (`bg-[#07090e]`), megakadályozva a ruhadarabok (pl. hosszú kabátok, cipők, nadrágok) levágását.
- **Képtömörítés:** Kliens oldali intelligens tömörítés (640×640 @ 0.75 JPEG, ~35–50KB) a villámgyors mobil betöltésért és minimális adatforgalomért.

---

### 6. 🔄 Kétirányú Állapot & URL Hash Perzisztencia (Zero Lost State)
- **Modul-megőrzés:** Az aktív fül (`activeTab`) kétirányúan szinkronizálva van a `localStorage`-el (`sartorial_active_tab`) és az URL hash-el (`#missing`, `#stylist`, `#advisor`, `#profile`, `#wardrobe`).
- **Oldalfrissítés-biztos:** Frissítéskor (F5, böngésző reload, mobilos lehúzás / pull-to-refresh) az alkalmazás mindig pontosan az aktuális modulban marad.

---

### 7. 📑 Modálok & Felugró Ablakok Mobil Viselkedése
- **Viewport Magasság:** Modálok esetén `max-h-[90vh]` vagy `max-h-[92dvh]`, belső görgetéssel (`overflow-y-auto`, `-webkit-overflow-scrolling: touch`).
- **Kényelmes Kilépés:** Modálokból való kilépés támogatott a háttérre koppintással, ESC billentyűvel és fixen látható sarki bezárás (`X`) gombbal.
- **Mobil Input Védelem:** A beviteli mezők ne váltsanak ki nemkívánatos iOS zoomolást (megfelelő betűméret és viewport skálázás).
