// Advanced Google Gemini Vision & Fashion Stylist Intelligence Engine
import { ensureBase64Image } from './imageOptimizer';
import { normalizeBrandName } from './webshop';

const getGeminiApiKey = () => {
  return import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('GEMINI_API_KEY') || 'AQ.Ab8RN6KI92lORSWUYkyTduRjayE_470SGe4rkmFWdAT5a29NsA';
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
  timeoutMs = 5500
}) {
  let lastError = null;

  // Prioritize previously successful model if it exists in preferred list for zero-latency calls
  const modelsToTry = activeFastModel && preferredModels.includes(activeFastModel)
    ? [activeFastModel, ...preferredModels.filter(m => m !== activeFastModel)]
    : preferredModels;

  for (const model of modelsToTry) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
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
          'x-goog-api-key': apiKey
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
        
        // If 503 or 429, invalidate activeFastModel cache so next call doesn't hit it first
        if (response.status === 503 || response.status === 429) {
          activeFastModel = null;
        }

        lastError = new Error(`Gemini API hiba (${response.status}): ${errBody.slice(0, 180)}`);
      }
    } catch (e) {
      clearTimeout(timeoutId);
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

      const targetFocusInstruction = `FONTOS:
- Ha csatolva van valós fotó, a fotó pixelei az elsődlegesek.
- Ha webshop terméklink vagy termékkód van megadva (pl. Next Direct, Zara, Reserved, H&M, Massimo Dutti), a Google és divat-tudásbázisod alapján azonosítsd a konkrét terméket, annak pontos anyagát, színét, kategóriáját és szabását!`;

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
        timeoutMs: 5000 
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
 * 2. UNIFIED ULTRA-FAST Vásárlás Előtti Döntéstámogató (1 Hívásban végzi a képelemzést és a 3 pillért)
 */
export async function evaluateAndExtractPrePurchaseItem({ imageBase64OrUrl, webshopContext = {}, itemName = '', itemPrice = '', wardrobe = [], styleProfile = {} }) {
  const apiKey = getGeminiApiKey();

  if (apiKey) {
    try {
      const resolvedBase64 = await ensureBase64Image(imageBase64OrUrl);
      
      // Lean, compact representation of wardrobe for ultra-low token transfer with normalized brands
      const compactWardrobe = wardrobe
        .filter(w => w.condition !== 'Javításra vár')
        .map(w => ({
          id: w.id,
          name: w.name,
          cat: w.category,
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
Felhasználó profilja: ${JSON.stringify({ height: styleProfile.height, weight: styleProfile.weight, body: styleProfile.bodyType, skin: styleProfile.skinTone, styles: styleProfile.preferredStyles, philosophy: styleProfile.stylePhilosophy })}

3 DÖNTÉSI PILLÉR, EGYÉNI SZABÁLYOK & RÉTEGEZÉSI INTELLIGENCIA:
1. Kombinálhatóság & KÖTELEZŐ RÉTEGEZÉS:
   - Készíts 3 különböző komplett outfitet a meglévő gardrób elemeivel (használd a pontos 'id'-kat a 'matchedItemIds' tömbben!).
   - RÉTEGEZÉSI SZABÁLY: Ha a kiszemelt darab pulóver ('knitwear') vagy zakó ('outerwear'), a szettekben KÖTELEZŐ egy bázis inget vagy prémium pólót ('tops') alárendelni! SOHA ne legyen pulóver vagy zakó csupasz felsőtestre bázis felső nélkül!
2. Változatosság & Duplikáció: Ha van már hasonló ruha, de az 'Kopott / Játszós' vagy 'Lecserélendő', KIFEJEZETTEN AJÁNLANI KELL a megvásárlást mint minőségi cserét! Ha van szép állapotú hasonló, jelezd a duplikációt.
3. Személyes Illeszkedés & SZABÁSBELI / EGYÉNI SZABÁLYSÉRTÉS ELLENŐRZÉSE:
   - SZABÁSVISSZAJELZÉS: Nézd meg, milyen szabást hord a user (pl. Slim tailored vs Regular). Ha eltér, figyelmeztess a 'fitMismatchWarning' mezőben!
   - EGYÉNI SZABÁLYSÉRTÉS: Vizsgáld meg, hogy a kiszemelt darab ütközik-e a felhasználó bármelyik egyéni stílusszabályával (pl. ha a szabály 'Nem szeretem a pólóingeket' és ez egy pólóing / polo felső; vagy ha 'Csak természetes anyagok' és ez poliészter; vagy ha kerül bizonyos színt/szabást)!
   - Ha szabálysértést észlelsz, a 'fitMismatchWarning' mezőben KIFEJEZETTEN ÉS KIEMELTEN ÍRD MEG A FIGYELMEZTETÉST (pl. '⚠️ Személyes stílusszabály ütközés: A stílusprofilodban rögzítetted, hogy nem szereted a pólóingeket, ez a darab pedig egy pólóing!'), és a döntést állítsd 'Gondold Át' vagy 'Kerülendő' státuszra!

VÁLASZOLJ KIZÁRÓLAG ÉRVÉNYES JSON FORMÁTUMBAN:
{
  "item": {
    "name": "${itemName || 'Elegáns magyar terméknév'}",
    "category": "outerwear" | "knitwear" | "tops" | "bottoms" | "shoes" | "dresses" | "skirts" | "accessories",
    "subCategory": "blazer" | "knitwear" | "shirt" | "t-shirt" | "polo" | "trousers" | "jeans" | "loafers" | "sneakers" | "dress" | "coat" | "other",
    "color": "Valódi fő szín magyarul (pl. Sötétkék, Homokbézs, Fekete)",
    "colorHex": "#hex",
    "material": "Anyagösszetétel",
    "brand": "${webshopBrand || 'Márkanév / Gyártó ha felismerhető'}",
    "size": "Méret ha webshopból vagy címkéből kivehető",
    "fit": "Felismerhető szabás (pl. Slim Fit, Regular Fit, Relaxed, Oversized, Tapered, Contemporary)",
    "qualityScore": 9.2,
    "formality": "Smart Casual",
    "styleArchetype": "Old Money & Quiet Luxury",
    "condition": "Vadonatúj / Kifogástalan",
    "stylingTip": "Mivel hordd és hogyan rétegezd",
    "whenToWear": "Mikor hordd",
    "colorHarmony": "Színharmónia indoklás",
    "bodyFitAdvice": "Szabás, egyéni stílusszabályok és testalkat indoklás",
    "tags": ["alapdarab"]
  },
  "compatibilityScore": 94,
  "verdict": "Erősen Ajánlott" | "Érdemes Megfontolni" | "Gondold Át",
  "verdictSummary": "Részletes szakmai összefoglaló a vásárlási döntésről és az egyéni szabályokról",
  "duplicationWarning": "Duplikáció vagy csere-javaslat",
  "fitMismatchWarning": "Szabásbeli eltérés VAGY személyes stílusszabály ütközés (pl. '⚠️ Személyes szabály ütközés: Nem szereted a pólóingeket!')",
  "sizingAdvice": "Méretválasztási tanács a meglévő márkáid és testalkatod alapján",
  "outfits": [
    {
      "title": "Szett 1 Neve",
      "occasion": "Alkalom",
      "matchedItemIds": ["id1", "id2"],
      "whyItWorks": "Miért harmonizál a meglévő ruhatárral és a rétegekkel"
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
        timeoutMs: 6500
      });

      const extractedItem = {
        ...(parsed.item || {}),
        name: itemName || parsed.item?.name || 'Új Ruhadarab',
        brand: normalizeBrandName(parsed.item?.brand) || parsed.item?.brand || '',
        imageUrl: imageBase64OrUrl,
        price: itemPrice
      };

      if (parsed && Array.isArray(parsed.outfits)) {
        parsed.outfits = parsed.outfits.map(o => ({
          ...o,
          items: [
            extractedItem,
            ...(o.matchedItemIds || []).map(id => wardrobe.find(w => w.id === id)).filter(Boolean)
          ]
        }));
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
        timeoutMs: 5000
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
      const availableWardrobe = wardrobe.filter(w => w.condition !== 'Lecserélendő' && w.condition !== 'Javításra vár');
      const anchorItems = wardrobe.filter(w => anchorItemIds.includes(w.id));
      const customRules = Array.isArray(styleProfile.customStylingRules) && styleProfile.customStylingRules.length > 0
        ? styleProfile.customStylingRules
        : [];

      const prompt = `Te egy világklasszis mester személyi stylist és sartorial rétegezési szakértő vagy.

A LEGELSŐ ÉS LEGFONTOSABB SZABÁLY: A FELHASZNÁLÓ EGYÉNI STÍLUS DNS-E, SZEMÉLYES SZABÁLYAI ÉS A TÖKÉLETES RÉTEGEZÉS AZ ALAP!
Nem sablonos kliséket és jelmezeket készítünk az eseményre, hanem a FELHASZNÁLÓ SAJÁT SZEMÉLYES STÍLUSÁT ÉS EGYÉNISÉGÉT adaptáljuk intelligensen az eseményhez úgy, hogy 100%-ig önazonos, funkcionális és magabiztos maradjon!

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

Ruhatár (${availableWardrobe.length} elem):
${JSON.stringify(availableWardrobe.map(w => ({ id: w.id, name: w.name, category: w.category, color: w.color, formality: w.formality, fit: w.fit || '', condition: w.condition, style: w.styleArchetype })))}

STYLIST DÖNTÉSI & RÉTEGEZÉSI LOGIKA (KRITIKUS FONTOSSÁGÚ SZABÁLYOK):

1. 👔 KÖTELEZŐ BÁZISRÉTEG (Base Layer - 'tops'):
   - MINDEN SZETTNEK KÖTELEZŐEN TARTALMAZNIA KELL egy közvetlenül a bőrön hordható felső bázisréteget: 'tops' (ing, oxford ing, vászoning, pamut póló, elegáns alapfelső)!
   - ❌ SZIGORÚ HIBA ÉS TILALOM: SOHA NE AJÁNLJ PULÓVERT ('knitwear'), KARDIGÁNT VAGY ZAKÓT ('outerwear') CSUPASZ FELSŐTESTRE BÁZIS ING/PÓLÓ NÉLKÜL! A pulóver és a zakó alá MINDIG KÖTELEZŐ a gardróbból egy megfelelő ing vagy póló kiválasztása!

2. 🧥 KÖZTES & KÜLSŐ RÉTEGEZÉS (Mid & Outer Layers):
   - Kötöttáru / Pulóver ('knitwear'): KÖTELEZŐEN az ingre vagy pólóra rétegezve.
   - Zakó / Kabát ('outerwear'): Az ingre, vagy ing + finom pulóver kombinációra rétegezve.
   - Nadrág ('bottoms') és Lábbeli ('shoes'): Minden szettnek kötelező része.

3. 🌡️ IDŐJÁRÁS- ÉS HŐMÉRSÉKLETI DINAMIKA, LEVÁLASZTHATÓ RÉTEGEK (Day-to-Night, Beltér/Kültér):
   - Vedd figyelembe az aktuális hőmérsékletet (${weather?.temperature || 20}°C, ${weather?.condition || 'Kellemes'}) és a napközbeni/esti/beltéri hőingadozást (bent fűtés vagy klíma van, este lehűl a levegő)!
   - A szett legyen MODULÁRIS: ha a felhasználó leveszi a zakót vagy a pulóvert (mert meleg a helyiség vagy melegebb a délután), az alatta lévő ing/póló önmagában is legyen hibátlan, elegáns és önazonos!
   - Hűvös / hideg időben (< 18°C) és este: javasolj 3-rétegű vagy meleg 2-rétegű összeállítást (Ing + Pulóver + Zakó/Kabát + Nadrág + Cipő).
   - Átmeneti időben (18–23°C): Ing + Zakó (vagy Ing + finomkötött pulóver/kardigán, ami szükség esetén vállra vethető vagy levehető).
   - Melegben (24°C+): Könnyű lélegző pamut/len ing vagy felső + nadrág + loafer/sneaker.

4. 3 KÜLÖNBÖZŐ SZEMÉLYES HANGULAT AZ ESEMÉNYRE:
   - Készíts 3 olyan szettet, amelyek mindegyike a fenti rétegezési szabályok szerint épül fel, de 3 különböző hangulatot képvisel (pl. 1. Kifinomult & Letisztult, 2. Karakteres & Laza, 3. Kényelmes & Modern).

VÁLASZOLJ KIZÁRÓLAG ÉRVÉNYES JSON TÖMBKÉNT:
[
  {
    "id": "outfit-1",
    "title": "Kifejező szett elnevezés",
    "styleArchetype": "A felhasználó személyes stílusához és az alkalomhoz illő stílusnév",
    "occasion": "${eventName}",
    "matchScore": 97,
    "stylingNotes": "Személyre szabott stylist tanács a viseléshez és a darabok összhangjához",
    "layeringAdvice": "Gyakorlati rétegezési útmutató (pl. 'Este és kültéren a kasmír pulóver melegen tart, bent a meleg étteremben levéve az alatta lévő oxford ing önmagában is tökéletesen mutat.')",
    "culturalFitReasoning": "Hogyan érvényesül a felhasználó személyes stílusa, egyéni szabályai és az esemény összhangja ebben a szettben",
    "weatherSuitability": "Időjárási és hőmérsékleti megfelelés (${weather?.temperature || 20}°C)",
    "itemIds": ["ing_vagy_polo_id", "opcionalis_pulover_id", "opcionalis_zako_id", "nadrag_id", "cipo_id"]
  }
]`;

      const contents = [{ parts: [{ text: prompt }] }];
      const parsed = await callGeminiApi({ 
        apiKey, 
        contents, 
        preferredModels: REASONING_MODELS, 
        timeoutMs: 7000 
      });
      
      if (Array.isArray(parsed)) {
        return parsed.map((p, idx) => ({
          id: p.id || `outfit-${Date.now()}-${idx}`,
          title: p.title || `${idx + 1}. Stílusos Szett`,
          styleArchetype: p.styleArchetype || 'Eseményhez Hangolt',
          occasion: p.occasion || eventName,
          matchScore: p.matchScore || 94 + (idx * 2) % 5,
          stylingNotes: p.stylingNotes || "Harmonikus összeállítás a gardróbodból.",
          layeringAdvice: p.layeringAdvice || "Funkcionálisan rétegezett összeállítás, amely meleg belső térben és hűvösebb időben is jól alkalmazkodik.",
          culturalFitReasoning: p.culturalFitReasoning || "Tökéletesen igazodik az esemény dress code-jához és atmoszférájához.",
          weatherSuitability: p.weatherSuitability || `Ideális a(z) ${weather?.temperature || 20}°C-os időjáráshoz.`,
          items: (p.itemIds || [])
            .map(id => wardrobe.find(w => w.id === id))
            .filter(Boolean)
        })).filter(o => o.items.length > 0);
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
      // Analyze current wardrobe pieces, their condition, category and fit
      const compactItems = wardrobe.map(w => ({
        id: w.id,
        name: w.name,
        category: w.category,
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

      const prompt = `Te egy mester kapszula ruhatár-tervező és sartorial stylist vagy.
Elemezd a felhasználó gardróbját (${wardrobe.length} elem), testalkatát és stílusprofilját:
Stílusprofil: ${JSON.stringify({ height: profile.height, weight: profile.weight, body: profile.bodyType, preferredStyles: profile.preferredStyles, philosophy: profile.stylePhilosophy })}

🚫 FELHASZNÁLÓ EGYÉNI STÍLUSSZABÁLYAI & TILTÁSAI:
${customRules.length > 0 ? customRules.map(r => `• ${r}`).join('\n') : 'Nincsenek külön rögzített tiltások.'}

Meglévő ruhatár elemek: ${JSON.stringify(compactItems)}
${replacementCandidates.length > 0 ? `Elhasználódott / játszós darabok a szekrényben: ${JSON.stringify(replacementCandidates.map(r => ({ name: r.name, category: r.category, color: r.color })))}` : ''}

FONTOS SZABÁLYOK AZ AJÁNLÁSOKHOZ:

1. EGYÉNI SZABÁLYOK SZIGORÚ TISZTELETBEN TARTÁSA:
   - SOHA NE AJÁNLJ olyan darabot, kategóriát vagy anyagot, amit a felhasználó kizárt (pl. ha 'Nem szeretem a pólóingeket', SOHA ne ajánlj poloinget; ha 'Csak 100% természetes anyagok', csak tiszta pamut/len/gyapjú/selyem darabot ajánlj; ha kerül bizonyos szabást, tartsd be)!

2. SZABÁS (FIT) BEÉPÍTÉSE:
   - Vizsgáld meg, milyen szabású darabokat hord a felhasználó (pl. Slim tailored, Slim fit, Tapered, Regular)!
   - Ha a felhasználó Slim Fit / karcsúsított szabású ruhákat hord vagy atlétikus testalkatú, akkor az ajánlott darabok megnevezésébe (title) és KIFEJEZETTEN a keresési kulcsszavakba (searchKeywords) is ÉPÍTSD BE a szabást (pl. 'Slim Fit Olasz Gyapjú Zakó', searchKeywords: 'slim fit navy blue wool blazer férfi zakó')!

3. TELÍTETTSÉG & INTELLIGENS CSERE SZABÁLY (Redundancy & Smart Replacement):
   - Ha egy adott típusból / kiegészítőből (pl. fonott öv, fehér bőr sneaker, sötétkék ing stb.) a ruhatárban MÁR VAN 2 VAGY TÖBB szép, 'Megkímélt / Kiváló' vagy 'Vadonatúj' állapotú darab, akkor MÉG HA VAN IS egy 'Játszós / Kopott' darab belőle, NEM SZABAD annak lecserélését / pótlását ajánlani!
   - Csak akkor ajánlj cserét ('isReplacement': true), ha az adott KULCSFONTOSSÁGÚ darabból nincs másik jó állapotú alternatíva a ruhatárban, és hiánya blokkolja a szettek építését!
   - Mindig a VALÓDI KAPSZULA HIÁNYOKRA fókuszálj, amelyek új kombinációs hidakat és outfit variációkat hoznak létre.

VÁLASZOLJ KIZÁRÓLAG ÉRVÉNYES JSON TÖMBKÉNT:
[
  {
    "id": "gap-1",
    "title": "Pontos terméknév a szabással együtt (pl. 'Slim Fit Sötétkék Olasz Gyapjú Zakó')",
    "recommendedFit": "pl. Slim tailored / Karcsúsított szabás",
    "impact": "+8 Új Outfit Variáció",
    "estimatedPrice": "35 000 - 65 000 Ft",
    "category": "outerwear" | "knitwear" | "tops" | "bottoms" | "shoes" | "accessories",
    "season": "Tavasz / Nyár" | "Ősz / Tél" | "Egész évben",
    "reason": "Részletes szakmai indoklás, miért ez a kulcsdarab hiányzik a ruhatárból és hogyan illeszkedik a felhasználó egyéni szabályaihoz",
    "isReplacement": false,
    "searchKeywords": "konkrét keresési kulcsszavak webshophoz szabással és anyaggal (pl. slim fit navy tailored wool blazer ferfi)"
  }
]`;

      const contents = [{ parts: [{ text: prompt }] }];
      const parsed = await callGeminiApi({ 
        apiKey, 
        contents, 
        preferredModels: REASONING_MODELS, 
        timeoutMs: 7000 
      });
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (e) {
      console.error('Gemini Capsule Gap hiba:', e);
    }
  }

  // Fallback ha nincs API kapcsolat
  return [
    {
      id: 'gap-blazer',
      title: 'Slim Fit Sötétkék Strukturált Gyapjú Zakó',
      recommendedFit: 'Slim tailored',
      impact: '+7 Új Outfit Variáció',
      estimatedPrice: '38 000 - 68 000 Ft',
      category: 'outerwear',
      season: 'Egész évben',
      reason: 'A smart casual és üzleti megjelenés abszolút sarokköve: karcsúsított szabása határozott vállat és arányos sziluettet ad.',
      isReplacement: false,
      searchKeywords: 'slim fit navy blue tailored wool blazer férfi zakó'
    },
    {
      id: 'gap-knit-polo',
      title: 'Slim Fit Tengerkék Finomkötött Merino Pólóing',
      recommendedFit: 'Tailored fit',
      impact: '+6 Új Outfit Variáció',
      estimatedPrice: '18 000 - 32 000 Ft',
      category: 'knitwear',
      season: 'Tavasz / Nyár',
      reason: 'A tökéletes híd a lezser póló és a formális ing között, zakó alá simuló szabással.',
      isReplacement: false,
      searchKeywords: 'slim fit knitted merino polo shirt férfi finomkötött galléros póló'
    },
    {
      id: 'gap-white-shirt',
      title: 'Contemporary Fit Fehér Oxford Pamuting',
      recommendedFit: 'Contemporary / Slim',
      impact: '+8 Új Outfit Variáció',
      estimatedPrice: '16 000 - 30 000 Ft',
      category: 'tops',
      season: 'Egész évben',
      reason: 'A leguniverzálisabb felsőruházat, ami minden zakóval és nadrággal azonnal működik.',
      isReplacement: false,
      searchKeywords: 'slim fit white 100% cotton oxford shirt pamuting'
    },
    {
      id: 'gap-leather-loafers',
      title: 'Barna Bőr Penny Loafer Cipő',
      recommendedFit: 'True to size / Classic last',
      impact: '+5 Új Outfit Variáció',
      estimatedPrice: '32 000 - 58 000 Ft',
      category: 'shoes',
      season: 'Tavasz / Nyár / Ősz',
      reason: 'Elengedhetetlen a Smart Casual és olasz Sprezzatura eleganciához.',
      isReplacement: false,
      searchKeywords: 'brown leather penny loafers férfi félcipő'
    }
  ];
}
