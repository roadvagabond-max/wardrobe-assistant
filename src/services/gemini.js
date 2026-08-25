// Advanced Google Gemini Vision & Fashion Stylist Intelligence Engine
import { ensureBase64Image } from './imageOptimizer';

const getGeminiApiKey = () => {
  return import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('GEMINI_API_KEY') || '';
};

export const isGeminiConfigured = () => Boolean(getGeminiApiKey());

// Google Gemini official models in order of priority (starting with 3.7-flash and 3.6-flash)
const GEMINI_MODELS = [
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash'
];

/**
 * Universal Gemini API caller with automatic multi-model fallback and JSON parser
 */
async function callGeminiApi({ apiKey, contents, tools = null, maxOutputTokens = 1200, temperature = 0.2 }) {
  let lastError = null;

  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const requestBody = {
        contents,
        generationConfig: {
          maxOutputTokens,
          temperature
        }
      };

      if (tools) {
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
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const jsonMatch = rawText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
          const cleaned = jsonMatch ? jsonMatch[0] : rawText
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/i, '')
            .replace(/\s*```$/i, '')
            .trim();
          return JSON.parse(cleaned);
        }
      } else {
        const errBody = await response.text();
        console.warn(`Gemini (${model}) státusz: ${response.status}`, errBody);
        lastError = new Error(`Gemini API hiba (${response.status}): ${errBody.slice(0, 180)}`);
      }
    } catch (e) {
      console.warn(`Hiba a(z) ${model} modellel:`, e);
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
      // Ensure image is converted to Base64 so Gemini Vision API receives the actual pixels
      const resolvedBase64 = await ensureBase64Image(imageBase64OrUrl);

      // Build context from webshop text
      const webshopTextInfo = [
        webshopContext.title ? `CÉLTERMÉK HIVATALOS NEVE: "${webshopContext.title}"` : '',
        webshopContext.brand ? `Márka / Gyártó: "${webshopContext.brand}"` : '',
        webshopContext.productCode ? `Cikkszám / Termékkód (SKU): "${webshopContext.productCode}"` : '',
        webshopContext.description ? `Hivatalos Leírás és Anyagösszetétel: "${webshopContext.description}"` : '',
        webshopContext.rawText ? `Oldal további részletei: "${webshopContext.rawText.slice(0, 800)}"` : ''
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

      const targetFocusInstruction = `FONTOS: A csatolt fotó a vizsgált céltermék valós fotója. A fotó pixelei (sziluett, gallér, ujjak, szabás, textúra, valódi szín) az abszolút elsődleges forrás a darab azonosításához!
- Ha a fotón póló, ing vagy pulóver látható, a kategória KÖTELEZŐEN 'tops' vagy 'knitwear' (soha ne téveszd össze nadrággal)!
- Ha a fotón nadrág vagy farmer látható, a kategória 'bottoms'.
- Ha zakó vagy kabát, a kategória 'outerwear'.
- A valódi színt közvetlenül a fotón látható árnyalatból állapítsd meg!`;

      const prompt = `Te egy világklasszis professzionális személyi stylist, divattanácsadó és ruhatár-tervező vagy.
Elemezd a csatolt képen látható ruhadarabot részletesen és szakértő szemmel!

${targetFocusInstruction}
${webshopTextInfo ? `\n--- HIVATALOS WEBSHOP ADATOK ---\n${webshopTextInfo}\n` : ''}
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
  "brand": "Márkanév ha felismerhető",
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

      // Enable live Google Search Grounding if productCode is present
      const tools = webshopContext.productCode ? [{ googleSearch: {} }] : null;

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
          cond: w.condition,
          style: w.styleArchetype
        }));

      const webshopTextInfo = [
        webshopContext.title ? `CÉLTERMÉK: "${webshopContext.title}"` : '',
        webshopContext.productCode ? `Cikkszám: "${webshopContext.productCode}"` : '',
        webshopContext.description ? `Leírás: "${webshopContext.description.slice(0, 300)}"` : ''
      ].filter(Boolean).join(' | ');

      const prompt = `Te egy világklasszis személyi stylist és vásárlási döntéstámogató vagy.
ELEMEZD A CSATOLT KÉPEN LÉVŐ KISZEMELT RUHÁT ÉS VÉGEZD EL A 3 DÖNTÉSI PILLÉR ÉRTÉKELÉST EGYETLEN MENETBEN!
${itemName ? `Megadott név: "${itemName}"` : ''} ${itemPrice ? `Ár: "${itemPrice}"` : ''} ${webshopTextInfo ? `Webshop info: ${webshopTextInfo}` : ''}
Felhasználó profilja: ${JSON.stringify({ height: styleProfile.height, weight: styleProfile.weight, body: styleProfile.bodyType, skin: styleProfile.skinTone, styles: styleProfile.preferredStyles })}
Meglévő ruhatár (${compactWardrobe.length} elem): ${JSON.stringify(compactWardrobe)}

3 DÖNTÉSI PILLÉR:
1. Kombinálhatóság: Készíts 3 különböző outfitet a meglévő gardrób elemeivel (használd a pontos 'id'-kat a 'matchedItemIds' tömbben!).
2. Változatosság & Duplikáció: Ha van már hasonló ruha, de az 'Kopott / Játszós' vagy 'Lecserélendő', KIFEJEZETTEN AJÁNLANI KELL a megvásárlást mint minőségi pótlást! Ha van szép állapotú hasonló, jelezd a duplikációt.
3. Személyes Illeszkedés: Értékeld a testalkathoz, bőrtónushoz és stílushoz való passzolást.

VÁLASZOLJ KIZÁRÓLAG ÉRVÉNYES JSON FORMÁTUMBAN:
{
  "item": {
    "name": "${itemName || 'Elegáns magyar terméknév'}",
    "category": "outerwear" | "knitwear" | "tops" | "bottoms" | "shoes" | "dresses" | "skirts" | "accessories",
    "subCategory": "blazer" | "knitwear" | "shirt" | "t-shirt" | "polo" | "trousers" | "jeans" | "loafers" | "sneakers" | "dress" | "coat" | "other",
    "color": "Valódi fő szín magyarul (pl. Sötétkék, Homokbézs, Fekete)",
    "colorHex": "#hex",
    "material": "Anyagösszetétel",
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
  "personalFitVerdict": "Személyes illeszkedés értékelése",
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

      const tools = webshopContext.productCode ? [{ googleSearch: {} }] : null;
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
 * 3. AI Outfit Stylist: Szabadszöveges esemény, időjárás & Anchor Kulcsdarab támogatás
 * Generates 3 distinct personal style variations (Classic Sharp, Modern Relaxed, Statement Expressive)
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

      const prompt = `Te egy mester személyi stylist és ruhatár-tervező vagy.
Felhasználó által megadott esemény / alkalom leírás: "${eventName}"
(Értelmezd a szövegben szereplő időpontot: pl. "holnap este", "hétvége", napszak, esemény típusa!)
Időjárás: ${weather?.temperature}°C, ${weather?.condition} (${weather?.recommendation || ''})
Felhasználó stílusprofilja: ${JSON.stringify(styleProfile)}
${anchorItems.length > 0 ? `KÖTELEZŐ KULCSDARABOK (Anchor Items - MINDEN szettben KÖTELEZŐEN szerepelniük kell!): ${JSON.stringify(anchorItems.map(a => ({ id: a.id, name: a.name, category: a.category, color: a.color })))}` : ''}

A felhasználó ruhatára (${availableWardrobe.length} elem):
${JSON.stringify(availableWardrobe.map(w => ({ id: w.id, name: w.name, category: w.category, color: w.color, formality: w.formality, condition: w.condition })))}

Készíts 3 KÜLÖNBÖZŐ KARAKTERŰ outfitet a felhasználó stílusában:
1. SZETT: "Klasszikus & Kifinomult" (Időtlen, elegáns, biztos választás)
2. SZETT: "Laza & Modern" (Smart Casual, kényelmes, trendi)
3. SZETT: "Karakteres & Sprezzatura" (Kifejező, bátor textúrák vagy színek)

VÁLASZOLJ KIZÁRÓLAG ÉRVÉNYES JSON TÖMBKÉNT:
[
  {
    "id": "outfit-1",
    "title": "Kifejező szett elnevezés",
    "styleArchetype": "Klasszikus & Kifinomult",
    "occasion": "${eventName}",
    "matchScore": 96,
    "stylingNotes": "Konkrét stylist tanács a darabok viseléséhez",
    "weatherSuitability": "Hogyan felel meg a ${weather?.temperature || 20}°C-os időjárásnak és napszaknak",
    "itemIds": ["id1", "id2", "id3"]
  }
]`;

      const contents = [{ parts: [{ text: prompt }] }];
      const parsed = await callGeminiApi({ apiKey, contents });
      
      if (Array.isArray(parsed)) {
        return parsed.map((p, idx) => ({
          id: p.id || `outfit-${Date.now()}-${idx}`,
          title: p.title || `${idx + 1}. Stílusos Szett`,
          styleArchetype: p.styleArchetype || (idx === 0 ? 'Klasszikus & Kifinomult' : idx === 1 ? 'Laza & Modern' : 'Karakteres & Sprezzatura'),
          occasion: p.occasion || eventName,
          matchScore: p.matchScore || 92 + (idx * 2) % 6,
          stylingNotes: p.stylingNotes || "Harmonikus összeállítás a gardróbodból.",
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
 * 4. Kapszula Ruhatár Elemzés: Dinamikus Gemini AI Gap Analysis & Lecserélendő Darabok Pótlása
 */
export async function analyzeWardrobeGaps(wardrobe = [], profile = {}) {
  const apiKey = getGeminiApiKey();

  if (apiKey && wardrobe.length > 0) {
    try {
      const itemsNeedingReplacement = wardrobe.filter(w => w.condition === 'Lecserélendő' || w.condition === 'Játszós / Kopott');

      const prompt = `Te egy mester kapszula ruhatár-tervező stylist vagy.
Elemezd a felhasználó gardróbját (${wardrobe.length} elem) és stílusprofilját:
Stílusprofil: ${JSON.stringify(profile)}
Meglévő ruhatár: ${JSON.stringify(wardrobe.map(w => ({ id: w.id, name: w.name, category: w.category, color: w.color, formality: w.formality, condition: w.condition })))}
${itemsNeedingReplacement.length > 0 ? `Lecserélendő / elhasználódott darabok a szekrényben: ${JSON.stringify(itemsNeedingReplacement.map(r => ({ name: r.name, category: r.category })))}` : ''}

Határozz meg 4-6 STRATÉGIAI HIÁNYZÓ KULCSDARABOT (Capsule Gaps), amelyek beszerzésével ugrásszerűen megnő a variálhatóság! Ha van lecserélendő darab, azt prioritásként emeld be mint megújítandó kulcselem!

VÁLASZOLJ KIZÁRÓLAG ÉRVÉNYES JSON TÖMBKÉNT:
[
  {
    "id": "gap-1",
    "title": "Pontos terméknév (pl. 'Tengerkék Finomkötött Merino Pólóing')",
    "impact": "+8 Új Outfit Variáció",
    "estimatedPrice": "25 000 - 45 000 Ft",
    "category": "knitwear" | "outerwear" | "tops" | "bottoms" | "shoes" | "accessories",
    "season": "Tavasz / Nyár" | "Ősz / Tél" | "Egész évben",
    "reason": "Részletes szakmai indoklás, miért elengedhetetlen a ruhatárhoz",
    "isReplacement": true | false,
    "searchKeywords": "keresési kulcsszavak webshophoz"
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
      title: 'Sötétkék Strukturált Gyapjú Zakó',
      impact: '+7 Új Outfit Variáció',
      estimatedPrice: '38 000 - 68 000 Ft',
      category: 'outerwear',
      season: 'Egész évben',
      reason: 'A smart casual és business megjelenés abszolút alappillére, ami bármely nadrággal azonnal emeli a megjelenést.',
      isReplacement: false,
      searchKeywords: 'navy blue tailored wool blazer férfi zakó'
    },
    {
      id: 'gap-knit-polo',
      title: 'Tengerkék vagy Homokszínű Finomkötött Pólóing',
      impact: '+6 Új Outfit Variáció',
      estimatedPrice: '18 000 - 32 000 Ft',
      category: 'knitwear',
      season: 'Tavasz / Nyár',
      reason: 'A tökéletes híd a lezser póló és a formális ing között, zakó alá és önmagában is elegáns.',
      isReplacement: false,
      searchKeywords: 'knitted polo shirt finomkötött galléros póló'
    },
    {
      id: 'gap-white-shirt',
      title: 'Prémium Fehér Oxford Pamuting',
      impact: '+8 Új Outfit Variáció',
      estimatedPrice: '16 000 - 30 000 Ft',
      category: 'tops',
      season: 'Egész évben',
      reason: 'A leguniverzálisabb felsőruházat a reggeli meetingektől az esti vacsorákig.',
      isReplacement: false,
      searchKeywords: 'white 100% cotton oxford shirt pamuting'
    },
    {
      id: 'gap-leather-loafers',
      title: 'Barna Bőr Penny Loafer vagy Suede Mokaszin',
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
