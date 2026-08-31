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

      const prompt = `Te egy világklasszis személyi stylist, szabászati szakértő és kapszula ruhatár döntéstámogató vagy.
ELEMEZD A MEGADOTT RUHADARABOT (FOTÓ VAGY WEBSHOP LINK / CIKKSZÁM ALAPJÁN) ÉS VÉGEZD EL A 4 DÖNTÉSI PILLÉR ÉRTÉKELÉST, KÜLÖNÖS TEKINTETTEL A SZABÁSRA (FIT), A STILISZTIKAI LEFEDETTSÉGRE / REDUNDANCIÁRA, AZ ANYAGMINŐSÉGRE ÉS A TÖKÉLETES ANATÓMIAI RÉTEGEZÉSRE!
${itemName ? `Megadott név: "${itemName}"` : ''} ${itemPrice ? `Ár: "${itemPrice}"` : ''} ${webshopTextInfo ? `Webshop info: ${webshopTextInfo}` : ''}
Felhasználó profilja: ${JSON.stringify({ height: styleProfile.height, weight: styleProfile.weight, body: styleProfile.bodyType, skin: styleProfile.skinTone, styles: styleProfile.preferredStyles, philosophy: styleProfile.stylePhilosophy })}

🚫 FELHASZNÁLÓ EGYÉNI STÍLUSSZABÁLYAI & TILTÁSAI (SZIGORÚAN KÖTELEZŐ BETARTANI!):
${customRules.length > 0 ? customRules.map(r => `• ${r}`).join('\n') : 'Nincsenek külön rögzített tiltások.'}

Meglévő ruhatár (${compactWardrobe.length} elem gazdag metaadatokkal): ${JSON.stringify(compactWardrobe)}

SZIGORÚ ANTI-HALLUCINÁCIÓS SZABÁLYOK:
1. Ha a kép vagy az ismert márka & SKU (pl. Next #AA1-939, Zara, Reserved) alapján a termék 100%-ban egyértelmű, elemezd a valós darabot.
2. HA NINCS FOTÓ ÉS A WEBSHOP BEMENET ALAPJÁN A RUHA NEM AZONOSÍTHATÓ BIZTOSAN:
   - SOHA NE TALÁLJ KI KITALÁLT RUHÁT VAGY FANTOM SZETTEKET!
   - Állítsd be: "isUnknown": true, "verdict": "Kép vagy adat szükséges", "verdictSummary": "A megadott link vagy bemenet alapján nem sikerült automatikusan beazonosítani a konkrét ruhadarabot. Kérlek illeszd be a termék fotóját a vágólapról (Ctrl+V) vagy add meg a nevét és kategóriáját a megbízható döntéstámogatáshoz!", "fitMismatchWarning": "⚠️ A termék vizuális adatai nem állnak rendelkezésre a megbízható értékeléshez.", "pros": [], "cons": []

4 DÖNTÉSI PILLÉR & SARTORIAL LOGIKA:

1. 👔 KOMBINÁLHATÓSÁG & 3 GARANTÁLT KOMPLETT OUTFIT (Kötelező Anatómiai Rétegzés):
   - Készíts 3 különböző komplett outfitet a kiszemelt ruhadarabbal ÉS a meglévő gardrób elemeivel (használd a pontos 'id'-kat a 'matchedItemIds' tömbben!).
   - ⚠️ KÖTELEZŐ BÁZISRÉTEG SZABÁLY (Base Layer Guard):
     * MINDEN OUTFITNEK KÖTELEZŐEN TARTALMAZNIA KELL EGY BÁZIS INGET VAGY PÓLÓT ('tops')!
     * HA A KISZEMELT TERMÉK EGY PULÓVER ('knitwear') VAGY ZAKÓ/KABÁT ('outerwear'): A pulóver és zakó egy KÖZTES / KÜLSŐ réteg! Ezért a meglévő ruhatárból a 'matchedItemIds' listába KÖTELEZŐEN VÁLASSZ egy megfelelő BÁZIS INGET VAGY PÓLÓT ('tops' - pl. pamuting vagy galléros ing)! SOHA ne tegyél össze szettet pulóverrel úgy, hogy nincs alatta bázis ing/póló a meglévő ruhatáradból!
     * Anatómiai rétegrend: 1 db Bázis felső ('tops' - ing/póló) + 0-1 db Köztes réteg ('knitwear' - pulóver) + 0-2 db Külső réteg ('outerwear' - zakó és/vagy télikabát) + 1 db Alsó ('bottoms' - nadrág) + 1 db Lábbeli ('shoes' - cipő).
   - ❄️ TÉLI / HIDEG RÉTEGEZÉS: Hideg időjárási szettnél a zakó ('blazer') FÖLÉ rétegződhet a téli szövetkabát ('overcoat' / 'coat')! Ha a kiszemelt darab egy zakó, hideg szettnél párosíthatod a ruhatárban lévő nagykabáttal; ha téli kabát, alatta szerepelhet zakó + ing!

2. ⚖️ VÁLTOZATOSSÁG, DUPLIKÁCIÓ & STILISZTIKAI LEFEDETTSÉG / REDUNDANCIA (Aesthetic Overlap):
   - Vizsgáld meg, hogy van-e már a ruhatárban olyan darab, ami STILISZTIKAILAG ÉS FUNKCIONÁLISAN UGYANEZT A MEGJELENÉST / SZEREPKÖRT nyújtja (pl. van már sötétkék gyapjú zakó, vagy sötétbarna loafer, vagy fehér pamuting)!
   - Ha van ilyen darab, és annak állapota 'Vadonatúj / Kifogástalan' vagy 'Megkímélt / Kiváló':
     * Állítsd be az 'aestheticOverlap' objektumot:
       { "isRedundant": true, "existingItemName": "A meglévő hasonló darab pontos neve", "reason": "Szakmai indoklás, miért felesleges stilisztikai duplikáció", "alternativeRecommendation": "Konkrét hiánypótló javaslat (mit érdemes inkább venni helyette, pl. teveszínű zakó vagy olívazöld chino, ami valóban tágítja a stílusskálát)" }
     * Csökkentsd a pontszámot és tedd be a 'cons' listába!
   - Ha a meglévő hasonló darab 'Játszós / Kopott' vagy 'Lecserélendő', akkor ez egy KIVÁLÓ MINŐSÉGI CSERE ('isRedundant': false, ajánld a cserét!).

3. 📐 SZEMÉLYES ILLESZKEDÉS, SZABÁS (FIT) & EGYÉNI SZABÁLYOK:
   - 🔍 VALÓSÁGHŰ SZABÁS-AZONOSÍTÁS: A termék szabását ('fit') KIZÁRÓLAG a webshop termékleírásából, címéből vagy fotójának valós formájából azonosítsd! Ha a termék egy klasszikus kötött pulóver (pl. Reserved Merinógyapjú pulóver) és nincs külön feltüntetve, hogy karcsúsított (slim), akkor a szabása 'Regular Fit' vagy 'Classic Fit', NEM Slim Fit! SOHA ne találd ki, hogy Slim Fit csak azért, mert a felhasználó profiljában az szerepel!
   - SZABÁSVISSZAJELZÉS: Ha a termék valós szabása (pl. Regular Fit) eltér a felhasználó preferált szabásától (pl. Slim tailored), jelezd a 'fitMismatchWarning' mezőben (pl. "⚠️ Szabásbeli eltérés: A kiszemelt pulóver Regular / egyenes szabású, míg a ruhatáradban a Slim / karcsúsított vonalvezetés dominál") és adj konkrét méretválasztási javaslatot ('sizingAdvice')!
   - EGYÉNI SZABÁLYSÉRTÉS: Ha a termék ütközik egyéni stílusszabállyal (pl. 'Nem szeretem a pólóingeket', 'Csak természetes anyagok', 'Kerülöm a skinny szabást'), azonnal generálj kiemelt figyelmeztetést a 'fitMismatchWarning'-ban, és állítsd 'Gondold Át' vagy 'Kerülendő' státuszra!
   - SZEMÉLYES ÉRTÉKELÉS ('personalFitVerdict'): Részletes szakvélemény a bőrtónus, testalkat és stílus DNS illeszkedéséről.

4. 🧶 ANYAGMINŐSÉG & MŰSZÁL AUDIT:
   - Prémium természetes anyagok (100% gyapjú, kasmír, len, egyiptomi pamut, selyem, valódi bőr): 'isSynthetic': false, 'fabricScore': 9.5, 'fabricWarning': null vagy elismerő értékelés.
   - Olcsó, nem lélegző műszál (100% poliészter, akril, műbőr/PU): 'isSynthetic': true, 'fabricScore': 3-5, kötelező 'fabricWarning', minőségi pontszám csökkentés, 'compatibilityScore' max 50-60%.

VÁLASZOLJ KIZÁRÓLAG ÉRVÉNYES JSON FORMÁTUMBAN:
{
  "item": {
    "name": "${itemName || 'Elegáns magyar terméknév'}",
    "category": "outerwear" | "knitwear" | "tops" | "bottoms" | "shoes" | "dresses" | "skirts" | "accessories",
    "subCategory": "blazer" | "knitwear" | "shirt" | "t-shirt" | "polo" | "trousers" | "jeans" | "loafers" | "sneakers" | "boots" | "coat" | "overcoat" | "jacket" | "other",
    "color": "Valódi fő szín magyarul (pl. Sötétkék, Homokbézs, Fekete)",
    "colorHex": "#hex",
    "material": "Valós vagy kinyert anyagösszetétel (pl. 100% Merinógyapjú / 100% Gyapjú / 100% Poliészter)",
    "brand": "${webshopBrand || 'Márkanév / Gyártó ha felismerhető'}",
    "size": "Méret ha webshopból vagy címkéből kivehető",
    "fit": "Valós szabás (pl. Regular Fit, Classic Fit, Slim Fit, Relaxed, Oversized, Tapered)",
    "qualityScore": 9.2,
    "formality": "Smart Casual",
    "styleArchetype": "Old Money & Quiet Luxury",
    "condition": "Vadonatúj / Kifogástalan",
    "stylingTip": "Mivel hordd és hogyan rétegezd (mindig bázis ingre/pólóra)",
    "whenToWear": "Mikor hordd",
    "colorHarmony": "Színharmónia indoklás",
    "bodyFitAdvice": "Szabás, egyéni stílusszabályok és testalkat indoklás",
    "tags": ["alapdarab"]
  },
  "compatibilityScore": 94,
  "verdict": "Erősen Ajánlott" | "Érdemes Megfontolni" | "Gondold Át",
  "verdictSummary": "Részletes szakmai összefoglaló a vásárlási döntésről, az anyagösszetételről és az egyéni szabályokról",
  "pros": [
    "2-4 konkrét indok, amiért megéri megvenni (pl. prémium 100% merinógyapjú anyag, kitűnő kombinálhatóság)"
  ],
  "cons": [
    "1-3 megfontolandó szempont vagy figyelmeztetés (pl. regular szabás miatt érdemes lehet kisebb méretet választani)"
  ],
  "personalFitVerdict": "Részletes szakvélemény a bőrtónushoz, testalkathoz és stílus DNS-hez való illeszkedésről",
  "duplicationWarning": "Duplikáció vagy csere-javaslat",
  "aestheticOverlap": {
    "isRedundant": false,
    "existingItemName": "Meglévő hasonló ruhadarab neve (ha van)",
    "reason": "Miért fedi le már ez a darab a megjelenést",
    "alternativeRecommendation": "Mit érdemes inkább venni helyette, ami valóban tágítja a kapszula ruhatárat"
  },
  "fitMismatchWarning": "Szabásbeli eltérés VAGY személyes stílusszabály ütközés (ha nincs hiba, null)",
  "fabricWarning": "Kiemelt figyelmeztetés ha műszálas/poliészter, vagy elismerés ha tiszta természetes anyag",
  "fabricScore": 9.5,
  "isSynthetic": false,
  "sizingAdvice": "Méretválasztási tanács a meglévő márkáid és testalkatod alapján",
  "outfits": [
    {
      "title": "Szett 1 Neve",
      "occasion": "Alkalom",
      "styleType": "pl. Olasz Sprezzatura",
      "matchedItemIds": ["bázis_ing_id", "nadrág_id", "cipő_id", "opcionális_zakó_id"],
      "stylingTip": "Gyakorlati rétegezési és viselési útmutató (pl. a finomkötött pulóver alá az egyiptomi pamuting gallérja elegáns kontrasztot ad)",
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
        timeoutMs: 22000
      });

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
          const allItems = [extractedItem, ...matchedItems];

          // 1. Kötelező Bázis Felső ellenőrzés (tops)
          const hasTops = allItems.some(i => i.category === 'tops');
          if (!hasTops) {
            const availableTop = wardrobe.find(w => w.category === 'tops' && w.condition !== 'Lecserélendő' && !allItems.some(i => i.id === w.id)) ||
                                 wardrobe.find(w => w.category === 'tops' && !allItems.some(i => i.id === w.id));
            if (availableTop) {
              allItems.push(availableTop);
            }
          }

          // 2. Kötelező Nadrág ellenőrzés (bottoms)
          const hasBottoms = allItems.some(i => i.category === 'bottoms');
          if (!hasBottoms) {
            const availableBottom = wardrobe.find(w => w.category === 'bottoms' && w.condition !== 'Lecserélendő' && !allItems.some(i => i.id === w.id)) ||
                                   wardrobe.find(w => w.category === 'bottoms' && !allItems.some(i => i.id === w.id));
            if (availableBottom) {
              allItems.push(availableBottom);
            }
          }

          // 3. Kötelező Lábbeli ellenőrzés (shoes)
          const hasShoes = allItems.some(i => i.category === 'shoes');
          if (!hasShoes) {
            const availableShoes = wardrobe.find(w => w.category === 'shoes' && w.condition !== 'Lecserélendő' && !allItems.some(i => i.id === w.id)) ||
                                   wardrobe.find(w => w.category === 'shoes' && !allItems.some(i => i.id === w.id));
            if (availableShoes) {
              allItems.push(availableShoes);
            }
          }

          // 4. Természetes anatómiai rétegrend szerinti rendezés:
          // Bázis felső (tops) -> Köztes kötött (knitwear) -> Zakó/Kabát (outerwear) -> Nadrág (bottoms) -> Lábbeli (shoes)
          const orderMap = { tops: 1, knitwear: 2, outerwear: 3, bottoms: 4, shoes: 5, accessories: 6 };
          allItems.sort((a, b) => (orderMap[a.category] || 99) - (orderMap[b.category] || 99));

          return {
            ...o,
            items: allItems
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

1. 👔 KÖTELEZŐ BÁZISRÉTEG (Base Layer - 'tops'):
   - MINDEN SZETTNEK KÖTELEZŐEN TARTALMAZNIA KELL pontosan egy közvetlenül a bőrön hordható felső bázisréteget: 'tops' (ing vagy prémium pamut póló)!
   - Zakóhoz vagy elegáns eseményhez KÖTELEZŐEN galléros ing ('subCategory': 'shirt').
   - ❌ SZIGORÚ TILALOM: SOHA NE AJÁNLJ PULÓVERT ('knitwear') VAGY ZAKÓT ('outerwear') CSUPASZ FELSŐTESTRE BÁZIS ING/PÓLÓ NÉLKÜL!

2. 👖 ALSÓ ('bottoms') ÉS 👞 LÁBBELI ('shoes'):
   - Minden szettnek kötelező része pontosan 1 db nadrág és pontosan 1 pár lábbeli (hidegben zárt elegáns cipő/csizma, melegben loafer/sneaker).

3. 🧥 KÖZTES & KÜLSŐ RÉTEGEZÉS (Mid & Outer Layers):
   - Kötöttáru / Pulóver ('knitwear'): Opcionálisan 0 vagy 1 db pulóver/kardigán az ingre rétegezve.
   - ❄️ TÉLI / HIDEG IDŐ (< 12°C vagy Téli esemény):
     * KETTŐS KÜLSŐ RÉTEG ENGEDÉLYEZETT ÉS AJÁNLOTT: A zakó ('blazer') FÖLÉ mehet a téli szövetkabát / nagykabát ('overcoat' / 'coat')!
     * Teljes luxus téli rétegezés: Ing + Kasmír pulóver + Zakó + Nagykabát + Nadrág + Bőrcipő/Csizma.
   - 🌤️ ÁTMENETI IDŐ (12–19°C): 1 db zakó vagy könnyű dzseki az ingre (vagy ing + vékony pulóver).
   - ☀️ MELEG / NYÁR (20°C+): Könnyű len/pamut ing vagy felső + nadrág + loafer/sneaker. Vastag télikabát és vastag kötött pulóver SZIGORÚAN TILOS!

4. 3 KÜLÖNBÖZŐ SZEMÉLYES HANGULAT AZ ESEMÉNYRE:
   - Készíts 3 olyan komplett szettet, amelyek a fenti rétegezési szabályok szerint épülnek fel, de 3 különböző stílusárnyalatot képviselnek (pl. 1. Kifinomult & Letisztult, 2. Karakteres & Laza, 3. Kényelmes & Modern).

VÁLASZOLJ KIZÁRÓLAG ÉRVÉNYES JSON TÖMBKÉNT:
[
  {
    "id": "outfit-1",
    "title": "Kifejező szett elnevezés",
    "styleArchetype": "A felhasználó személyes stílusához és az alkalomhoz illő stílusnév",
    "occasion": "${eventName}",
    "matchScore": 97,
    "stylingNotes": "Személyre szabott stylist tanács a viseléshez és a darabok összhangjához",
    "layeringAdvice": "Gyakorlati rétegezési útmutató (pl. 'Kültéren a teveszínű gyapjúkabát a zakó fölött melegen tart, a meleg étterembe érve levéve a sötétkék zakó és az egyiptomi pamuting önmagában is kifogástalan eleganciát nyújt.')",
    "culturalFitReasoning": "Hogyan érvényesül a felhasználó személyes stílusa, egyéni szabályai és az esemény összhangja ebben a szettben",
    "weatherSuitability": "Időjárási és hőmérsékleti megfelelés (${weather?.temperature || 20}°C)",
    "itemIds": ["ing_id", "opcionalis_pulover_id", "opcionalis_zako_id", "opcionalis_teli_kabat_id", "nadrag_id", "cipo_id"]
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
        return parsed.map((p, idx) => ({
          id: p.id || `outfit-${Date.now()}-${idx}`,
          title: p.title || `${idx + 1}. Stílusos Szett`,
          styleArchetype: p.styleArchetype || 'Eseményhez Hangolt',
          occasion: p.occasion || eventName,
          matchScore: p.matchScore || 94 + (idx * 2) % 5,
          stylingNotes: p.stylingNotes || "Harmonikus összeállítás a gardróbodból.",
          layeringAdvice: p.layeringAdvice || "Funkcionálisan rétegezett összeállítás, amely a belső térben és hűvösebb időben is jól alkalmazkodik.",
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
Elemezd a felhasználó gardróbját (${wardrobe.length} elem), testalkatát és stílusprofilját:
Stílusprofil: ${JSON.stringify({ height: profile.height, weight: profile.weight, body: profile.bodyType, preferredStyles: profile.preferredStyles, philosophy: profile.stylePhilosophy })}

🚫 FELHASZNÁLÓ EGYÉNI STÍLUSSZABÁLYAI & TILTÁSAI:
${customRules.length > 0 ? customRules.map(r => `• ${r}`).join('\n') : 'Nincsenek külön rögzített tiltások.'}

Meglévő ruhatár elemek (${compactItems.length} db részletes adatokkal): ${JSON.stringify(compactItems)}
${replacementCandidates.length > 0 ? `Elhasználódott / játszós darabok a szekrényben: ${JSON.stringify(replacementCandidates.map(r => ({ name: r.name, category: r.category, color: r.color })))}` : ''}

KRITIKUS KAPSZULA GAP SZABÁLYOK:

1. 👞 SZEZONÁLIS LÁBBELI ÉS FUNKCIONÁLIS GAP AUDIT (1. Számú Prioritás!):
   - ${!hasAutumnWinterShoes ? '⚠️ FIGYELEM: A felhasználónak JELENLEG 0 DB ŐSZI / TÉLI LÁBBELIJE (pl. bőr Chelsea csizma, Chukka bakancs, téli bélelt elegáns bőrcipő) van a ruhatárában! Ez a ruhatár legkritikusabb szezonális hiánya. KÖTELEZŐ legalább egy őszi/téli prémium bőrlábbelit ajánlani (pl. "Barna Full-grain Bőr Chelsea Csizma")!' : 'A lábbeli kategória rendelkezik őszi/téli fedettséggel.'}

2. 🛑 KATEGÓRIA TELÍTETTSÉGI STOP (Category Saturation Guard):
   - Ha egy adott típusból / kategóriából (pl. ingek, vékony pamut felsők, loafer cipők) MÁR VAN 2 VAGY TÖBB szép állapotú darab a ruhatárban, SZIGORÚAN TILOS még egy hasonlót ajánlani!
   - Csak olyan kulcsdarabokat ajánlj, amelyek a ruhatár VALÓDI HIÁNYZÓ SZEZONÁLIS VAGY FUNKCIÓS PILLÉREIT (pl. téli lábbeli, gyapjú szövetnadrág, átmeneti réteg) pótolják!

3. 📐 SZABÁS (FIT) ÉS ANYAGMINŐSÉG:
   - Kizárólag 100% természetes prémium anyagokat ajánlj (gyapjú, len, kasmír, egyiptomi pamut, valódi bőr).
   - Építsd be a preferált szabást (pl. Slim tailored) a címbe és a keresési kulcsszavakba (searchKeywords).

4. ♻️ INTELLIGENS CSERE (Replacement):
   - Csak akkor jelölj meg cserét ('isReplacement': true), ha az adott kulcsfontosságú darabból nincs más jó állapotú alternatíva a ruhatárban.

VÁLASZOLJ KIZÁRÓLAG ÉRVÉNYES JSON TÖMBKÉNT:
[
  {
    "id": "gap-1",
    "title": "Pontos terméknév a szabással és anyaggal (pl. 'Sötétbarna Full-Grain Bőr Chelsea Csizma')",
    "recommendedFit": "pl. Slim tailored / Classic last",
    "impact": "+8 Új Őszi/Téli Outfit Variáció",
    "estimatedPrice": "42 000 - 75 000 Ft",
    "category": "shoes" | "outerwear" | "knitwear" | "tops" | "bottoms" | "accessories",
    "season": "Ősz / Tél" | "Tavasz / Nyár" | "Egész évben",
    "reason": "Részletes szakmai indoklás, miért ez a kulcsdarab hiányzik a ruhatárból és hogyan zárja le a szezonális funkcionális rést",
    "isReplacement": false,
    "searchKeywords": "konkrét keresési kulcsszavak webshophoz (pl. mens dark brown leather chelsea boots)"
  }
]`;

      const contents = [{ parts: [{ text: prompt }] }];
      const parsed = await callGeminiApi({ 
        apiKey, 
        contents, 
        preferredModels: REASONING_MODELS, 
        timeoutMs: 20000 
      });
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
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
      impact: '+9 Új Őszi/Téli Outfit Variáció',
      estimatedPrice: '45 000 - 85 000 Ft',
      category: 'shoes',
      season: 'Ősz / Tél',
      reason: 'A ruhatárad legfontosabb hiányzó őszi-téli sarokköve: vízálló, elegáns és tökéletesen működik flanelnadrággal és gyapjúkabáttal.',
      isReplacement: false,
      searchKeywords: 'mens dark brown leather chelsea boots ferfi bor csizma'
    },
    {
      id: 'gap-flannel-trousers',
      title: 'Sötétszürke Olasz Gyapjú Flanel Nadrág',
      recommendedFit: 'Slim tailored / Tapered',
      impact: '+7 Új Outfit Variáció',
      estimatedPrice: '28 000 - 52 000 Ft',
      category: 'bottoms',
      season: 'Ősz / Tél',
      reason: 'Meleg és strukturált eleganciát nyújt a hideg évszakokban, tökéletes hidat képezve a zakók és téli kötöttek felé.',
      isReplacement: false,
      searchKeywords: 'mens slim fit charcoal wool flannel trousers gyapju nadrag'
    },
    {
      id: 'gap-camel-blazer',
      title: 'Teveszínű Strukturálatlan Gyapjú Zakó',
      recommendedFit: 'Slim tailored',
      impact: '+8 Új Outfit Variáció',
      estimatedPrice: '45 000 - 78 000 Ft',
      category: 'outerwear',
      season: 'Egész évben',
      reason: 'A sötétkék zakód mellé új stílusdimenziót és meleg tónusú eleganciát hoz a ruhatáradba.',
      isReplacement: false,
      searchKeywords: 'mens camel wool blazer ferfi teveszin gyapju zako'
    }
  ];

  const rulesLower = (Array.isArray(profile?.customStylingRules) ? profile.customStylingRules.join(' ') : '').toLowerCase();
  return fallbackGaps.filter(g => {
    if ((rulesLower.includes('pólóing') || rulesLower.includes('polo')) && g.id?.includes('polo')) return false;
    return true;
  });
}
