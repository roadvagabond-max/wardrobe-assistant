// Autonomous Sartorial Intelligence & Rule Mining Service
import { callGeminiApi, FAST_MODELS, getGeminiApiKey } from './gemini';
import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const SARTORIAL_CATEGORIES = [
  { id: 'all', label: 'Összes Szabály', icon: '✨' },
  { id: 'collar_harmony', label: 'Gallérok & Nyakkivágások', icon: '👔' },
  { id: 'sleeve_hierarchy', label: 'Ujjak & Rétegek', icon: '👕' },
  { id: 'silhouette_balance', label: 'Sziluettek & Arányok', icon: '⚖️' },
  { id: 'fabric_synergy', label: 'Anyagok & Textúrák', icon: '🧵' },
  { id: 'color_and_contrast', label: 'Színharmónia & Kontraszt', icon: '🎨' },
  { id: 'footwear_and_proportions', label: 'Lábbelik & Hossz', icon: '👞' },
  { id: 'leather_and_metals', label: 'Bőrök & Fémek', icon: '🎗️' },
  { id: 'finishing_touches', label: 'Gombolás & Kiegészítők', icon: '🎩' },
  { id: 'womenswear_specific', label: 'Női Stílusszabályok', icon: '👗' }
];

export const INITIAL_SARTORIAL_RULES = [
  // 1. Collar & Neckline
  {
    id: 'rule-mandarin-closed-pullover',
    category: 'collar_harmony',
    title: 'Állógalléros ing és zárt kötött pulóver összeférhetetlensége',
    ruleDescription: 'Az állógalléros ing (mandarin/band/grandad/mao) merev, álló pereme nem fekszik rá a kerek- vagy V-nyakra; a kötött szegély alatt gyűrődik és deformálódik.',
    dont: 'Állógalléros ing + zárt kereknyakú vagy V-nyakú kötött pulóver',
    do: 'Állógalléros ing + önálló viselés nadrággal, vagy nyitott gombos kardigánnal / gallér nélküli dzsekivel',
    gender: 'universal',
    severity: 'strict',
    source: 'Bespoke Tailoring Sartorial Standard & Permanent Style',
    enabled: true,
    discoveredAt: '2026-09-01T00:00:00.000Z'
  },
  {
    id: 'rule-mandarin-lapel-blazer',
    category: 'collar_harmony',
    title: 'Állógalléros ing és klasszikus hajtókás zakó stílusütközése',
    ruleDescription: 'Hagyományos hajtókás (notched vagy peaked lapel) zakóhoz strukturálisan klasszikus, kifekvő galléros ing (Spread/Point/Button-down) szükséges. Az állógallér üresen hagyja a hajtóka felső terét.',
    dont: 'Állógalléros ing + klasszikus hajtókás öltönyzakó vagy blézer',
    do: 'Állógalléros ing + gallér nélküli / állógalléros zakó vagy casual overshirt',
    gender: 'universal',
    severity: 'strict',
    source: 'Savile Row Bespoke Layering Guidelines',
    enabled: true,
    discoveredAt: '2026-09-01T00:00:00.000Z'
  },
  {
    id: 'rule-turtleneck-no-shirt',
    category: 'collar_harmony',
    title: 'Garbó viselési alapszabály: nincs alatta ing',
    ruleDescription: 'A garbó önmagában képezi a legtisztább bázisréteget zakó vagy nagykabát alatt. Galléros inget alávéve a gallér kidudorodik a nyakrészen.',
    dont: 'Garbó alá galléros ing vagy vastag póló rétegezése',
    do: 'Garbó önálló bázisként zakó, kiskabát vagy téli szövetkabát alatt',
    gender: 'universal',
    severity: 'strict',
    source: 'Italian Sprezzatura Tailoring Code',
    enabled: true,
    discoveredAt: '2026-09-01T00:00:00.000Z'
  },
  {
    id: 'rule-boatneck-clean-lines',
    category: 'collar_harmony',
    title: 'Csónaknyakú és aszimmetrikus kivágások tiszta vonala',
    ruleDescription: 'Csónaknyakú (boat neck) vagy aszimmetrikus női felsők alá tilos zárt környakú pamutpólót vagy merev inggallért rétegezni, mert megtöri a dekoltázs elegáns, vízszintes ívét.',
    dont: 'Csónaknyakú felső + magas környakú bázispóló',
    do: 'Csónaknyakú felső önállóan, pánt nélküli vagy rejtett alsóréteggel',
    gender: 'womenswear_specific',
    severity: 'strict',
    source: 'Vogue Styling Masterclass & French Chic Guidelines',
    enabled: true,
    discoveredAt: '2026-09-01T00:00:00.000Z'
  },
  {
    id: 'rule-pussy-bow-layering',
    category: 'collar_harmony',
    title: 'Masnis galléros blúz (Pussy-bow) rétegezése',
    ruleDescription: 'A masnis selyemblúz a dekoltázs és nyak dísze; zárt pulóver alá szorítva elveszíti formáját. Kizárólag mély V-kivágású kardigánnal vagy strukturált blézerrel kombinálandó.',
    dont: 'Masnis blúz + kereknyakú zárt pulóver',
    do: 'Masnis blúz + egygombos blézer vagy mély V-nyakú finom kardigán',
    gender: 'womenswear_specific',
    severity: 'strict',
    source: 'Harper\'s Bazaar Haute Couture Layering Guide',
    enabled: true,
    discoveredAt: '2026-09-01T00:00:00.000Z'
  },
  {
    id: 'rule-shacket-overshirt-no-shirt',
    category: 'collar_harmony',
    title: 'Ingdzseki (Shacket / Overshirt) rétegezése: nincs alatta ing',
    ruleDescription: 'Az ingdzseki (shacket / overshirt) már eleve inggallérral, mellzsebekkel és elülső gomboláspánttal rendelkezik. Hagyományos galléros inget alávéve a két gallér mereven egymásra torlódik és összeakad (kettős inggallér és kettős gombsor stílushiba).',
    dont: 'Ingdzseki / Shacket + alatta hagyományos galléros ing (Kettős inggallér és kettős gombpánt)',
    do: 'Ingdzseki / Shacket + alatta tiszta prémium pamut póló, vékony merinó garbó vagy kereknyakú finomkötött felső',
    gender: 'universal',
    severity: 'strict',
    source: 'Modern Sartorial Code & Die Workwear Layering Principles',
    enabled: true,
    discoveredAt: '2026-09-01T00:00:00.000Z'
  },

  // 2. Sleeve Hierarchy
  {
    id: 'rule-short-sleeve-knitwear',
    category: 'sleeve_hierarchy',
    title: 'Rövid ujjú kötött pulóver ujj-hierarchiája',
    ruleDescription: 'Rövid ujjú kötöttáru vagy kötött póló alá tilos rövid ujjú pólót rétegezni, mivel a póló ujja kilóg vagy megvastagítja és gyűri a finomkötött ujjat.',
    dont: 'Rövid ujjú kötött pulóver + alatta rövid ujjú póló',
    do: 'Rövid ujjú kötött pulóver közvetlenül bőrön vagy ujjatlan bázissal viselve',
    gender: 'universal',
    severity: 'strict',
    source: 'GQ Style Manual & Pitti Uomo Knitwear Standards',
    enabled: true,
    discoveredAt: '2026-09-01T00:00:00.000Z'
  },
  {
    id: 'rule-sweater-vest-long-sleeves',
    category: 'sleeve_hierarchy',
    title: 'Kötött mellény (Sweater vest / Slipover) ujj-szabálya',
    ruleDescription: 'Kötött ujjatlan mellény alá kizárólag hosszú ujjú ing vagy hosszú ujjú finom felső illik. Rövid ujjú pólóval hordva aránytalanná és befejezetlenné teszi a kart.',
    dont: 'Kötött mellény + rövid ujjú póló',
    do: 'Kötött mellény + hosszú ujjú legombolt ing vagy hosszú ujjú garbó',
    gender: 'universal',
    severity: 'strict',
    source: 'Ivy League & Oxford Sartorial Heritage Rules',
    enabled: true,
    discoveredAt: '2026-09-01T00:00:00.000Z'
  },
  {
    id: 'rule-blazer-cuff-exposure',
    category: 'sleeve_hierarchy',
    title: 'Zakó és ingujj mandzsetta-arány (1-1.5 cm)',
    ruleDescription: 'Strukturált zakó és blézer alá kötelező a hosszú ujjú ing vagy blúz, amelynek mandzsettája pontosan 1–1.5 cm-t látszik ki a zakó ujjából, miközben védi a zakó bélését a közvetlen bőrkontaktustól.',
    dont: 'Formális zakó + rövid ujjú póló vagy túl rövid ingujj',
    do: 'Formális zakó + tökéletes hosszúságú hosszú ujjú ing (1–1.5 cm mandzsetta kilógás)',
    gender: 'universal',
    severity: 'high',
    source: 'Savile Row Bespoke Proportion Standards',
    enabled: true,
    discoveredAt: '2026-09-01T00:00:00.000Z'
  },

  // 3. Silhouette & Volume Balance
  {
    id: 'rule-volume-balance-rule',
    category: 'silhouette_balance',
    title: 'Térfogat-egyensúly szabály (Volume Balance Rule)',
    ruleDescription: 'Bő vagy oversized felsőrészhez mindig karcsúsított vagy egyenes vonalú alsó (Slim/Straight/Tapered/Ceruzaszoknya) társul. Bő szárú vagy A-vonalú alsóhoz feszes, betűrt felső és derékhangsúly szükséges.',
    dont: 'Alaktalan bő felső + alaktalan bő nadrág strukturálatlanul',
    do: 'Bő kötött felső + egyenes szárú nadrág / Széles szárú palazzo nadrág + testhezálló betűrt felső',
    gender: 'universal',
    severity: 'high',
    source: 'The Curated Closet & Modern Silhouette Theory',
    enabled: true,
    discoveredAt: '2026-09-01T00:00:00.000Z'
  },
  {
    id: 'rule-dress-cropped-layering',
    category: 'womenswear_specific',
    title: 'Női ruhák (Midi/Maxi) és külső réteg arányai',
    ruleDescription: 'Midi és Maxi ruhák felett a derékvonalat nem szabad hosszú, formátlan zakóval elnyomni. Derékban szabott vagy rövidített (cropped) blézer, bőrdzseki vagy övvel hangsúlyozott derékvonal a kötelező.',
    dont: 'Hosszú, egyenes ruha + térdig érő alaktalan zakó öv nélkül',
    do: 'Midi ruha + derékban szabott rövidített blézer vagy deréköv',
    gender: 'womenswear_specific',
    severity: 'high',
    source: 'Parisian Style Guide & High-Fashion Proportions',
    enabled: true,
    discoveredAt: '2026-09-01T00:00:00.000Z'
  },

  // 4. Fabric Synergy & Weather Dynamics
  {
    id: 'rule-rustic-vs-fine-fabrics',
    category: 'fabric_synergy',
    title: 'Anyagsúly és textúra szinergia (Finom vs Rusztikus)',
    ruleDescription: 'Vastag, nehéz textúrájú kötött darabok (Cable-knit / Chunky wool) gyapjú flanellel, tweeddel vagy denim nadrággal működnek; szigorúan tiltott selyemfényű öltönynadrággal vagy lakkbőr cipővel párosítani.',
    dont: 'Vastag rusztikus pulóver + finom selyemfényű szmokingnadrág',
    do: 'Rusztikus pulóver + gyapjú flanelnadrág vagy strukturált farmer + nubuk/bőrlábbeli',
    gender: 'universal',
    severity: 'high',
    source: 'Bespoke Fabric & Texture Pairing Guide',
    enabled: true,
    discoveredAt: '2026-09-01T00:00:00.000Z'
  },
  {
    id: 'rule-linen-seasonal-integrity',
    category: 'fabric_synergy',
    title: 'Lenvászon és nyári természetes szálak szezonális integritása',
    ruleDescription: 'A könnyű, szellős lenvászon (Linen) nyári nadrágokkal (len/pamut chino) és bőr loaferrel / mokaszinnal harmonizál; nem hordható nehéz téli szövetkabáttal vagy téli csizmával.',
    dont: 'Len ing + vastag téli kabát vagy bélelt bakancs',
    do: 'Len ing + pamut/len nadrág + bőr penny loafer',
    gender: 'universal',
    severity: 'strict',
    source: 'Riviera Summer Sartorial Code',
    enabled: true,
    discoveredAt: '2026-09-01T00:00:00.000Z'
  },
  {
    id: 'rule-worsted-vs-denim',
    category: 'fabric_synergy',
    title: 'Fényes öltönyszövet (Worsted Wool) és farmer összeférhetetlensége',
    ruleDescription: 'Selyemfényű, sima felületű formális öltönyzakó (Super 120s+ Worsted) nem hordható koptatott farmernadrággal. A farmer textúrájához matt, rusztikusabb vagy szőtt zakó (tweed, flanel, hop-sack, len vagy pamut blézer) dukál.',
    dont: 'Fényes fésűsgyapjú öltönyzakó + koptatott farmer',
    do: 'Farmernadrághoz strukturált tweed, gyapjú flanel, pamut vagy lenvászon blézer',
    gender: 'universal',
    severity: 'strict',
    source: 'Loro Piana & Permanent Style Fabric Pairing Manual',
    enabled: true,
    discoveredAt: '2026-09-02T00:00:00.000Z'
  },
  {
    id: 'rule-suede-rain-protection',
    category: 'fabric_synergy',
    title: 'Velúrbőr (Suede) és csapadékos időjárás dinamikája',
    ruleDescription: 'Kezeletlen nyers velúrbőr (suede) és nubuk lábbeli vagy dzseki esős, nyirkos időben átázik és foltosodik. Csapadékos időben sima borjúbőr (Calfskin) vagy kezelt vízálló bőr hordandó.',
    dont: 'Nyers velúrbőr lábbeli esős, sáros időben',
    do: 'Esőben sima boxbőr/borjúbőr lábbeli vagy impregnált velúr; száraz őszi/tavaszi napokon velúrbőr',
    gender: 'universal',
    severity: 'high',
    source: 'Crockett & Jones Leather Care & Weather Manual',
    enabled: true,
    discoveredAt: '2026-09-02T00:00:00.000Z'
  },

  // 5. Color Harmony & Contrast
  {
    id: 'rule-three-color-harmony',
    category: 'color_and_contrast',
    title: 'A 3-Színes Sartorial Alapszabály (Three-Color Rule)',
    ruleDescription: 'Egy elegáns és harmonikus outfitben legfeljebb 3 domináns színcsalád szerepelhet egyszerre (pl. Sötétkék zakó + Dohánybarna nadrág + Törtfehér ing). 4 vagy több különböző élénk szín zűrzavaros, túlzsúfolt hatást kelt.',
    dont: '4 vagy több eltérő élénk alapszín véletlenszerű keverése egyetlen szettben',
    do: 'Legfeljebb 3 harmonizáló színcsalád (1 domináns bázis, 1 másodlagos réteg, 1 semleges/akcentus tónus)',
    gender: 'universal',
    severity: 'high',
    source: 'Alan Flusser: Dressing the Man & Italian Color Theory',
    enabled: true,
    discoveredAt: '2026-09-02T00:00:00.000Z'
  },

  // 6. Footwear, Proportions & Socks
  {
    id: 'rule-trouser-break-loafer-oxford',
    category: 'footwear_and_proportions',
    title: 'Nadrágtörés (Trouser Break) és lábbeli harmóniája',
    ruleDescription: 'A nadrág szárhossza és a cipő típusa szoros geometriai kapcsolatban áll: loaferhez és mokaszinhoz No Break (bokavillantós/croppelt) vagy finom Quarter Break szárhossz illik; fűzős félcipőhöz és flanelnadrághoz Half Break ajánlott.',
    dont: 'Földig érő, gyűrődő Full Break nadrágszár nyári könnyű loaferrel',
    do: 'Bőrcipőhöz méretre szabott nadrághossz (loaferhez No/Quarter Break, oxfordhoz Half Break)',
    gender: 'universal',
    severity: 'high',
    source: 'Crockett & Jones Bespoke Fitting Guide & Parisian Gentleman',
    enabled: true,
    discoveredAt: '2026-09-02T00:00:00.000Z'
  },
  {
    id: 'rule-sock-color-etiquette',
    category: 'footwear_and_proportions',
    title: 'Zokni színetika és a fehér zokni tiltása',
    ruleDescription: 'A zokni színe mindig a nadrág színét követi a láb optikai nyújtása érdekében (vagy tudatos sartorial kontrasztot képez, pl. sötétbordó vagy erdőzöld). Sosem lehet világosabb a nadrágnál és a cipőnél (fehér pamutzokni formális nadrággal tiltott).',
    dont: 'Fehér sport- vagy pamutzokni öltönynadrághoz vagy elegáns félcipőhöz',
    do: 'A zokni színe megegyezik a nadrág színével, vagy mély bordó/sötétkék merinó zokni; melegben loafernél titokzokni',
    gender: 'universal',
    severity: 'strict',
    source: 'Edward Green & Savile Row Etiquette Code',
    enabled: true,
    discoveredAt: '2026-09-02T00:00:00.000Z'
  },

  // 7. Leather & Metal Coordination
  {
    id: 'rule-leather-metal-harmony',
    category: 'leather_and_metals',
    title: 'Bőrök és fém kiegészítők szigorú tónusharmóniája',
    ruleDescription: 'Egy szetten belül a bőrelemek (cipő, öv, óraszíj) és a fémek (övcsat, óratok, mandzsettagomb, gyűrű) tónusának harmonizálnia kell. Fekete és barna bőr keverése formális viseletben tiltott.',
    dont: 'Fekete cipő + barna öv keverése, vagy arany óratok + ezüst övcsat és ezüst mandzsettagomb vegyítése',
    do: 'Barna cipőhöz azonos tónusú barna öv és sárgaréz/arany fémek; fekete cipőhöz fekete öv és ezüst/króm fémek',
    gender: 'universal',
    severity: 'strict',
    source: 'Classic Sartorial Leather & Metal Coordination Standard',
    enabled: true,
    discoveredAt: '2026-09-02T00:00:00.000Z'
  },

  // 8. Finishing Touches & Buttoning Etiquette
  {
    id: 'rule-pocket-square-independent',
    category: 'finishing_touches',
    title: 'Díszzsebkendő aranyszabály: tilos a nyakkendővel egyforma minta',
    ruleDescription: 'A díszzsebkendő (Pocket square) sosem készülhet a nyakkendővel megegyező anyagból és mintából (olcsó ajándékszett-hatás). A zsebkendő önálló textúrát képvisel, csupán egy másodlagos színárnyalatot tükröz vissza.',
    dont: 'A nyakkendővel pontosan megegyező mintájú és anyagú poliészter díszzsebkendő viselése',
    do: 'Fehér lenvászon TV-fold díszzsebkendő, vagy a szett valamelyik árnyalatával harmonizáló önálló mintájú kendő',
    gender: 'universal',
    severity: 'strict',
    source: 'Drake\'s London & Rubinacci Pocket Square Guide',
    enabled: true,
    discoveredAt: '2026-09-02T00:00:00.000Z'
  },
  {
    id: 'rule-blazer-buttoning-always-never',
    category: 'finishing_touches',
    title: 'Zakó gombolási illemkódex (Always, Never)',
    ruleDescription: 'Kétgombos zakó esetén álláskor a felső gomb mindig zárva van, az alsó gomb SOHA nincs begombolva (az alsó gomb zárása torzítja a zakó szabásvonalát és csípőesését). Leüléskor a zakó kigombolandó.',
    dont: 'Kétgombos zakó alsó gombjának begombolása álláskor',
    do: 'Álláskor felső gomb zárva, alsó nyitva; leüléskor teljes kigombolás',
    gender: 'universal',
    severity: 'strict',
    source: 'Savile Row Etiquette & Tailoring Protocol',
    enabled: true,
    discoveredAt: '2026-09-02T00:00:00.000Z'
  }
];

const STORAGE_KEY_RULES = 'sartorial_rules_knowledge_base';
const STORAGE_KEY_LAST_MINING = 'last_sartorial_mining_timestamp';
const AUTO_SYNC_INTERVAL_DAYS = 7;
const AUTO_SYNC_INTERVAL_MS = AUTO_SYNC_INTERVAL_DAYS * 24 * 60 * 60 * 1000;

/**
 * Get active sartorial rules from LocalStorage / Firestore cache or initial set
 */
export function getStoredSartorialRules() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RULES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (_) {}
  return INITIAL_SARTORIAL_RULES;
}

/**
 * Save sartorial rules to LocalStorage and Firestore
 */
export async function saveSartorialRules(rules, uid = null) {
  try {
    localStorage.setItem(STORAGE_KEY_RULES, JSON.stringify(rules));
    if (uid && db) {
      const docRef = doc(db, 'users', uid, 'settings', 'sartorialRules');
      await setDoc(docRef, {
        rules,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }
  } catch (err) {
    console.warn('Sartorial rules mentési hiba:', err);
  }
}

/**
 * Load sartorial rules from Firestore for logged in user
 */
export async function loadSartorialRulesFromCloud(uid) {
  if (!uid || !db) return getStoredSartorialRules();
  try {
    const docRef = doc(db, 'users', uid, 'settings', 'sartorialRules');
    const snap = await getDoc(docRef);
    if (snap.exists() && Array.isArray(snap.data()?.rules)) {
      const cloudRules = snap.data().rules;
      // Merge with initial rules to make sure core rules are always present
      const merged = [...cloudRules];
      INITIAL_SARTORIAL_RULES.forEach(initRule => {
        if (!merged.some(r => r.id === initRule.id)) {
          merged.unshift(initRule);
        }
      });
      localStorage.setItem(STORAGE_KEY_RULES, JSON.stringify(merged));
      return merged;
    }
  } catch (err) {
    console.warn('Sartorial rules felhő betöltési hiba:', err);
  }
  return getStoredSartorialRules();
}

/**
 * Get formatted rules for Gemini prompts
 */
export function formatRulesForPrompt(category = null) {
  const allRules = getStoredSartorialRules().filter(r => r.enabled !== false);
  const filtered = category ? allRules.filter(r => r.category === category) : allRules;

  return filtered.map((r, idx) => {
    return `${idx + 1}. [${r.title}]: ❌ TILTOTT: ${r.dont} | ✅ HELYES: ${r.do} (${r.ruleDescription})`;
  }).join('\n');
}

/**
 * Autonomous Web-Grounded Sartorial Intelligence Miner
 * Uses Google Gemini 3.x with Google Search Grounding to discover real-world sartorial rules
 */
export async function mineSartorialRulesFromWeb({ apiKey = null, userUid = null, focusTopic = '' } = {}) {
  const key = apiKey || getGeminiApiKey();
  if (!key) {
    throw new Error('Nincs érvényes Gemini API kulcs a webes szabálykutatáshoz!');
  }

  const currentRules = getStoredSartorialRules();

  const searchTopics = focusTopic || `
- Classic and modern bespoke tailoring layering rules (Savile Row, Milanese tailoring, Pitti Uomo, Die Workwear, Permanent Style)
- Menswear collar vs lapel vs knitwear pairing mistakes (stand collar, mandarin collar, turtleneck, crewneck, shacket overshirt)
- Trouser break proportions (No Break vs Quarter Break vs Full Break) with loafers, monkstraps, derbies and oxfords (Crockett & Jones, Edward Green, Parisian Gentleman)
- Sock etiquette (trouser-matching, white sock prohibition with suits, invisible socks with loafers)
- Leather & metal coordination (shoe and belt tone matching, watch metal vs belt buckle harmony, black vs brown separation)
- Three-color rule and contrast ratio in tailoring (Alan Flusser, Johannes Itten color theory)
- Worsted wool vs denim/tweed texture pairing (Loro Piana fabric synergy, GSM weight balance, suede weather protection)
- Blazer buttoning etiquette (always-never rule) and independent pocket square styling (Drake's London, Rubinacci)
- Womenswear neckline, collar, sleeve layering and silhouette volume balance rules (Vogue Styling Masterclass, Harper's Bazaar)
`;

  const prompt = `Te egy világklasszis Sartorial Kutató és Szabályalkotó AI vagy (Master Sartorial Intelligence & Rule Mining Engine).
A FELADATOD: Használd a Google Keresést, és kutass fel 4–7 VALÓDI, MEGDÖNTHETETLEN, AUTENTIKUS szabászati és stílusszabályt a nemzetközi divat- és szabászat-tudományból (férfi és női öltözködés vegyesen)!

KUTATÁSI FÓKUSZ:
${searchTopics}

SZABÁLYKÖVETELMÉNYEK:
1. Konkrét, strukturális és esztétikai DOs and DONTs (ne általános közhelyek legyenek, hanem pontos gallér-, ujj-, sziluett-, arány-, cipő-, zokni-, fém- vagy anyag-szabályok)!
2. Keress olyan szabályokat is, amelyek a rétegezés fizikai/geometriai hibáit (pl. gyűrődés, kettős ujjvég, gallér-összeakadás, aránytalan sziluett, hibás gombolás) küszöbölik ki!
3. Megbízható forrásokat jelölj meg (pl. Bespoke Tailoring Guides, Savile Row Code, Vogue Styling Masterclass, Pitti Uomo Standards, Die Workwear, Permanent Style, Crockett & Jones, Parisian Gentleman, Drake's London).

A MEGLÉVŐ SZABÁLYAINK (${currentRules.length} db):
${currentRules.slice(0, 10).map(r => `• ${r.title}`).join('\n')}

VÁLASZOLJ KIZÁRÓLAG ÉRVÉNYES JSON TÖMBKÉNT:
[
  {
    "id": "egyedi-angol-azonosito (pl. rule-crewneck-shirt-collar-proportions)",
    "category": "collar_harmony" | "sleeve_hierarchy" | "silhouette_balance" | "fabric_synergy" | "womenswear_specific" | "footwear_and_proportions",
    "title": "Tömör, kifejező magyar cím (pl. 'Inggallér és kereknyakú pulóver aránya')",
    "ruleDescription": "Részletes szakmai indoklás arról, miért működik így a rétegezés vagy szabás",
    "dont": "Konkrétan mi a hiba / tiltott összeállítás (❌ Don't)",
    "do": "Konkrétan mi a helyes és elegáns viselési mód (✅ Do)",
    "gender": "universal" | "menswear_specific" | "womenswear_specific",
    "severity": "strict" | "high" | "moderate",
    "source": "A forrás vagy stílusirányzat neve (pl. Permanent Style & Savile Row Bespoke Code)"
  }
]`;

  try {
    const parsed = await callGeminiApi({
      apiKey: key,
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ googleSearch: {} }],
      preferredModels: FAST_MODELS,
      temperature: 0.2,
      timeoutMs: 25000
    });

    if (Array.isArray(parsed) && parsed.length > 0) {
      const newDiscoveredRules = parsed.map((item, idx) => ({
        id: item.id || `mined-rule-${Date.now()}-${idx}`,
        category: item.category || 'silhouette_balance',
        title: item.title || 'Új Sartorial Szabály',
        ruleDescription: item.ruleDescription || '',
        dont: item.dont || '',
        do: item.do || '',
        gender: item.gender || 'universal',
        severity: item.severity || 'high',
        source: item.source ? `🌐 ${item.source}` : '🌐 Web Research (Google Search Grounded)',
        enabled: true,
        discoveredAt: new Date().toISOString()
      }));

      // Merge and deduplicate by title / ID
      const existingMap = new Map();
      currentRules.forEach(r => existingMap.set(r.id, r));
      
      newDiscoveredRules.forEach(r => {
        // If not matching any existing title loosely
        const exists = currentRules.some(ex => 
          ex.title.toLowerCase().includes(r.title.toLowerCase().slice(0, 15)) ||
          r.title.toLowerCase().includes(ex.title.toLowerCase().slice(0, 15))
        );
        if (!exists) {
          existingMap.set(r.id, r);
        }
      });

      const updatedRules = Array.from(existingMap.values());
      await saveSartorialRules(updatedRules, userUid);
      localStorage.setItem(STORAGE_KEY_LAST_MINING, new Date().toISOString());

      return {
        success: true,
        newRulesCount: newDiscoveredRules.length,
        totalRulesCount: updatedRules.length,
        newRules: newDiscoveredRules
      };
    }

    throw new Error('A Gemini modell nem adott vissza érvényes szabálytömböt.');
  } catch (err) {
    console.error('Webes szabálykutatási hiba:', err);
    throw err;
  }
}

/**
 * Check if 7 days have passed since last mining, and if so, run background mining
 */
export async function checkAndAutoSyncSartorialRules(userUid = null) {
  try {
    const lastMining = localStorage.getItem(STORAGE_KEY_LAST_MINING);
    const now = Date.now();

    if (!lastMining) {
      // First run: schedule initial silent background research
      console.log('Sartorial Auto-Sync: Első indítás, 7 napos ciklus inicializálása...');
      localStorage.setItem(STORAGE_KEY_LAST_MINING, new Date(now - (AUTO_SYNC_INTERVAL_MS - (24 * 60 * 60 * 1000))).toISOString());
      return null;
    }

    const lastTime = new Date(lastMining).getTime();
    if (now - lastTime >= AUTO_SYNC_INTERVAL_MS) {
      console.log(`Sartorial Auto-Sync: Eltelt 7 nap (${Math.round((now - lastTime) / (24 * 3600 * 1000))} nap), automatikus webes kutatás indítása a háttérben...`);
      const res = await mineSartorialRulesFromWeb({ userUid });
      console.log(`Sartorial Auto-Sync: Sikeres! +${res.newRulesCount} új szabály kutatva és beépítve.`);
      return res;
    } else {
      const daysLeft = Math.ceil((AUTO_SYNC_INTERVAL_MS - (now - lastTime)) / (24 * 3600 * 1000));
      console.log(`Sartorial Auto-Sync: Naprakész. Következő automatikus internetes kutatás ${daysLeft} nap múlva.`);
      return null;
    }
  } catch (err) {
    console.warn('Sartorial Auto-Sync háttérhiba:', err);
    return null;
  }
}

/**
 * Toggle enable/disable status for a rule
 */
export async function toggleRuleStatus(ruleId, userUid = null) {
  const current = getStoredSartorialRules();
  const updated = current.map(r => r.id === ruleId ? { ...r, enabled: !r.enabled } : r);
  await saveSartorialRules(updated, userUid);
  return updated;
}

/**
 * Delete a rule
 */
export async function deleteRule(ruleId, userUid = null) {
  const current = getStoredSartorialRules();
  const updated = current.filter(r => r.id !== ruleId);
  await saveSartorialRules(updated, userUid);
  return updated;
}
