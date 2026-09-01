---
name: purchase-advisor
description: 3-Pillar pre-purchase clothing decision support, fit mismatch analysis, and capsule gap auditor.
---

# Purchase Advisor & Fit Intelligence Skill

Ez a skill a vásárlás előtti tudatos döntéshozatalt és a kapszula ruhatár hiányzó darabjainak pótlását támogatja a legszigorúbb sartorial szabályok alapján.

## Irányelvek és Szabályok:
1. **4 Döntési Pillér & Tudatos Kapszula Építés:**
   - *Kombinálhatóság & 3 Komplett Szett:* Garantált 3 anatómiailag és sartorial szempontból hibátlan szett (bázis ing + nadrág + cipő + öv + opc. rétegek).
   - *Gallér- és Ujj-kompatibilitási Audit:* Ha a kiszemelt darab állógalléros ing (mandarin collar), nem párosítható zárt pulóverrel vagy hajtókás zakóval; ha rövid ujjú kötött pulóver, nem kerülhet alá rövid ujjú póló.
   - *Stilisztikai Lefedettség & Redundancia Audit (`aestheticOverlap`):* Ha a ruhatárban már van hasonló megjelenésű/szerepkörű darab (pl. másik sötétkék zakó), megnevezi a meglévő ruhát, figyelmeztet a duplikációra, és valódi hiánypótló alternatívát javasol.
   - *Személyes Illeszkedés & Szabás (Fit):* Testalkat, bőrtónus és stílusszabályok harmonizálása.
   - *Anyagminőség & Műszál Audit:* 100% prémium természetes anyagok támogatása, olcsó műszálak lepontozása és szűrése.
2. **Strukturált Döntési Diagnózis:**
   - Kötelezően generálja a vásárlási előnyöket (`pros`), megfontolandó szempontokat (`cons`) és személyes szakvéleményt (`personalFitVerdict`).
3. **Kapszula Gap Szezonális Lábbeli & Telítettségi Audit:**
   - Ha a gardróbban 0 db őszi/téli lábbeli van, 1. prioritású hiányként őszi/téli cipőt (pl. Chelsea csizma) ajánl.
   - Ha egy felső kategória már telített (2+ darab), tilos újabb hasonlót ajánlani a hiányzó funkciók lefedése előtt.
