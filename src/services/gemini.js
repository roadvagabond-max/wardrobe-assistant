// Advanced Google Gemini Vision & Fashion Stylist Intelligence Engine
import { ensureBase64Image } from './imageOptimizer';
import { normalizeBrandName } from './webshop';
import { formatRulesForPrompt } from './sartorialRules';

export const getGeminiApiKey = () => {
  const localKey = (localStorage.getItem('GEMINI_API_KEY') || '').trim();
  if (localKey) return localKey;

  const envKey = (import.meta.env.VITE_GEMINI_API_KEY || '').trim();
  if (envKey) return envKey;

  return '';
};

export const isGeminiConfigured = (providedKey = null) => {
  const key = (providedKey || getGeminiApiKey() || '').trim();
  return Boolean(key && key.length >= 10);
};

/**
 * Test a Gemini API key with a fast ping to verify credentials
 */
export async function testGeminiApiKey(testKey) {
  const cleanKey = (testKey || getGeminiApiKey() || '').trim();
  if (!cleanKey) {
    return { success: false, message: 'Nincs megadva API kulcs!' };
  }
  try {
    const res = await callGeminiApi({
      apiKey: cleanKey,
      contents: [{ role: 'user', parts: [{ text: 'Ping! Respond in JSON: {"status": "ok"}' }] }],
      preferredModels: FAST_MODELS,
      timeoutMs: 8000,
      expectJson: true
    });
    return { success: true, message: '✓ Sikeres kapcsolat a Google Gemini AI-val!' };
  } catch (err) {
    return { success: false, message: err.message || 'Nem sikerült csatlakozni a Geminihez.' };
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
 * Robust, self-healing JSON parser for AI outputs
 * Handles markdown backticks, trailing commas, unclosed brackets, and truncated JSON arrays.
 */
function safeParseJson(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;

  // 1. Remove markdown fences
  let clean = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  // Try direct parse first
  try {
    return JSON.parse(clean);
  } catch (_) { }

  // 2. Extract JSON structure via regex
  const jsonMatch = clean.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (_) {
      clean = jsonMatch[0];
    }
  }

  // 3. Attempt Self-Healing for Truncated JSON (e.g. cut off near end of token limit)
  try {
    // If it started as an array
    if (clean.trim().startsWith('[')) {
      // Find last completely closed object '}'
      const lastClosedObjIndex = clean.lastIndexOf('}');
      if (lastClosedObjIndex !== -1) {
        const repairedArray = clean.slice(0, lastClosedObjIndex + 1) + ']';
        return JSON.parse(repairedArray);
      }
    }

    // If it started as an object
    if (clean.trim().startsWith('{')) {
      let openBrackets = (clean.match(/\{/g) || []).length;
      let closeBrackets = (clean.match(/\}/g) || []).length;
      let repairedObj = clean;

      // Close open string quotes if odd count
      const quoteCount = (repairedObj.match(/"/g) || []).length;
      if (quoteCount % 2 !== 0) repairedObj += '"';

      while (openBrackets > closeBrackets) {
        repairedObj += '}';
        closeBrackets++;
      }
      return JSON.parse(repairedObj);
    }
  } catch (healErr) {
    console.warn('JSON self-healing nem sikerült:', healErr);
  }

  throw new Error(`Nem sikerült érvényes JSON-t olvasni az AI válaszból.`);
}

/**
 * Universal Gemini API caller with fast-timeout fallback and robust JSON parsing
 */
export async function callGeminiApi({ apiKey, contents, preferredModels = FAST_MODELS, timeoutMs = 8000, maxOutputTokens = 8192, temperature = 0.2, tools = null, expectJson = true }) {
  const cleanKey = (apiKey || '').trim();
  if (!cleanKey) {
    throw new Error('Nincs érvényes Google Gemini API kulcs! Kérlek add meg a Beállítások menüben.');
  }

  let lastError = null;

  // Prioritize previously successful model if it exists in preferred list for zero-latency calls
  const modelsToTry = activeFastModel && preferredModels.includes(activeFastModel)
    ? [activeFastModel, ...preferredModels.filter(m => m !== activeFastModel)]
    : preferredModels;

  for (const model of modelsToTry) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const isBearerAuth = cleanKey.startsWith('AQ.') || cleanKey.startsWith('ya29.');

      const url = isBearerAuth
        ? `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
        : `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(cleanKey)}`;

      const requestBody = {
        contents,
        generationConfig: {
          maxOutputTokens,
          temperature
        }
      };

      // Google API rule: If tools are used or expectJson is false, do not force application/json
      if (expectJson && (!tools || tools.length === 0)) {
        requestBody.generationConfig.responseMimeType = "application/json";
      } else if (tools && tools.length > 0) {
        requestBody.tools = tools;
      }

      const headers = {
        'Content-Type': 'application/json',
        ...(isBearerAuth
          ? { 'Authorization': `Bearer ${cleanKey}` }
          : { 'x-goog-api-key': cleanKey }
        )
      };

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          if (expectJson) {
            const parsed = safeParseJson(rawText);
            if (parsed) {
              activeFastModel = model; // Cache this working model
              return parsed;
            }
          } else {
            activeFastModel = model;
            return rawText.trim();
          }
        }
      } else {
        const errBody = await response.text();
        console.warn(`Gemini (${model}) státusz: ${response.status}`, errBody);

        if (
          response.status === 401 ||
          response.status === 403 ||
          (response.status === 400 && (
            errBody.includes('API key not valid') ||
            errBody.includes('INVALID_ARGUMENT') ||
            errBody.includes('UNAUTHENTICATED') ||
            errBody.includes('API_KEY_INVALID')
          ))
        ) {
          throw new Error('Érvénytelen vagy lejárt Google Gemini API kulcs (401 Auth Error)! Kérlek ellenőrizd az API kulcsodat a jobb felső ⚙️ Beállítások menüben.');
        }

        // If 503 or 429, invalidate activeFastModel cache so next call doesn't hit it first
        if (response.status === 503 || response.status === 429) {
          activeFastModel = null;
        }

        lastError = new Error(`Gemini API hiba (${response.status}): ${errBody.slice(0, 180)}`);
      }
    } catch (e) {
      clearTimeout(timeoutId);
      if (
        e.message?.includes('401 Auth Error') ||
        e.message?.includes('Érvénytelen vagy hiányzó Google Gemini API kulcs') ||
        e.message?.includes('aistudio.google.com/apikey')
      ) {
        throw e;
      }
      console.warn(`Hiba vagy időtúllépés a(z) ${model} modellel:`, e.name === 'AbortError' ? `Időtúllépés (>${(timeoutMs / 1000).toFixed(1)}s)` : e.message);
      activeFastModel = null;
      lastError = e;
    }
  }

  throw lastError || new Error('Nem sikerült választ kapni a Gemini AI modelltől.');
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

      const userProfileInfo = userProfile && Object.keys(userProfile).length > 0 ? `
--- FELHASZNÁLÓI STÍLUSPROFIL & ADOTTSÁGOK ---
Név: ${userProfile.name || 'Felhasználó'}
Magasság: ${userProfile.height || '180 cm'}
Testsúly: ${userProfile.weight || '78 kg'}
Testalkat: ${userProfile.bodyType || 'Atlétikus / Trapéz'}
Bőrtónus & Színtípus: ${userProfile.skinTone || 'Meleg Ősz / Tavasz'}
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

SZABÁLYOK:
1. "category": "outerwear" (Zakó & Kabát) | "knitwear" (Pulóverek & Kötöttáru) | "tops" (Ingek & Felsők & Pólók) | "bottoms" (Nadrág) | "shoes" (Cipő & Lábbeli) | "dresses" (Ruhák & Egyrészesek) | "skirts" (Szoknyák) | "accessories" (Kiegészítők).
2. "formality": "Casual (Laza)" | "Smart Casual" | "Business Casual" | "Business Formal" | "Black Tie & Formal".
3. "styleArchetype": "Klasszikus & Időtlen" | "Old Money & Quiet Luxury" | "Smart Urban" | "Streetwear" | "Olasz Sprezzatura" | "Minimalista" | "Vintage & Retro".
4. "condition": "Vadonatúj / Kifogástalan" | "Megkímélt / Kiváló" | "Játszós / Kopott" | "Javításra vár" | "Lecserélendő".
5. Gallér- és Ujjtípus Specifikáció (Kiemelten fontos):
   - A névben ("name") és címkékben ("tags") pontosan tüntesd fel a gallér- és ujjtípust: pl. 'Állógalléros Ing', 'Kereknyakú Merinó Pulóver', 'Garbó Pulóver', 'Rövid Ujjú Kötött Póló', 'Csónaknyakú Felső', 'Hosszú Ujjú Slim Fit Ing'!
6. Szöveges ajánlások:
   - "stylingTip": Mivel érdemes kombinálni/hordani a sartorial szabályok szerint? (Pl. állógalléros ingnél jelezd, hogy nyitott kardigánnal vagy önmagában viselendő, sosem zárt pulóverrel vagy hajtókás zakóval).
   - "whenToWear": Mikor és milyen alkalmakkor érdemes viselni? (Események, napszakok, hőmérsékleti sáv).
   - "colorHarmony": Hogyan harmonizál a darab színe a felhasználó bőrtónusával / színtípusával?
   - "bodyFitAdvice": Hogyan áll a szabás a felhasználó testalkatán?
   - "stylingAdvice": Szakértői stílusjellemzés a darabról.

VÁLASZOLJ KIZÁRÓLAG ÉRVÉNYES JSON FORMÁTUMBAN:
{
  "name": "Pontos és elegáns magyar megnevezés a gallér- és ujjhosszal (pl. 'Navy Kék Állógalléros Len Ing' vagy 'Homokbézs Rövid Ujjú Kötött Póló')",
  "category": "outerwear" | "knitwear" | "tops" | "bottoms" | "shoes" | "dresses" | "skirts" | "accessories",
  "subCategory": "blazer" | "knitwear" | "shirt" | "t-shirt" | "polo" | "trousers" | "jeans" | "loafers" | "sneakers" | "dress" | "skirt" | "coat" | "other",
  "color": "Valódi fő szín magyarul (pl. Sötétkék, Fekete, Fehér, Homokbézs, Olívazöld)",
  "colorHex": "#hex_színkód",
  "material": "Részletes anyag és szövés (pl. 100% Pima Pamut Pique)",
  "brand": "Márkanév / Gyártó ha felismerhető (pl. Massimo Dutti, Zara, Boglioli)",
  "size": "Méretjelölés ha kivehető vagy webshopból kinyerhető (pl. 'M', 'L', '50', '32/32', '42.5')",
  "qualityScore": 9.2,
  "season": ["tavasz", "nyar", "osz", "tel"],
  "formality": "Smart Casual",
  "styleArchetype": "Old Money & Quiet Luxury",
  "condition": "Vadonatúj / Kifogástalan",
  "stylingTip": "Mivel hordd: Konkrét kombinációs javaslatok a gallér- és rétegzési szabályok szerint",
  "whenToWear": "Mikor hordd: Események és hőmérséklet",
  "colorHarmony": "A szín és tónus harmóniája a felhasználóval",
  "bodyFitAdvice": "Hogyan áll a szabás a felhasználó testalkatán",
  "stylingAdvice": "Karakteres, sokoldalú darab.",
  "personalMatchScore": 95,
  "imageUrl": "Ha a Google Keresési találatokban találsz közvetlen termékfotó URL-t, add meg, különben hagyd üresen",
  "tags": ["alapdarab", "állógallér", "hosszú ujjú", "pamut"]
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

/**
 * Helper to ensure complete anatomical layering and strict sartorial harmony for an outfit across all modules
 */
export function enforceAnatomicalOutfitLayers(rawItems = [], wardrobe = [], candidateItem = null, weather = null) {
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

  const temperature = typeof weather?.temperature === 'number' ? weather.temperature : 22;
  const isWarmWeather = temperature >= 19;

  // 1. SARTORIAL HARMONY RESOLUTION: Stand collar, Turtleneck & Sleeve rules
  const hasStandCollarShirt = items.some(i => isBaseTop(i) && isStandCollar(i));
  const hasClosedSweater = items.some(i => isClosedSweater(i));
  const hasClassicBlazer = items.some(i => isClassicBlazer(i));
  const hasTurtleneckKnit = items.some(i => isTurtleneck(i));
  const hasShortSleeveKnit = items.some(i => (i.category === 'knitwear' || (i.subCategory || '').includes('sweater') || (i.name || '').toLowerCase().includes('pulóver')) && isShortSleeve(i));

  // A. Stand Collar Shirt vs Closed Sweaters & Classic Blazers:
  // A stand collar shirt (mandarin/band) cannot be worn under a closed crewneck/V-neck sweater or a classic notched/peaked lapel blazer!
  if (hasStandCollarShirt) {
    if (hasClosedSweater) {
      if (candidateItem && isStandCollar(candidateItem)) {
        items = items.filter(i => !isClosedSweater(i));
      } else {
        const classicShirt = wardrobe.find(w => isBaseTop(w) && !isStandCollar(w) && w.condition !== 'Lecserélendő' && !items.some(i => i.id === w.id));
        if (classicShirt) {
          items = items.map(i => isStandCollar(i) && isBaseTop(i) ? classicShirt : i);
        } else {
          items = items.filter(i => !isClosedSweater(i));
        }
      }
    }

    if (hasClassicBlazer) {
      if (candidateItem && isStandCollar(candidateItem)) {
        items = items.filter(i => !isClassicBlazer(i));
      } else if (candidateItem && isClassicBlazer(candidateItem)) {
        const classicShirt = wardrobe.find(w => isBaseTop(w) && !isStandCollar(w) && w.condition !== 'Lecserélendő' && !items.some(i => i.id === w.id));
        if (classicShirt) {
          items = items.map(i => isStandCollar(i) && isBaseTop(i) ? classicShirt : i);
        }
      } else {
        const classicShirt = wardrobe.find(w => isBaseTop(w) && !isStandCollar(w) && w.condition !== 'Lecserélendő' && !items.some(i => i.id === w.id));
        if (classicShirt) {
          items = items.map(i => isStandCollar(i) && isBaseTop(i) ? classicShirt : i);
        } else {
          items = items.filter(i => !isClassicBlazer(i));
        }
      }
    }
  }

  // B. Turtleneck Resolution:
  // A turtleneck acts as its own top/base layer or mid layer; no collared shirt should be underneath!
  if (hasTurtleneckKnit) {
    items = items.filter(i => !isBaseTop(i) || isTurtleneck(i));
  }

  // C. Short Sleeve Knitwear Resolution:
  // Under a short sleeve knitwear, do NOT layer a short sleeve t-shirt!
  if (hasShortSleeveKnit) {
    items = items.filter(i => !(isBaseTop(i) && isShortSleeve(i) && i.category !== 'knitwear'));
  }

  // D. Shacket / Overshirt Resolution:
  // Under a shacket or overshirt, do NOT layer a collared dress shirt (Double collar & Double placket clash)!
  // Replace with a clean t-shirt, fine knit top, or turtleneck.
  const hasShacket = items.some(i => isShacket(i));
  const hasCollaredShirt = items.some(i => isCollaredShirt(i));
  if (hasShacket && hasCollaredShirt) {
    const tShirtOrKnit = wardrobe.find(w =>
      !isCollaredShirt(w) &&
      !isShacket(w) &&
      (isBaseTop(w) || isTurtleneck(w)) &&
      w.condition !== 'Lecserélendő' &&
      !items.some(i => i.id === w.id)
    ) || wardrobe.find(w =>
      !isCollaredShirt(w) &&
      !isShacket(w) &&
      (isBaseTop(w) || isTurtleneck(w)) &&
      !items.some(i => i.id === w.id)
    );
    if (tShirtOrKnit) {
      items = items.map(i => isCollaredShirt(i) ? tShirtOrKnit : i);
    } else {
      items = items.filter(i => !isCollaredShirt(i));
    }
  }

  // 2. Check if the outfit has a valid Base Top (ing vagy póló) unless turtleneck is already present
  const hasBaseTop = items.some(i => isBaseTop(i) || isTurtleneck(i) || hasShortSleeveKnit);
  if (!hasBaseTop) {
    const baseTop = wardrobe.find(w => isBaseTop(w) && !isStandCollar(w) && w.condition !== 'Lecserélendő' && !items.some(i => i.id === w.id)) ||
      wardrobe.find(w => isBaseTop(w) && w.condition !== 'Lecserélendő' && !items.some(i => i.id === w.id)) ||
      wardrobe.find(w => isBaseTop(w) && !items.some(i => i.id === w.id));
    if (baseTop) {
      items.push(baseTop);
    }
  }

  // 3. Check if the outfit has Bottoms (nadrág)
  const hasBottom = items.some(i => isBottom(i));
  if (!hasBottom) {
    const bottom = wardrobe.find(w => isBottom(w) && w.condition !== 'Lecserélendő' && !items.some(i => i.id === w.id)) ||
      wardrobe.find(w => isBottom(w) && !items.some(i => i.id === w.id));
    if (bottom) {
      items.push(bottom);
    }
  }

  // 4. Check if the outfit has Shoes (lábbeli) & Enforce Temperature Appropriateness
  const currentShoeIndex = items.findIndex(i => isShoe(i));
  if (currentShoeIndex !== -1) {
    const currentShoe = items[currentShoeIndex];
    // If it's warm weather (>= 19°C) and the shoe is a heavy boot/autumn-winter ankle boot, replace with summer shoe if available
    if (isWarmWeather && isHeavyBoot(currentShoe)) {
      const summerAlternative = wardrobe.find(w => isShoe(w) && !isHeavyBoot(w) && w.condition !== 'Lecserélendő' && !items.some(i => i.id === w.id)) ||
        wardrobe.find(w => isShoe(w) && !isHeavyBoot(w) && !items.some(i => i.id === w.id));
      if (summerAlternative) {
        items[currentShoeIndex] = summerAlternative;
      }
    }
  } else {
    // If missing shoe, select temperature-appropriate shoe
    const shoe = isWarmWeather
      ? (wardrobe.find(w => isShoe(w) && !isHeavyBoot(w) && w.condition !== 'Lecserélendő' && !items.some(i => i.id === w.id)) ||
        wardrobe.find(w => isShoe(w) && !isHeavyBoot(w) && !items.some(i => i.id === w.id)) ||
        wardrobe.find(w => isShoe(w) && w.condition !== 'Lecserélendő' && !items.some(i => i.id === w.id)) ||
        wardrobe.find(w => isShoe(w) && !items.some(i => i.id === w.id)))
      : (wardrobe.find(w => isShoe(w) && w.condition !== 'Lecserélendő' && !items.some(i => i.id === w.id)) ||
        wardrobe.find(w => isShoe(w) && !items.some(i => i.id === w.id)));

    if (shoe) {
      items.push(shoe);
    }
  }

  // 5. Check if the outfit has a Belt (öv - kötelező kiegészítő)
  const hasBelt = items.some(i => isBelt(i));
  if (!hasBelt) {
    const belt = wardrobe.find(w => isBelt(w) && w.condition !== 'Lecserélendő' && !items.some(i => i.id === w.id)) ||
      wardrobe.find(w => isBelt(w) && !items.some(i => i.id === w.id));
    if (belt) {
      items.push(belt);
    }
  }

  // 6. Strictly ensure AT MOST ONE item of each core type:
  // - Exactly 1 Belt
  const beltIndices = [];
  items.forEach((item, idx) => {
    if (isBelt(item)) beltIndices.push(idx);
  });
  if (beltIndices.length > 1) {
    const keepIdx = beltIndices[0];
    items = items.filter((_, idx) => !beltIndices.includes(idx) || idx === keepIdx);
  }

  // - Exactly 1 Bottom
  const bottomIndices = [];
  items.forEach((item, idx) => {
    if (isBottom(item)) bottomIndices.push(idx);
  });
  if (bottomIndices.length > 1) {
    const keepIdx = bottomIndices[0];
    items = items.filter((_, idx) => !bottomIndices.includes(idx) || idx === keepIdx);
  }

  // - Exactly 1 Shoe
  const shoeIndices = [];
  items.forEach((item, idx) => {
    if (isShoe(item)) shoeIndices.push(idx);
  });
  if (shoeIndices.length > 1) {
    const keepIdx = shoeIndices[0];
    items = items.filter((_, idx) => !shoeIndices.includes(idx) || idx === keepIdx);
  }

  // - Exactly 1 Base Top
  const topIndices = [];
  items.forEach((item, idx) => {
    if (isBaseTop(item)) topIndices.push(idx);
  });
  if (topIndices.length > 1) {
    const keepIdx = topIndices[0];
    items = items.filter((_, idx) => !topIndices.includes(idx) || idx === keepIdx);
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
export async function evaluateAndExtractPrePurchaseItem({ imageBase64OrUrl, webshopContext = {}, itemName = '', itemPrice = '', wardrobe = [], styleProfile = {} }) {
  const apiKey = getGeminiApiKey();

  if (apiKey) {
    try {
      const resolvedBase64 = await ensureBase64Image(imageBase64OrUrl);

      // Lean, rich representation of wardrobe for ultra-low token transfer with normalized brands and full sartorial metadata
      const compactWardrobe = wardrobe
        .filter(w => w.condition !== 'Javításra vár')
        .map(w => ({
          id: w.id,
          name: w.name,
          cat: w.category,
          subCat: w.subCategory || '',
          mat: w.material || '',
          season: w.season || [],
          pat: w.pattern || '',
          col: w.color,
          form: w.formality,
          fit: w.fit || '',
          brand: normalizeBrandName(w.brand) || w.brand || '',
          size: w.size || '',
          cond: w.condition,
          style: w.styleArchetype
        }));

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
      const dynamicSartorialRules = formatRulesForPrompt();

      const prompt = `Te egy világklasszis személyi stylist, divatelemző és kapszula ruhatár döntéstámogató vagy.
ELEMEZD A MEGADOTT RUHADARABOT KIZÁRÓLAG A WEBSHOPBAN / FOTÓN TALÁLT VALÓS ADATOK ALAPJÁN!
${itemName ? `Megadott név: "${itemName}"` : ''} ${itemPrice ? `Ár: "${itemPrice}"` : ''} ${webshopTextInfo ? `Webshop info: ${webshopTextInfo}` : ''}
Felhasználó profilja: ${JSON.stringify({ height: styleProfile.height, weight: styleProfile.weight, body: styleProfile.bodyType, skin: styleProfile.skinTone, styles: styleProfile.preferredStyles, philosophy: styleProfile.stylePhilosophy })}

🚫 FELHASZNÁLÓ EGYÉNI STÍLUSSZABÁLYAI & TILTÁSAI:
${customRules.length > 0 ? customRules.map(r => `• ${r}`).join('\n') : 'Nincsenek külön rögzített tiltások.'}

👔 AKTÍV SARTORIAL HARMÓNIA- ÉS RÉTEGEZÉSI SZABÁLYZAT (AUTONOMIKUSAN KUTATOTT & BESPOKE SZABÁLYOK):
${dynamicSartorialRules}

Meglévő ruhatár (${compactWardrobe.length} elem gazdag metaadatokkal): ${JSON.stringify(compactWardrobe)}

SZIGORÚ VALÓS ADAT ELV ÉS ANTI-HALLUCINÁCIÓS SZABÁLYOK:
1. KIZÁRÓLAG AZOKAT AZ ADATOKAT ADD MEG, AMIKET A WEBSHOP LEÍRÁSA, CÍME VAGY FOTÓJA TÉNYLEGESEN TARTALMAZ!
2. HA EGY ADAT (PL. SZABÁS, ANYAGÖSSZETÉTEL, MÉRET) NEM SZEREPEL A WEBSHOPBAN VAGY NEM ÁLL RENDELKEZÉSRE:
   - SOHA NE TALÁLJ KI SEMMIT, NE TIPPELJ ÉS NE ERŐLTESS RÁ SEMMIT A FELHASZNÁLÓ PROFILJÁBÓL!
   - Ha a szabás nincs megadva: "fit": "Nem ismert szabás" (vagy null), és a szabásbeli elemzésnél jelezd, hogy a webshop nem közölte a szabást.
   - Ha az anyagösszetétel nincs megadva: "material": "Nem ismert anyagösszetétel".
   - Ha a méret nincs megadva: "size": "".
3. SOHA NE ÁLLÍTSD EGY TERMÉKRŐL, HOGY SLIM FIT VAGY REGULAR FIT, HA EZT A WEBSHOP NEM ÍRJA KIFEJEZETTEN!

4 DÖNTÉSI PILLÉR & SARTORIAL LOGIKA:

1. 👔 KOMBINÁLHATÓSÁG & 3 KOMPLETT OUTFIT:
   - Készíts 3 különböző komplett, hordható outfitet a kiszemelt darab és a meglévő ruhatár elemeiből, szigorúan betartva a fenti sartorial harmóniaszabályokat!
   - KÖTELEZŐ ELEMEK:
     * 👔 Bázis felső ('tops' - ing vagy minőségi pamut póló közvetlenül a bőrön; ha a céltermék garbó vagy rövid ujjú kötöttáru, az maga a bázis).
     * 👖 Alsó ('bottoms' - nadrág vagy szoknya a ruhatárból).
     * 👞 Lábbeli ('shoes' - cipő / csizma / loafer / sneaker a ruhatárból).
     * 🎗️ Öv ('accessories' - a cipővel harmonizáló bőröv a ruhatárból, kötelező kiegészítő).
   - OPCIONÁLIS RÉTEGEK: Köztes réteg ('knitwear' - pulóver/kardigán), Zakó ('outerwear' / 'blazer'), Télikabát ('coat' / 'overcoat'), egyéb kiegészítők.
   - A 'matchedItemIds' listába KÖTELEZŐEN TEDD BE az összes olyan darab pontos 'id'-ját, amit a szetthez és a leírásban ('stylingTip') felhasználsz!

2. ⚖️ VÁLTOZATOSSÁG & STILISZTIKAI LEFEDETTSÉG (Aesthetic Overlap):
   - Ha a ruhatárban már van azonos szerepkörű/megjelenésű darab, töltsd ki az 'aestheticOverlap' objektumot.

3. 📐 SZEMÉLYES ILLESZKEDÉS & SZABÁS:
   - Csak a valós adatok alapján értékeld a termék illeszkedését a stílus DNS-hez.

4. 🧶 ANYAGMINŐSÉG:
   - A kinyert valós anyag alapján értékeld a minőséget. Ha nem ismert, jelezd az ismeretlen anyagot.

🚫 CSENDES SZABÁLYBETARTÁS (Silent Rule Enforcement):
- A felhasználó egyéni stílusszabályait és tiltásait KÖTELEZŐEN A HÁTTÉRBEN, CSENDBEN TARTSD BE a szettek és tanácsok generálásakor!
- SZIGORÚAN TILOS a szövegben megemlíteni vagy magyarázni a felhasználó saját szabályait (pl. TILOS leírni, hogy "a szabályod szerint nem választottunk pólóinget", "mivel kérted az ing+jogger kerülését" stb.)! A leírás kizárólag a darabok valódi eleganciájára, esztétikájára és kombinálhatóságára fókuszáljon!

VÁLASZOLJ KIZÁRÓLAG ÉRVÉNYES JSON FORMÁTUMBAN:
{
  "item": {
    "name": "${itemName || 'Valós magyar terméknév'}",
    "category": "outerwear" | "knitwear" | "tops" | "bottoms" | "shoes" | "dresses" | "skirts" | "accessories",
    "subCategory": "blazer" | "knitwear" | "shirt" | "t-shirt" | "polo" | "trousers" | "jeans" | "loafers" | "sneakers" | "boots" | "coat" | "overcoat" | "jacket" | "other",
    "color": "Webshopban talált szín magyarul",
    "colorHex": "#hex",
    "material": "Webshopban talált valós anyag (ha nem ismert: 'Nem ismert anyagösszetétel')",
    "brand": "${webshopBrand || 'Márkanév ha ismert'}",
    "size": "Méret ha kinyerhető",
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
  "compatibilityScore": 94,
  "verdict": "Erősen Ajánlott" | "Érdemes Megfontolni" | "Gondold Át",
  "verdictSummary": "Részletes szakmai összefoglaló a valós adatok alapján",
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
  "fitMismatchWarning": "Szabásbeli észrevétel (ha a webshop nem közölte a szabást, vagy ha nincs hiba: null)",
  "fabricWarning": "Anyagminőségi észrevétel",
  "fabricScore": 9.0,
  "isSynthetic": false,
  "sizingAdvice": "Méretválasztási tanács",
  "outfits": [
    {
      "title": "Szett 1 Neve",
      "occasion": "Alkalom",
      "styleType": "Stílusirányzat",
      "matchedItemIds": ["bázis_ing_id", "nadrág_id", "cipő_id", "opcionális_zakó_id"],
      "stylingTip": "Részletes rétegezési és viselési leírás",
      "whyItWorks": "Miért harmonizál a darabokkal"
    }
  ]
}`;

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
          const matchedItems = (o.matchedItemIds || []).map(id => wardrobe.find(w => w.id === id)).filter(Boolean);
          const fullEnforcedItems = enforceAnatomicalOutfitLayers(matchedItems, wardrobe, extractedItem);

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
      const dynamicSartorialRules = formatRulesForPrompt();

      const richWardrobe = availableWardrobe.map(w => ({
        id: w.id,
        name: w.name,
        category: w.category,
        subCategory: w.subCategory || '',
        material: w.material || '',
        season: w.season || [],
        pattern: w.pattern || '',
        color: w.color,
        formality: w.formality,
        fit: w.fit || '',
        condition: w.condition,
        style: w.styleArchetype
      }));

      const prompt = `Te egy világklasszis mester személyi stylist és sartorial rétegezési szakértő vagy.

A LEGELSŐ ÉS LEGFONTOSABB SZABÁLY: A FELHASZNÁLÓ EGYÉNI STÍLUS DNS-E, SZEMÉLYES SZABÁLYAI ÉS A TÖKÉLETES ANATÓMIAI RÉTEGEZÉS AZ ALAP!
Nem sablonos kliséket készítünk, hanem a FELHASZNÁLÓ SAJÁT SZEMÉLYES STÍLUSÁT adaptáljuk intelligensen az eseményhez úgy, hogy 100%-ig önazonos, funkcionális és magabiztos maradjon!

FELHASZNÁLÓ STÍLUSPROFILJA:
- Preferált Stílusirányzatok: ${JSON.stringify(styleProfile.preferredStyles || ['Klasszikus & Időtlen', 'Old Money & Quiet Luxury', 'Olasz Sprezzatura'])}
- Stílusfilozófia: "${styleProfile.stylePhilosophy || 'Kifinomult elegancia, prémium természetes anyagok és tökéletes szabás'}"
- Kedvenc Színpaletta: ${JSON.stringify(styleProfile.favoriteColors || ['Sötétkék', 'Homokbézs', 'Fekete', 'Olívazöld', 'Törtfehér'])}
- Testalkat és Magasság: ${styleProfile.bodyType || 'Atlétikus'}, ${styleProfile.height || '180 cm'} (${styleProfile.skinTone || 'Természetes bőrtónus'})

🚫 FELHASZNÁLÓ EGYÉNI STÍLUSSZABÁLYAI & TILTÁSAI (SZIGORÚAN KÖTELEZŐ BETARTANI!):
${customRules.length > 0 ? customRules.map(r => `• ${r}`).join('\n') : 'Nincsenek külön rögzített tiltások.'}

👔 AKTÍV SARTORIAL HARMÓNIA- ÉS RÉTEGEZÉSI SZABÁLYZAT (AUTONOMIKUSAN KUTATOTT & BESPOKE SZABÁLYOK):
${dynamicSartorialRules}

ESEMÉNY / ALKALOM: "${eventName}"
HELYSZÍN ÉS IDŐJÁRÁS: ${weather?.city || 'Budapest'}, ${temperature}°C, ${weather?.condition || 'Kellemes'}
${anchorItems.length > 0 ? `KÖTELEZŐ KULCSDARABOK (Anchor Items): ${JSON.stringify(anchorItems.map(a => ({ id: a.id, name: a.name, category: a.category, color: a.color })))}` : ''}

Ruhatár (${richWardrobe.length} elérhető darab gazdag metaadatokkal):
${JSON.stringify(richWardrobe)}

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

7. 3 KÜLÖNBÖZŐ SZEMÉLYES HANGULAT AZ ESEMÉNYRE:
   - Készíts 3 olyan komplett szettet, amelyek a fenti rétegezési szabályok szerint épülnek fel, de 3 különböző stílusárnyalatot képviselnek.

🚫 CSENDES SZABÁLYBETARTÁS (Silent Rule Enforcement):
- A felhasználó egyéni szabályait és tiltásait (pl. nem hord pólóinget, nem vesz fel joggert inggel stb.) KÖTELEZŐEN A HÁTTÉRBEN, CSENDBEN TARTSD BE a szettek összeállításakor!
- SZIGORÚAN TILOS a kimeneti szövegekben (stylingNotes, culturalFitReasoning, layeringAdvice) megemlíteni vagy magyarázni a felhasználó saját szabályait!
- A leírás KIZÁRÓLAG a szett esztétikájára, a színek és anyagok kifinomult harmóniájára és az esemény dress code-jára fókuszáljon!

VÁLASZOLJ KIZÁRÓLAG ÉRVÉNYES JSON TÖMBKÉNT:
[
  {
    "id": "outfit-1",
    "title": "Kifejező szett elnevezés",
    "styleArchetype": "A felhasználó személyes stílusához és az alkalomhoz illő stílusnév",
    "occasion": "${eventName}",
    "matchScore": 97,
    "stylingNotes": "Személyre szabott stylist tanács a viseléshez és a darabok összhangjához",
    "layeringAdvice": "Gyakorlati rétegezési útmutató",
    "culturalFitReasoning": "Hogyan érvényesül a felhasználó személyes stílusa és az esemény összhangja ebben a szettben",
    "weatherSuitability": "Időjárási és hőmérsékleti megfelelés (${temperature}°C)",
    "itemIds": ["bázis_ing_id", "opcionalis_pulover_id", "opcionalis_zako_id", "opcionalis_teli_kabat_id", "nadrag_id", "cipo_id", "ov_id"]
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
 * 4. Kapszula Ruhatár Elemzés: Dinamikus Gemini AI Gap Analysis & Intelligens Kulcsdarab Ajánló
 */
export async function analyzeWardrobeGaps(wardrobe = [], profile = {}) {
  const apiKey = getGeminiApiKey();

  if (apiKey && wardrobe.length > 0) {
    try {
      // Analyze current wardrobe pieces with full sartorial richness
      const compactItems = wardrobe.map(w => ({
        id: w.id,
        name: w.name,
        category: w.category,
        subCategory: w.subCategory || '',
        material: w.material || '',
        season: w.season || [],
        pattern: w.pattern || '',
        color: w.color,
        formality: w.formality,
        fit: w.fit || '',
        brand: w.brand || '',
        condition: w.condition
      }));

      // Count items per category and identify potential replacements
      const replacementCandidates = wardrobe.filter(w => w.condition === 'Lecserélendő' || w.condition === 'Játszós / Kopott');
      const customRules = Array.isArray(profile.customStylingRules) && profile.customStylingRules.length > 0
        ? profile.customStylingRules
        : [];

      // Check seasonal footwear status in existing wardrobe
      const hasAutumnWinterShoes = wardrobe.some(w =>
        w.category === 'shoes' &&
        Array.isArray(w.season) &&
        (w.season.includes('osz') || w.season.includes('tel')) &&
        (w.subCategory === 'boots' || w.subCategory === 'chelsea_boots' || w.name.toLowerCase().includes('csizma') || w.name.toLowerCase().includes('bakancs'))
      );

      const prompt = `Te egy mester kapszula ruhatár-tervező és sartorial stylist vagy.
Elemezd a felhasználó gardróbját (${wardrobe.length} elem), testalkatát és stílusprofilját, és KÉSZÍTS EGY ÁTFOGÓ, 6–8 STRATÉGIAI KULCSDARABBÓL ÁLLÓ HIÁNYLISTÁT!
Stílusprofil: ${JSON.stringify({ height: profile.height, weight: profile.weight, body: profile.bodyType, preferredStyles: profile.preferredStyles, philosophy: profile.stylePhilosophy })}

🚫 FELHASZNÁLÓ EGYÉNI STÍLUSSZABÁLYAI & TILTÁSAI:
${customRules.length > 0 ? customRules.map(r => `• ${r}`).join('\n') : 'Nincsenek külön rögzített tiltások.'}

Meglévő ruhatár elemek (${compactItems.length} db részletes adatokkal): ${JSON.stringify(compactItems)}
${replacementCandidates.length > 0 ? `Elhasználódott / játszós darabok a szekrényben: ${JSON.stringify(replacementCandidates.map(r => ({ name: r.name, category: r.category, color: r.color })))}` : ''}

KAPSZULA HIÁNYELEMZÉS & PRIORITÁSI IRÁNYELVEK:

1. 🎯 ÁTFOGÓ 6-8 DARABOS HIÁNYLISTA (Különböző szintek és rétegek lefedése):
   - 🔴 **Kritikus Hiány (Priority Score: 90–100):** Olyan funkcionális alapdarabok, amikből 0 db van, és nélkülük egész szezonok vagy szettek esnek ki (pl. őszi/téli bőr Chelsea csizma vagy harmonizáló bőröv).
   - 🟡 **Fontos Kapszula Bázis (Priority Score: 80–89):** Nélkülözhetetlen rétegzési alapok (pl. prémium nehézsúlyú törtfehér pamut póló zakók és pulóverek alá, vagy meleg szürke gyapjú flanelnadrág).
   - 🟢 **Nagy Varianciát Adó Kulcsdarabok (Priority Score: 70–79):** Olyan karakteres, sokoldalú új darabok, amik +8–15 új hordható szettet nyitnak meg a meglévő ruhákkal (pl. földszínű merinó/kasmír garbó, strukturálatlan teveszínű zakó, olívazöld chino).
   - ⚪ **Stílusgazdagító / Nice to Have (Priority Score: 50–69):** Extra kifinomultságot adó kiegészítők (pl. 100% kasmír sál a télikabáthoz, hernyóselyem díszzsebkendő).

2. 👞 SZEZONÁLIS LÁBBELI GAP:
   - ${!hasAutumnWinterShoes ? 'KÖTELEZŐ legalább egy prémium őszi/téli bőrlábbelit ajánlani (pl. Barna Full-Grain Bőr Chelsea Csizma)!' : 'A lábbeli kategória rendelkezik őszi/téli darabbal.'}

3. 📐 SZABÁS & ANYAG:
   - Kizárólag 100% természetes anyagokat ajánlj (gyapjú, len, kasmír, pamut, bőr).

🚫 SZIGORÚ SZABÁLYÉRTELMEZÉS & CSENDES SZABÁLYBETARTÁS:
1. PONTOS, KATEGÓRIASPECIFIKUS ÉRTELMEZÉS (TILOS A TÚLÁLTALÁNOSÍTÁS!):
   - Ha egy szabály konkrét darabra/kategóriára vonatkozik (pl. "Nem szeretem a fehér nadrágokat"), az KIZÁRÓLAG a nadrágokra érvényes!
   - SZIGORÚAN TILOS kiterjeszteni más kategóriákra: a fehér pamut póló, fehér ing és fehér bőr sneaker a klasszikus ruhatár tökéletesen érvényes, engedélyezett alapdarabjai!
2. CSENDES SZABÁLYBETARTÁS:
   - A 'reason' mezőben SZIGORÚAN TILOS megemlíteni a felhasználó szabályait (TILOS leírni: "a preferenciáid miatt", "a szabályod szerint", "mivel tiltottad" stb.)!
   - Az indoklás KIZÁRÓLAG a darab minőségére, rétegezhetőségére és kombinációs értékére fókuszáljon!

VÁLASZOLJ KIZÁRÓLAG ÉRVÉNYES JSON TÖMBKÉNT (6-8 darabbal):
[
  {
    "id": "gap-1",
    "title": "Pontos terméknév a szabással és anyaggal (pl. 'Sötétbarna Full-Grain Bőr Chelsea Csizma')",
    "recommendedFit": "pl. Classic last / Slim tailored",
    "priorityScore": 96,
    "priorityLevel": "Kritikus Alapdarab" | "Fontos Kapszula Bázis" | "Nagy Varianciát Adó Kulcsdarab" | "Stílusgazdagító / Nice to Have",
    "impact": "+10 Új Őszi/Téli Outfit Variáció",
    "estimatedPrice": "45 000 - 85 000 Ft",
    "category": "shoes" | "outerwear" | "knitwear" | "tops" | "bottoms" | "accessories",
    "season": "Ősz / Tél" | "Tavasz / Nyár" | "Egész évben",
    "reason": "Részletes szakmai indoklás, miért ez a kulcsdarab hiányzik a ruhatárból és hogyan növeli a kombinálhatóságot",
    "isReplacement": false,
    "searchKeywords": "konkrét keresési kulcsszavak webshophoz (pl. mens dark brown leather chelsea boots)"
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
        return parsed.sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
      }
    } catch (e) {
      console.error('Gemini Capsule Gap hiba:', e);
    }
  }

  // Intelligens Fallback ha nincs API kapcsolat
  const fallbackGaps = [
    {
      id: 'gap-chelsea-boots',
      title: 'Sötétbarna Full-Grain Bőr Chelsea Csizma',
      recommendedFit: 'Classic last / True to size',
      priorityScore: 98,
      priorityLevel: 'Kritikus Alapdarab',
      impact: '+12 Új Őszi/Téli Outfit Variáció',
      estimatedPrice: '45 000 - 85 000 Ft',
      category: 'shoes',
      season: 'Ősz / Tél',
      reason: 'A ruhatárad legfontosabb hiányzó őszi-téli sarokköve: vízálló, elegáns és tökéletesen működik flanelnadrággal és gyapjúkabáttal.',
      isReplacement: false,
      searchKeywords: 'mens dark brown leather chelsea boots ferfi bor csizma'
    },
    {
      id: 'gap-heavy-tshirt',
      title: 'Prémium Nehézsúlyú Törtfehér Pamut Póló (220 GSM)',
      recommendedFit: 'Slim tailored / Regular fit',
      priorityScore: 88,
      priorityLevel: 'Fontos Kapszula Bázis',
      impact: '+10 Új Rétegezhető Szett',
      estimatedPrice: '12 000 - 22 000 Ft',
      category: 'tops',
      season: 'Egész évben',
      reason: 'Kiváló minőségű, sűrű szövésű bázisdarab, ami zakók és pulóverek alatt tartást és friss kontrasztot nyújt.',
      isReplacement: false,
      searchKeywords: 'mens heavyweight white cotton t-shirt feher pamut polo'
    },
    {
      id: 'gap-flannel-trousers',
      title: 'Sötétszürke Olasz Gyapjú Flanel Nadrág',
      recommendedFit: 'Slim tailored / Tapered',
      priorityScore: 84,
      priorityLevel: 'Fontos Kapszula Bázis',
      impact: '+8 Új Őszi/Téli Outfit Variáció',
      estimatedPrice: '28 000 - 52 000 Ft',
      category: 'bottoms',
      season: 'Ősz / Tél',
      reason: 'Meleg és strukturált eleganciát nyújt a hideg évszakokban, tökéletes hidat képezve a zakók és téli kötöttek felé.',
      isReplacement: false,
      searchKeywords: 'mens slim fit charcoal wool flannel trousers gyapju nadrag'
    },
    {
      id: 'gap-camel-turtleneck',
      title: 'Teveszínű (Camel) Merinógyapjú Garbó Pulóver',
      recommendedFit: 'Slim tailored',
      priorityScore: 78,
      priorityLevel: 'Nagy Varianciát Adó Kulcsdarab',
      impact: '+9 Új Elegáns Téli Szett',
      estimatedPrice: '24 000 - 45 000 Ft',
      category: 'knitwear',
      season: 'Ősz / Tél',
      reason: 'A garbó azonnal kifinomult, olasz sprezzatura karaktert ad zakó alá rétegezve anélkül, hogy inget kellene vasalnod.',
      isReplacement: false,
      searchKeywords: 'mens camel merino wool turtleneck pulover garbo'
    },
    {
      id: 'gap-leather-belt',
      title: 'Dohánybarna Kézműves Bőröv Sárgaréz Csattal',
      recommendedFit: 'Classic 3.5cm',
      priorityScore: 74,
      priorityLevel: 'Fontos Kapszula Bázis',
      impact: '+15 Szett Harmonizálása',
      estimatedPrice: '14 000 - 28 000 Ft',
      category: 'accessories',
      season: 'Egész évben',
      reason: 'Összeköti a felső- és alsóruházatot, tökéletes összhangot teremtve a barna loaferrel és chelsea csizmával.',
      isReplacement: false,
      searchKeywords: 'mens handmade brown leather belt ferfi bor ov'
    },
    {
      id: 'gap-cashmere-scarf',
      title: 'Antracitszürke 100% Mongol Kasmír Sál',
      recommendedFit: 'One size (180x30cm)',
      priorityScore: 62,
      priorityLevel: 'Stílusgazdagító / Nice to Have',
      impact: '+6 Hideg Téli Megjelenés',
      estimatedPrice: '22 000 - 38 000 Ft',
      category: 'accessories',
      season: 'Ősz / Tél',
      reason: 'A téli szövetkabát elengedhetetlen luxus kísérője, ami védi a nyakat és textúrát ad a hideg utcai szetteknek.',
      isReplacement: false,
      searchKeywords: 'mens 100 cashmere charcoal grey scarf ferfi kasmir sal'
    }
  ];

  const rulesLower = (Array.isArray(profile?.customStylingRules) ? profile.customStylingRules.join(' ') : '').toLowerCase();
  return fallbackGaps.filter(g => {
    if ((rulesLower.includes('pólóing') || rulesLower.includes('polo')) && g.id?.includes('polo')) return false;
    return true;
  });
}

/**
 * 5. Saját Szett Összeállítása & Sartorial AI Audit (Manual Outfit Auditor)
 */
export async function auditManualOutfit({ items = [], eventName = 'Általános Megjelenés', weather = null, styleProfile = {} }) {
  const apiKey = getGeminiApiKey();

  if (apiKey && items.length > 0) {
    try {
      const customRules = Array.isArray(styleProfile.customStylingRules) && styleProfile.customStylingRules.length > 0
        ? styleProfile.customStylingRules
        : [];
      const dynamicSartorialRules = formatRulesForPrompt();

      const compactItems = items.map(w => ({
        id: w.id,
        name: w.name,
        category: w.category,
        subCategory: w.subCategory || '',
        material: w.material || '',
        season: w.season || [],
        pattern: w.pattern || '',
        color: w.color,
        formality: w.formality,
        fit: w.fit || '',
        brand: w.brand || '',
        condition: w.condition,
        style: w.styleArchetype
      }));

      const prompt = `Te egy mester személyi stylist, szín- és aránytanácsadó, valamint sartorial szakértő vagy.
A felhasználó saját maga állított össze egy szettet a meglévő ruhatárából az alábbi alkalomra és időjárási körülményekre.

A FELADATOD: Végezz szigorú, mégis építő jellegű, professzionális Stílus- és Összhang Auditot a szettre a klasszikus sartorial elvek és a felhasználó személyes Stílus DNS-e alapján!

FELHASZNÁLÓ STÍLUSPROFILJA:
- Preferált Stílusirányzatok: ${JSON.stringify(styleProfile.preferredStyles || ['Klasszikus & Időtlen', 'Old Money & Quiet Luxury', 'Olasz Sprezzatura'])}
- Stílusfilozófia: "${styleProfile.stylePhilosophy || 'Kifinomult elegancia, prémium természetes anyagok és tökéletes szabás'}"
- Kedvenc Színpaletta: ${JSON.stringify(styleProfile.favoriteColors || ['Sötétkék', 'Homokbézs', 'Fekete', 'Olívazöld', 'Törtfehér'])}
- Testalkat és Magasság: ${styleProfile.bodyType || 'Atlétikus'}, ${styleProfile.height || '180 cm'} (${styleProfile.skinTone || 'Természetes bőrtónus'})

🚫 FELHASZNÁLÓ EGYÉNI SZABÁLYAI & TILTÁSAI (Ha a felhasználó által választott szettben ezek bármelyike sérül, jelezd a figyelmeztetésben és a tanácsokban!):
${customRules.length > 0 ? customRules.map(r => `• ${r}`).join('\n') : 'Nincsenek külön rögzített tiltások.'}

👔 AKTÍV SARTORIAL HARMÓNIA- ÉS RÉTEGEZÉSI SZABÁLYZAT (AUTONOMIKUSAN KUTATOTT & BESPOKE SZABÁLYOK):
${dynamicSartorialRules}

ESEMÉNY / ALKALOM: "${eventName}"
HELYSZÍN ÉS IDŐJÁRÁS: ${weather?.city || 'Budapest'}, ${weather?.temperature}°C, ${weather?.condition || 'Kellemes'}

A FELHASZNÁLÓ ÁLTAL ÖSSZEVÁLOGATOTT DARABOK (${compactItems.length} db):
${JSON.stringify(compactItems, null, 2)}

SZEMPONTOK AZ AUDITHOZ:
1. 🎯 Esemény & Dress Code összhang: Illik-e a választott szett az esemény kulturális és formai elvárásaihoz?
2. 👔 Sartorial Gallér- és Ujj-Harmónia (Kritikus ellenőrzési pontok):
   - Állógalléros ing (Mandarin / Band collar / Grandad) + zárt kötött pulóver (Crewneck/V-neck) vagy klasszikus hajtókás zakó: DISSZONÁNS RÉTEGEZÉS! (Adj lejjebb a pontszámból, és a 'fitMismatchWarning' és 'suggestions' mezőkben kötelezően részletesen megnevezni a hibát és a helyes viselést).
   - Rövid ujjú kötött pulóver + alatta rövid ujjú póló: KETTŐS UJJVÉG / GYŰRŐDÉS HIBA! (A rövid ujjú pulóvert bőrön vagy ujjatlan bázissal hordjuk).
   - Garbó + alatta galléros ing: DISSZONÁNS! (A garbó önmagában a bázis).
3. 🎨 Színharmónia & Kontraszt: Hogyan illeszkednek egymáshoz a színek és a bőrtónushoz? Érvényesül-e a 3-szín szabály?
4. 🧵 Anyagok & Textúrák szinergiája: Természetes szálak találkozása (pl. gyapjú flanel, len, pamut twill, sima vagy velúrbőr).
5. 🧥 Anatómiai rétegezés & Időjárási alkalmasság: Van-e megfelelő bázisréteg? Megfelelő-e a ${weather?.temperature || 20}°C-os hőmérséklethez?
6. ⚖️ Szabások & Arányok összhangja: Bő felsőhöz szűkített alsó; széles nadrághoz/szoknyához betűrt felső és öv.

VÁLASZOLJ KIZÁRÓLAG ÉRVÉNYES JSON FORMÁTUMBAN:
{
  "score": 88,
  "verdict": "Kifejezetten Kifinomult Smart Casual / Apró Korrekciót Igénylő Összeállítás / Kiváló Sprezzatura Harmónia",
  "eventAlignment": "Részletes, szabatos indoklás arról, hogy az esemény dress code-jához hogyan passzol ez a szett",
  "colorHarmony": "A színek és tónusok kölcsönhatásának szakmai értékelése",
  "fabricSynergy": "Az anyagok, szövések és textúrák találkozásának értékelése",
  "layeringEvaluation": "A rétegezés, bázisréteg és hőmérsékleti komfort elemzése a megadott időjáráshoz",
  "bodyFitVerdict": "Hogyan támogatja a szett a testalkatot és a személyes arányokat",
  "strengths": [
    "A sötétkék zakó és a törtfehér ing kontrasztja azonnali időtlen eleganciát ad",
    "A cipő és az öv bőrszínének harmóniája stabilizálja az alsó sziluettet"
  ],
  "suggestions": [
    "Ha hűvösebbre fordulna az este, vegyél fel egy vékony merinógyapjú pulóvert a zakó alá",
    "A barna bőröv még jobban összekötné a nadrágot a felsővel"
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
      const hasBootInWarmWeather = temp >= 19 && items.some(i => isHeavyBoot(i));

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

      return {
        ...parsed,
        score: calculatedScore,
        verdict: penalty > 0 && calculatedScore < 75 ? 'Korrekciót Igénylő Összeállítás' : (parsed?.verdict || 'Harmonikus Összeállítás'),
        strengths,
        suggestions,
        fitMismatchWarning
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
    const dynamicSartorialRules = formatRulesForPrompt();

    const wardrobeInventory = wardrobe.map(w => ({
      id: w.id,
      name: w.name,
      category: w.category,
      subCategory: w.subCategory || '',
      material: w.material || '',
      color: w.color,
      brand: w.brand || '',
      size: w.size || '',
      condition: w.condition || '',
      formality: w.formality || '',
      style: w.styleArchetype || '',
      tags: w.tags || []
    }));

    const systemInstruction = `Te egy világklasszis, közvetlen, diszkrét és rendkívül művelt Mester Személyi Stylist (Master Sartorial Consultant) vagy.
A felhasználóval beszélgetsz, aki tanácsot kérhet tőled szettekről, konkrét ruhadarabjainak viseléséről, stílustrendekről, gardrób-bővítésről vagy esemény-specifikus megjelenésről.

A LEGFONTOSABB SZUPERERŐD:
Teljes mélységében ismered a felhasználó SAJÁT DIGITÁLIS RUHATÁRÁT, SZEMÉLYES STÍLUS DNS-ÉT, EGYÉNI SZABÁLYAIT ÉS AZ AKTUÁLIS IDŐJÁRÁST!

FELHASZNÁLÓ STÍLUSPROFILJA:
- Preferált Stílusirányzatok: ${JSON.stringify(styleProfile.preferredStyles || ['Klasszikus & Időtlen', 'Old Money & Quiet Luxury', 'Olasz Sprezzatura'])}
- Stílusfilozófia: "${styleProfile.stylePhilosophy || 'Kifinomult elegancia, prémium természetes anyagok és tökéletes szabás'}"
- Kedvenc Színpaletta: ${JSON.stringify(styleProfile.favoriteColors || ['Sötétkék', 'Homokbézs', 'Fekete', 'Olívazöld', 'Törtfehér'])}
- Testalkat és Magasság: ${styleProfile.bodyType || 'Atlétikus'}, ${styleProfile.height || '180 cm'} (${styleProfile.skinTone || 'Természetes bőrtónus'})
- Cipőméret & Ruhaméret: ${styleProfile.shoeSize || '42.5'}, Felső: ${styleProfile.topSize || 'M / 50'}, Nadrág: ${styleProfile.pantSize || '32/32'}

🚫 FELHASZNÁLÓ EGYÉNI SZABÁLYAI & TILTÁSAI (MINDIG SZIGORÚAN TARTSD BE!):
${customRules.length > 0 ? customRules.map(r => `• ${r}`).join('\n') : 'Nincsenek külön tiltások rögzítve.'}

👔 AKTÍV SARTORIAL HARMÓNIA- ÉS RÉTEGEZÉSI SZABÁLYZAT (AUTONOMIKUSAN KUTATOTT & BESPOKE SZABÁLYOK):
${dynamicSartorialRules}

AKTUÁLIS IDŐJÁRÁS:
Helyszín: ${weather?.city || 'Budapest'}, Hőmérséklet: ${weather?.temperature ?? 21}°C, Körülmények: ${weather?.condition || 'Kellemes'}

A FELHASZNÁLÓ TELJES RUHATÁRA (${wardrobeInventory.length} db darab):
${JSON.stringify(wardrobeInventory, null, 2)}

STÍLUS ÉS KOMMUNIKÁCIÓS IRÁNYELVEK:
1. Válaszolj közvetlen, barátságos, magabiztos, kifinomult és emberi magyar nyelven!
2. SZIGORÚAN TILOS JSON, kódblokk vagy kulcs-érték struktúra (pl. { "top_missing_color": ... }) formátumban válaszolnod! Mindig igényes, szép Markdown folyó szöveget írj!
3. Amikor konkrét összeállítást javasolsz, MINDIG a felhasználó valós ruhatárából válassz konkrét darabokat a pontos nevükkel!
4. Ha a felhasználó egy új darab vásárlásáról vagy hiányzó ruháról kérdez, javasolj valódi kapszula hiánypótló darabot a meglévő ruhatára alapján és magyarázd el, miért éri meg beszerezni.
5. Ha a felhasználó egy szettet kérdez tőled, használd a sartorial rétegezési szabályokat (Bázis ing + Nadrág + Cipő + Öv + opcionális Pulóver / Zakó / Kabát).
6. Használj elegáns markdown formázást (félkövér kiemelések, felsorolások, bekezdések).`;

    // Convert chat history into Gemini contents format
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

    for (const msg of messages) {
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
