// Advanced Google Gemini Vision & Fashion Stylist Intelligence Engine
import { ensureBase64Image } from './imageOptimizer';
import { normalizeBrandName } from './webshop';

const getGeminiApiKey = () => {
  return (import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('GEMINI_API_KEY') || '').trim();
};

export const isGeminiConfigured = () => Boolean(getGeminiApiKey());

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
  } catch (_) {}

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
async function callGeminiApi({ 
  apiKey, 
  contents, 
  tools = null, 
  maxOutputTokens = 2500, 
  temperature = 0.15,
  preferredModels = FAST_MODELS,
  timeoutMs = 20000
}) {
  const cleanKey = (apiKey || '').trim();
  if (!cleanKey) {
    throw new Error('Nincs beállítva Google Gemini API kulcs! Kérlek add meg a saját ingyenes API kulcsodat a Beállítások (Fogaskerék) menüben (aistudio.google.com/apikey).');
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
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(cleanKey)}`;
      const requestBody = {
        contents,
        generationConfig: {
          maxOutputTokens,
          temperature
        }
      };

      // Google API rule: If tools (like googleSearch) are used, responseMimeType CANNOT be application/json
      if (tools && tools.length > 0) {
        requestBody.tools = tools;
      } else {
        requestBody.generationConfig.responseMimeType = "application/json";
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': cleanKey
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const parsed = safeParseJson(rawText);
          if (parsed) {
            activeFastModel = model; // Cache this working model
            return parsed;
          }
        }
      } else {
        const errBody = await response.text();
        console.warn(`Gemini (${model}) státusz: ${response.status}`, errBody);
        
        if (response.status === 400 && (errBody.includes('API key not valid') || errBody.includes('INVALID_ARGUMENT'))) {
          throw new Error('Érvénytelen Google Gemini API kulcs! Kérlek generálj egy saját ingyenes kulcsot az aistudio.google.com/apikey oldalon, és másold be a Beállítások menübe!');
        }

        // If 503 or 429, invalidate activeFastModel cache so next call doesn't hit it first
        if (response.status === 503 || response.status === 429) {
          activeFastModel = null;
        }

        lastError = new Error(`Gemini API hiba (${response.status}): ${errBody.slice(0, 180)}`);
      }
    } catch (e) {
      clearTimeout(timeoutId);
      if (e.message?.includes('Érvénytelen Google Gemini API kulcs')) {
        throw e;
      }
      console.warn(`Hiba vagy időtúllépés a(z) ${model} modellel:`, e.name === 'AbortError' ? `Időtúllépés (>${(timeoutMs/1000).toFixed(1)}s)` : e.message);
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
5. Szöveges ajánlások:
   - "stylingTip": Mivel érdemes kombinálni/hordani? (Konkrét színek és darabok a harmonikus szetthez).
   - "whenToWear": Mikor és milyen alkalmakkor érdemes viselni? (Események, napszakok, hőmérsékleti sáv).
   - "colorHarmony": Hogyan harmonizál a darab színe a felhasználó bőrtónusával / színtípusával?
   - "bodyFitAdvice": Hogyan áll a szabás a felhasználó testalkatán?
   - "stylingAdvice": Szakértői stílusjellemzés a darabról.

VÁLASZOLJ KIZÁRÓLAG ÉRVÉNYES JSON FORMÁTUMBAN:
{
  "name": "Pontos és elegáns magyar megnevezés (pl. 'Navy Kék Pique Pamut Pólóing' vagy 'Fekete Slim Fit Póló')",
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
  "stylingTip": "Mivel hordd: Konkrét kombinációs javaslatok",
  "whenToWear": "Mikor hordd: Események és hőmérséklet",
  "colorHarmony": "A szín és tónus harmóniája a felhasználóval",
  "bodyFitAdvice": "Hogyan áll a szabás a felhasználó testalkatán",
  "stylingAdvice": "Karakteres, sokoldalú darab.",
  "personalMatchScore": 95,
  "imageUrl": "Ha a Google Keresési találatokban találsz közvetlen termékfotó URL-t, add meg, különben hagyd üresen",
  "tags": ["alapdarab", "pamut", "nyári"]
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
 * Helper to ensure complete anatomical layering for an outfit across all modules
 * 1: Tops (Bázis ing/póló közvetlenül a bőrön)
 * 2: Knitwear (Köztes pulóver/kötöttáru)
 * 3: Blazer (Zakó)
 * 4: Coat (Nagykabát/Télikabát)
 * 5: Bottoms (Nadrág)
 * 6: Shoes (Lábbeli)
 * 7: Accessories (Kiegészítő)
 */
export function enforceAnatomicalOutfitLayers(rawItems = [], wardrobe = [], candidateItem = null) {
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

  // Helper: Is this item bottoms (pants/trousers)?
  const isBottom = (item) => {
    if (!item) return false;
    const cat = item.category || '';
    const sub = (item.subCategory || '').toLowerCase();
    const name = (item.name || '').toLowerCase();
    return cat === 'bottoms' || sub === 'trousers' || sub === 'jeans' || sub === 'pants' || name.includes('nadrág') || name.includes('chino') || name.includes('farmer');
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

  // 1. Check if the outfit has a valid Base Top (ing vagy póló)
  const hasBaseTop = items.some(i => isBaseTop(i));
  if (!hasBaseTop) {
    const baseTop = wardrobe.find(w => isBaseTop(w) && w.condition !== 'Lecserélendő' && !items.some(i => i.id === w.id)) ||
                    wardrobe.find(w => isBaseTop(w) && !items.some(i => i.id === w.id));
    if (baseTop) {
      items.push(baseTop);
    }
  }

  // 2. Check if the outfit has Bottoms (nadrág)
  const hasBottom = items.some(i => isBottom(i));
  if (!hasBottom) {
    const bottom = wardrobe.find(w => isBottom(w) && w.condition !== 'Lecserélendő' && !items.some(i => i.id === w.id)) ||
                   wardrobe.find(w => isBottom(w) && !items.some(i => i.id === w.id));
    if (bottom) {
      items.push(bottom);
    }
  }

  // 3. Check if the outfit has Shoes (lábbeli)
  const hasShoe = items.some(i => isShoe(i));
  if (!hasShoe) {
    const shoe = wardrobe.find(w => isShoe(w) && w.condition !== 'Lecserélendő' && !items.some(i => i.id === w.id)) ||
                 wardrobe.find(w => isShoe(w) && !items.some(i => i.id === w.id));
    if (shoe) {
      items.push(shoe);
    }
  }

  // 4. Check if the outfit has a Belt (öv - kötelező kiegészítő)
  const hasBelt = items.some(i => isBelt(i));
  if (!hasBelt) {
    const belt = wardrobe.find(w => isBelt(w) && w.condition !== 'Lecserélendő' && !items.some(i => i.id === w.id)) ||
                 wardrobe.find(w => isBelt(w) && !items.some(i => i.id === w.id));
    if (belt) {
      items.push(belt);
    }
  }

  // 5. Strictly ensure AT MOST ONE item of each core type:
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

  // 6. Sort in natural anatomical layering order:
  const getItemLayerRank = (item) => {
    const cat = item.category || '';
    const sub = (item.subCategory || '').toLowerCase();
    const name = (item.name || '').toLowerCase();

    if (sub === 'coat' || sub === 'overcoat' || name.includes('kabát') || name.includes('trench')) return 4;
    if (cat === 'outerwear' || sub === 'blazer' || sub === 'jacket' || name.includes('zakó') || name.includes('dzseki')) return 3;
    if (cat === 'knitwear' || sub === 'knitwear' || sub === 'sweater' || sub === 'cardigan' || name.includes('pulóver') || name.includes('kardigán')) return 2;
    if (isBaseTop(item)) return 1;
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

      const prompt = `Te egy világklasszis személyi stylist, divatelemző és kapszula ruhatár döntéstámogató vagy.
ELEMEZD A MEGADOTT RUHADARABOT KIZÁRÓLAG A WEBSHOPBAN / FOTÓN TALÁLT VALÓS ADATOK ALAPJÁN!
${itemName ? `Megadott név: "${itemName}"` : ''} ${itemPrice ? `Ár: "${itemPrice}"` : ''} ${webshopTextInfo ? `Webshop info: ${webshopTextInfo}` : ''}
Felhasználó profilja: ${JSON.stringify({ height: styleProfile.height, weight: styleProfile.weight, body: styleProfile.bodyType, skin: styleProfile.skinTone, styles: styleProfile.preferredStyles, philosophy: styleProfile.stylePhilosophy })}

🚫 FELHASZNÁLÓ EGYÉNI STÍLUSSZABÁLYAI & TILTÁSAI:
${customRules.length > 0 ? customRules.map(r => `• ${r}`).join('\n') : 'Nincsenek külön rögzített tiltások.'}

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
   - Készíts 3 különböző komplett, hordható outfitet a kiszemelt darab és a meglévő ruhatár elemeiből.
   - KÖTELEZŐ ELEMEK:
     * 👔 Bázis felső ('tops' - ing vagy minőségi pamut póló közvetlenül a bőrön; szabadon válassz a szett stílusához illő darabot a ruhatárból, ne fixen ugyanazt).
     * 👖 Alsó ('bottoms' - nadrág a ruhatárból).
     * 👞 Lábbeli ('shoes' - cipő / csizma / loafer / sneaker a ruhatárból).
     * 🎗️ Öv ('accessories' - a cipővel harmonizáló bőröv a ruhatárból, kötelező kiegészítő).
   - OPCIONÁLIS RÉTEGEK: Köztes réteg ('knitwear' - pulóver/kardigán), Zakó ('outerwear' / 'blazer'), Télikabát ('coat' / 'overcoat'), egyéb kiegészítők (díszzsebkendő, sál stb.).
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
      const availableWardrobe = wardrobe.filter(w => {
        if (w.condition === 'Lecserélendő' || w.condition === 'Javításra vár') return false;
        if (isFormalEvent && w.condition === 'Játszós / Kopott') return false;
        return true;
      });

      const anchorItems = wardrobe.filter(w => anchorItemIds.includes(w.id));
      const customRules = Array.isArray(styleProfile.customStylingRules) && styleProfile.customStylingRules.length > 0
        ? styleProfile.customStylingRules
        : [];

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

ESEMÉNY / ALKALOM: "${eventName}"
HELYSZÍN ÉS IDŐJÁRÁS: ${weather?.city || 'Budapest'}, ${weather?.temperature}°C, ${weather?.condition}
${anchorItems.length > 0 ? `KÖTELEZŐ KULCSDARABOK (Anchor Items): ${JSON.stringify(anchorItems.map(a => ({ id: a.id, name: a.name, category: a.category, color: a.color })))}` : ''}

Ruhatár (${richWardrobe.length} elérhető darab gazdag metaadatokkal):
${JSON.stringify(richWardrobe)}

SARTORIAL BLUEPRINT & ANATÓMIAI RÉTEGEZÉSI SZABÁLYOK:

1. 👔 KÖTELEZŐ ELEMEK MINDEN SZETTBEN:
   - 👔 Bázis felső ('tops' - ing vagy minőségi pamut póló közvetlenül a bőrön; szabadon válassz a ruhatárból a szett hangulatához illő felsőt, ne fixen ugyanazt).
   - 👖 Alsó ('bottoms' - pontosan 1 db nadrág / chino / flanelnadrág / farmer a ruhatárból).
   - 👞 Lábbeli ('shoes' - pontosan 1 pár cipő / csizma / loafer / sneaker a ruhatárból).
   - 🎗️ Öv ('accessories' - a cipővel harmonizáló bőröv a ruhatárból, kötelező kiegészítő).

2. 🧥 OPCIONÁLIS RÉTEGEK (Időjárás, esemény és stílus szerint):
   - Kötöttáru / Pulóver ('knitwear'): Opcionálisan 0 vagy 1 db pulóver/kardigán az ingre/pólóra rétegezve.
   - Zakó ('outerwear' / 'blazer'): Opcionális zakó / dzseki a bázisra/pulóverre.
   - ❄️ TÉLI / HIDEG IDŐ (< 12°C vagy Téli esemény):
     * KETTŐS KÜLSŐ RÉTEG ENGEDÉLYEZETT: A zakó ('blazer') FÖLÉ mehet a téli szövetkabát / nagykabát ('overcoat' / 'coat')!
     * Teljes luxus téli rétegezés: Ing + Pulóver + Zakó + Nagykabát + Nadrág + Öv + Bőrcipő/Csizma.
   - ☀️ MELEG / NYÁR (20°C+): Könnyű len/pamut ing vagy felső + nadrág + öv + loafer/sneaker. Vastag télikabát és vastag kötött pulóver SZIGORÚAN TILOS!

3. ✦ TOVÁBBI KIEGÉSZÍTŐK:
   - Az AI stílusérzéke szerint opcionálisan bevonhatók további kiegészítők a ruhatárból (pl. díszzsebkendő zakóhoz, sál hidegben, óra, napszemüveg).

4. 3 KÜLÖNBÖZŐ SZEMÉLYES HANGULAT AZ ESEMÉNYRE:
   - Készíts 3 olyan komplett szettet, amelyek a fenti rétegezési szabályok szerint épülnek fel, de 3 különböző stílusárnyalatot képviselnek.

🚫 CSENDES SZABÁLYBETARTÁS (Silent Rule Enforcement):
- A felhasználó egyéni szabályait és tiltásait (pl. nem hord pólóinget, nem vesz fel joggert inggel stb.) KÖTELEZŐEN A HÁTTÉRBEN, CSENDBEN TARTSD BE a szettek összeállításakor!
- SZIGORÚAN TILOS a kimeneti szövegekben (stylingNotes, culturalFitReasoning, layeringAdvice) megemlíteni vagy magyarázni a felhasználó saját szabályait (pl. TILOS leírni, hogy "szabályaid szerint nem választottunk pólóinget", "betartva az ing+jogger tiltást" stb.)!
- A felhasználó tisztában van a saját szabályaival; a leírás KIZÁRÓLAG a szett esztétikájára, a színek és anyagok kifinomult harmóniájára és az esemény dress code-jára fókuszáljon!

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
    "weatherSuitability": "Időjárási és hőmérsékleti megfelelés (${weather?.temperature || 20}°C)",
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
          const fullEnforcedItems = enforceAnatomicalOutfitLayers(rawItems, availableWardrobe, null);

          return {
            id: p.id || `outfit-${Date.now()}-${idx}`,
            title: p.title || `${idx + 1}. Stílusos Szett`,
            styleArchetype: p.styleArchetype || 'Eseményhez Hangolt',
            occasion: p.occasion || eventName,
            matchScore: p.matchScore || 94 + (idx * 2) % 5,
            stylingNotes: p.stylingNotes || "Harmonikus összeállítás a gardróbodból.",
            layeringAdvice: p.layeringAdvice || "Funkcionálisan rétegezett összeállítás, amely a belső térben és hűvösebb időben is jól alkalmazkodik.",
            culturalFitReasoning: p.culturalFitReasoning || "Tökéletesen igazodik az esemény dress code-jához és atmoszférájához.",
            weatherSuitability: p.weatherSuitability || `Ideális a(z) ${weather?.temperature || 20}°C-os időjáráshoz.`,
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
