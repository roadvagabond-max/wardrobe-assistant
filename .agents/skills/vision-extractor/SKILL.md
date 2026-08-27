---
name: vision-extractor
description: High-speed multimodal image processing, fabric analysis, and webshop SKU extraction skill for clothing.
---

# Vision Extractor Skill

Ez a skill felelős a fotózott, feltöltött vagy webshopból behúzott ruhadarabok vizuális és technikai azonosításáért.

## Irányelvek és Szabályok:
1. **Képméretezés:** Minden képet max. 640×640 pixelre és 0.75 JPEG minőségre tömörít a hálózati késleltetés minimalizálásáért (~35-50 KB).
2. **Anyag- és Színfelismerés:** A fotó pixelei alapján pontosan azonosítja a textúrát (pique, len, gyapjú, selyem, denim, bőr) és a valódi színt.
3. **SKU & Webshop Engine:** Next Direct, Zara, Reserved, Massimo Dutti, H&M termékkódok (SKU) felismerése és a közvetlen nagyfelbontású CDN képek betöltése.
4. **Modell-architektúra:** Hivatalos Gemini 3.x modellek (`gemini-3.7-flash`, `gemini-3.6-flash`, `gemini-3.1-flash-lite`).
