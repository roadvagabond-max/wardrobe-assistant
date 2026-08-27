// Advanced Google Gemini Vision & Fashion Stylist Intelligence Engine
import { ensureBase64Image } from './imageOptimizer';

const getGeminiApiKey = () => {
  return import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('GEMINI_API_KEY') || 'AQ.Ab8RN6KI92lORSWUYkyTduRjayE_470SGe4rkmFWdAT5a29NsA';
};

export const isGeminiConfigured = () => Boolean(getGeminiApiKey());

// Google Gemini official 2026 models in order of stability & speed
const GEMINI_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-3.1-flash-lite'
];

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
async function callGeminiApi({ apiKey, contents, tools = null, maxOutputTokens = 2500, temperature = 0.15 }) {
  let lastError = null;

  // Prioritize previously successful model for ultra-fast zero-latency calls
  const modelsToTry = activeFastModel
    ? [activeFastModel, ...GEMINI_MODELS.filter(m => m !== activeFastModel)]
    : GEMINI_MODELS;

  for (const model of modelsToTry) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

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
      console.warn(`Hiba vagy időtúllépés a(z) ${model} modellel:`, e.name === 'AbortError' ? 'Időtúllépés (>8.5s)' : e.message);
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

      return await callGeminiApi({ apiKey, contents: [{ parts }], tools });
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
      
      // Lean, compact representation of wardrobe for ultra-low token transfer
      const compactWardrobe = wardrobe
        .filter(w => w.condition !== 'Javításra vár')
        .map(w => ({
          id: w.id,
          name: w.name,
          cat: w.category,
          col: w.color,
          form: w.formality,
          fit: w.fit || '',
          brand: w.brand || '',
          size: w.size || '',
          cond: w.condition,
          style: w.styleArchetype
        }));

      const webshopTextInfo = [
        webshopContext.rawInput ? `WEBSHOP TERMÉKLINK / BEMENET: "${webshopContext.rawInput}"` : '',
        webshopContext.url ? `URL: "${webshopContext.url}"` : '',
        webshopContext.title ? `CÉLTERMÉK: "${webshopContext.title}"` : '',
        webshopContext.brand ? `Márka: "${webshopContext.brand}"` : '',
        webshopContext.productCode ? `Cikkszám / Termékkód (SKU): "${webshopContext.productCode}"` : '',
        webshopContext.description ? `Leírás: "${webshopContext.description}"` : ''
      ].filter(Boolean).join(' | ');

      const prompt = `Te egy világklasszis személyi stylist, szabászati és vásárlási döntéstámogató vagy.
ELEMEZD A MEGADOTT RUHADARABOT (FOTÓ VAGY WEBSHOP LINK / CIKKSZÁM ALAPJÁN A GOOGLE ÉS DIVAT-TUDÁSODAT HASZNÁLVA) ÉS VÉGEZD EL A 3 DÖNTÉSI PILLÉR ÉRTÉKELÉST, KÜLÖNÖS TEKINTETTEL A SZABÁSRA (FIT) ÉS A TESTALKATHHOZ VALÓ ILLESZKEDÉSRE!
${itemName ? `Megadott név: "${itemName}"` : ''} ${itemPrice ? `Ár: "${itemPrice}"` : ''} ${webshopTextInfo ? `Webshop info: ${webshopTextInfo}` : ''}
Felhasználó profilja: ${JSON.stringify({ height: styleProfile.height, weight: styleProfile.weight, body: styleProfile.bodyType, skin: styleProfile.skinTone, styles: styleProfile.preferredStyles, philosophy: styleProfile.stylePhilosophy })}
Meglévő ruhatár (${compactWardrobe.length} elem a szabásokkal és méretekkel): ${JSON.stringify(compactWardrobe)}

3 DÖNTÉSI PILLÉR:
1. Kombinálhatóság: Készíts 3 különböző komplett outfitet a meglévő gardrób elemeivel (használd a pontos 'id'-kat a 'matchedItemIds' tömbben!).
2. Változatosság & Duplikáció: Ha van már hasonló ruha, de az 'Kopott / Játszós' vagy 'Lecserélendő', KIFEJEZETTEN AJÁNLANI KELL a megvásárlást mint minőségi cserét! Ha van szép állapotú hasonló, jelezd a duplikációt.
3. Személyes Illeszkedés & SZABÁSBELI ELTÉRÉS (Fit Analysis):
   - NÉZD MEG, MILYEN SZABÁST HORD ÁLTALÁBAN A USER a ruhatárában (pl. Slim tailored, Tapered, Regular, Oversized)!
   - Ha a user pl. Slim Fit zakókat hord, de ez a termék Regular Fit vagy Bővebb szabású, KIFEJEZETTEN HÍVD FEL RÁ A FIGYELMET a 'fitMismatchWarning' mezőben!
   - Értékeld a testalkathoz (pl. V-alak, atlétikus, teltebb) és magassághoz való vizuális arányokat.

VÁLASZOLJ KIZÁRÓLAG ÉRVÉNYES JSON FORMÁTUMBAN:
{
  "item": {
    "name": "${itemName || 'Elegáns magyar terméknév'}",
    "category": "outerwear" | "knitwear" | "tops" | "bottoms" | "shoes" | "dresses" | "skirts" | "accessories",
    "subCategory": "blazer" | "knitwear" | "shirt" | "t-shirt" | "polo" | "trousers" | "jeans" | "loafers" | "sneakers" | "dress" | "coat" | "other",
    "color": "Valódi fő szín magyarul (pl. Sötétkék, Homokbézs, Fekete)",
    "colorHex": "#hex",
    "material": "Anyagösszetétel",
    "brand": "Márkanév / Gyártó ha felismerhető",
    "size": "Méret ha webshopból vagy címkéből kivehető",
    "fit": "Felismerhető szabás (pl. Slim Fit, Regular Fit, Relaxed, Oversized, Tapered, Contemporary)",
    "qualityScore": 9.2,
    "formality": "Smart Casual",
    "styleArchetype": "Old Money & Quiet Luxury",
    "condition": "Vadonatúj / Kifogástalan",
    "stylingTip": "Mivel hordd",
    "whenToWear": "Mikor hordd",
    "colorHarmony": "Színharmónia indoklás",
    "bodyFitAdvice": "Szabás és testalkat indoklás",
    "tags": ["alapdarab"]
  },
  "compatibilityScore": 94,
  "verdict": "Erősen Ajánlott" | "Érdemes Megfontolni" | "Gondold Át",
  "verdictSummary": "Részletes szakmai összefoglaló a vásárlási döntésről",
  "duplicationWarning": "Duplikáció vagy csere-javaslat",
  "personalFitVerdict": "Személyes illeszkedés értékelése a testalkat alapján",
  "fitMismatchWarning": "SZABÁSBELI FIGYELMEZTETÉS: ha a termék szabása (pl. Regular) eltér a felhasználó ruhatárában domináló szabástól (pl. Slim) vagy a testalkatától, részletesen indokold meg! Ha nincs eltérés, írd le a tökéletes egyezést.",
  "sizingAdvice": "Méretválasztási tanács a felhasználó márkái és testalkata alapján",
  "pros": ["3 konkrét előny"],
  "cons": ["1 megfontolandó szempont"],
  "outfits": [
    {
      "id": "eval-1",
      "title": "1. Szett Címe",
      "occasion": "Munka / Tárgyalás",
      "styleType": "Klasszikus & Kifinomult",
      "matchScore": 96,
      "stylingTip": "Stílustipp",
      "matchedItemIds": ["létező ID-k a fenti gardróbból"]
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
      const parsed = await callGeminiApi({ apiKey, contents: [{ parts }], tools, temperature: 0.1 });

      const extractedItem = {
        ...(parsed.item || {}),
        name: itemName || parsed.item?.name || 'Új Ruhadarab',
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
      console.error('Gemini unified purchase check hiba:', e);
      throw e;
    }
  }

  throw new Error('Nincs beállítva Gemini API kulcs! Kérlek add meg a Beállításokban.');
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

      return await callGeminiApi({ apiKey, contents: [{ parts }], temperature: 0.1 });
    } catch (e) {
      console.error('Color season analysis hiba:', e);
      throw e;
    }
  }

  throw new Error('Nincs beállítva Gemini API kulcs!');
}

/**
 * 3. AI Outfit Stylist: Kulturális, Geográfiai & Esemény-specifikus Stílusintelligencia
 * Decodes subcultural norms, geography, dress codes, weather, and builds 3 authentic event variations.
 */
export async function generateEventOutfits({ eventName, weather, wardrobe = [], styleProfile = {}, anchorItemIds = [] }) {
  const apiKey = getGeminiApiKey();

  if (apiKey && wardrobe.length > 0) {
    try {
      // Filter out items in "Javításra vár" or "Lecserélendő" unless anchor
      const availableWardrobe = wardrobe.filter(w => 
        anchorItemIds.includes(w.id) || (w.condition !== 'Javításra vár' && w.condition !== 'Lecserélendő')
      );

      const anchorItems = wardrobe.filter(w => anchorItemIds.includes(w.id));

      const prompt = `Te egy világklasszis mester személyi stylist vagy, aki a személyre szabott, önazonos öltözködés nagymestere.

A LEGELSŐ ÉS LEGFONTOSABB SZABÁLY: A FELHASZNÁLÓ EGYÉNI STÍLUS DNS-E AZ ALAP!
Nem sablonos kliséket és jelmezeket készítünk az eseményre, hanem a FELHASZNÁLÓ SAJÁT SZEMÉLYES STÍLUSÁT ÉS EGYÉNISÉGÉT adaptáljuk intelligensen az eseményhez úgy, hogy 100%-ig önazonos és magabiztos maradjon!

FELHASZNÁLÓ STÍLUSPROFILJA ÉS SZEMÉLYES PREFERENCIÁI:
- Preferált Stílusirányzatok: ${JSON.stringify(styleProfile.preferredStyles || ['Klasszikus & Időtlen', 'Old Money & Quiet Luxury', 'Olasz Sprezzatura'])}
- Stílusfilozófia: "${styleProfile.stylePhilosophy || 'Kifinomult elegancia, prémium természetes anyagok és tökéletes szabás'}"
- Kedvenc Színpaletta: ${JSON.stringify(styleProfile.favoriteColors || ['Sötétkék', 'Homokbézs', 'Fekete', 'Olívazöld', 'Törtfehér'])}
- Testalkat és Magasság: ${styleProfile.bodyType || 'Atlétikus'}, ${styleProfile.height || '180 cm'} (${styleProfile.skinTone || 'Természetes bőrtónus'})

ESEMÉNY / ALKALOM: "${eventName}"
HELYSZÍN ÉS IDŐJÁRÁS: ${weather?.city || 'Budapest'}, ${weather?.temperature}°C, ${weather?.condition}
${anchorItems.length > 0 ? `KÖTELEZŐ KULCSDARABOK (Anchor Items): ${JSON.stringify(anchorItems.map(a => ({ id: a.id, name: a.name, category: a.category, color: a.color })))}` : ''}

Ruhatár (${availableWardrobe.length} elem):
${JSON.stringify(availableWardrobe.map(w => ({ id: w.id, name: w.name, category: w.category, color: w.color, formality: w.formality, fit: w.fit || '', condition: w.condition, style: w.styleArchetype })))}

STYLIST DÖNTÉSI LOGIKA (Személyes Stílus DNS + Esemény Harmónia):
1. ÖNAZONOS STÍLUS-ADAPTÁCIÓ:
   - Ha a felhasználó stílusa pl. az elegáns 'Quiet Luxury / Sprezzatura / Klasszikus', és egy lazább eseményre (pl. techno buli, nyári terasz, kerti party) megy:
     Akkor a SAJÁT kifinomult, prémium stílusát fordítsd le az esemény nyelvére (pl. sötét árnyalatú, minőségi finomkötött pólóing, letisztult sötét nadrág, prémium bőr sneaker vagy kigombolt lezser ing), ahelyett hogy klisés vagy kényelmetlen darabokat adnál rá!
   - Kerüld a merev túlöltözöttséget (pl. ne erőltess strukturált öltönyt táncos klubba), de őrizd meg a felhasználó igényességét és stíluskarakterét!

2. 3 KÜLÖNBÖZŐ SZEMÉLYES HANGULAT AZ ESEMÉNYRE:
   - Készíts 3 olyan szettet, amelyek mindegyike a felhasználó ízlésvilágából építkezik, de 3 különböző nüanszot / energiát képvisel (pl. 1. Kifinomult & Letisztult, 2. Karakteres & Laza, 3. Kényelmes & Modern).

VÁLASZOLJ KIZÁRÓLAG ÉRVÉNYES JSON TÖMBKÉNT:
[
  {
    "id": "outfit-1",
    "title": "Kifejező szett elnevezés",
    "styleArchetype": "A felhasználó személyes stílusához és az alkalomhoz illő stílusnév",
    "occasion": "${eventName}",
    "matchScore": 97,
    "stylingNotes": "Személyre szabott stylist tanács a viseléshez és rétegzéshez",
    "culturalFitReasoning": "Hogyan érvényesül a felhasználó személyes stílusa és az esemény összhangja ebben a szettben",
    "weatherSuitability": "Időjárási és kényelmi megfelelés (${weather?.temperature || 20}°C)",
    "itemIds": ["id1", "id2", "id3"]
  }
]`;

      const contents = [{ parts: [{ text: prompt }] }];
      const parsed = await callGeminiApi({ apiKey, contents });
      
      if (Array.isArray(parsed)) {
        return parsed.map((p, idx) => ({
          id: p.id || `outfit-${Date.now()}-${idx}`,
          title: p.title || `${idx + 1}. Stílusos Szett`,
          styleArchetype: p.styleArchetype || 'Eseményhez Hangolt',
          occasion: p.occasion || eventName,
          matchScore: p.matchScore || 94 + (idx * 2) % 5,
          stylingNotes: p.stylingNotes || "Harmonikus összeállítás a gardróbodból.",
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

      const prompt = `Te egy mester kapszula ruhatár-tervező és sartorial stylist vagy.
Elemezd a felhasználó gardróbját (${wardrobe.length} elem), testalkatát és stílusprofilját:
Stílusprofil: ${JSON.stringify({ height: profile.height, weight: profile.weight, body: profile.bodyType, preferredStyles: profile.preferredStyles, philosophy: profile.stylePhilosophy })}
Meglévő ruhatár elemek: ${JSON.stringify(compactItems)}
${replacementCandidates.length > 0 ? `Elhasználódott / játszós darabok a szekrényben: ${JSON.stringify(replacementCandidates.map(r => ({ name: r.name, category: r.category, color: r.color })))}` : ''}

FONTOS SZABÁLYOK AZ AJÁNLÁSOKHOZ:

1. SZABÁS (FIT) BEÉPÍTÉSE:
   - Vizsgáld meg, milyen szabású darabokat hord a felhasználó (pl. Slim tailored, Slim fit, Tapered, Regular)!
   - Ha a felhasználó Slim Fit / karcsúsított szabású ruhákat hord vagy atlétikus testalkatú, akkor az ajánlott darabok megnevezésébe (title) és KIFEJEZETTEN a keresési kulcsszavakba (searchKeywords) is ÉPÍTSD BE a szabást (pl. 'Slim Fit Olasz Gyapjú Zakó', searchKeywords: 'slim fit navy blue wool blazer férfi zakó')!

2. TELÍTETTSÉG & INTELLIGENS CSERE SZABÁLY (Redundancy & Smart Replacement):
   - Ha egy adott típusból / kiegészítőből (pl. fonott öv, fehér bőr sneaker, sötétkék pólóing stb.) a ruhatárban MÁR VAN 2 VAGY TÖBB szép, 'Megkímélt / Kiváló' vagy 'Vadonatúj' állapotú darab, akkor MÉG HA VAN IS egy 'Játszós / Kopott' darab belőle, NEM SZABAD annak lecserélését / pótlását ajánlani!
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
    "reason": "Részletes szakmai indoklás, miért ez a kulcsdarab hiányzik a ruhatárból és hogyan kombinálható a meglévő darabokkal",
    "isReplacement": false,
    "searchKeywords": "konkrét keresési kulcsszavak webshophoz szabással és anyaggal (pl. slim fit navy tailored wool blazer ferfi)"
  }
]`;

      const contents = [{ parts: [{ text: prompt }] }];
      const parsed = await callGeminiApi({ apiKey, contents });
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
