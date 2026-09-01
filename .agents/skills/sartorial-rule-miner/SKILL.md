---
name: sartorial-rule-miner
description: Autonomous web-grounded sartorial intelligence and rule mining skill with 7-day background sync.
---

# Sartorial Rule Miner Skill

Ez a skill a sartorial stílusszabályok, rétegezési normák és szabászati elvek autonóm, internetes felkutatását és karbantartását végzi.

## Irányelvek és Szabályok:
1. **Google Search Grounding Kutatás (`mineSartorialRulesFromWeb`):**
   - Nemzetközi szakmai forrásokból (Savile Row, Pitti Uomo, Vogue, Permanent Style, Die Workwear) gyűjti össze az autentikus szabályokat.
   - Minden szabály strukturált: kategória, cím, leírás, ❌ TILTOTT / Don't, ✅ HELYES / Do, nemi érvényesség, forrás és dátum.
2. **7-Napos Ciklikus Háttér-Szinkronizáció (`checkAndAutoSyncSartorialRules`):**
   - 7 naponta automatikusan lefut a háttérben.
   - Intelligens deduplikációval bővíti a Cloud Firestore és LocalStorage szabálytárat.
3. **Keresztfunkciós Döntési Integráció:**
   - Minden aktív szabály azonnal érvényesül az Outfit Generátorban, a Manuális Auditban, a Vásárlási Döntéstámogatóban és a Master Stylist Chatben.
