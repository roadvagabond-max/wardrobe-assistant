// Advanced Google Gemini Vision & Fashion Stylist Intelligence Engine (Server Proxy Architecture)
import { ensureBase64Image } from './imageOptimizer';
import { normalizeBrandName } from './webshop';
import { formatRulesForPrompt } from './sartorialRules';
import { callCloudFunction, isFirebaseConfigured } from './firebase';
import { getProfileDemographics, getDemographicSartorialInstructions } from './demographics';

export const getGeminiApiKey = () => {
  return 'SERVER_MANAGED_SECRET';
};

export const isGeminiConfigured = () => {
  return isFirebaseConfigured;
};

/**
 * Test the Server-Side Gemini API connection
 */
export async function testGeminiApiKey() {
  try {
    const res = await callGeminiApi({
      contents: [{ role: 'user', parts: [{ text: 'Ping! Respond in JSON: {"status": "ok"}' }] }],
      preferredModels: FAST_MODELS,
      expectJson: true
    });
    return { success: true, message: '✓ Biztonságos szerveroldali kapcsolat a Google Gemini AI-val aktív!' };
  } catch (err) {
    return { success: false, message: err.message || 'Nem sikerült elérni a szerveroldali Gemini AI szolgáltatást.' };
  }
}

// Google Gemini official 2026 models in order of stability & speed
export const FAST_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.7-flash',
  'gemini-3.6-flash'
];

export const REASONING_MODELS = [
  'gemini-3.7-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite'
];

const GEMINI_MODELS = FAST_MODELS;

// In-memory cache of the fastest currently working model
let activeFastModel = null;

/**
 * Formats full wardrobe array into an ultra token-efficient TSV-like [CATALOG] block (Spec Section 10.1).
 * Reduces input token consumption by ~75% while preserving all critical sartorial metadata:
 * ID, Name, Category, SubCategory, Color, Material (with % composition), Fit, Formality, Pattern, Brand, Size, Season, Style Archetype, Condition.
 */
export function formatWardrobeToCompactCatalog(wardrobe = []) {
  if (!Array.isArray(wardrobe) || wardrobe.length === 0) return '[CATALOG]\n(A gardrób jelenleg üres)\n[/CATALOG]';
  
  const lines = wardrobe.map(item => {
    const id = item.id || '';
    const name = (item.name || '').replace(/\|/g, '-').trim();
    const cat = item.category || 'other';
    const sub = item.subCategory ? `sub:${item.subCategory}` : '';
    const color = (item.color || '').trim();
    const mat = item.material ? `mat:${(item.material || '').replace(/\|/g, '-')}` : '';
    const fit = item.fit ? `fit:${item.fit}` : '';
    const form = item.formality ? `form:${item.formality}` : '';
    const pat = item.pattern ? `pat:${item.pattern}` : '';
    const brand = item.brand ? `brand:${normalizeBrandName(item.brand) || item.brand}` : '';
    const size = item.size ? `size:${item.size}` : '';
    const season = Array.isArray(item.season) ? `sz:${item.season.join(',')}` : (item.season ? `sz:${item.season}` : '');
    const style = item.styleArchetype ? `style:${item.styleArchetype}` : '';
    const cond = item.condition ? `cond:${item.condition.split('/')[0].trim()}` : '';

    const parts = [
      `ID:${id}`,
      name,
      `cat:${cat}`,
      sub,
      `col:${color}`,
      mat,
      fit,
      form,
      pat,
      brand,
      size,
      season,
      style,
      cond
    ].filter(Boolean);

    return parts.join(' | ');
  });

  return `[CATALOG]\n${lines.join('\n')}\n[/CATALOG]`;
}

/**
 * Universal Gemini API caller routed securely through Firebase Cloud Functions v2 Backend Proxy
 */
export async function callGeminiApi({ contents, preferredModels = FAST_MODELS, timeoutMs = 25000, maxOutputTokens = 8192, temperature = 0.2, tools = null, expectJson = true }) {
  try {
    const response = await callCloudFunction('sartorialAiProxy', {
      contents,
      preferredModels,
      expectJson,
      temperature,
      maxOutputTokens,
      tools
    });

    if (response && response.success) {
      if (response.model) {
        activeFastModel = response.model;
      }
      return response.result;
    }

    throw new Error(response?.message || 'Nem érkezett érvényes válasz a szervertől.');
  } catch (err) {
    console.warn('Szerveroldali Gemini hívási hiba:', err);
    throw err;
  }
}

/**
 * 1. Deep Multimodal & Text-First AI Garment Vision Analysis
 * Incorporates 5 formality levels, 7 style archetypes, 5 conditions, user fit & color harmony.
 */
export async function analyzeClothingImage(imageBase64OrUrl, webshopContext = {}, userProfile = {}) {
  const apiKey = getGeminiApiKey();

  if (apiKey) {
    try {
      // Ensure image is converted to Base64 if available
      const resolvedBase64 = imageBase64OrUrl ? await ensureBase64Image(imageBase64OrUrl) : null;

      // Build context from webshop text
      const webshopTextInfo = [
        webshopContext.rawInput ? `WEBSHOP TERMÉKLINK VAGY BEMENET: "${webshopContext.rawInput}"` : '',
        webshopContext.url ? `URL: "${webshopContext.url}"` : '',
        webshopContext.title ? `CÉLTERMÉK MEGNEVEZÉSE: "${webshopContext.title}"` : '',
        webshopContext.brand ? `Márka / Gyártó: "${webshopContext.brand}"` : '',
        webshopContext.productCode ? `Cikkszám / Termékkód (SKU): "${webshopContext.productCode}"` : '',
        webshopContext.description ? `Hivatalos Leírás: "${webshopContext.description}"` : '',
        webshopContext.rawText ? `További részletek: "${webshopContext.rawText.slice(0, 800)}"` : ''
      ].filter(Boolean).join('\n');

      const demographics = getProfileDemographics(userProfile);
      const demographicRules = getDemographicSartorialInstructions(demographics, userProfile);
      const dynamicSartorialRules = formatRulesForPrompt(null, demographics);

      const userProfileInfo = userProfile && Object.keys(userProfile).length > 0 ? `
--- FELHASZNÁLÓI STÍLUSPROFIL & ADOTTSÁGOK ---
Név: ${userProfile.name || 'Felhasználó'}
Nem: ${demographics.gender} (${demographics.age} éves, ${demographics.bracketDescription})
Magasság: ${userProfile.height || 'Nem ismert'}
Testsúly: ${userProfile.weight || 'Nem ismert'}
Testalkat: ${userProfile.bodyType || 'Arányos'}
Bőrtónus & Színtípus: ${userProfile.skinTone || 'Természetes tónus'}
Preferált stílusok: ${JSON.stringify(userProfile.preferredStyles || [])}
Kedvenc színek: ${JSON.stringify(userProfile.favoriteColors || [])}
` : '';

      const targetFocusInstruction = `SZIGORÚ ANTI-HALLUCINÁCIÓS SZABÁLYOK:
1. Ha van csatolva valós fotó, a fotó vizuális adatai (szín, anyag, típus) 100%-ban meghatározóak.
2. Ha nincs fotó, de meg van adva ismert márka és hivatalos cikkszám (pl. Next Direct #AA1-939 / SU415329, Zara, Reserved), pontosan azonosítsd a terméket a valós leírása alapján.
3. HA NINCS FOTÓ ÉS A WEBSHOP LINK/BEMENET ALAPJÁN A TERMÉK NEM AZONOSÍTHATÓ BIZTOSAN:
   - SOHA NE TALÁLJ KI KITALÁLT RUHADARABOT (NE hallucinálj fantom ruhát vagy kitalált színt)!
   - Állítsd be a JSON-ben: "isUnknown": true, "name": "Ismeretlen Termék (Kérlek csatolj fotót vagy add meg kézzel)", "stylingAdvice": "A megadott link alapján a termék nem volt automatikusan beazonosítható. Kérlek illessz be egy fotót (Ctrl+V) vagy válassz kategóriát kézzel!"`;

      const prompt = `Te egy világklasszis professzionális személyi stylist, divattanácsadó és ruhatár-tervező vagy.
Elemezd a megadott ruhadarabot / webshop terméket részletesen és szakértő szemmel!

${targetFocusInstruction}
${webshopTextInfo ? `\n--- WEBSHOP TERMÉKADATOK ÉS LINK ---\n${webshopTextInfo}\n` : ''}
${userProfileInfo}

${demographicRules}

👔 AKTÍV SARTORIAL HARMÓNIA- ÉS RÉTEGEZÉSI SZABÁLYZAT:
${dynamicSartorialRules}

SZABÁLYOK:
1. "category": "outerwear" (Zakó & Kabát) | "knitwear" (Pulóverek & Kötöttáru) | "tops" (Ingek & Felsők & Pólók) | "bottoms" (Nadrág) | "shoes" (Cipő & Lábbeli) | "dresses" (Ruhák & Egyrészesek) | "skirts" (Szoknyák) | "accessories" (Kiegészítők).
2. "formality": "Casual (Laza)" | "Smart Casual" | "Business Casual" | "Business Formal" | "Black Tie & Formal".
3. "styleArchetype": ${demographics.isChild ? '"Kényelmes & Játszós" | "Óvodai / Iskolai Alapdarab" | "Csinos Ünnepi" | "Sportos & Laza" | "Meleg Réteges"' : '"Klasszikus & Időtlen" | "Old Money & Quiet Luxury" | "Smart Urban" | "Streetwear" | "Olasz Sprezzatura" | "Minimalista" | "Vintage & Retro"'}.
4. "condition": "Vadonatúj / Kifogástalan" | "Megkímélt / Kiváló" | "Játszós / Kopott" | "Javításra vár" | "Lecserélendő".
5. Gallér- és Ujjtípus Specifikáció (Kiemelten fontos):
   - A névben ("name") és címkékben ("tags") pontosan tüntesd fel a gallér- és ujjtípust: pl. 'Állógalléros Ing', 'Kereknyakú Merinó Pulóver', 'Garbó Pulóver', 'Rövid Ujjú Kötött Póló', 'Csónaknyakú Felső', 'Hosszú Ujjú Slim Fit Ing', 'Puha Pamut Gyerekpulóver'!
6. Szöveges ajánlások & Korosztályos Rétegezés:
   - "stylingTip": Mivel érdemes kombinálni/hordani a korosztálynak és nemnek megfelelő szabályok szerint?
     * GYERMEK ÉS BABA RUHÁKNÁL: Pulóver vagy kötöttáru alá KIZÁRÓLAG puha pamut bodyt, pamut pólót vagy hosszú ujjú pamut alsót javasolj! SOHA NE javasolj merev galléros inget a gyerekpulóver alá!
     * FELNŐTT NŐI RUHÁKNÁL: Nőies szabások, finom rétegek, dekoltázs és lágy esésű anyagok harmóniája.
     * FELNŐTT FÉRFI RUHÁKNÁL: Férfi szabások és a választott stílusirányzatnak megfelelő rétegek.
   - "whenToWear": Mikor és milyen a    - "stylingAdvice": Szakértői stílusjellemzés a darabról.

SZIGORÚ ZERO-MÉRET HALLUCINÁCIÓS SZABÁLY:
SOHA NE TIPPELJ ÉS NE TALÁLJ KI MÉRETET! KIZÁRÓLAG akkor adj meg méretet (pl. 'M', 'L', '40', '32/32'), ha a fotón szereplő címkén OLVASHATÓAN látszik a méretjelölés, VAGY ha a webshop bemenet ezt konkrétan megadja! Ha a fotón csak maga a ruha látható címke nélkül, a "size" KÖTELEZŐEN üres string: ""!

VÁLASZOLJ KIZÁRÓLAG ÉRVÉNYES JSON FORMÁTUMBAN:
{
  "name": "Pontos és elegáns magyar megnevezés a gallér- és ujjhosszal (pl. 'Navy Kék Állógalléros Len Ing' vagy 'Homokbézs Pamut Kereknyakú Gyerekpulóver')",
  "category": "outerwear" | "knitwear" | "tops" | "bottoms" | "shoes" | "dresses" | "skirts" | "accessories",
  "subCategory": "blazer" | "knitwear" | "shirt" | "t-shirt" | "polo" | "trousers" | "jeans" | "loafers" | "sneakers" | "dress" | "skirt" | "coat" | "other",
  "color": "Valódi fő szín magyarul (pl. Sötétkék, Fekete, Fehér, Homokbézs, Olívazöld)",
  "colorHex": "#hex_színkód",
  "material": "Részletes anyag és szövés (pl. 100% Organikus Pamut)",
  "brand": "Márkanév / Gyártó ha felismerhető (pl. Massimo Dutti, Zara, Next Direct)",
  "size": "Méretjelölés KIZÁRÓLAG ha olvasható a címkén vagy szövegben szerepel (különben: '')",
  "qualityScore": 9.2,
  "season": ["tavasz", "nyar", "osz", "tel"],
  "formality": "Casual (Laza)",
  "styleArchetype": "Smart Urban",
  "condition": "Vadonatúj / Kifogástalan",
  "stylingTip": "Mivel hordd: Konkrét kombinációs javaslatok a korosztálynak megfelelő rétegezési szabályok szerint",
  "whenToWear": "Mikor hordd: Események és hőmérséklet",
  "colorHarmony": "A szín és tónus harmóniája a felhasználóval",
  "bodyFitAdvice": "Hogyan áll a szabás a felhasználó testalkatán és életkorában",
  "stylingAdvice": "Karakteres, kényelmes és praktikus darab.",
  "personalMatchScore": 95,
  "imageUrl": "Ha a Google Keresési találatokban találsz közvetlen termékfotó URL-t, add meg, különben hagyd üresen",
  "tags": ["alapdarab", "pamut", "kényelmes"]
}al",
  "bodyFitAdvice": "Hogyan áll a szabás a felhasználó testalkatán és életkorában",
  "stylingAdvice": "Karakteres, kényelmes és praktikus darab.",
  "personalMatchScore": 95,
  "imageUrl": "Ha a Google Keresési találatokban találsz közvetlen termékfotó URL-t, add meg, különben hagyd üresen",
  "tags": ["alapdarab", "pamut", "kényelmes"]
}`;

      const parts = [{ text: prompt }];

      // Attach image if base64 exists
      if (resolvedBase64 && resolvedBase64.startsWith('data:')) {
        const p = resolvedBase64.split(';base64,');
        const mimeType = p[0].replace('data:', '') || 'image/jpeg';
        const base64Data = p[1];
        parts.push({ inlineData: { mimeType, data: base64Data } });
      }

      // Enable Google Search Grounding for webshop links and product codes (Native Web Grounding)
      const hasWebInput = Boolean(webshopContext.rawInput || webshopContext.productCode || webshopContext.url);
      const tools = (!resolvedBase64 && hasWebInput) ? [{ googleSearch: {} }] : null;

      const result = await callGeminiApi({
        apiKey,
        contents: [{ parts }],
        tools,
        preferredModels: FAST_MODELS,
        timeoutMs: 18000
      });
      if (result && result.brand) {
        result.brand = normalizeBrandName(result.brand) || result.brand;
      }
      // Zero size hallucination guarantee for pure image upload without webshop text
      if (result && result.size) {
        const fullInputText = `${webshopContext.rawInput || ''} ${webshopContext.title || ''} ${webshopContext.description || ''} ${webshopContext.rawText || ''}`.toLowerCase();
        const hasExplicitTextSize = /\b(méret|size|xs|s|m|l|xl|xxl|36|38|40|42|44|46|48|50|52|54|30\/32|32\/32|34\/32)\b/i.test(fullInputText);
        if (!hasExplicitTextSize && !webshopContext.productCode && !webshopContext.url) {
          result.size = '';
        }
      }
      return result;
    } catch (err) {
      console.error('Gemini Vision & Text API hiba:', err);
      throw err;
    }
  }

  throw new Error('Nincs beállítva Gemini API kulcs! Kérlek add meg a Beállítások menüben.');
}

/**
 * Helper: Is this a warm/heavy boot or autumn/winter ankle boot?
 */
export function isHeavyBoot(item) {
  if (!item) return false;
  const cat = (item.category || '').toLowerCase();
  const sub = (item.subCategory || '').toLowerCase();
  const name = (item.name || '').toLowerCase();
  const seasons = Array.isArray(item.season) ? item.season : [item.season].filter(Boolean);
  const isWinterOnly = seasons.length > 0 && seasons.every(s => s === 'tel' || s === 'osz');

  return (
    sub === 'boots' ||
    name.includes('bokacipő') ||
    name.includes('bokacsizma') ||
    name.includes('csizma') ||
    name.includes('bakancs') ||
    name.includes('chelsea') ||
    name.includes('chukka') ||
    name.includes('boka') ||
    name.includes('boot') ||
    (cat === 'shoes' && isWinterOnly && !name.includes('loafer') && !name.includes('sneaker') && !name.includes('félcipő'))
  );
}

/**
 * Sartorial Collar, Neckline & Sleeve Inspection Helpers
 */
export function isStandCollar(item) {
  if (!item) return false;
  const text = `${item.name || ''} ${item.subCategory || ''} ${item.pattern || ''} ${item.material || ''} ${(item.tags || []).join(' ')}`.toLowerCase();
  return (
    text.includes('állógallér') ||
    text.includes('allogaller') ||
    text.includes('mandarin') ||
    text.includes('band collar') ||
    text.includes('grandad') ||
    text.includes('mao gallér') ||
    text.includes('mao galler') ||
    text.includes('nehru')
  );
}

export function isTurtleneck(item) {
  if (!item) return false;
  const text = `${item.name || ''} ${item.subCategory || ''} ${(item.tags || []).join(' ')}`.toLowerCase();
  return (
    text.includes('garbó') ||
    text.includes('garbo') ||
    text.includes('turtleneck') ||
    text.includes('rollneck') ||
    text.includes('mockneck')
  );
}

export function isCardigan(item) {
  if (!item) return false;
  const text = `${item.name || ''} ${item.subCategory || ''}`.toLowerCase();
  return text.includes('kardigán') || text.includes('kardigan') || text.includes('cardigan') || text.includes('cipzáras kötött');
}

export function isShortSleeve(item) {
  if (!item) return false;
  const text = `${item.name || ''} ${item.subCategory || ''} ${(item.tags || []).join(' ')}`.toLowerCase();
  return (
    text.includes('rövid ujjú') ||
    text.includes('rovid ujju') ||
    text.includes('rövidujjú') ||
    text.includes('short sleeve') ||
    text.includes('kötött póló') ||
    text.includes('polo shirt') ||
    text.includes('t-shirt') ||
    text.includes('póló') ||
    text.includes('polo')
  );
}

export function isClassicBlazer(item) {
  if (!item) return false;
  const cat = (item.category || '').toLowerCase();
  const sub = (item.subCategory || '').toLowerCase();
  const name = (item.name || '').toLowerCase();
  const isBlazer = cat === 'outerwear' || sub === 'blazer' || name.includes('zakó') || name.includes('blézer');
  return isBlazer && !isStandCollar(item) && !name.includes('dzseki') && !name.includes('kabát');
}

export function isClosedSweater(item) {
  if (!item) return false;
  const cat = (item.category || '').toLowerCase();
  const sub = (item.subCategory || '').toLowerCase();
  const name = (item.name || '').toLowerCase();
  const isKnit = cat === 'knitwear' || sub === 'knitwear' || sub === 'sweater' || name.includes('pulóver');
  return isKnit && !isCardigan(item) && !isTurtleneck(item);
}

export function isShacket(item) {
  if (!item) return false;
  const text = `${item.name || ''} ${item.subCategory || ''} ${(item.tags || []).join(' ')}`.toLowerCase();
  return (
    text.includes('shacket') ||
    text.includes('overshirt') ||
    text.includes('ingdzseki') ||
    text.includes('ingkabát') ||
    text.includes('ing kabát') ||
    text.includes('shirt jacket')
  );
}

export function isCollaredShirt(item) {
  if (!item) return false;
  const cat = (item.category || '').toLowerCase();
  const sub = (item.subCategory || '').toLowerCase();
  const name = (item.name || '').toLowerCase();
  if (isShacket(item) || isTurtleneck(item)) return false;
  return (
    (cat === 'tops' || sub === 'shirt') &&
    (name.includes('ing') || sub === 'shirt') &&
    !name.includes('póló') &&
    !name.includes('t-shirt') &&
    !name.includes('trikó')
  );
}

export function isDress(item) {
  if (!item) return false;
  const cat = (item.category || '').toLowerCase();
  const sub = (item.subCategory || '').toLowerCase();
  const name = (item.name || '').toLowerCase();
  if (name.includes('fürdőruha') || name.includes('úszódressz')) return false;

  return (
    cat === 'dresses' ||
    cat === 'dress' ||
    sub === 'dress' ||
    sub === 'mididress' ||
    sub === 'maxidress' ||
    sub === 'cocktail_dress' ||
    name.includes('egyberuha') ||
    name.includes('midiruha') ||
    name.includes('maxiruha') ||
    name.includes('koktélruha') ||
    name.includes('ingruha') ||
    name.includes('estiruha') ||
    name.includes('mini ruha') ||
    name.includes('midi ruha') ||
    name.includes('maxi ruha') ||
    (name.includes('ruha') && !name.includes('szoknya') && !name.includes('nadrág') && !name.includes('felső'))
  );
}

export function isCoatGarment(item) {
  if (!item) return false;
  const name = (item.name || '').toLowerCase();
  const sub = (item.subCategory || '').toLowerCase();
  const cat = (item.category || '').toLowerCase();
  return (
    name.includes('kabát') ||
    name.includes('dzseki') ||
    name.includes('overshirt') ||
    name.includes('ingdzseki') ||
    name.includes('shacket') ||
    name.includes('trench') ||
    name.includes('overcoat') ||
    name.includes('parka') ||
    name.includes('anorak') ||
    name.includes('télikabát') ||
    name.includes('szövetkabát') ||
    name.includes('bőrdzseki') ||
    name.includes('mellény') ||
    sub === 'coat' ||
    sub === 'overcoat' ||
    sub === 'jacket' ||
    sub === 'parka' ||
    sub === 'trench' ||
    sub === 'shacket' ||
    sub === 'overshirt' ||
    cat === 'outerwear'
  );
}

/**
 * Helper to ensure complete anatomical layering and strict sartorial harmony for an outfit across all modules
 */
export function enforceAnatomicalOutfitLayers(rawItems = [], wardrobe = [], candidateItem = null, weather = null, targetSeason = 'auto') {
  let items = [...rawItems];
  if (candidateItem && !items.some(i => i.id === candidateItem.id)) {
    items.unshift(candidateItem);
  }

  // Deduplicate by ID immediately
  const itemMap = new Map();
  items.forEach(i => {
    if (i && i.id && !itemMap.has(i.id)) {
      itemMap.set(i.id, i);
    }
  });
  items = Array.from(itemMap.values());

  // Check for one-piece dress (ruha / egyberuha)
  const hasDress = items.some(i => isDress(i));

  // If an all-in-one dress is present, strictly eliminate any separate bottom garments (nadrág, szoknyanadrág, szoknya, farmer)
  if (hasDress) {
    items = items.filter(i => !isBottom(i));
  }

  // Helper: Is this item a base top wearable directly on the skin (shirt / t-shirt / polo)?
  const isBaseTop = (item) => {
    if (!item) return false;
    const cat = item.category || '';
    const sub = (item.subCategory || '').toLowerCase();
    const name = (item.name || '').toLowerCase();

    // Explicitly exclude sweaters, cardigans, blazers, and coats
    if (cat === 'knitwear' || sub === 'knitwear' || sub === 'sweater' || sub === 'cardigan' || name.includes('pulóver') || name.includes('kardigán')) return false;
    if (cat === 'outerwear' || sub === 'blazer' || sub === 'coat' || sub === 'overcoat' || name.includes('zakó') || name.includes('kabát')) return false;
    if (cat === 'bottoms' || cat === 'shoes' || cat === 'accessories') return false;

    return cat === 'tops' || sub === 'shirt' || sub === 't-shirt' || sub === 'polo' || name.includes('ing') || name.includes('póló') || name.includes('felső');
  };

  // Helper: Is this item bottoms (pants/trousers/skirts)?
  const isBottom = (item) => {
    if (!item) return false;
    const cat = item.category || '';
    const sub = (item.subCategory || '').toLowerCase();
    const name = (item.name || '').toLowerCase();
    return cat === 'bottoms' || cat === 'skirts' || sub === 'trousers' || sub === 'jeans' || sub === 'pants' || sub === 'skirt' || name.includes('nadrág') || name.includes('chino') || name.includes('farmer') || name.includes('szoknya');
  };

  // Helper: Is this item shoes?
  const isShoe = (item) => {
    if (!item) return false;
    const cat = item.category || '';
    const sub = (item.subCategory || '').toLowerCase();
    const name = (item.name || '').toLowerCase();
    return cat === 'shoes' || sub === 'loafers' || sub === 'boots' || sub === 'sneakers' || sub === 'oxfords' || sub === 'derbies' || name.includes('cipő') || name.includes('csizma') || name.includes('loafer') || name.includes('bakancs');
  };

  // Helper: Is this item a belt?
  const isBelt = (item) => {
    if (!item) return false;
    const sub = (item.subCategory || '').toLowerCase();
    const name = (item.name || '').toLowerCase();
    return sub === 'belt' || name.includes('öv') || name.includes('bőröv');
  };

  // Target season & Candidate garment cold/warm context detection (off-season shopping support)
  const isCandidateColdItem = candidateItem && (
    (candidateItem.subCategory || '').toLowerCase().includes('coat') ||
    (candidateItem.subCategory || '').toLowerCase().includes('boot') ||
    (candidateItem.category || '').toLowerCase() === 'outerwear' ||
    isHeavyBoot(candidateItem) ||
    isCoatGarment(candidateItem) ||
    (candidateItem.material || '').toLowerCase().includes('gyapjú') ||
    (candidateItem.material || '').toLowerCase().includes('flanel') ||
    (candidateItem.material || '').toLowerCase().includes('kasmír') ||
    (candidateItem.name || '').toLowerCase().includes('téli') ||
    (candidateItem.name || '').toLowerCase().includes('kabát') ||
    (candidateItem.name || '').toLowerCase().includes('csizma') ||
    (candidateItem.name || '').toLowerCase().includes('bakancs')
  );

  const isExplicitColdSeason = targetSeason === 'winter' || targetSeason === 'autumn';
  const isExplicitWarmSeason = targetSeason === 'summer' || targetSeason === 'spring';

  let isWarmWeather;
  if (isExplicitColdSeason || isCandidateColdItem) {
    isWarmWeather = false;
  } else if (isExplicitWarmSeason) {
    isWarmWeather = true;
  } else if (typeof weather?.temperature === 'number') {
    isWarmWeather = weather.temperature >= 19;
  } else {
    isWarmWeather = false;
  }

  // Helper: Smart, unbiased candidate picker for fallback layers to ensure fair wardrobe rotation
  const getCandidateItems = (matcher) => {
    return wardrobe.filter(w => matcher(w) && w.condition !== 'Lecserélendő' && w.condition !== 'Javításra vár' && !items.some(i => i.id === w.id));
  };

  const pickSmartFallbackGarment = (candidates, preferredColorFamily = null) => {
    if (!candidates || candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];

    if (preferredColorFamily) {
      const colorMatches = candidates.filter(c => {
        const col = (c.color || '').toLowerCase();
        return col.includes(preferredColorFamily.toLowerCase());
      });
      if (colorMatches.length > 0) {
        const randIdx = Math.floor(Math.random() * colorMatches.length);
        return colorMatches[randIdx];
      }
    }

    const randIdx = Math.floor(Math.random() * candidates.length);
    return candidates[randIdx];
  };

  // Helper: Is this item the candidate item? (Immunity check)
  const isCand = (item) => Boolean(candidateItem && item && (item.id === candidateItem.id || item.name === candidateItem.name));

  // 1. SARTORIAL HARMONY RESOLUTION: Stand collar, Turtleneck & Sleeve rules
  const hasStandCollarShirt = items.some(i => isBaseTop(i) && isStandCollar(i));
  const hasClosedSweater = items.some(i => isClosedSweater(i));
  const hasClassicBlazer = items.some(i => isClassicBlazer(i));
  const hasTurtleneckKnit = items.some(i => isTurtleneck(i));
  const hasShortSleeveKnit = items.some(i => (i.category === 'knitwear' || (i.subCategory || '').includes('sweater') || (i.name || '').toLowerCase().includes('pulóver')) && isShortSleeve(i));

  // A. Stand Collar Shirt vs Closed Sweaters & Classic Blazers
  if (hasStandCollarShirt) {
    if (hasClosedSweater) {
      if (isCand(candidateItem) && isStandCollar(candidateItem)) {
        // Candidate item is stand collar: remove the closed sweater from wardrobe
        items = items.filter(i => !isClosedSweater(i));
      } else {
        const classicShirtCandidates = getCandidateItems(w => isBaseTop(w) && !isStandCollar(w));
        const classicShirt = pickSmartFallbackGarment(classicShirtCandidates);
        if (classicShirt) {
          items = items.map(i => isCand(i) ? i : (isStandCollar(i) && isBaseTop(i) ? classicShirt : i));
        } else {
          items = items.filter(i => isCand(i) || !isClosedSweater(i));
        }
      }
    }

    if (hasClassicBlazer) {
      if (isCand(candidateItem) && isStandCollar(candidateItem)) {
        // Candidate item is stand collar: remove the classic blazer from wardrobe
        items = items.filter(i => !isClassicBlazer(i));
      } else if (isCand(candidateItem) && isClassicBlazer(candidateItem)) {
        const classicShirtCandidates = getCandidateItems(w => isBaseTop(w) && !isStandCollar(w));
        const classicShirt = pickSmartFallbackGarment(classicShirtCandidates);
        if (classicShirt) {
          items = items.map(i => isCand(i) ? i : (isStandCollar(i) && isBaseTop(i) ? classicShirt : i));
        }
      } else {
        const classicShirtCandidates = getCandidateItems(w => isBaseTop(w) && !isStandCollar(w));
        const classicShirt = pickSmartFallbackGarment(classicShirtCandidates);
        if (classicShirt) {
          items = items.map(i => isCand(i) ? i : (isStandCollar(i) && isBaseTop(i) ? classicShirt : i));
        } else {
          items = items.filter(i => isCand(i) || !isClassicBlazer(i));
        }
      }
    }
  }

  // B. Turtleneck Resolution
  if (hasTurtleneckKnit) {
    if (isCand(candidateItem) && isBaseTop(candidateItem) && !isTurtleneck(candidateItem)) {
      // Candidate item is the base top (shirt): remove the turtleneck from wardrobe, do NOT delete candidate shirt!
      items = items.filter(i => !isTurtleneck(i));
    } else {
      items = items.filter(i => isCand(i) || !isBaseTop(i) || isTurtleneck(i));
    }
  }

  // C. Short Sleeve Knitwear Resolution
  if (hasShortSleeveKnit) {
    items = items.filter(i => isCand(i) || !(isBaseTop(i) && isShortSleeve(i) && i.category !== 'knitwear'));
  }

  // D. Shacket / Overshirt Resolution
  const hasShacket = items.some(i => isShacket(i));
  const hasCollaredShirt = items.some(i => isCollaredShirt(i));
  if (hasShacket && hasCollaredShirt) {
    if (isCand(candidateItem) && isCollaredShirt(candidateItem)) {
      // Candidate item is the collared shirt: remove the shacket from wardrobe, do NOT replace the shirt!
      items = items.filter(i => !isShacket(i));
    } else if (isCand(candidateItem) && isShacket(candidateItem)) {
      // Candidate item is the shacket: remove the collared shirt from wardrobe!
      items = items.filter(i => !isCollaredShirt(i));
    } else {
      const tShirtCandidates = getCandidateItems(w => !isCollaredShirt(w) && !isShacket(w) && (isBaseTop(w) || isTurtleneck(w)));
      const tShirtOrKnit = pickSmartFallbackGarment(tShirtCandidates);
      if (tShirtOrKnit) {
        items = items.map(i => isCand(i) ? i : (isCollaredShirt(i) ? tShirtOrKnit : i));
      } else {
        items = items.filter(i => isCand(i) || !isCollaredShirt(i));
      }
    }
  }

  // 2. Check if the outfit has a valid Base Top (ing vagy póló) unless dress, turtleneck or short sleeve knit is already present
  const hasBaseTop = hasDress || items.some(i => isBaseTop(i) || isTurtleneck(i) || hasShortSleeveKnit);
  if (!hasBaseTop) {
    const topCandidates = getCandidateItems(w => isBaseTop(w) && !isStandCollar(w));
    const baseTop = pickSmartFallbackGarment(topCandidates.length > 0 ? topCandidates : getCandidateItems(isBaseTop));
    if (baseTop) {
      items.push(baseTop);
    }
  }

  // 3. Check if the outfit has Bottoms (nadrág) - ONLY if there is NO one-piece dress!
  if (!hasDress) {
    const hasBottom = items.some(i => isBottom(i));
    if (!hasBottom) {
      const bottomCandidates = getCandidateItems(isBottom);
      const bottom = pickSmartFallbackGarment(bottomCandidates);
      if (bottom) {
        items.push(bottom);
      }
    }
  }

  // 4. Check if the outfit has Shoes (lábbeli) & Enforce Temperature & Formality Appropriateness
  const currentShoeIndex = items.findIndex(i => isShoe(i));
  if (currentShoeIndex !== -1) {
    const currentShoe = items[currentShoeIndex];
    if (isWarmWeather && isHeavyBoot(currentShoe)) {
      const summerCandidates = getCandidateItems(w => isShoe(w) && !isHeavyBoot(w));
      const summerAlternative = pickSmartFallbackGarment(summerCandidates);
      if (summerAlternative && !isCand(currentShoe)) {
        items[currentShoeIndex] = summerAlternative;
      }
    }
  } else {
    // Determine outfit formality to pick a matching footwear fallback (no random sneakers for formal suits)
    const isFormalOutfit = items.some(i => 
      (i.formality || '').includes('Formal') || 
      (i.formality || '').includes('Business') ||
      (i.name || '').toLowerCase().includes('zakó') ||
      (i.name || '').toLowerCase().includes('blézer') ||
      (i.name || '').toLowerCase().includes('öltöny')
    );
    const isCasualOutfit = items.some(i =>
      (i.formality || '').includes('Casual') ||
      (i.name || '').toLowerCase().includes('farmer') ||
      (i.name || '').toLowerCase().includes('melegítő')
    );

    let shoeCandidates = isWarmWeather
      ? getCandidateItems(w => isShoe(w) && !isHeavyBoot(w))
      : getCandidateItems(isShoe);

    if (isFormalOutfit) {
      const formalShoes = shoeCandidates.filter(s => 
        (s.formality || '').includes('Formal') ||
        (s.formality || '').includes('Smart') ||
        (s.subCategory || '').includes('oxford') ||
        (s.subCategory || '').includes('derby') ||
        (s.subCategory || '').includes('loafer') ||
        (s.name || '').toLowerCase().includes('bőrcipő') ||
        (s.name || '').toLowerCase().includes('loafer') ||
        (s.name || '').toLowerCase().includes('félcipő')
      );
      if (formalShoes.length > 0) shoeCandidates = formalShoes;
    } else if (isCasualOutfit) {
      const casualShoes = shoeCandidates.filter(s =>
        (s.subCategory || '').includes('sneaker') ||
        (s.name || '').toLowerCase().includes('sneaker') ||
        (s.name || '').toLowerCase().includes('mokaszin') ||
        (s.name || '').toLowerCase().includes('cipő')
      );
      if (casualShoes.length > 0) shoeCandidates = casualShoes;
    }

    const existingBelt = items.find(i => isBelt(i));
    const beltColorFamily = existingBelt?.color ? (existingBelt.color.toLowerCase().includes('barna') ? 'barna' : (existingBelt.color.toLowerCase().includes('fekete') ? 'fekete' : null)) : null;

    const shoe = pickSmartFallbackGarment(shoeCandidates.length > 0 ? shoeCandidates : getCandidateItems(isShoe), beltColorFamily);
    if (shoe) {
      items.push(shoe);
    }
  }

  // 5. Check if the outfit has a Belt (öv - csak akkor injektálunk, ha nem lezser/gumis/melegítő/szoknya a nadrág)
  const currentBottom = items.find(i => isBottom(i));
  const isCasualOrElasticBottom = currentBottom && (
    (currentBottom.name || '').toLowerCase().includes('melegítő') ||
    (currentBottom.name || '').toLowerCase().includes('jogger') ||
    (currentBottom.name || '').toLowerCase().includes('gumis') ||
    (currentBottom.name || '').toLowerCase().includes('szoknya') ||
    currentBottom.category === 'skirts' ||
    currentBottom.category === 'dresses'
  );

  const hasBelt = items.some(i => isBelt(i));
  if (!hasBelt && !isCasualOrElasticBottom) {
    const existingShoe = items.find(i => isShoe(i));
    const shoeColorFamily = existingShoe?.color ? (existingShoe.color.toLowerCase().includes('barna') ? 'barna' : (existingShoe.color.toLowerCase().includes('fekete') ? 'fekete' : null)) : null;

    const beltCandidates = getCandidateItems(isBelt);
    const belt = pickSmartFallbackGarment(beltCandidates, shoeColorFamily);
    if (belt) {
      items.push(belt);
    }
  }

  // 6. Strictly ensure AT MOST ONE item of each core type (Immunity: candidateItem is always preserved):
  // - Exactly 1 Belt
  const beltIndices = [];
  items.forEach((item, idx) => {
    if (isBelt(item)) beltIndices.push(idx);
  });
  if (beltIndices.length > 1) {
    const candIdx = beltIndices.find(idx => isCand(items[idx]));
    const keepIdx = candIdx !== undefined ? candIdx : beltIndices[0];
    items = items.filter((_, idx) => !beltIndices.includes(idx) || idx === keepIdx);
  }

  // - Exactly 1 Bottom
  const bottomIndices = [];
  items.forEach((item, idx) => {
    if (isBottom(item)) bottomIndices.push(idx);
  });
  if (bottomIndices.length > 1) {
    const candIdx = bottomIndices.find(idx => isCand(items[idx]));
    const keepIdx = candIdx !== undefined ? candIdx : bottomIndices[0];
    items = items.filter((_, idx) => !bottomIndices.includes(idx) || idx === keepIdx);
  }

  // - Exactly 1 Shoe
  const shoeIndices = [];
  items.forEach((item, idx) => {
    if (isShoe(item)) shoeIndices.push(idx);
  });
  if (shoeIndices.length > 1) {
    const candIdx = shoeIndices.find(idx => isCand(items[idx]));
    const keepIdx = candIdx !== undefined ? candIdx : shoeIndices[0];
    items = items.filter((_, idx) => !shoeIndices.includes(idx) || idx === keepIdx);
  }

  // - Exactly 1 Base Top
  const topIndices = [];
  items.forEach((item, idx) => {
    if (isBaseTop(item)) topIndices.push(idx);
  });
  if (topIndices.length > 1) {
    const candIdx = topIndices.find(idx => isCand(items[idx]));
    const keepIdx = candIdx !== undefined ? candIdx : topIndices[0];
    items = items.filter((_, idx) => !topIndices.includes(idx) || idx === keepIdx);
  }

  // Absolute Final Guarantee: candidateItem must NEVER be dropped
  if (candidateItem && !items.some(i => isCand(i))) {
    items.unshift(candidateItem);
  }

  // 7. Sort in natural anatomical layering order:
  const getItemLayerRank = (item) => {
    const cat = item.category || '';
    const sub = (item.subCategory || '').toLowerCase();
    const name = (item.name || '').toLowerCase();

    if (sub === 'coat' || sub === 'overcoat' || name.includes('kabát') || name.includes('trench')) return 4;
    if (cat === 'outerwear' || sub === 'blazer' || sub === 'jacket' || name.includes('zakó') || name.includes('dzseki') || name.includes('blézer')) return 3;
    if (cat === 'knitwear' || sub === 'knitwear' || sub === 'sweater' || sub === 'cardigan' || name.includes('pulóver') || name.includes('kardigán')) return 2;
    if (isBaseTop(item) || isTurtleneck(item)) return 1;
    if (isBottom(item)) return 5;
    if (isShoe(item)) return 6;
    if (isBelt(item)) return 7;
    return 8;
  };

  items.sort((a, b) => getItemLayerRank(a) - getItemLayerRank(b));
  return items;
}

/**
 * 2. UNIFIED ULTRA-FAST Vásárlás Előtti Döntéstámogató
 */
export async function evaluateAndExtractPrePurchaseItem({ imageBase64OrUrl, webshopContext = {}, itemName = '', itemPrice = '', wardrobe = [], styleProfile = {}, targetSeason = 'auto', weather = null }) {
  const apiKey = getGeminiApiKey();

  if (apiKey) {
    try {
      const resolvedBase64 = await ensureBase64Image(imageBase64OrUrl);

      // Ultra-efficient [CATALOG] TSV representation of wardrobe for minimal token footprint
      const eligibleItems = wardrobe.filter(w => w.condition !== 'Javításra vár');
      const shuffledEligible = [...eligibleItems];
      for (let i = shuffledEligible.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledEligible[i], shuffledEligible[j]] = [shuffledEligible[j], shuffledEligible[i]];
      }

      const webshopBrand = normalizeBrandName(webshopContext.brand) || webshopContext.brand || '';
      const webshopTextInfo = [
        webshopContext.rawInput ? `WEBSHOP TERMÉKLINK / BEMENET: "${webshopContext.rawInput}"` : '',
        webshopContext.url ? `URL: "${webshopContext.url}"` : '',
        webshopContext.title ? `CÉLTERMÉK: "${webshopContext.title}"` : '',
        webshopBrand ? `Márka: "${webshopBrand}"` : '',
        webshopContext.productCode ? `Cikkszám / Termékkód (SKU): "${webshopContext.productCode}"` : '',
        webshopContext.description ? `Leírás: "${webshopContext.description}"` : ''
      ].filter(Boolean).join(' | ');

      const customRules = Array.isArray(styleProfile.customStylingRules) && styleProfile.customStylingRules.length > 0
        ? styleProfile.customStylingRules
        : [];

      const demographics = getProfileDemographics(styleProfile);
      const demographicRules = getDemographicSartorialInstructions(demographics, styleProfile);
      const dynamicSartorialRules = formatRulesForPrompt(null, demographics);

      const thermalDesc = styleProfile.thermalPreference === 'coldSensitive'
        ? 'Fázósabb alkat (szereti a meleg rétegeket és a védő textúrákat hűvösben)'
        : styleProfile.thermalPreference === 'warmSensitive'
        ? 'Melegkedvelő alkat (a szellős pamut/len anyagokat és könnyed rétegeket részesíti előnyben)'
        : 'Kiegyensúlyozott / Normál hőérzet';

      const seasonContextText = targetSeason && targetSeason !== 'auto'
        ? `VÁSÁRLÁSI CÉL-SZEZON: ${targetSeason === 'winter' ? 'Tél / Hideg idő' : targetSeason === 'summer' ? 'Nyár / Meleg idő' : targetSeason === 'autumn' ? 'Ősz / Hűvös idő' : 'Tavasz / Enyhe idő'} (A felhasználó kifejezetten erre a cél-szezonra keres ruhadarabot, pl. leárazáson vagy előretervezve, függetlenül az aktuális külső időjárástól!)`
        : `VÁSÁRLÁSI CÉL-SZEZON: Automatikus (A kiszemelt darab saját természetes rendeltetése és szezonja határozza meg a szetteket. Pl. téli kabát vagy csizma esetén őszi/téli rétegezést és téli darabokat építs köré a meglévő ruhatárból, míg nyári lenvászon ing esetén nyári lezser darabokat!)`;

      const prompt = `Te egy világklasszis személyi stylist, divatelemző és kapszula ruhatár döntéstámogató vagy.
ELEMEZD A MEGADOTT RUHADARABOT KIZÁRÓLAG A WEBSHOPBAN / FOTÓN TALÁLT VALÓS ADATOK ALAPJÁN!
${itemName ? `Megadott név: "${itemName}"` : ''} ${itemPrice ? `Ár: "${itemPrice}"` : ''} ${webshopTextInfo ? `Webshop info: ${webshopTextInfo}` : ''}
${seasonContextText}
Felhasználó profilja: Név: ${styleProfile.name || 'Felhasználó'}, Nem: ${demographics.gender}, Életkor: ${demographics.age} év (${demographics.bracketDescription}), Magasság: ${styleProfile.height || 'Nem ismert'}, Testalkat: ${styleProfile.bodyType || 'Arányos'}, Színtípus: ${styleProfile.skinTone || 'Természetes'}, Hőtűrés: ${thermalDesc}, Stílusok: ${JSON.stringify(styleProfile.preferredStyles || [])}

${demographicRules}

🚫 FELHASZNÁLÓ EGYÉNI STÍLUSSZABÁLYAI & TILTÁSAI:
${customRules.length > 0 ? customRules.map(r => `• ${r}`).join('\n') : 'Nincsenek külön rögzített tiltások.'}

👔 AKTÍV SARTORIAL HARMÓNIA- ÉS RÉTEGEZÉSI SZABÁLYZAT:
${dynamicSartorialRules}

Meglévő ruhatár (${shuffledEligible.length} elem [CATALOG] TSV formátumban):
${formatWardrobeToCompactCatalog(shuffledEligible)}

SZIGORÚ VALÓS ADAT ELV ÉS ANTI-HALLUCINÁCIÓS SZABÁLYOK:
1. KIZÁRÓLAG AZOKAT AZ ADATOKAT ADD MEG, AMIKET A WEBSHOP LEÍRÁSA, CÍME VAGY FOTÓJA TÉNYLEGESEN TARTALMAZ!
2. HA A FOTÓ, LINK VAGY BEMENET ALAPJÁN A TERMÉK EGYÁLTALÁN NEM AZONOSÍTHATÓ BE (pl. hibás vagy elérhetetlen link, üres kép, nem ruházati termék):
   - Állítsd be: "isUnknown": true, "unknownReason": "Konkrét indoklás, miért nem sikerült azonosítani", és kérd meg a felhasználót valós terméknév vagy fotó megadására! SOHA NE TALÁLJ KI FANTOMRUHÁT!
3. SZIGORÚ ZERO-MÉRET HALLUCINÁCIÓS SZABÁLY:
   - SOHA NE TIPPELJ ÉS NE TALÁLJ KI MÉRETET! KIZÁRÓLAG akkor adj meg méretet (pl. 'M', 'L', '40', '32/32'), ha a fotón szereplő címkén OLVASHATÓAN látszik a méretjelölés, VAGY ha a webshop bemenet ezt kifejezetten tartalmazza! Ha a fotón csak maga a ruha látható címke nélkül, a "size" KÖTELEZŐEN üres string: ""!
4. HA A SZABÁS NINCS KIFEJEZETTEN LEÍRVA: "fit": "Nem ismert szabás" (vagy null). SOHA NE ÁLLÍTSD EGY TERMÉKRŐL, HOGY SLIM FIT VAGY REGULAR FIT, HA EZT A WEBSHOP NEM ÍRJA KIFEJEZETTEN!
5. HA AZ ANYAGÖSSZETÉTEL NINCS MEGADVA: "material": "Nem ismert anyagösszetétel".

SZETTAJÁNLÓ KÖTELEZŐ KULCSDARAB (ANCHOR ITEM) & SZERVEZÉSI ELVEK:
A kiszemelt új ruhadarab ID-ja: "candidate-item".
MIND a 3 szett KÖTELEZŐEN e köré a kiszemelt kulcsdarab ("candidate-item") köré épül!
1. A szettek jellegét, alkalmát ('occasion') és stílusát ('styleType') a kiszemelt darab saját természetes karaktere, formalitása, szabása, anyaga és női/férfi/gyermek rendeltetése határozza meg dinamikusan a divatvilág teljes spektrumában (női ruhák, szoknyák, nadrágok, zakók, sportos vagy elegáns darabok)! TILOS merev sablonokat ráerőltetni!
   - Egyberuha esetén az egyberuha egyrészes bázisdarab: SZIGORÚAN TILOS külön nadrágot vagy szoknyát rendelni hozzá! Helyette elegáns felöltő réteg (blézer, kardigán, kabát), cipő és deréköv társítható hozzá!
   - Ha a kiszemelt darab egy felső (ing/póló/garbó), az maga a bázisfelső; ne válassz mellé másik bázisinget a gardróbból!
   - Ha a kiszemelt darab zakó/kabát, válassz hozzá bázisfelsőt, nadrágot/szoknyát, cipőt!
   - Ha a kiszemelt darab nadrág/szoknya, válassz hozzá felsőt, cipőt, övet!
   - Ha a kiszemelt darab cipő, válassz hozzá felsőt, nadrágot, övet/kiegészítőt!
2. A 'matchedItemIds' listába KÖTELEZŐEN TEDD BE a "candidate-item"-et, és válassz mellé a ruhatár katalógusából tökéletesen harmonizáló darabokat (alsó/felső, lábbeli, öv, opc. rétegek)!
3. SZIGORÚ SZÖVEG- ÉS ID-SZINKRONIZÁCIÓ (ZERO MISMATCH):
   - A leírásban ('stylingTip') és indoklásban megnevezett darabok (különösen a lábbeli, mint pl. barna bőrcipő, fekete loafer vagy fehér sneaker) ID-ja 100%-ban megegyezik a 'matchedItemIds' listába betett gardrób-elemek ID-jával!
   - Tilos barna cipőt írni, ha fekete sneaker ID-ját adod meg, és fordítva!
   - A lábbeli formalitása és stílusa 100%-ban passzoljon az összeállítás jellegéhez!

MIX & MATCH STRUKTURÁLT SZAKMAI AUDIT:
- "colorHarmony": Színharmónia, kontraszt, hideg/meleg tónusok és a 3-szín szabály érvényesülése a meglévő darabjaiddal.
- "fabricSynergy": Anyagok és textúrák találkozása a meglévő darabokkal (természetes szálak, esés, légáteresztés).
- "layeringEvaluation": Anatómiai rétegezés, gallér- és ujj-harmónia, arányok és sziluett.
- "bodyFitVerdict": Testalkat, magasság és személyes proporciók értékelése a profilod alapján.
- "eventAlignment": Sokoldalúság és stílus DNS illeszkedés a darab valódi hordhatósági tartományában.
- "aestheticOverlap": Stilisztikai lefedettség & redundancia vizsgálat (ha már van hasonló a ruhatárban).
- "pros": Konkrét valós érvek a vásárlás mellett.
- "cons": Megfontolandó szempontok.
- "fitMismatchWarning": Szabásbeli vagy testalkati figyelmeztetés (ha nincs: null).
- "fabricWarning": Anyagminőségi észrevétel (műszál, légáteresztés; ha kiváló természetes anyag: pozitív értékelés).
- "sizingAdvice": Gyártói és méretválasztási tanács a márka és a ruhatár méretei alapján.

VÁLASZOLJ KIZÁRÓLAG ÉRVÉNYES JSON FORMÁTUMBAN:
{
  "isUnknown": false,
  "unknownReason": null,
  "item": {
    "name": "${itemName || 'Valós magyar terméknév'}",
    "category": "outerwear" | "knitwear" | "tops" | "bottoms" | "shoes" | "dresses" | "skirts" | "accessories",
    "subCategory": "blazer" | "knitwear" | "shirt" | "t-shirt" | "polo" | "trousers" | "jeans" | "loafers" | "sneakers" | "boots" | "dress" | "skirt" | "coat" | "overcoat" | "jacket" | "other",
    "color": "Webshopban talált szín magyarul",
    "colorHex": "#hex",
    "material": "Webshopban talált valós anyag (ha nem ismert: 'Nem ismert anyagösszetétel')",
    "brand": "${webshopBrand || 'Márkanév ha ismert'}",
    "size": "Méretjelölés KIZÁRÓLAG ha a címkén olvasható vagy szövegben szerepel (különben: '')",
    "fit": "Webshopban megadott szabás ha szerepel (ha nincs megadva: 'Nem ismert szabás')",
    "qualityScore": 9.0,
    "formality": "Smart Casual",
    "styleArchetype": "Old Money & Quiet Luxury",
    "condition": "Vadonatúj / Kifogástalan",
    "stylingTip": "Viselési javaslat a meglévő darabokkal",
    "whenToWear": "Mikor hordd",
    "colorHarmony": "Színharmónia indoklás",
    "bodyFitAdvice": "Szabás és testalkat indoklás",
    "tags": ["alapdarab"]
  },
  "compatibilityScore": 92,
  "verdict": "Erősen Ajánlott" | "Érdemes Megfontolni" | "Gondold Át",
  "verdictSummary": "Részletes szakmai összefoglaló a valós adatok alapján",
  "colorHarmony": "A kiszemelt darab színének kölcsönhatása a ruhatárad palettájával és színtípusoddal",
  "fabricSynergy": "Az anyagok és szövés találkozása a gardróbodban meglévő textúrákkal",
  "layeringEvaluation": "Anatómiai rétegezés, gallér- és ujj-harmónia, arányok elemzése",
  "bodyFitVerdict": "Szakvélemény a testalkatodhoz és magasságodhoz való illeszkedésről",
  "eventAlignment": "Alkalmi sokoldalúság és a stílus DNS-eddel való összecsengés a darab formalitásán",
  "pros": [
    "Konkrét valós érvek a vásárlás mellett"
  ],
  "cons": [
    "Megfontolandó szempontok"
  ],
  "personalFitVerdict": "Szakvélemény a profilhoz való illeszkedésről",
  "duplicationWarning": "Duplikáció vagy csere-javaslat",
  "aestheticOverlap": {
    "isRedundant": false,
    "existingItemName": "Meglévő hasonló ruhadarab neve (ha van)",
    "reason": "Miért fedi le már ez a darab a megjelenést",
    "alternativeRecommendation": "Mit érdemes inkább venni helyette"
  },
  "fitMismatchWarning": null,
  "fabricWarning": null,
  "fabricScore": 9.0,
  "isSynthetic": false,
  "sizingAdvice": "Méretválasztási tanács a márka és profil alapján",
  "targetSeason": "Tél" | "Nyár" | "Ősz" | "Tavasz" | "Négyévszakos",
  "outfits": [
    {
      "title": "Szett 1 Neve",
      "occasion": "A darab formalitásához illeszkedő alkalom",
      "styleType": "Stílusirányzat",
      "matchedItemIds": ["candidate-item", "nadrag_vagy_felsorasz_id", "cipo_id", "opcionalis_ov_vagy_zako_id"],
      "stylingTip": "Részletes rétegezési és viselési leírás a szinkronizált darabokkal",
      "whyItWorks": "Miért harmonizálnak ezek a darabok"
    }
  ]
}
`;

      const parts = [{ text: prompt }];

      if (resolvedBase64 && resolvedBase64.startsWith('data:')) {
        const p = resolvedBase64.split(';base64,');
        const mimeType = p[0].replace('data:', '') || 'image/jpeg';
        const base64Data = p[1];
        parts.push({ inlineData: { mimeType, data: base64Data } });
      }

      const hasWebInput = Boolean(webshopContext.rawInput || webshopContext.productCode || webshopContext.url);
      const tools = (!resolvedBase64 && hasWebInput) ? [{ googleSearch: {} }] : null;
      const parsed = await callGeminiApi({
        apiKey,
        contents: [{ parts }],
        tools,
        temperature: 0.1,
        preferredModels: FAST_MODELS,
        timeoutMs: 22000
      });

      // Strict Real-Data-Only Fit Check (Zero Guessing / Zero Automatic Assignment)
      const fullText = `${webshopContext.rawInput || ''} ${webshopContext.title || ''} ${itemName || ''} ${parsed.item?.name || ''}`.toLowerCase();
      const hasExplicitSlim = fullText.includes('slim') || fullText.includes('karcsúsított') || fullText.includes('fitted') || fullText.includes('skinny');
      const hasExplicitRegular = fullText.includes('regular') || fullText.includes('classic') || fullText.includes('egyenes');

      if (parsed && parsed.item) {
        if (hasExplicitSlim) {
          parsed.item.fit = 'Slim Fit';
        } else if (hasExplicitRegular) {
          parsed.item.fit = 'Regular Fit';
        } else if (!parsed.item.fit || parsed.item.fit === 'Slim Fit') {
          // If not explicitly stated in webshop text, DO NOT guess Slim Fit!
          parsed.item.fit = 'Nem ismert szabás';
        }

        // Zero size hallucination guarantee: if no explicit size in text input, clear hallucinated size
        const fullInputText = `${webshopContext.rawInput || ''} ${webshopContext.title || ''} ${webshopContext.description || ''} ${itemName || ''}`.toLowerCase();
        const hasExplicitSizeInInput = /\b(méret|size|xs|s|m|l|xl|xxl|36|38|40|42|44|46|48|50|52|54|30\/32|32\/32|34\/32)\b/i.test(fullInputText);
        if (!hasExplicitSizeInInput && !webshopContext.productCode && !webshopContext.url) {
          parsed.item.size = '';
        }
      }

      const candidateCat = parsed.item?.category || (parsed.item?.subCategory === 'knitwear' || (parsed.item?.name || '').toLowerCase().includes('pulóver') ? 'knitwear' : 'tops');
      const extractedItem = {
        id: 'candidate-item',
        ...(parsed.item || {}),
        category: candidateCat,
        name: itemName || parsed.item?.name || 'Új Ruhadarab',
        brand: normalizeBrandName(parsed.item?.brand) || parsed.item?.brand || '',
        imageUrl: imageBase64OrUrl,
        price: itemPrice
      };

      if (parsed && Array.isArray(parsed.outfits)) {
        parsed.outfits = parsed.outfits.map(o => {
          const rawIds = o.matchedItemIds || o.itemIds || [];
          let matchedItems = rawIds.map(id => {
            if (id === 'candidate-item') return extractedItem;
            return wardrobe.find(w => w.id === id);
          }).filter(Boolean);

          // Absolute guarantee: candidate item is in the outfit
          if (!matchedItems.some(i => i.id === 'candidate-item' || i.name === extractedItem.name)) {
            matchedItems.unshift(extractedItem);
          }

          const fullEnforcedItems = enforceAnatomicalOutfitLayers(matchedItems, wardrobe, extractedItem, weather, targetSeason);

          return {
            ...o,
            items: fullEnforcedItems
          };
        });
      }

      // Safe fallbacks for pros, cons, personalFitVerdict, aestheticOverlap
      if (parsed) {
        if (!Array.isArray(parsed.pros) || parsed.pros.length === 0) {
          parsed.pros = [
            `Kiválóan beilleszthető a(z) ${styleProfile.preferredStyles?.[0] || 'Klasszikus'} stílusprofilodba.`,
            `Garantáltan több komplett összeállítást nyit meg a meglévő darabjaiddal.`
          ];
        }
        if (!Array.isArray(parsed.cons)) {
          parsed.cons = parsed.fitMismatchWarning
            ? [parsed.fitMismatchWarning]
            : ['Ügyelj az anyagösszetételnek megfelelő kímélő kezelésre és tisztításra.'];
        }
        if (!parsed.personalFitVerdict) {
          parsed.personalFitVerdict = `Harmonizál a(z) ${styleProfile.bodyType || 'Atlétikus'} testalkatoddal és a meglévő ruhatárad színeivel.`;
        }
      }

      return {
        ...parsed,
        extractedItem
      };
    } catch (e) {
      console.error('Hiba az egyfázisú értékelésben:', e);
      throw e;
    }
  }

  throw new Error('Nincs beállítva Gemini API kulcs!');
}

/**
 * 2b. Backward compatibility alias
 */
export const evaluatePrePurchaseItem = evaluateAndExtractPrePurchaseItem;

/**
 * 2c. Szelfi / Portré alapú AI Színtípus & Bőrtónus Elemző (Color Season Analysis)
 */
export async function analyzeColorSeason(portraitBase64OrUrl) {
  const apiKey = getGeminiApiKey();

  if (apiKey) {
    try {
      const resolvedBase64 = await ensureBase64Image(portraitBase64OrUrl);

      const prompt = `Te egy mester szín- és stílustanácsadó (Color Analysis Expert) vagy.
Elemezd a csatolt portréfotót / szelfit!
Vizsgáld meg:
1. Bőr altónusa (Meleg arany/olíva vs Hideg rózsaszínes/kékesszürke).
2. Szemszín és hajszín kontrasztja.
3. Hivatalos 12 évszakos besorolás: Meleg Ősz (Warm Autumn), Sötét Ősz (Dark Autumn), Lágy Ősz (Soft Autumn), Világos Tavasz (Light Spring), Tiszta Tavasz (Clear Spring), Meleg Tavasz (Warm Spring), Hideg Tél (Cool Winter), Sötét Tél (Dark Winter), Tiszta Tél (Clear Winter), Lágy Nyár (Soft Summer), Világos Nyár (Light Summer), Hideg Nyár (Cool Summer).

VÁLASZOLJ KIZÁRÓLAG ÉRVÉNYES JSON FORMÁTUMBAN:
{
  "seasonName": "pl. Meleg Ősz (Warm Autumn)",
  "skinTone": "Közép-világos meleg arany altónussal",
  "description": "Részletes szakmai leírás arról, miért ez a színtípus és milyen árnyalatok világosítják a legszebben az arcot",
  "recommendedPalette": ["Sötétkék (Navy)", "Olívazöld (Olive)", "Teveszín (Camel)", "Dohánybarna", "Törtfehér", "Bordó", "Terrakotta"],
  "avoidPalette": ["Hideg neon pink", "Fakó hideg szürke"]
}`;

      const parts = [{ text: prompt }];

      if (resolvedBase64 && resolvedBase64.startsWith('data:')) {
        const p = resolvedBase64.split(';base64,');
        const mimeType = p[0].replace('data:', '') || 'image/jpeg';
        const base64Data = p[1];
        parts.push({ inlineData: { mimeType, data: base64Data } });
      }

      return await callGeminiApi({
        apiKey,
        contents: [{ parts }],
        temperature: 0.1,
        preferredModels: FAST_MODELS,
        timeoutMs: 18000
      });
    } catch (e) {
      console.error('Color season analysis hiba:', e);
      throw e;
    }
  }

  throw new Error('Nincs beállítva Gemini API kulcs!');
}

/**
 * 3. Esemény- és Dress Code Hangolt AI Stylist (StylistView)
 */
export async function generateEventOutfits({ eventName, weather, anchorItemIds = [], wardrobe = [], styleProfile = {} }) {
  const apiKey = getGeminiApiKey();

  if (apiKey && wardrobe.length > 0) {
    try {
      const isFormalEvent = /üzleti|tárgyalás|esküvő|gála|színház|ünnepi|formal|opera|vacsora/i.test(eventName);
      const temperature = typeof weather?.temperature === 'number' ? weather.temperature : 22;
      const isWarmWeather = temperature >= 19;
      const isColdWeather = temperature < 14;

      const availableWardrobe = wardrobe.filter(w => {
        if (w.condition === 'Lecserélendő' || w.condition === 'Javításra vár') return false;
        if (isFormalEvent && w.condition === 'Játszós / Kopott') return false;

        // Temperature & Seasonal Filtering
        if (isWarmWeather) {
          // In warm weather (>= 19°C), exclude heavy winter coats
          const sub = (w.subCategory || '').toLowerCase();
          const name = (w.name || '').toLowerCase();
          const isHeavyCoat = sub === 'overcoat' || sub === 'coat' || name.includes('télikabát') || name.includes('nagykabát') || name.includes('téli kabát');
          if (isHeavyCoat) return false;

          // In warm weather (>= 19°C), exclude heavy boots/autumn-winter ankle boots if summer/low shoes exist
          if (isHeavyBoot(w)) {
            const hasSummerShoes = wardrobe.some(sw => {
              const sc = (sw.category || '').toLowerCase();
              return sc === 'shoes' && !isHeavyBoot(sw) && sw.condition !== 'Lecserélendő';
            });
            if (hasSummerShoes) return false;
          }
        }

        return true;
      });

      const anchorItems = wardrobe.filter(w => anchorItemIds.includes(w.id));
      const customRules = Array.isArray(styleProfile.customStylingRules) && styleProfile.customStylingRules.length > 0
        ? styleProfile.customStylingRules
        : [];

      const demographics = getProfileDemographics(styleProfile);
      const demographicRules = getDemographicSartorialInstructions(demographics, styleProfile);
      const dynamicSartorialRules = formatRulesForPrompt(null, demographics);

      // Fisher-Yates shuffle to eliminate LLM Primacy Bias
      const shuffledWardrobe = [...availableWardrobe];
      for (let i = shuffledWardrobe.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledWardrobe[i], shuffledWardrobe[j]] = [shuffledWardrobe[j], shuffledWardrobe[i]];
      }

      const prompt = `Te egy világklasszis mester személyi stylist és adaptív ruhatár-tervezési szakértő vagy.

A LEGELSŐ ÉS LEGFONTOSABB SZABÁLY: A FELHASZNÁLÓ ÉLETKORA, NEME, EGYÉNI STÍLUS DNS-E ÉS SZEMÉLYES SZABÁLYAI AZ ALAP!
Nem sablonos kliséket készítünk, hanem a FELHASZNÁLÓ SAJÁT SZEMÉLYES ÉLETKORÁT ÉS STÍLUSÁT adaptáljuk intelligensen az eseményhez úgy, hogy 100%-ig önazonos, funkcionális és magabiztos maradjon!

FELHASZNÁLÓ STÍLUSPROFILJA:
- Név: ${styleProfile.name || 'Felhasználó'}
- Nem & Életkor: ${demographics.gender}, ${demographics.age} éves (${demographics.bracketDescription})
- Preferált Stílusirányzatok: ${JSON.stringify(styleProfile.preferredStyles || ['Mindennapi Smart Casual & Letisztult Kapszula'])}
- Stílusfilozófia: "${styleProfile.stylePhilosophy || 'Kényelmes, letisztult ruhatár minőségi darabokkal'}"
- Kedvenc Színpaletta: ${styleProfile.favoriteColors && styleProfile.favoriteColors.length > 0 ? JSON.stringify(styleProfile.favoriteColors) : 'Nincs egyedileg rögzítve (Alkalmazz a ruhatár meglévő darabjaihoz és az eseményhez illő harmonikus színkombinációkat)'}
- Testalkat és Magasság: ${styleProfile.bodyType || 'Arányos'}, ${styleProfile.height || 'Nem megadott'} (${styleProfile.skinTone || 'Természetes bőrtónus'})
- Öltözködési Hőérzet & Komfort: ${styleProfile.thermalPreference === 'coldSensitive' ? 'Fázósabb alkat' : styleProfile.thermalPreference === 'warmSensitive' ? 'Melegkedvelő alkat' : 'Kiegyensúlyozott / Normál hőérzet'}

${demographicRules}

🚫 FELHASZNÁLÓ EGYÉNI STÍLUSSZABÁLYAI & TILTÁSAI (SZIGORÚAN KÖTELEZŐ BETARTANI!):
${customRules.length > 0 ? customRules.map(r => `• ${r}`).join('\n') : 'Nincsenek külön rögzített tiltások.'}

👔 AKTÍV SARTORIAL HARMÓNIA- ÉS RÉTEGEZÉSI SZABÁLYZAT:
${dynamicSartorialRules}

ESEMÉNY / ALKALOM: "${eventName}"
HELYSZÍN ÉS IDŐJÁRÁS: ${weather?.city || 'Budapest'}, ${temperature}°C, ${weather?.condition || 'Kellemes'}
${anchorItems.length > 0 ? `KÖTELEZŐ KULCSDARABOK (Anchor Items): ${JSON.stringify(anchorItems.map(a => ({ id: a.id, name: a.name, category: a.category, color: a.color })))}` : ''}

Ruhatár (${shuffledWardrobe.length} elérhető darab [CATALOG] TSV formátumban):
${formatWardrobeToCompactCatalog(shuffledWardrobe)}

SARTORIAL BLUEPRINT, ANATÓMIAI RÉTEGEZÉSI & SZILUETTSZABÁLYOK:

👔 SARTORIAL HARMÓNIA, GALLÉR-, UJJ- ÉS SZILUETTSZABÁLYZAT (SZIGORÚAN KÖTELEZŐ!):

1. 👔 GALLÉR ÉS HAJTÓKA HARMÓNIA (Collar & Lapel Compatibility):
   - ❌ ÁLLÓGALLÉROS ING (Mandarin / Band collar / Grandad / Mao / Nehru):
     * SZIGORÚAN TILTOTT zárt kerek- vagy V-nyakú kötött pulóverrel rétegezni! (Az állógallér nem fekszik rá a kötött nyakkivágásra, gyűrődik és deformálódik).
     * SZIGORÚAN TILTOTT klasszikus hajtókás (Notched/Peaked lapel) öltönyzakóval kombinálni! (Klasszikus zakóhoz mindig klasszikus galléros - Spread, Point, Button-down - ing kötelező).
     * Állógalléros ing viselése: Önmagában (nadrággal + cipővel), vagy nyitott kardigánnal / gallér nélküli dzsekivel!
   - ❌ GARBÓ (Turtleneck / Rollneck):
     * Garbó alá SZIGORÚAN TILOS galléros inget vagy pólót venni! A garbó önmagában bázisfelső zakó vagy kabát alatt.
   - ❌ PÓLÓING (Polo collar):
     * Zárt kereknyakú pulóver alatt gyűrődik. Hordható önállóan, V-nyakú kötöttel vagy laza casual pamut/len zakóval.
   - ❌ NŐI KIVÁGÁSOK & GALLÉROK:
     * Csónaknyak, aszimmetrikus, szögletes (Square) nyak alá tilos magas, zárt környakú pamutpólót vagy merev inggallért rétegezni!
     * Masnis gallér (Pussy-bow) blézerrel vagy V-kardigánnal viselendő, sosem zárt pulóver alá gyűrve.

2. 👕 UJJHOSSZ & RÉTEGEZÉSI HIERARCHIA (Sleeve Length Hierarchy):
   - ❌ RÖVID UJJÚ KÖTÖTT PULÓVER / KÖTÖTT PÓLÓ:
     * SZIGORÚAN TILOS alá rövid ujjú pólót vagy rövid ujjú inget rétegezni! (Kettős ujjvég, kilógó vagy gyűrődő ujjak elkerülése). A rövid ujjú kötött pulóvert közvetlenül a bőrön hordjuk (vagy ujjatlan / láthatatlan bázissal)!
   - ❌ KÖTÖTT MELLÉNY (Sweater vest / Slipover):
     * Alá KIZÁRÓLAG hosszú ujjú ing (vagy hosszú ujjú garbó/felső) passzol, soha nem rövid ujjú póló!
   - ❌ ZAKÓ / BLÉZER:
     * Smart casual és formális zakó alá hosszú ujjú ing szükséges a mandzsetta kilátszódásához és a komfortos viselethez.

3. ⚖️ SZILUETT, TÉRFOGAT & ARÁNYOK EGYENSÚLYA (Volume & Silhouette Balance):
   - Bő / Oversized felsőhöz ➔ karcsúsított / egyenes alsó (Slim / Straight / Tapered / Ceruzaszoknya).
   - Bő / Wide-leg nadrághoz vagy A-vonalú maxiszoknyához ➔ testhezálló, betűrt felső és deréköv.
   - Női Ruhák (Dresses) és Szoknyák rétegezése: Midi és Maxi ruhához derékban szabott / rövidített (Cropped/Tailored) blézer vagy deréköv szükséges; tilos alaktalan, túl hosszú zakóval elnyomni a ruha esését.

4. 👔 KÖTELEZŐ ALAPELEMEK MINDEN SZETTBEN:
   - 👔 Bázis felső ('tops' - ing vagy minőségi pamut póló közvetlenül a bőrön; ha a szett bázisa garbó vagy rövid ujjú kötött pulóver, az maga a bázis).
   - 👖 Alsó ('bottoms' - pontosan 1 db nadrág / chino / flanelnadrág / farmer / szoknya a ruhatárból).
   - 👗 NŐI EGYBERUHA (DRESS) KIVÉTEL ÉS SZABÁLY:
     * Ha a szett alapja egy egyberuha / ruha (pl. midiruha, maxiruha, koktélruha, ingruha), az önálló EGYRÉSZES bázisdarab (egyszerre fedi le a felsőt és az alsót)!
     * EGYBERUHÁHOZ SZIGORÚAN TILOS KÜLÖN ALSÓT (nadrágot, farmert, szoknyát, szoknyanadrágot / culottes) RENDELNI!
     * Egyberuhához kizárólag felöltő réteg (blézer, kardigán, szövetkabát), cipő és kiegészítők (öv, táska) társíthatók!
   - 👞 Lábbeli ('shoes' - pontosan 1 pár cipő / loafer / sneaker / félcipő a ruhatárból).
   - 🎗️ Öv ('accessories' - a cipővel harmonizáló bőröv a ruhatárból, kötelező kiegészítő).

5. ☀️ HŐMÉRSÉKLETI ÉS LÁBBELI DRESS CODE SZABÁLYOK (${temperature}°C):
   - ☀️ MELEG IDŐ (${temperature}°C >= 19°C):
     * SZIGORÚAN KIZÁRT: Őszi/téli bokacipő, bokacsizma, Chelsea csizma, Chukka, bélelt bakancs, vastag télikabát és vastag kötött garbó!
     * KIZÁRÓLAG NYÁRI / KÖNNYŰ LÁBBELI ENGEDÉLYEZETT: Bőr penny/tassel loafer, mokaszin, tiszta bőr sneaker, szellős derbi/oxford félcipő!
     * FELSŐRÉTEG: Könnyű pamut/len ing + laza zakó (opcionális).
   - ❄️ HŰVÖS / HIDEG IDŐ (${temperature}°C < 14°C):
     * Bokacsizma, chelsea csizma, bélelt elegáns lábbeli, téli szövetkabát és meleg flanelnadrág preferált.

6. 🧥 OPCIONÁLIS RÉTEGEK (Időjárás, esemény és stílus szerint):
   - Kötöttáru / Pulóver ('knitwear'): Opcionálisan 0 vagy 1 db pulóver/kardigán az ingre/pólóra rétegezve (figyelembe véve a fenti gallér- és ujj-szabályokat!).
   - Zakó ('outerwear' / 'blazer'): Opcionális zakó / dzseki a bázisra/pulóverre.
   - ❄️ TÉLI / HIDEG IDŐ (< 12°C vagy Téli esemény):
     * KETTŐS KÜLSŐ RÉTEG ENGEDÉLYEZETT: A zakó ('blazer') FÖLÉ mehet a téli szövetkabát / nagykabát ('overcoat' / 'coat')!

7. 🔄 KÖTELEZŐ RUHATÁR-ROTÁCIÓ & MAXIMÁLIS DARAB-VÁLTOZATOSSÁG (STRICT WARDROBE DIVERSITY):
   - A 3 generált szettben KÖTELEZŐ a ruhatár TELJES SZÉLESSÉGÉT és mélységét kihasználni!
   - SZIGORÚAN TILOS ugyanazt a nadrágot, cipőt vagy zakót mindhárom szettbe beletenni, ha a ruhatárban elérhető más megfelelő darab!
   - Mind a korábban meglévő klasszikus alapdarabokat, mind az újabb szerzeményeket EGYENLŐ ESÉLLYEL és KIEGYENSÚLYOZOTTAN vond be a válogatásba!
   - A 3 szett (Outfit 1, Outfit 2, Outfit 3) 3 teljesen különböző stílusárnyalatot és darab-kombinációt mutasson be!

🚫 CSENDES SZABÁLYBETARTÁS (Silent Rule Enforcement):
- A felhasználó egyéni szabályait és tiltásait (pl. nem hord pólóinget, nem vesz fel joggert inggel stb.) KÖTELEZŐEN A HÁTTÉRBEN, CSENDBEN TARTSD BE a szettek összeállításakor!
- SZIGORÚAN TILOS a kimeneti szövegekben (stylingNotes, culturalFitReasoning, layeringAdvice) megemlíteni vagy magyarázni a felhasználó saját szabályait!
- A leírás KIZÁRÓLAG a szett esztétikájára, a színek és anyagok kifinomult harmóniájára és az esemény dress code-jára fókuszáljon!

VÁLASZOLJ KIZÁRÓLAG ÉRVÉNYES JSON TÖMBKÉNT:
[
  {
    "id": "outfit-1",
    "title": "Kifejező szett elnevezés",
    "decisionBadge": "Tömör, egysoros döntési jelvény (pl. '✓ Smart Casual: sötétkék zakó + homokbézs chino kontraszt • 🌡️ 16°C rétegrend')",
    "styleArchetype": "A felhasználó személyes stílusához és az alkalomhoz illő stílusnév",
    "occasion": "${eventName}",
    "matchScore": 97,
    "stylingNotes": "Személyre szabott stylist tanács a viseléshez és a darabok összhangjához",
    "layeringAdvice": "Gyakorlati rétegezési útmutató",
    "culturalFitReasoning": "Hogyan érvényesül a felhasználó személyes stílusa és az esemény összhangja ebben a szettben",
    "weatherSuitability": "Időjárási és hőmérsékleti megfelelés (${temperature}°C)",
    "itemIds": ["bázis_ing_vagy_ruha_id", "opcionalis_pulover_vagy_kardigan_id", "opcionalis_zako_id", "opcionalis_teli_kabat_id", "opcionalis_nadrag_id_egyberuhanak_tilos", "cipo_id", "ov_id"]
  }
]`;

      const contents = [{ parts: [{ text: prompt }] }];
      const parsed = await callGeminiApi({
        apiKey,
        contents,
        preferredModels: REASONING_MODELS,
        timeoutMs: 22000
      });

      if (Array.isArray(parsed)) {
        return parsed.map((p, idx) => {
          const rawItems = (p.itemIds || [])
            .map(id => wardrobe.find(w => w.id === id))
            .filter(Boolean);
          const fullEnforcedItems = enforceAnatomicalOutfitLayers(rawItems, availableWardrobe, null, weather);

          return {
            id: p.id || `outfit-${Date.now()}-${idx}`,
            title: p.title || `${idx + 1}. Stílusos Szett`,
            decisionBadge: p.decisionBadge || `✓ ${p.styleArchetype || 'Smart Casual'} • 🌡️ ${temperature}°C`,
            styleArchetype: p.styleArchetype || 'Eseményhez Hangolt',
            occasion: p.occasion || eventName,
            matchScore: p.matchScore || 94 + (idx * 2) % 5,
            stylingNotes: p.stylingNotes || "Harmonikus összeállítás a gardróbodból.",
            layeringAdvice: p.layeringAdvice || "Funkcionálisan rétegezett összeállítás, amely a belső térben és hűvösebb időben is jól alkalmazkodik.",
            culturalFitReasoning: p.culturalFitReasoning || "Tökéletesen igazodik az esemény dress code-jához és atmoszférájához.",
            weatherSuitability: p.weatherSuitability || `Ideális a(z) ${temperature}°C-os időjáráshoz.`,
            items: fullEnforcedItems
          };
        }).filter(o => o.items.length > 0);
      }
    } catch (e) {
      console.error("Gemini Stylist hiba:", e);
      throw e;
    }
  }

  throw new Error('Nincs beállítva Gemini API kulcs vagy üres a ruhatár!');
}

/**
 * 3b. AI Outfit Garment Swapper (Intelligens Egyedi Ruhacsere a Szettben)
 * Replaces a single garment in an outfit with the best matching alternative from the wardrobe.
 */
export async function swapOutfitItem({
  outfit,
  itemToReplace,
  wardrobe = [],
  styleProfile = {},
  weather = null,
  eventName = ''
}) {
  const apiKey = getGeminiApiKey();
  if (!apiKey || !outfit || !itemToReplace) {
    throw new Error('Hiányzó adatok vagy Gemini API kulcs a ruha cseréjéhez!');
  }

  // 1. Identify category / role of itemToReplace
  const itemCategory = itemToReplace.category || '';
  const isShoes = itemCategory === 'shoes' || (itemToReplace.name || '').toLowerCase().includes('cipő') || (itemToReplace.name || '').toLowerCase().includes('loafer');
  const isBottoms = itemCategory === 'bottoms' || itemCategory === 'skirts' || (itemToReplace.name || '').toLowerCase().includes('nadrág');
  const isOuterwear = itemCategory === 'outerwear' || (itemToReplace.name || '').toLowerCase().includes('zakó') || (itemToReplace.name || '').toLowerCase().includes('kabát') || (itemToReplace.name || '').toLowerCase().includes('blézer');
  const isTops = itemCategory === 'tops' || (itemToReplace.name || '').toLowerCase().includes('ing') || (itemToReplace.name || '').toLowerCase().includes('póló');
  const isKnitwear = itemCategory === 'knitwear' || (itemToReplace.name || '').toLowerCase().includes('pulóver') || (itemToReplace.name || '').toLowerCase().includes('kardigán');
  const isAccessory = itemCategory === 'accessories' || (itemToReplace.name || '').toLowerCase().includes('öv');

  // 2. Candidate items from wardrobe in the same / compatible category excluding current item and items already in outfit
  const remainingOutfitItems = (outfit.items || []).filter(i => i.id !== itemToReplace.id);
  const remainingIds = new Set(remainingOutfitItems.map(i => i.id));

  const candidateWardrobe = wardrobe.filter(w => {
    if (w.id === itemToReplace.id) return false;
    if (remainingIds.has(w.id)) return false;
    if (w.condition === 'Lecserélendő' || w.condition === 'Javításra vár') return false;

    if (isShoes) {
      return w.category === 'shoes' || (w.name || '').toLowerCase().includes('cipő') || (w.name || '').toLowerCase().includes('loafer') || (w.name || '').toLowerCase().includes('sneaker') || (w.name || '').toLowerCase().includes('csizma') || (w.name || '').toLowerCase().includes('bakancs');
    }
    if (isBottoms) {
      return w.category === 'bottoms' || w.category === 'skirts' || (w.name || '').toLowerCase().includes('nadrág') || (w.name || '').toLowerCase().includes('chino') || (w.name || '').toLowerCase().includes('farmer');
    }
    if (isOuterwear) {
      return w.category === 'outerwear' || (w.name || '').toLowerCase().includes('zakó') || (w.name || '').toLowerCase().includes('blézer') || (w.name || '').toLowerCase().includes('dzseki') || (w.name || '').toLowerCase().includes('kabát');
    }
    if (isTops) {
      return w.category === 'tops' || (w.name || '').toLowerCase().includes('ing') || (w.name || '').toLowerCase().includes('póló') || (w.name || '').toLowerCase().includes('felső');
    }
    if (isKnitwear) {
      return w.category === 'knitwear' || (w.name || '').toLowerCase().includes('pulóver') || (w.name || '').toLowerCase().includes('kardigán');
    }
    if (isAccessory) {
      return w.category === 'accessories' || (w.name || '').toLowerCase().includes('öv');
    }
    return w.category === itemCategory;
  });

  if (candidateWardrobe.length === 0) {
    throw new Error(`Nincs másik elérhető darab a ruhatáradban a(z) "${itemToReplace.name}" cseréjéhez ebben a kategóriában.`);
  }

  // 3. Prompt Gemini to pick the best alternative and explain
  const customRules = Array.isArray(styleProfile.customStylingRules) && styleProfile.customStylingRules.length > 0
    ? styleProfile.customStylingRules
    : [];
  const prompt = `Te egy mester sartorial személyi stylist vagy.
A felhasználó az alábbi outfitből szeretné LECSERÉLNI a(z) "${itemToReplace.name}" (${itemToReplace.category}, ${itemToReplace.color}) darabot egy másik, tökéletesen passzoló alternatívára.

ESEMÉNY: "${eventName || outfit.occasion || 'Stílusos megjelenés'}"
SZETT NEVE: "${outfit.title}"
A SZETT MEGLÉVŐ TOVÁBBI ELEMEI (amik megmaradnak a szettben):
${formatWardrobeToCompactCatalog(remainingOutfitItems)}

CSERÉRE ELÉRHETŐ DARABOK A FELHASZNÁLÓ RUHATÁRÁBÓL:
${formatWardrobeToCompactCatalog(candidateWardrobe)}

FELHASZNÁLÓ EGYÉNI SZABÁLYAI & TILTÁSAI:
${customRules.length > 0 ? customRules.map(r => `• ${r}`).join('\n') : 'Nincsenek.'}

SARTORIAL HARMÓNIASZABÁLYOK:
${dynamicSartorialRules}

FELADAT:
Válaszd ki a legmegfelelőbb alternatív darab 'id'-ját a fenti elérhető listából!
A választott darabnak tökéletes színharmóniában, anyagtalálkozásban és formalitásban kell lennie a szett megmaradt elemeivel és az eseménnyel.

VÁLASZOLJ KIZÁRÓLAG ÉRVÉNYES JSON FORMÁTUMBAN:
{
  "selectedItemId": "a_kiválasztott_ruha_id_ja",
  "reasoning": "Rövid, meggyőző indoklás (1-2 mondat magyarul), hogy miért ez az új darab a tökéletes választás a szetthez",
  "updatedTitle": "Opcionális frissített szett név ha a stílus finomodott",
  "matchScore": 95
}`;

  const parsed = await callGeminiApi({
    apiKey,
    contents: [{ parts: [{ text: prompt }] }],
    temperature: 0.2,
    preferredModels: FAST_MODELS,
    timeoutMs: 14000
  });

  const selectedItem = candidateWardrobe.find(w => w.id === parsed.selectedItemId) || candidateWardrobe[0];
  if (!selectedItem) {
    throw new Error('Nem sikerült megfelelő alternatív darabot kiválasztani.');
  }

  // Replace item in items array
  const newItemsRaw = outfit.items.map(i => i.id === itemToReplace.id ? selectedItem : i);
  const updatedItems = enforceAnatomicalOutfitLayers(newItemsRaw, wardrobe, null, weather);

  return {
    ...outfit,
    title: parsed.updatedTitle || outfit.title,
    matchScore: parsed.matchScore || outfit.matchScore || 94,
    culturalFitReasoning: parsed.reasoning || outfit.culturalFitReasoning,
    items: updatedItems,
    replacedItemInfo: {
      previousItemName: itemToReplace.name,
      newItemName: selectedItem.name,
      reasoning: parsed.reasoning
    }
  };
}

/**
 * 4. Kapszula Ruhatár Elemzés: Dinamikus Gemini AI Gap Analysis & Intelligens Kulcsdarab Ajánló
 */
export async function analyzeWardrobeGaps(wardrobe = [], profile = {}) {
  const apiKey = getGeminiApiKey();

  if (apiKey && wardrobe.length > 0) {
    try {
      // Count items per category and identify potential replacements
      const replacementCandidates = wardrobe.filter(w => w.condition === 'Lecserélendő' || w.condition === 'Játszós / Kopott');
      const customRules = Array.isArray(profile.customStylingRules) && profile.customStylingRules.length > 0
        ? profile.customStylingRules
        : [];

      const demographics = getProfileDemographics(profile);
      const demographicRules = getDemographicSartorialInstructions(demographics, profile);
      const dynamicSartorialRules = formatRulesForPrompt(null, demographics);

      // Check seasonal footwear status in existing wardrobe
      const hasAutumnWinterShoes = wardrobe.some(w =>
        w.category === 'shoes' &&
        Array.isArray(w.season) &&
        (w.season.includes('osz') || w.season.includes('tel')) &&
        (w.subCategory === 'boots' || w.subCategory === 'chelsea_boots' || w.name.toLowerCase().includes('csizma') || w.name.toLowerCase().includes('bakancs') || w.name.toLowerCase().includes('cipő'))
      );

      const prompt = `Te egy mester kapszula ruhatár-tervező és személyi stylist vagy.
Elemezd a felhasználó gardróbját (${wardrobe.length} elem), életkorát, nemét, testalkatát és stílusprofilját, és KÉSZÍTS EGY ÁTFOGÓ, 6–8 STRATÉGIAI KULCSDARABBÓL ÁLLÓ HIÁNYLISTÁT!

DEMOGRÁFIAI PROFIL:
Név: ${profile.name || 'Felhasználó'}
Nem & Életkor: ${demographics.gender}, ${demographics.age} éves (${demographics.bracketDescription})
Stílusprofil: ${JSON.stringify({ height: profile.height, weight: profile.weight, body: profile.bodyType, preferredStyles: profile.preferredStyles, philosophy: profile.stylePhilosophy })}

${demographicRules}

🚫 FELHASZNÁLÓ EGYÉNI STÍLUSSZABÁLYAI & TILTÁSAI:
${customRules.length > 0 ? customRules.map(r => `• ${r}`).join('\n') : 'Nincsenek külön rögzített tiltások.'}

👔 AKTÍV SARTORIAL HARMÓNIA- ÉS RÉTEGEZÉSI SZABÁLYZAT:
${dynamicSartorialRules}

MEGLÉVŐ RUHATÁR KATALÓGUS (${wardrobe.length} db darab):
${formatWardrobeToCompactCatalog(wardrobe)}
${replacementCandidates.length > 0 ? `Elhasználódott / játszós darabok a szekrényben: ${JSON.stringify(replacementCandidates.map(r => ({ name: r.name, category: r.category, color: r.color })))}` : ''}

KAPSZULA HIÁNYELEMZÉS & PRIORITÁSI IRÁNYELVEK:

1. 🎯 ÁTFOGÓ 6-8 DARABOS HIÁNYLISTA (Kifejezetten a felhasználó neméhez [${demographics.gender}] és életkorához [${demographics.age} éves, ${demographics.bracketDescription}] igazítva):
   - 🔴 **Kritikus Hiány (Priority Score: 90–100):** Olyan funkcionális alapdarabok, amikből 0 db van, és nélkülük egész szezonok vagy szettek esnek ki ${demographics.isChild ? '(pl. vízálló és szélálló őszi gyerekdzseki, kényelmes tépőzáras vagy puha bőr lábbeli)' : (demographics.isFemale ? '(pl. őszi/téli női bőr bokacsizma, nőies szövetkabát)' : '(pl. őszi/téli bőr Chelsea csizma vagy harmonizáló bőröv)')}.
   - 🟡 **Fontos Kapszula Bázis (Priority Score: 80–89):** Nélkülözhetetlen rétegzési alapok ${demographics.isChild ? '(pl. 100% pamut strapabíró gumis derekú nadrág, puha pamut pulóver)' : (demographics.isFemale ? '(pl. prémium pamut felső blézerek alá, elegáns női nadrág vagy midi ruha)' : '(pl. prémium pamut póló zakók és pulóverek alá, vagy gyapjú flanelnadrág)')}.
   - 🟢 **Nagy Varianciát Adó Kulcsdarabok (Priority Score: 70–79):** Olyan karakteres, sokoldalú új darabok, amik +8–15 új hordható szettet nyitnak meg a meglévő ruhákkal.
   - ⚪ **Stílusgazdagító / Nice to Have (Priority Score: 50–69):** Extra kényelmet vagy kifinomultságot adó kiegészítők.

2. 👞 SZEZONÁLIS LÁBBELI GAP:
   - ${!hasAutumnWinterShoes ? `KÖTELEZŐ legalább egy ${demographics.isChild ? 'strapabíró, kényelmes és vízálló gyerek őszi/téli lábbelit' : (demographics.isFemale ? 'női elegáns őszi/téli bőrcsizmát vagy bokacipőt' : 'férfi prémium őszi/téli bőrlábbelit')} ajánlani!` : 'A lábbeli kategória rendelkezik őszi/téli darabbal.'}

3. 📐 SZABÁS & ANYAG:
   - Kizárólag 100% természetes és bőrbarát anyagokat ajánlj (gyapjú, len, kasmír, pamut, bőr).

🚫 SZIGORÚ SZABÁLYÉRTELMEZÉS & CSENDES SZABÁLYBETARTÁS:
1. PONTOS, KATEGÓRIASPECIFIKUS ÉRTELMEZÉS:
   - Ha egy szabály konkrét darabra/kategóriára vonatkozik, az KIZÁRÓLAG az adott kategóriára érvényes!
2. CSENDES SZABÁLYBETARTÁS:
   - A 'reason' mezőben SZIGORÚAN TILOS megemlíteni a felhasználó szabályait (TILOS leírni: "a preferenciáid miatt", "a szabályod szerint", "mivel tiltottad" stb.)!
   - Az indoklás KIZÁRÓLAG a darab minőségére, rétegezhetőségére és kombinációs értékére fókuszáljon!

VÁLASZOLJ KIZÁRÓLAG ÉRVÉNYES JSON TÖMBKÉNT (6-8 darabbal):
[
  {
    "id": "gap-1",
    "title": "Pontos terméknév a szabással és anyaggal (pl. '${demographics.isChild ? 'Sötétkék Vízálló és Lélegző Gyermek Átmeneti Dzseki' : (demographics.isFemale ? 'Teveszínű Női Gyapjú Szövetkabát' : 'Sötétbarna Full-Grain Bőr Chelsea Csizma')}')",
    "recommendedFit": "pl. ${demographics.isChild ? 'Kényelmes mozgásbarát szabás' : (demographics.isFemale ? 'Karcsúsított nőies szabás' : 'Slim tailored / Classic last')}",
    "priorityScore": 96,
    "priorityLevel": "Kritikus Alapdarab" | "Fontos Kapszula Bázis" | "Nagy Varianciát Adó Kulcsdarab" | "Stílusgazdagító / Nice to Have",
    "impact": "+10 Új Outfit Variáció",
    "estimatedPrice": "${demographics.isChild ? '12 000 - 25 000 Ft' : '45 000 - 85 000 Ft'}",
    "category": "shoes" | "outerwear" | "knitwear" | "tops" | "bottoms" | "accessories",
    "season": "Ősz / Tél" | "Tavasz / Nyár" | "Egész évben",
    "reason": "Részletes szakmai indoklás, miért ez a kulcsdarab hiányzik a ruhatárból és hogyan növeli a kombinálhatóságot",
    "isReplacement": false,
    "searchKeywords": "konkrét keresési kulcsszavak webshophoz (pl. ${demographics.isChild ? 'kids waterproof breathable autumn jacket' : (demographics.isFemale ? 'womens camel wool coat' : 'mens dark brown leather chelsea boots')})"
  }
]`;

      const contents = [{ parts: [{ text: prompt }] }];
      const parsed = await callGeminiApi({
        apiKey,
        contents,
        preferredModels: REASONING_MODELS,
        timeoutMs: 22000
      });
      if (Array.isArray(parsed) && parsed.length > 0) {
        const sorted = parsed.sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
        try {
          localStorage.setItem('sartorial_last_ai_gaps', JSON.stringify(sorted));
        } catch (_) {}
        return sorted;
      }
    } catch (e) {
      console.error('Gemini Capsule Gap hiba:', e);
    }
  }

  // 1. SZINT: Legutóbbi sikeres valódi AI hiánylista beolvasása a helyi gyorsítótárból (Cache-First Fallback)
  try {
    const cachedRaw = typeof localStorage !== 'undefined'
      ? (localStorage.getItem('sartorial_last_ai_gaps') || localStorage.getItem('capsule_gaps_cache'))
      : null;

    if (cachedRaw) {
      const cachedGaps = JSON.parse(cachedRaw);
      if (Array.isArray(cachedGaps) && cachedGaps.length > 0) {
        // Intelligensen kiszűrjük azokat a darabokat, amiket a felhasználó azóta már felvitt a gardróbba
        const filteredCached = cachedGaps.filter(gap => {
          const gapTitle = (gap.title || '').toLowerCase();
          const gapCat = gap.category;
          
          const alreadyOwned = wardrobe.some(w => {
            const wName = (w.name || '').toLowerCase();
            const wSub = (w.subCategory || '').toLowerCase();
            if (gapCat && w.category && w.category !== gapCat) return false;
            if (gapTitle.includes('chelsea') && (wName.includes('chelsea') || wSub.includes('chelsea'))) return true;
            if (gapTitle.includes('loafer') && (wName.includes('loafer') || wSub.includes('loafer'))) return true;
            if (gapTitle.includes('hopsack') && (wName.includes('hopsack') || (wName.includes('zakó') && wName.includes('kék')))) return true;
            if (gapTitle.includes('flanel') && (wName.includes('flanel') || (wName.includes('nadrág') && wName.includes('szürke')))) return true;
            if (gapTitle.includes('garbó') && (wName.includes('garbó') || wSub.includes('garbo'))) return true;
            if (gapTitle.includes('bőröv') && (wName.includes('öv') || wSub.includes('belt'))) return true;
            return false;
          });
          return !alreadyOwned;
        });

        if (filteredCached.length > 0) {
          return filteredCached;
        }
      }
    }
  } catch (err) {
    console.warn('Hiba a gyorsítótárazott AI hiánylista beolvasásakor:', err);
  }

  // 2. SZINT (Hidegindítás): Gardrób-Adaptív Dinamikus Fallback Kapszula Elemző
  return generateDynamicWardrobeFallbackGaps(wardrobe, profile);
}

/**
 * Gardrób-Adaptív Dinamikus Kapszula Hiányelemző Motor
 * Ha offline van a rendszer vagy az API hívás meghiúsul, nem egy fix statikus listát ad vissza,
 * hanem valós időben megvizsgálja a felhasználó létező darabjait, nemét, hiányzó kategóriáit és szabályait.
 */
export function generateDynamicWardrobeFallbackGaps(wardrobe = [], profile = {}) {
  const demographics = getProfileDemographics(profile);
  const { isBaby, isPreschool, isSchoolChild, isTeen, isAdult, isFemale, gender } = demographics;
  const rulesLower = (Array.isArray(profile?.customStylingRules) ? profile.customStylingRules.join(' ') : '').toLowerCase();

  // 1. Meglévő darabok intelligens auditálása a gardróbban
  const hasBoots = wardrobe.some(w => w.category === 'shoes' && (
    (Array.isArray(w.season) && (w.season.includes('osz') || w.season.includes('tel'))) ||
    w.subCategory === 'boots' || w.subCategory === 'chelsea_boots' || 
    (w.name || '').toLowerCase().includes('csizma') || (w.name || '').toLowerCase().includes('bakancs')
  ));
  const hasLoafers = wardrobe.some(w => w.category === 'shoes' && (
    (w.name || '').toLowerCase().includes('loafer') || (w.name || '').toLowerCase().includes('mokaszin') || (w.subCategory || '').toLowerCase().includes('loafer')
  ));
  const hasSneakers = wardrobe.some(w => w.category === 'shoes' && (
    (w.name || '').toLowerCase().includes('sneaker') || (w.name || '').toLowerCase().includes('edzőcipő') || (w.name || '').toLowerCase().includes('tornacipő')
  ));
  const hasNavyBlazer = wardrobe.some(w => w.category === 'outerwear' && (
    (w.name || '').toLowerCase().includes('zakó') || (w.name || '').toLowerCase().includes('blazer') || (w.name || '').toLowerCase().includes('blézer')
  ) && (
    (w.color || '').toLowerCase().includes('kék') || (w.name || '').toLowerCase().includes('kék') || (w.name || '').toLowerCase().includes('navy')
  ));
  const hasOvercoat = wardrobe.some(w => w.category === 'outerwear' && (
    (w.name || '').toLowerCase().includes('kabát') || (w.name || '').toLowerCase().includes('szövetkabát') || (w.name || '').toLowerCase().includes('overcoat') || (w.name || '').toLowerCase().includes('trench') || (w.name || '').toLowerCase().includes('dzseki')
  ));
  const hasMerinoTurtleneck = wardrobe.some(w => w.category === 'knitwear' && (
    (w.name || '').toLowerCase().includes('garbó') || (w.name || '').toLowerCase().includes('turtleneck')
  ));
  const hasKnitwear = wardrobe.some(w => w.category === 'knitwear' || (w.name || '').toLowerCase().includes('pulóver') || (w.name || '').toLowerCase().includes('kardigán'));
  const hasFlannelTrousers = wardrobe.some(w => w.category === 'bottoms' && (
    (w.name || '').toLowerCase().includes('flanel') || (w.name || '').toLowerCase().includes('gyapjú') || (w.name || '').toLowerCase().includes('öltönynadrág')
  ));
  const hasChinos = wardrobe.some(w => w.category === 'bottoms' && (
    (w.name || '').toLowerCase().includes('chino') || (w.name || '').toLowerCase().includes('pamutnadrág')
  ));
  const hasCasualPants = wardrobe.some(w => w.category === 'bottoms' && (
    (w.name || '').toLowerCase().includes('kord') || (w.name || '').toLowerCase().includes('pamut') || (w.name || '').toLowerCase().includes('farmer') || (w.name || '').toLowerCase().includes('nadrág')
  ));
  const hasHeavyTee = wardrobe.some(w => w.category === 'tops' && (
    (w.name || '').toLowerCase().includes('póló') || (w.name || '').toLowerCase().includes('t-shirt')
  ));
  const hasOxfordShirt = wardrobe.some(w => w.category === 'tops' && (
    (w.name || '').toLowerCase().includes('oxford') || (w.name || '').toLowerCase().includes('ocbd') || (w.name || '').toLowerCase().includes('kék ing')
  ));
  const hasWhiteShirt = wardrobe.some(w => w.category === 'tops' && (
    (w.name || '').toLowerCase().includes('fehér ing') || (w.name || '').toLowerCase().includes('white shirt') || (w.name || '').toLowerCase().includes('blúz')
  ));
  const hasLeatherBelt = wardrobe.some(w => w.category === 'accessories' && (
    (w.name || '').toLowerCase().includes('öv') || (w.name || '').toLowerCase().includes('belt')
  ));

  const candidatePool = [];

  // 1. Csecsemő- és babakor (0–2 év)
  if (isBaby) {
    candidatePool.push({
      id: 'gap-baby-cotton-romper',
      title: '100% Organikus Pamut Puha Rugdalózó',
      recommendedFit: 'Comfortable / Easy-snap',
      priorityScore: 98,
      priorityLevel: 'Kritikus Alapdarab',
      impact: '+15 Bőrbarát Mindennapi Kényelem',
      estimatedPrice: '4 500 - 8 500 Ft',
      category: 'tops',
      season: 'Egész évben',
      reason: 'Légáteresztő, puha és kíméli az érzékeny bababőrt, patentos kialakítása megkönnyíti a pelenkázást.',
      isReplacement: false,
      searchKeywords: 'organic cotton baby romper puha babaruha'
    });
    candidatePool.push({
      id: 'gap-baby-winter-pramsuit',
      title: 'Bélelt Meleg Babakocsis Overál (Pramsuit)',
      recommendedFit: 'Cozy hooded / Windproof',
      priorityScore: 95,
      priorityLevel: 'Kritikus Alapdarab',
      impact: '+12 Védett Őszi/Téli Séta',
      estimatedPrice: '12 000 - 24 000 Ft',
      category: 'outerwear',
      season: 'Ősz / Tél',
      reason: 'Megvédi a babát a hideg széltől és hűvös időjárástól a kinti séták alkalmával.',
      isReplacement: false,
      searchKeywords: 'baby winter pramsuit belelt baba overal'
    });
    candidatePool.push({
      id: 'gap-baby-soft-shoes',
      title: 'Puhatalpú Bőr / Polár Kocsicipő',
      recommendedFit: 'Soft sole / Elastic ankle',
      priorityScore: 90,
      priorityLevel: 'Fontos Kapszula Bázis',
      impact: '+10 Meleg Babalábak',
      estimatedPrice: '4 000 - 8 000 Ft',
      category: 'shoes',
      season: 'Ősz / Tél',
      reason: 'Nem akadályozza a lábfej természetes fejlődését, és melegen tartja a baba lábát.',
      isReplacement: false,
      searchKeywords: 'baby soft sole shoes puhatalpu kocsicipo'
    });
  }
  // 2. Bölcsődés és óvodás korosztály (3–6 év)
  else if (isPreschool) {
    if (!hasCasualPants) {
      candidatePool.push({
        id: 'gap-preschool-cord-pants',
        title: isFemale ? 'Gumis Derekú Puha Kordbársony Nadrág' : 'Gumis Derekú Kényelmes Kordbársony Nadrág',
        recommendedFit: 'Elastic waist / Relaxed regular',
        priorityScore: 98,
        priorityLevel: 'Kritikus Alapdarab',
        impact: '+14 Kényelmes Óvodai & Játszós Szett',
        estimatedPrice: '5 500 - 11 000 Ft',
        category: 'bottoms',
        season: 'Ősz / Tél',
        reason: 'Puha, meleg, nem szorítja a hasat és könnyű önállóan fel- és levenni az óvodában.',
        isReplacement: false,
        searchKeywords: 'kids elastic waist corduroy trousers ovodas kord nadrag'
      });
    }
    if (!hasKnitwear) {
      candidatePool.push({
        id: 'gap-preschool-cotton-cardigan',
        title: 'Puha Pamutkötött Gombos Kardigán',
        recommendedFit: 'Soft regular fit',
        priorityScore: 92,
        priorityLevel: 'Fontos Kapszula Bázis',
        impact: '+11 Rétegezhető Meleg Felső',
        estimatedPrice: '6 000 - 12 000 Ft',
        category: 'knitwear',
        season: 'Ősz / Tél',
        reason: 'Könnyen le- és felvehető réteg az óvodai csoportszobában és a szabadban.',
        isReplacement: false,
        searchKeywords: 'kids soft cotton cardigan gyerek kotott kardigan'
      });
    }
    if (!hasBoots && !hasSneakers) {
      candidatePool.push({
        id: 'gap-preschool-boots',
        title: 'Vízálló Tépőzáras Őszi Bokacipő / Bakancs',
        recommendedFit: 'Velcro / Flexible waterproof sole',
        priorityScore: 95,
        priorityLevel: 'Kritikus Alapdarab',
        impact: '+12 Vízálló Játszótéri Lábbeli',
        estimatedPrice: '10 000 - 20 000 Ft',
        category: 'shoes',
        season: 'Ősz / Tél',
        reason: 'A tépőzár segíti az önálló cipőfelvételt, miközben szárazon és melegen tartja a lábat.',
        isReplacement: false,
        searchKeywords: 'kids waterproof velcro boots gyerek tepozaras cipo'
      });
    }
  }
  // 3. Kisiskolás korosztály (7–12 év)
  else if (isSchoolChild) {
    if (!hasCasualPants) {
      candidatePool.push({
        id: 'gap-school-autumn-pants',
        title: isFemale ? 'Kényelmes Rugalmas Derekú Kordbársony Őszi Nadrág' : 'Kényelmes Pamut-Twill Iskolai Nadrág',
        recommendedFit: 'Comfort stretch / Regular fit',
        priorityScore: 98,
        priorityLevel: 'Kritikus Alapdarab',
        impact: '+14 Csinos & Kényelmes Iskolai Szett',
        estimatedPrice: '7 000 - 14 000 Ft',
        category: 'bottoms',
        season: 'Ősz / Tél',
        reason: 'Csinos megjelenést és teljes mozgásszabadságot nyújt az iskolában és a délutáni játék során.',
        isReplacement: false,
        searchKeywords: 'kids comfortable autumn trousers iskolas kényelmes nadrag'
      });
    }
    if (!hasKnitwear) {
      candidatePool.push({
        id: 'gap-school-cotton-sweater',
        title: 'Prémium Pamut Kereknyakú Kötött Pulóver',
        recommendedFit: 'Regular fit',
        priorityScore: 92,
        priorityLevel: 'Fontos Kapszula Bázis',
        impact: '+10 Meleg Iskolai Réteg',
        estimatedPrice: '8 000 - 16 000 Ft',
        category: 'knitwear',
        season: 'Ősz / Tél',
        reason: 'Meleg, puha pamut réteg pólóra vagy felsőre véve, amely nem szúr és nem gyűrődik.',
        isReplacement: false,
        searchKeywords: 'kids 100 cotton crewneck sweater gyerek pamut pulover'
      });
    }
    if (!hasBoots && !hasSneakers) {
      candidatePool.push({
        id: 'gap-school-shoes',
        title: 'Vízálló Kényelmes Bőr Őszi Bokacipő / Sneaker',
        recommendedFit: 'Flexible sole / True to size',
        priorityScore: 94,
        priorityLevel: 'Kritikus Alapdarab',
        impact: '+12 Strapabíró Iskolai Lábbeli',
        estimatedPrice: '14 000 - 26 000 Ft',
        category: 'shoes',
        season: 'Ősz / Tél',
        reason: 'Tökéletes átmeneti lábbeli iskolába, szakkörre és hétvégi sétákra.',
        isReplacement: false,
        searchKeywords: 'kids waterproof autumn leather shoes gyerek bor cipo'
      });
    }
  }
  // 4. Kiskamasz és tinédzser korosztály (13–18 év)
  else if (isTeen) {
    candidatePool.push({
      id: 'gap-teen-relaxed-pants',
      title: isFemale ? 'Kényelmes Egyenes Szárú Pamut Nadrág (Relaxed Straight)' : 'Laza Szabású Pamut Chino / Cargo Nadrág',
      recommendedFit: 'Relaxed straight fit',
      priorityScore: 96,
      priorityLevel: 'Kritikus Alapdarab',
      impact: '+14 Laza Sulis & Városi Outfit',
      estimatedPrice: '12 000 - 24 000 Ft',
      category: 'bottoms',
      season: 'Egész évben',
      reason: 'Trendi, laza sziluettet ad sneakerekkel és kapucnis felsőkkel kombinálva.',
      isReplacement: false,
      searchKeywords: 'teen relaxed straight cotton pants tini laza nadrag'
    });
    if (!hasSneakers) {
      candidatePool.push({
        id: 'gap-teen-white-sneakers',
        title: 'Letisztult Fehér Bőr Sneaker',
        recommendedFit: 'Low top / True to size',
        priorityScore: 94,
        priorityLevel: 'Kritikus Alapdarab',
        impact: '+12 Sokoldalú Mindennapi Lábbeli',
        estimatedPrice: '20 000 - 38 000 Ft',
        category: 'shoes',
        season: 'Egész évben',
        reason: 'A modern fiatal ruhatár alapja: szinte bármilyen nadrággal és réteggel tökéletesen működik.',
        isReplacement: false,
        searchKeywords: 'white leather sneakers feher bor tornacipo'
      });
    }
    if (!hasKnitwear) {
      candidatePool.push({
        id: 'gap-teen-heavy-hoodie',
        title: 'Prémium Nehézsúlyú Pamut Kapucnis Pulóver',
        recommendedFit: 'Relaxed fit',
        priorityScore: 90,
        priorityLevel: 'Fontos Kapszula Bázis',
        impact: '+10 Meleg & Laza Réteg',
        estimatedPrice: '14 000 - 28 000 Ft',
        category: 'knitwear',
        season: 'Ősz / Tél',
        reason: 'Sűrű szövésű, tartós és kényelmes felső suliba és hétvégi programokra.',
        isReplacement: false,
        searchKeywords: 'heavyweight cotton hoodie kapucnis pulover'
      });
    }
  }
  // 5. Felnőtt korosztály (19+ év)
  else {
    if (isFemale) {
      if (!hasNavyBlazer) {
        candidatePool.push({
          id: 'gap-female-blazer',
          title: 'Karcsúsított Sötétkék Olasz Gyapjú Blézer',
          recommendedFit: 'Tailored slim / Cropped waist',
          priorityScore: 97,
          priorityLevel: 'Kritikus Alapdarab',
          impact: '+14 Elegáns Irodai & Kapszula Szett',
          estimatedPrice: '45 000 - 95 000 Ft',
          category: 'outerwear',
          season: 'Egész évben',
          reason: 'A női kapszula ruhatár sarokköve: nadrággal, szoknyával és ruhával is azonnali tartást ad.',
          isReplacement: false,
          searchKeywords: 'womens navy tailored wool blazer noi kek blezer'
        });
      }
      if (!hasBoots) {
        candidatePool.push({
          id: 'gap-female-boots',
          title: 'Fekete Full-Grain Bőr Magasszárú / Bokacsizma',
          recommendedFit: 'Classic almond toe / Block heel',
          priorityScore: 96,
          priorityLevel: 'Kritikus Alapdarab',
          impact: '+12 Őszi/Téli Szett',
          estimatedPrice: '40 000 - 80 000 Ft',
          category: 'shoes',
          season: 'Ősz / Tél',
          reason: 'Nélkülözhetetlen hideg időben a nadrágok és ruhák mellé.',
          isReplacement: false,
          searchKeywords: 'womens black leather ankle boots noi bor csizma'
        });
      }
      if (!hasFlannelTrousers && !hasChinos) {
        candidatePool.push({
          id: 'gap-female-wide-trousers',
          title: 'Magas Derekú Gyapjú Nadrág (Wide-Leg Szabás)',
          recommendedFit: 'High waist / Wide leg drape',
          priorityScore: 90,
          priorityLevel: 'Fontos Kapszula Bázis',
          impact: '+10 Chic Megjelenés',
          estimatedPrice: '28 000 - 55 000 Ft',
          category: 'bottoms',
          season: 'Ősz / Tél',
          reason: 'Tökéletes sziluettet és kényelmet biztosít finomkötött felsőkkel és blézerekkel.',
          isReplacement: false,
          searchKeywords: 'womens high waist wide leg wool trousers noi gyapju nadrag'
        });
      }
      if (!hasWhiteShirt) {
        candidatePool.push({
          id: 'gap-female-silk-blouse',
          title: 'Törtfehér 100% Hernyóselyem Blúz (Silk Crepe)',
          recommendedFit: 'Relaxed tailored',
          priorityScore: 88,
          priorityLevel: 'Fontos Kapszula Bázis',
          impact: '+9 Kifinomult Smart Szett',
          estimatedPrice: '24 000 - 48 000 Ft',
          category: 'tops',
          season: 'Egész évben',
          reason: 'Prémium természetes esésű bázisdarab, ami zakó alatt és önmagában is rendkívül elegáns.',
          isReplacement: false,
          searchKeywords: 'womens silk blouse tortfeher selyem bluz'
        });
      }
    } else {
      // Felnőtt Férfi
      if (!hasBoots) {
        candidatePool.push({
          id: 'gap-chelsea-boots',
          title: 'Sötétbarna Full-Grain Bőr Chelsea Csizma',
          recommendedFit: 'Classic last / True to size',
          priorityScore: 98,
          priorityLevel: 'Kritikus Alapdarab',
          impact: '+12 Új Őszi/Téli Outfit Variáció',
          estimatedPrice: '45 000 - 85 000 Ft',
          category: 'shoes',
          season: 'Ősz / Tél',
          reason: 'A ruhatár legfontosabb hiányzó őszi-téli sarokköve: vízálló, elegáns és tökéletesen működik flanelnadrággal és gyapjúkabáttal.',
          isReplacement: false,
          searchKeywords: 'mens dark brown leather chelsea boots ferfi bor csizma'
        });
      }
      if (!hasNavyBlazer) {
        candidatePool.push({
          id: 'gap-navy-hopsack-blazer',
          title: 'Sötétkék Olasz Gyapjú Hopsack Zakó (Unstructured)',
          recommendedFit: 'Slim tailored / Neapolitan shoulder',
          priorityScore: 95,
          priorityLevel: 'Kritikus Alapdarab',
          impact: '+14 Sokoldalú Smart & Business Szett',
          estimatedPrice: '55 000 - 110 000 Ft',
          category: 'outerwear',
          season: 'Egész évben',
          reason: 'A leguniverzálisabb kulcsdarab: lélegző, gyűrődésálló szövésű, inggel és pamut pólóval is tartást ad.',
          isReplacement: false,
          searchKeywords: 'mens navy wool hopsack blazer ferfi sotetkek zakó'
        });
      }
      if (!hasFlannelTrousers && !hasChinos) {
        candidatePool.push({
          id: 'gap-flannel-trousers',
          title: 'Sötétszürke Olasz Gyapjú Flanel Nadrág',
          recommendedFit: 'Slim tailored / Tapered',
          priorityScore: 90,
          priorityLevel: 'Fontos Kapszula Bázis',
          impact: '+8 Új Őszi/Téli Outfit Variáció',
          estimatedPrice: '28 000 - 52 000 Ft',
          category: 'bottoms',
          season: 'Ősz / Tél',
          reason: 'Meleg és strukturált eleganciát nyújt a hideg évszakokban.',
          isReplacement: false,
          searchKeywords: 'mens slim fit charcoal wool flannel trousers gyapju nadrag'
        });
      }
      if (!hasOxfordShirt) {
        candidatePool.push({
          id: 'gap-oxford-shirt',
          title: 'Világoskék Oxford Pamut Gombolós Gallérú Ing (OCBD)',
          recommendedFit: 'Slim tailored / Button-down collar',
          priorityScore: 89,
          priorityLevel: 'Fontos Kapszula Bázis',
          impact: '+11 Új Smart Casual Szett',
          estimatedPrice: '16 000 - 32 000 Ft',
          category: 'tops',
          season: 'Egész évben',
          reason: 'A casual elegancia kötelező alapja: kigombolt gallérral, zakó vagy pulóver alatt is hibátlan textúrát nyújt.',
          isReplacement: false,
          searchKeywords: 'mens light blue oxford cotton button down shirt kek oxford ing'
        });
      }
    }
  }

  // Szabályszűrés (egyéni tiltások kizárása)
  const filtered = candidatePool.filter(g => {
    const titleLower = g.title.toLowerCase();
    if ((rulesLower.includes('pólóing') || rulesLower.includes('polo')) && (g.id.includes('polo') || titleLower.includes('pólóing'))) return false;
    if (rulesLower.includes('fehér nadrág') && g.category === 'bottoms' && titleLower.includes('fehér')) return false;
    if ((rulesLower.includes('nem szeretem a fehér') || rulesLower.includes('fehér tilos')) && titleLower.includes('fehér nadrág')) return false;
    if (rulesLower.includes('skinny') && g.recommendedFit.toLowerCase().includes('skinny')) return false;
    return true;
  });

  return filtered.sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0)).slice(0, 8);
}

/**
 * 5. Saját Szett Összeállítása & Sartorial AI Audit (Manual Outfit Auditor)
 */
export async function auditManualOutfit({ items = [], eventName = '', weather = null, styleProfile = {} }) {
  const apiKey = getGeminiApiKey();

  if (apiKey && items.length > 0) {
    try {
      const customRules = Array.isArray(styleProfile.customStylingRules) && styleProfile.customStylingRules.length > 0
        ? styleProfile.customStylingRules
        : [];
      const demographics = getProfileDemographics(styleProfile);
      const demographicInstructions = getDemographicSartorialInstructions(demographics, styleProfile);
      const dynamicSartorialRules = formatRulesForPrompt(null, demographics);

      const isSpecificEvent = Boolean(eventName && eventName.trim() && eventName !== 'Általános Megjelenés');
      const eventPromptContext = isSpecificEvent
        ? `ESEMÉNY / ALKALOM: "${eventName.trim()}"
Vizsgáld meg a szett formai szintjét, dress code normáit és kulturális alkalmasságát ehhez a megadott eseményhez!`
        : `ESEMÉNY / ALKALOM: Nincs rögzítve konkrét esemény (önálló, mindennapi / stílusos megjelenés).
FONTOS: Ne erőltess rá semmilyen merev alkalmi dress code-ot vagy protokollt! A vizsgálat fókusza a választott darabok belső esztétikai harmóniája, a színek és textúrák egymásra hatása, az anatómiai rétegrend, valamint a felhasználó személyes Stílus DNS-éhez és az aktuális időjárási hőmérséklethez való illeszkedése.`;

      const hasWeatherMention = Boolean(
        weather && 
        eventName && 
        typeof eventName === 'string' && 
        /\b(időjárás|fok|°c|meleg|hideg|hűvös|eső|esős|hó|fagy|napsütés|szél|nyár|tél|ősz|tavasz|vihar|zápor|fagyos)\b/i.test(eventName)
      );

      const weatherPromptContext = hasWeatherMention
        ? `HELYSZÍN ÉS IDŐJÁRÁS: ${weather?.city || 'Budapest'}, ${weather?.temperature ?? 21}°C, ${weather?.condition || 'Kellemes'}. Vedd figyelembe a megadott időjárási hőmérsékletet!`
        : `IDŐJÁRÁS: A felhasználó nem specifikált külső időjárási körülményt ehhez az összeállításhoz. A vizsgálat fókusza kizárólag a darabok stílusösszhangja, a sziluett, az arányok, a színek és az anyagharmónia. TILOS külső időjárási körülményre vagy feltételezett hőmérsékletre hivatkozva levonni pontot!`;

      const prompt = `Te egy mester személyi stylist, szín- és aránytanácsadó, valamint stílusszakértő vagy. Kerüld a "sartorial" kifejezés használatát a válaszaidban, helyette használj természetes magyar kifejezéseket (stílusos, elegáns, kifinomult, harmonikus)!
A felhasználó saját maga állított össze egy szettet a meglévő ruhatárából.

A FELADATOD: Végezz professzionális, építő jellegű Stílus- és Összhang Auditot a szettre a felhasználó személyes profilja, Stílus DNS-e és az alábbi paraméterek alapján!

DEMOGRÁFIAI PROFIL ÉS KORCSOPORT SZABÁLYOK:
- Felhasználó kategóriája: ${demographics.gender} (${demographics.age} éves, ${demographics.bracketDescription})
${demographicInstructions}

FELHASZNÁLÓ STÍLUSPROFILJA (100%-ban érvényesítendő):
- Preferált Stílusirányzatok: ${JSON.stringify(styleProfile.preferredStyles || (demographics.isFemale ? ['Klasszikus & Nőies', 'Smart Casual'] : ['Klasszikus & Időtlen', 'Smart Casual']))}
- Stílusfilozófia: "${styleProfile.stylePhilosophy || 'Kifinomult harmónia, prémium kényelmes anyagok és stílusos megjelenés'}"
- Kedvenc Színpaletta: ${styleProfile.favoriteColors && styleProfile.favoriteColors.length > 0 ? JSON.stringify(styleProfile.favoriteColors) : 'Nincs rögzítve (Alkalmazz természetes harmóniát)'}
- Testalkat és Magasság: ${styleProfile.bodyType || 'Normál'}${styleProfile.height ? `, ${styleProfile.height}` : ''}${styleProfile.skinTone ? ` (${styleProfile.skinTone})` : ''}
- Öltözködési Hőérzet & Komfort: ${styleProfile.thermalPreference === 'coldSensitive' ? 'Fázósabb alkat (hűvösben melegebb textúrák, finomkötöttek és rétegek előnyben)' : styleProfile.thermalPreference === 'warmSensitive' ? 'Melegkedvelő alkat (könnyed, szellős pamut/len preferálása)' : 'Kiegyensúlyozott / Normál hőérzet'}

🚫 FELHASZNÁLÓ EGYÉNI SZABÁLYAI & TILTÁSAI (Ha a választott szettben ezek bármelyike sérül, jelezd a figyelmeztetésben és a tanácsokban!):
${customRules.length > 0 ? customRules.map(r => `• ${r}`).join('\n') : 'Nincsenek külön rögzített tiltások.'}

👔 AKTÍV STÍLUS- ÉS RÉTEGEZÉSI SZABÁLYZAT:
${dynamicSartorialRules}

${eventPromptContext}
${weatherPromptContext}

A FELHASZNÁLÓ ÁLTAL ÖSSZEVÁLOGATOTT DARABOK (${items.length} db):
${formatWardrobeToCompactCatalog(items)}

SZEMPONTOK AZ AUDITHOZ:
1. 🎯 Stílus- & Esemény összhang: ${isSpecificEvent ? 'Illik-e az esemény dress code-jához?' : 'Harmonikus-e a szett általános stílusvilága és önazonossága?'}
   - LAZA / CASUAL / STREETWEAR SZETTEKNÉL: Egy minőségi póló + nadrág + sneaker összeállítás 100%-ban teljes értékű szett! TILOS kötelezően zakót, blézert vagy nyakkendőt erőltetni, ha a szett laza jellegű!
2. 👔 Gallér- és Ujj-Harmónia:
   - Állógalléros ing + zárt kötött pulóver vagy klasszikus hajtókás zakó: DISSZONÁNS!
   - Rövid ujjú kötött pulóver + alatta rövid ujjú póló: KETTŐS UJJVÉG HIBA!
   - Garbó + alatta galléros ing: DISSZONÁNS! (A garbó önmagában bázis).
   - Ingdzseki (Shacket) + alatta klasszikus galléros ing: DISSZONÁNS! (Kettős gallér és gombsor).
3. 🧦 Lábbeli, Zokni & Harisnya Harmónia:
   - Ha van zokni vagy harisnya, illeszkedik-e a cipőhöz és az alsórészhez (hossz, szín, textúra, denier)?
   - Ha a felhasználó kifejezetten meleg időt adott meg (>= 19°C), kerülendők a vastag téli csizmák és bélelt bakancsok; hűvösben szellős vászon helyett zártabb lábbeli ajánlott.
4. 🎗️ Kiegészítők & Részletek (Öv, Karóra, Táska, Ékszer):
   - Az öv színe és textúrája harmonizál-e a cipővel? A karóra fém- vagy bőrszíja támogatja-e az összképet?
5. 👗 Egyberuha / Sziluett Arányok (ha szerepel):
   - Egyberuha esetén a sziluett arányai és a kiegészítők (cipő, táska, öv, kabát) egyensúlya.
6. 🎨 Színharmónia & Kontraszt: Hideg/meleg tónusok, 3-szín szabály érvényesülése.
7. 🧵 Anyagok & Textúrák szinergiája: Természetes szálak és textúrák találkozása.
8. 🧥 ${hasWeatherMention ? `Anatómiai rétegezés & Időjárási alkalmasság a megadott ${weather?.temperature ?? 21}°C-hoz.` : 'Anatómiai rétegezés & sziluett egyensúly (bázis felső, köztes réteg, külső réteg viszonya).'}

VÁLASZOLJ KIZÁRÓLAG ÉRVÉNYES JSON FORMÁTUMBAN:
{
  "score": 88,
  "verdict": "Kifejezetten Kifinomult / Apró Korrekciót Igénylő Összeállítás / Harmonikus Szett",
  "eventAlignment": "Részletes, szabatos összefoglaló a stílusösszhangról és az alkalmasságról",
  "colorHarmony": "A színek és árnyalatok kölcsönhatásának értékelése",
  "fabricSynergy": "Az anyagok és textúrák találkozásának értékelése",
  "layeringEvaluation": "A rétegezés és a sziluett egyensúly elemzése",
  "bodyFitVerdict": "Hogyan támogatja a szett a testalkatot és a személyes arányokat",
  "strengths": [
    "Az összeállítás elemei jól kiegészítik egymást és kényelmes mozgást biztosítanak"
  ],
  "suggestions": [
    "Hűvösebb idő esetén vegyél fel egy kényelmes kardigánt vagy kabátot"
  ],
  "fitMismatchWarning": null
}`;

      const contents = [{ parts: [{ text: prompt }] }];
      const parsed = await callGeminiApi({
        apiKey,
        contents,
        preferredModels: REASONING_MODELS,
        timeoutMs: 22000
      });

      const temp = typeof weather?.temperature === 'number' ? weather.temperature : 22;
      const hasBootInWarmWeather = hasWeatherMention && temp >= 19 && items.some(i => isHeavyBoot(i));

      // Deterministic Sartorial Checks for Manual Selection
      const hasStandCollarShirt = items.some(i => (i.category === 'tops' || (i.name || '').toLowerCase().includes('ing')) && isStandCollar(i));
      const hasClosedSweater = items.some(i => isClosedSweater(i));
      const hasClassicBlazer = items.some(i => isClassicBlazer(i));
      const hasShortSleeveKnit = items.some(i => (i.category === 'knitwear' || (i.name || '').toLowerCase().includes('pulóver')) && isShortSleeve(i));
      const hasShortSleeveTee = items.some(i => i.category === 'tops' && isShortSleeve(i) && !isStandCollar(i));
      const hasTurtleneck = items.some(i => isTurtleneck(i));
      const hasCollaredShirtUnderTurtleneck = hasTurtleneck && items.some(i => i.category === 'tops' && (i.name || '').toLowerCase().includes('ing'));

      const strengths = Array.isArray(parsed?.strengths) && parsed.strengths.length > 0
        ? parsed.strengths
        : ['Jól megválasztott alapdarabok a gardróbodból.'];

      const suggestions = Array.isArray(parsed?.suggestions) ? [...parsed.suggestions] : [];
      let penalty = 0;
      let fitMismatchWarning = parsed?.fitMismatchWarning || null;

      // Stand collar clash check
      if (hasStandCollarShirt && hasClosedSweater) {
        penalty += 15;
        suggestions.unshift('Az állógalléros ing (mandarin/band collar) nem illik zárt kerek- vagy V-nyakú kötött pulóver alá, mert gyűrődik a kötött szegély alatt. Hordd önmagában vagy nyitott kardigánnal!');
        if (!fitMismatchWarning) {
          fitMismatchWarning = '⚠️ Gallér-összhang hiba: Az állógalléros ing nem illik zárt pulóver alá.';
        }
      }

      if (hasStandCollarShirt && hasClassicBlazer) {
        penalty += 12;
        suggestions.unshift('Az állógalléros ing klasszikus hajtókás zakóval stilisztikailag ütközik. Hagyományos zakóhoz válassz klasszikus galléros (Spread/Button-down) inget!');
        if (!fitMismatchWarning) {
          fitMismatchWarning = '⚠️ Gallér-hajtóka hiba: Az állógalléros ing klasszikus hajtókás zakóval disszonáns.';
        }
      }

      // Short sleeve knitwear + short sleeve tee clash
      if (hasShortSleeveKnit && hasShortSleeveTee) {
        penalty += 14;
        suggestions.unshift('Rövid ujjú kötött pulóver alá nem javasolt rövid ujjú pólót venni, mert a póló ujja kilóg vagy megvastagítja a pulóver ujját. Viseld közvetlenül a bőrön vagy ujjatlan bázissal!');
        if (!fitMismatchWarning) {
          fitMismatchWarning = '⚠️ Ujjak rétegzési hibája: Rövid ujjú kötött felső alá ne vegyél rövid ujjú pólót!';
        }
      }

      // Turtleneck + collared shirt clash
      if (hasCollaredShirtUnderTurtleneck) {
        penalty += 16;
        suggestions.unshift('A garbó önmagában képez elegáns bázist, galléros inget nem veszünk alá. Viseld a garbót önálló felsőként a zakó vagy kabát alatt!');
        if (!fitMismatchWarning) {
          fitMismatchWarning = '⚠️ Rétegezési hiba: Garbó alá nem veszünk galléros inget.';
        }
      }

      // Shacket / Overshirt + collared shirt clash
      const hasShacketInAudit = items.some(i => isShacket(i));
      const hasCollaredShirtInAudit = items.some(i => isCollaredShirt(i));
      if (hasShacketInAudit && hasCollaredShirtInAudit) {
        penalty += 15;
        suggestions.unshift('Ingdzseki (Shacket / Overshirt) alá nem veszünk fel még egy hagyományos galléros inget (kettős inggallér és gombsor stílushiba). Cseréld az inget prémium pamut pólóra, vékony finomkötött kereknyakúra vagy merinó garbóra!');
        if (!fitMismatchWarning) {
          fitMismatchWarning = '⚠️ Kettős inggallér hiba: Ingdzseki alá nem illik klasszikus galléros ing.';
        }
      }

      // Warm weather boot warning
      if (hasBootInWarmWeather && !suggestions.some(s => s.toLowerCase().includes('loafer') || s.toLowerCase().includes('cipő') || s.toLowerCase().includes('csizma'))) {
        suggestions.unshift(`A(z) ${temp}°C-os meleg időben az őszi/téli bokacipő túl meleg lehet. Cseréld le egy szellősebb bőr loaferre vagy könnyű sneakerre!`);
        if (!fitMismatchWarning) {
          fitMismatchWarning = `⚠️ Hőmérsékleti észrevétel: A(z) ${temp}°C-os meleg időben a zárt őszi bokacipő/csizma helyett egy könnyű bőr loafer vagy szellős félcipő kényelmesebb és stílusosabb.`;
        }
      }

      if (suggestions.length === 0) {
        suggestions.push('Viseld magabiztosan, a szett elemei jól kiegészítik egymást!');
      }

      const calculatedScore = Math.max(45, Math.min(100, (typeof parsed?.score === 'number' ? parsed.score : 85) - penalty));

      const cleanText = (txt) => {
        if (!txt || typeof txt !== 'string') return txt;
        return txt
          .replace(/\bsartorial\s+szempontb[oó]l\b/gi, 'stílusszempontból')
          .replace(/\bsartorial\s+eleganci[aá][t]?\b/gi, 'klasszikus eleganciát')
          .replace(/\bsartorialis\b/gi, 'stílusos')
          .replace(/\bsartoriális\b/gi, 'stílusos')
          .replace(/\bsartorial\b/gi, 'stílusos')
          .replace(/\bSartorial\b/gi, 'Stílus');
      };

      return {
        ...parsed,
        score: calculatedScore,
        verdict: cleanText(penalty > 0 && calculatedScore < 75 ? 'Korrekciót Igénylő Összeállítás' : (parsed?.verdict || 'Harmonikus Összeállítás')),
        eventAlignment: cleanText(parsed?.eventAlignment || ''),
        colorHarmony: cleanText(parsed?.colorHarmony || ''),
        fabricSynergy: cleanText(parsed?.fabricSynergy || ''),
        layeringEvaluation: cleanText(parsed?.layeringEvaluation || ''),
        bodyFitVerdict: cleanText(parsed?.bodyFitVerdict || ''),
        strengths: strengths.map(cleanText),
        suggestions: suggestions.map(cleanText),
        fitMismatchWarning: cleanText(fitMismatchWarning)
      };
    } catch (e) {
      console.error('Hiba a manuális szett auditálásakor:', e);
      throw e;
    }
  }

  throw new Error('Nincs beállítva Gemini API kulcs vagy üres a szett!');
}

/**
 * 6. Szabad Szöveges Személyes AI Master Stylist Chat
 */
export async function chatWithMasterStylist({ messages = [], wardrobe = [], styleProfile = {}, weather = null, apiKey = null }) {
  const cleanKey = (apiKey || getGeminiApiKey() || '').trim();

  if (!cleanKey) {
    throw new Error('Nincs érvényes Gemini API kulcs! Kérlek add meg a Beállításokban.');
  }

  const activeApiKey = cleanKey;

  try {
    const customRules = Array.isArray(styleProfile.customStylingRules) && styleProfile.customStylingRules.length > 0
      ? styleProfile.customStylingRules
      : [];
    const demographics = getProfileDemographics(styleProfile);
    const demographicInstructions = getDemographicSartorialInstructions(demographics, styleProfile);
    const dynamicSartorialRules = formatRulesForPrompt(null, demographics);

    const systemInstruction = `Te egy világklasszis, közvetlen, empatikus és rendkívül sokoldalú Mester Személyi Stylist vagy.
A felhasználóval beszélgetsz, aki tanácsot kérhet tőled szettekről, konkrét ruhadarabjainak viseléséről, stílustrendekről, gardrób-bővítésről vagy esemény-specifikus megjelenésről.

A LEGFONTOSABB SZUPERERŐD:
Teljes mélységében ismered a felhasználó SAJÁT DIGITÁLIS RUHATÁRÁT, SZEMÉLYES DEMOGRÁFIAI PROFILJÁT ÉS EGYÉNI SZABÁLYAIT!

DEMOGRÁFIAI PROFIL ÉS KORCSOPORT SZABÁLYOK:
- Felhasználó neme és korcsoportja: ${demographics.genderLabel} (${demographics.age} éves, ${demographics.bracketDescription})
${demographicInstructions}

FELHASZNÁLÓ STÍLUSPROFILJA:
- Preferált Stílusirányzatok: ${JSON.stringify(styleProfile.preferredStyles || (demographics.isFemale ? ['Klasszikus & Nőies', 'Smart Casual', 'Letisztult Minimalizmus'] : ['Klasszikus & Időtlen', 'Smart Casual', 'Letisztult Minimalizmus']))}
- Stílusfilozófia: "${styleProfile.stylePhilosophy || 'Kifinomult harmónia, minőségi anyagok és önazonos megjelenés'}"
- Kedvenc Színpaletta: ${styleProfile.favoriteColors && styleProfile.favoriteColors.length > 0 ? JSON.stringify(styleProfile.favoriteColors) : 'Nincs rögzítve (Alkalmazz a ruhatárhoz illő természetes harmóniát)'}
- Testalkat és Magasság: ${styleProfile.bodyType || 'Természetes'}${styleProfile.height ? `, ${styleProfile.height}` : ''}${styleProfile.skinTone ? ` (${styleProfile.skinTone})` : ''}
- Öltözködési Hőérzet: ${styleProfile.thermalPreference === 'coldSensitive' ? 'Fázósabb' : styleProfile.thermalPreference === 'warmSensitive' ? 'Melegkedvelő' : 'Normál'}
${styleProfile.shoeSize || styleProfile.topSize || styleProfile.pantSize ? `- Méretek: ${[styleProfile.shoeSize ? `Cipő: ${styleProfile.shoeSize}` : '', styleProfile.topSize ? `Felső: ${styleProfile.topSize}` : '', styleProfile.pantSize ? `Nadrág: ${styleProfile.pantSize}` : ''].filter(Boolean).join(', ')}` : ''}

🚫 FELHASZNÁLÓ EGYÉNI SZABÁLYAI & TILTÁSAI (MINDIG SZIGORÚAN TARTSD BE!):
${customRules.length > 0 ? customRules.map(r => `• ${r}`).join('\n') : 'Nincsenek külön tiltások rögzítve.'}

👔 AKTÍV SARTORIAL HARMÓNIA- ÉS RÉTEGEZÉSI SZABÁLYZAT:
${dynamicSartorialRules}

A FELHASZNÁLÓ TELJES RUHATÁRI KATALÓGUSA (${wardrobe.length} db darab):
${formatWardrobeToCompactCatalog(wardrobe)}

🛡️ TÉMAFÜGGETLENSÉGI ÉS KONTEXTUS-VÉDELMI SZABÁLY (TOPIC BOUNDARY GUARD):
1. Minden egyes új felhasználói kérdést KIZÁRÓLAG abból a konkrét témából, eseményből és leírásból értelmezz, amit a felhasználó a saját aktuális üzenetében kifejezetten leír vagy megkérdez!
2. SZIGORÚAN TILOS a korábbi, eltérő témájú üzenetekből vagy a rendszer alapértelmezett időjárás/helyszín kontextusából (pl. korábbi városok, korábbi időjárás, korábbi alkalmak) feltételezéseket, korlátokat vagy helyszíneket áthozni az új kérdésre, hacsak a felhasználó azt kifejezetten nem kéri vagy nem említi!
3. Időjárást és helyszínt KIZÁRÓLAG akkor vegyél figyelembe, ha a felhasználó a kérdésében kifejezetten rákeres/megemlíti azt (pl. "Mit vegyek fel holnap?", "Esős időre mit ajánlasz?", "Utazom Londonba"), vagy ha az aktuális kérdése kifejezetten időjárás-függő öltözködésre irányul. Ha a kérdés általános stílustanács, rétegezés, ruha-kombináció vagy vásárlási tanács, a válasz fókuszáljon szigorúan a kért kérdésre!

🏷️ INTERAKTÍV RUHA-HIVATKOZÁSOK (ITEM CARD EMBEDDING):
Amikor a felhasználó ruhatárából konkrét darabokat javasolsz vagy említesz a válaszodban, a ruha neve mellett vagy a pontban MINDIG szúrd be a darab ID azonosító tokenjét a következő formátumban: {{item:ID}} (például: **Kényelmes Pamut Nadrág** {{item:w1}}).
Ez lehetővé teszi, hogy a felület interaktív, megtekinthető fotós ruhakártyaként jelenítse meg a darabot a felhasználónak.

🎯 VÁSÁRLÁSI ÉS GARDRÓB-BŐVÍTÉSI DÖNTÉSI PROTOKOLL (GAP & ZERO-REDUNDANCY AUDIT):
Ha a felhasználó új darab vásárlásáról, színválasztásról vagy hiánypótlásról kérdez (pl. "Milyen színű X darabot vegyek? Szürke, navy vagy bézs?"):
1. KÖTELEZŐ 1. LÉPÉS - KATEGÓRIA-SZINTŰ DUPLIKÁCIÓ SZŰRÉS (Zero-Redundancy Rule):
   - Mielőtt színt vagy fazont javasolsz, alaposan vizsgáld meg a felhasználó [CATALOG]-jában a kérdéses főkategóriát (cat) és alkategóriát (sub)!
   - Ha egy adott szín-anyag kombináció (pl. Homokbézs merinó kötöttáru) már létezik a ruhatárban, azt a színt SOHA NE tedd első helyre, kivéve, ha a felhasználó kifejezetten a meglévő darab cseréjét kéri!
   - A javaslatnak valódi funkcionális és kromatikus űrt (GAP) kell betöltenie az adott kategórián belül.
2. KROMATIKUS ŰR ELEMZÉS (Color Gap Analysis):
   - Azokat a színeket priorizáld legmagasabbra, amelyek:
     a) Illeszkednek a felhasználó színpalettájához és évszaktípusához,
     b) Harmonizálnak a meglévő nadrágokkal/zakókkal,
     c) DE JELENLEG TELJESEN HIÁNYOZNAK a kérdéses ruhakategóriából (pl. Navy kötöttáru hiánya, ha 0 db van belőle a kötöttáruk között)!
3. DÖNTÉSI PRIORITÁSI SORREND:
   1. Kategórián belüli Gap/Redundancia audit (Ne duplikálj meglévő színt a célkategóriában!)
   2. Színtípus / Paletta illeszkedés
   3. Kombinálhatóság a domináns alsókkal/felsőkkel

STÍLUS ÉS KOMMUNIKÁCIÓS IRÁNYELVEK:
1. Válaszolj közvetlen, barátságos, segítőkész és emberi magyar nyelven!
2. SZIGORÚAN TILOS nyers JSON, kódblokk vagy kulcs-érték struktúra (pl. { "top_missing_color": ... }) formátumban válaszolnod! Mindig igényes, szép Markdown folyó szöveget írj!
3. Amikor konkrét összeállítást javasolsz, MINDIG a felhasználó valós ruhatárából válassz konkrét darabokat a pontos nevükkel és az {{item:ID}} hivatkozással!
4. Ha a felhasználó egy új darab vásárlásáról vagy hiányzó ruháról kérdez, javasolj valódi kapszula hiánypótló darabot a meglévő ruhatára és korosztálya/neme alapján, és magyarázd el, miért éri meg beszerezni.
5. Rugalmas & Tanuló Profil: Alkalmazkodj a felhasználó stílusához (mindennapi kényelem, smart casual, streetwear, klasszikus elegancia) és ne erőltess formális darabokat laza alkalmakra!
6. Használj elegáns markdown formázást (félkövér kiemelések, felsorolások, bekezdések).`;

    // Convert chat history into Gemini contents format (sliding window: last 8 messages)
    const contents = [
      {
        role: 'user',
        parts: [{ text: `[KONTEXTUS ÉS RENDSZER UTASÍTÁS]:\n${systemInstruction}\n\nKérlek erősítsd meg, hogy felkészültél a személyes stílustanácsadásra!` }]
      },
      {
        role: 'model',
        parts: [{ text: 'Természetesen! Teljes mélységében áttekintettem a ruhatáradat, a stílusprofilodat és a személyes preferenciáidat. Készen állok, miben segíthetek ma?' }]
      }
    ];

    const recentMessages = messages.slice(-8);
    for (const msg of recentMessages) {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      });
    }

    const response = await callGeminiApi({
      apiKey: activeApiKey,
      contents,
      temperature: 0.65,
      expectJson: false,
      preferredModels: REASONING_MODELS,
      timeoutMs: 25000
    });

    if (typeof response === 'string') {
      return formatStylistJsonToMarkdown(response);
    }
    if (response && response.text) {
      return formatStylistJsonToMarkdown(response.text);
    }
    if (response && response.content) {
      return formatStylistJsonToMarkdown(response.content);
    }
    return formatStylistJsonToMarkdown(response);
  } catch (e) {
    console.error('Hiba a Master Stylist chat során:', e);
    throw e;
  }
}

/**
 * 7. Intelligens Formázó: Nyers JSON Stylist válaszok átalakítása elegáns, emberbarát Markdown szöveggé
 */
export function formatStylistJsonToMarkdown(data) {
  if (!data) return '';
  let obj = data;
  if (typeof data === 'string') {
    const trimmed = data.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        obj = JSON.parse(trimmed);
      } catch (_) {
        return data;
      }
    } else {
      return data;
    }
  }

  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return typeof data === 'string' ? data : JSON.stringify(data);
  }

  let md = '';

  // 1. Missing colors / top advice
  if (obj.top_missing_color || obj.secondary_missing_colors) {
    md += `### 🎨 Színpaletta & Hiányzó Árnyalatok\n\n`;
    if (obj.top_missing_color) {
      md += `**Legfontosabb hiányzó szín:** ${obj.top_missing_color}\n\n`;
    }
    if (Array.isArray(obj.secondary_missing_colors) && obj.secondary_missing_colors.length > 0) {
      md += `**További ajánlott színek:**\n`;
      obj.secondary_missing_colors.forEach(c => {
        md += `• ${c}\n`;
      });
      md += `\n`;
    }
  }

  // 2. Color analysis context
  if (obj.color_analysis_context) {
    md += `**Színtípus & Altónus Kontextus:**\n${obj.color_analysis_context}\n\n`;
  }

  // 3. Detailed Stylist verdict
  if (obj.stylist_detailed_verdict) {
    md += `### 👔 Mester Stylist Szakvélemény\n${obj.stylist_detailed_verdict}\n\n`;
  }

  // 4. Why this is the best investment
  if (Array.isArray(obj.why_this_is_the_best_investment) && obj.why_this_is_the_best_investment.length > 0) {
    md += `**Miért a legjobb választás a ruhatáradhoz?**\n`;
    obj.why_this_is_the_best_investment.forEach(w => {
      md += `• ${w}\n`;
    });
    md += `\n`;
  }

  // 5. Suggested outfits
  if (Array.isArray(obj.suggested_outfits_with_the_new_piece) && obj.suggested_outfits_with_the_new_piece.length > 0) {
    md += `### ✦ Szett-Ötletek a Meglévő Darabjaiddal\n\n`;
    obj.suggested_outfits_with_the_new_piece.forEach((outfit, idx) => {
      md += `**${idx + 1}. ${outfit.outfit_name || 'Összeállítás'}**\n`;
      if (outfit.base) md += `• 👔 **Bázis:** ${outfit.base}\n`;
      if (outfit.bottom) md += `• 👖 **Alsó:** ${outfit.bottom}\n`;
      if (outfit.shoes) md += `• 👞 **Lábbeli:** ${outfit.shoes}\n`;
      if (outfit.belt) md += `• 🎗️ **Öv:** ${outfit.belt}\n`;
      if (outfit.layer) md += `• 🧥 **Réteg:** ${outfit.layer}\n`;
      md += `\n`;
    });
  }

  // 6. Buying recommendation
  if (obj.buying_recommendation && typeof obj.buying_recommendation === 'object') {
    md += `### 🛍️ Vásárlási Útmutató\n`;
    if (obj.buying_recommendation.material) md += `• **Ajánlott anyag:** ${obj.buying_recommendation.material}\n`;
    if (obj.buying_recommendation.fit) md += `• **Ideális szabás:** ${obj.buying_recommendation.fit}\n`;
    if (obj.buying_recommendation.neckline) md += `• **Kialakítás / Nyakrész:** ${obj.buying_recommendation.neckline}\n`;
  }

  // General fallback for other keys
  if (!md) {
    for (const [k, v] of Object.entries(obj)) {
      const formattedKey = k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      if (typeof v === 'string') {
        md += `**${formattedKey}:** ${v}\n\n`;
      } else if (Array.isArray(v)) {
        md += `**${formattedKey}:**\n` + v.map(i => `• ${typeof i === 'object' ? JSON.stringify(i) : i}`).join('\n') + '\n\n';
      }
    }
  }

  return md.trim();
}
