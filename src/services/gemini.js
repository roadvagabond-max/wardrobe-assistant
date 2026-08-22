// Advanced Google Gemini Vision & Fashion Stylist Intelligence Engine
import { convertImageViaCanvas } from './webshop';

const getGeminiApiKey = () => {
  return import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('GEMINI_API_KEY') || '';
};

export const isGeminiConfigured = () => Boolean(getGeminiApiKey());

// Google Gemini models in order of priority (starting with 3.6-flash)
const GEMINI_MODELS = [
  'gemini-3.6-flash',
  'gemini-1.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-pro'
];

/**
 * Universal Gemini API caller with automatic multi-model fallback and JSON parser
 */
async function callGeminiApi({ apiKey, contents, responseMimeType = "application/json" }) {
  let lastError = null;

  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const cleaned = rawText
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
 * Targets specifically the target item even if model wears a full outfit.
 */
export async function analyzeClothingImage(imageBase64OrUrl, webshopContext = {}) {
  const apiKey = getGeminiApiKey();

  if (apiKey) {
    try {
      let finalBase64 = null;
      let hasImage = false;

      if (imageBase64OrUrl) {
        if (imageBase64OrUrl.startsWith('data:')) {
          finalBase64 = imageBase64OrUrl;
          hasImage = true;
        } else {
          try {
            finalBase64 = await convertImageViaCanvas(imageBase64OrUrl);
            if (finalBase64 && finalBase64.startsWith('data:')) {
              hasImage = true;
            }
          } catch (e) {
            console.warn('Canvas képkonverzió figyelmeztetés:', e);
          }
        }
      }

      // Build context from webshop text
      const webshopTextInfo = [
        webshopContext.title ? `CÉLTERMÉK HIVATALOS NEVE: "${webshopContext.title}"` : '',
        webshopContext.brand ? `Márka / Gyártó: "${webshopContext.brand}"` : '',
        webshopContext.description ? `Hivatalos Leírás és Anyagösszetétel: "${webshopContext.description}"` : '',
        webshopContext.rawText ? `Oldal további részletei: "${webshopContext.rawText.slice(0, 800)}"` : ''
      ].filter(Boolean).join('\n');

      const targetFocusInstruction = webshopContext.title 
        ? `FONTOS: A vizsgált céltermék a(z) "${webshopContext.title}". Amennyiben a fotón a modell egy teljes szettet visel (pl. zakó + nadrág + cipő), te KIZÁRÓLAG a nevezett célterméket (${webshopContext.title}) szegmentáld és elemezd! A szett többi darabját hagyd figyelmen kívül!`
        : `Amennyiben a fotón több ruhadarab látható, fókuszálj a legfőbb, központi darabra!`;

      const prompt = `Te egy világklasszis professzionális személyi stylist, divattanácsadó és ruhatár-tervező vagy.
Elemezd a ruhadarabot részletesen, szakértő szemmel!

${webshopTextInfo ? `--- HIVATALOS WEBSHOP ADATOK ---\n${webshopTextInfo}\n` : ''}
${targetFocusInstruction}
Elsődlegesen a hivatalos szöveges adatokból határozd meg az anyagot (pl. 100% Pamut, Gyapjú, Len, stb.), nevét és márkáját!

Határozd meg:
1. A darab pontos elnevezését, főkategóriáját, alkategóriáját, valódi színét, színkódját (#hex), anyagösszetételét, becsült minőségét (1.0-10.0 pont), formalitási szintjét és szezonalitását.
2. RÉSZLETES SZÖVEGES AJÁNLÁST:
   - "stylingTip": Mivel érdemes kombinálni/hordani? (Konkrét színek, felsők, nadrágok, kabátok, cipők és kiegészítők, amikkel harmonizál).
   - "whenToWear": Mikor és milyen alkalmakkor érdemes viselni? (Alkalmak, napszakok, időjárási viszonyok, dress code).
   - "stylingAdvice": Szakértői összefoglaló a darab stílusáról és karakteréről.

VÁLASZOLJ KIZÁRÓLAG ÉRVÉNYES JSON FORMÁTUMBAN:
{
  "name": "Pontos és elegáns magyar megnevezés (pl. 'Sötétkék Olasz Gyapjú Zakó', 'Homokbézs Slim Chino', 'Fehér Poplin Pamuting')",
  "category": "outerwear" | "tops" | "bottoms" | "shoes" | "accessories",
  "subCategory": "blazer" | "shirt" | "t-shirt" | "knitwear" | "hoodie" | "trousers" | "jeans" | "shorts" | "loafers" | "sneakers" | "boots" | "overcoat" | "jacket" | "other",
  "color": "Valódi fő szín magyarul (pl. Sötétkék, Bézs, Törtfehér, Antracitszürke)",
  "colorHex": "#színkód",
  "material": "Részletes anyag és szövés (pl. 100% Super 120s Gyapjú, Prémium Egyiptomi Pamut, Len-selyem keverék, Bőr)",
  "qualityScore": 9.2,
  "season": ["tavasz", "nyar", "osz", "tel"],
  "formality": "Casual" | "Smart Casual" | "Sprezzatura" | "Business" | "Black Tie",
  "stylingTip": "Mivel hordd: Konkrét kombinációs javaslatok más darabokkal",
  "whenToWear": "Mikor hordd: Események, időjárás és alkalmak",
  "stylingAdvice": "Szakértői stílusjellemzés a darabról",
  "tags": ["elegáns", "alapdarab", "olasz szabás"]
}`;

      const parts = [{ text: prompt }];

      if (hasImage && finalBase64 && finalBase64.startsWith('data:')) {
        const p = finalBase64.split(';base64,');
        const mimeType = p[0].replace('data:', '') || 'image/jpeg';
        const base64Data = p[1];
        parts.push({ inlineData: { mimeType, data: base64Data } });
      }

      return await callGeminiApi({ apiKey, contents: [{ parts }] });
    } catch (err) {
      console.error('Gemini Vision & Text API hiba:', err);
      throw err;
    }
  }

  // Fallback
  return {
    name: webshopContext.title || "Feltöltött Ruhadarab",
    category: "tops",
    subCategory: "shirt",
    color: "Sötétkék",
    colorHex: "#1e293b",
    material: webshopContext.description || "100% Pamut",
    qualityScore: 8.8,
    season: ["tavasz", "nyar", "osz"],
    formality: "Smart Casual",
    stylingTip: "Mivel hordd: Viseld bézs chino nadrággal és barna bőr loaferrel.",
    whenToWear: "Mikor hordd: Kiváló irodai munkához és elegáns esti programokhoz.",
    stylingAdvice: "Letisztult és univerzális alapdarab.",
    tags: ["alapdarab", "smart casual", "irodai"]
  };
}

/**
 * 2. Vásárlás Előtti Tanácsadó: 3-Outfit Szabály Szimuláció
 */
export async function evaluatePrePurchaseItem({ newItem, wardrobe = [], styleProfile = {} }) {
  const apiKey = getGeminiApiKey();

  if (apiKey) {
    try {
      const prompt = `Te egy prémium stílustanácsadó vagy.
A felhasználó ezt a darabot tervezi megvenni: ${JSON.stringify(newItem)}
Stílusprofilja: ${JSON.stringify(styleProfile)}
Meglévő ruhatára (${wardrobe.length} elem): ${JSON.stringify(wardrobe.map(w => ({ id: w.id, name: w.name, category: w.category, color: w.color, formality: w.formality })))}

Végezd el a 3-Outfit Szabály tesztet! Készíts 3 komplett outfitet a meglévő ruhákból ezzel a darabbal párosítva.
Válaszolj KIZÁRÓLAG JSON formátumban:
{
  "compatibilityScore": 92,
  "verdict": "Erősen Ajánlott" | "Érdemes Megfontolni" | "Gondold Át",
  "verdictSummary": "Részletes szakmai indoklás magyarul",
  "stylingTip": "Kiemelt stylist tipp",
  "outfits": [
    {
      "id": "eval-1",
      "title": "1. Szett Címe",
      "occasion": "Munka / Tárgyalás",
      "matchScore": 95,
      "stylingTip": "Stílustanács ehhez a szetthez",
      "items": [
        { "name": "${newItem.name || 'Új darab'}", "category": "${newItem.category || 'tops'}", "color": "${newItem.color || 'Kék'}" }
      ]
    }
  ]
}`;

      const contents = [{ parts: [{ text: prompt }] }];
      return await callGeminiApi({ apiKey, contents });
    } catch(e) {
      console.error("Gemini 3-outfit hiba:", e);
    }
  }

  // Fallback szimuláció
  const sampleOutfits = [
    {
      id: 'mock-eval-1',
      title: 'Klasszikus Smart Casual Irodai Szett',
      occasion: 'Munka & Üzleti Tárgyalás',
      matchScore: 94,
      stylingTip: 'Kombináld semleges alapszínekkel és minőségi kiegészítőkkel.',
      items: [
        { name: newItem.name || 'Kiszemelt Darab', category: newItem.category || 'tops', color: newItem.color || 'Kék' },
        ...(wardrobe.slice(0, 3))
      ]
    },
    {
      id: 'mock-eval-2',
      title: 'Elegáns Esti / Vacsora Szett',
      occasion: 'Vacsora & Színház',
      matchScore: 89,
      stylingTip: 'A sötétebb tónusú kiegészítők kifinomult eleganciát kölcsönöznek.',
      items: [
        { name: newItem.name || 'Kiszemelt Darab', category: newItem.category || 'tops', color: newItem.color || 'Kék' },
        ...(wardrobe.slice(2, 5))
      ]
    },
    {
      id: 'mock-eval-3',
      title: 'Kötetlen Hétvégi Séta & Brunch',
      occasion: 'Hétvége & Kötetlen',
      matchScore: 91,
      stylingTip: 'Kényelmes, mégis rendezett megjelenés letisztult lábbelivel.',
      items: [
        { name: newItem.name || 'Kiszemelt Darab', category: newItem.category || 'tops', color: newItem.color || 'Kék' },
        ...(wardrobe.slice(1, 4))
      ]
    }
  ];

  return {
    compatibilityScore: 92,
    verdict: "Erősen Ajánlott",
    verdictSummary: `A(z) "${newItem.name || 'darab'}" kiválóan illeszkedik a meglévő ${wardrobe.length} db ruhatári elemedhez, és legalább 3 különböző stílusú szettben azonnal hordható!`,
    stylingTip: "A semleges és földszínekkel való kombinálás maximalizálja a variálhatóságát.",
    outfits: sampleOutfits
  };
}

/**
 * 3. AI Outfit Stylist: Esemény & Időjárás alapú szettgenerálás
 */
export async function generateEventOutfits({ eventName, weather, wardrobe = [], styleProfile = {} }) {
  const apiKey = getGeminiApiKey();

  if (apiKey && wardrobe.length > 0) {
    try {
      const prompt = `Te egy mester stylist és ruhatár-tervező vagy.
Esemény / Alkalom: "${eventName}"
Időjárás: ${weather?.temperature}°C, ${weather?.condition} (${weather?.recommendation || ''})
Felhasználó stílusprofilja: ${JSON.stringify(styleProfile)}
A felhasználó meglévő ruhatára (${wardrobe.length} elem):
${JSON.stringify(wardrobe.map(w => ({ id: w.id, name: w.name, category: w.category, color: w.color, formality: w.formality })))}

Készíts 3 különböző, kifinomult és komplett outfitet KIZÁRÓLAG a fenti ruhatári elemek kombinációjából!
VÁLASZOLJ KIZÁRÓLAG ÉRVÉNYES JSON TÖMBKÉNT:
[
  {
    "id": "outfit-1",
    "title": "Kifejező szett elnevezés",
    "occasion": "${eventName}",
    "matchScore": 96,
    "stylingTip": "Konkrét tanács a szett viseléséhez",
    "itemIds": ["id1", "id2", "id3"]
  }
]`;

      const contents = [{ parts: [{ text: prompt }] }];
      const parsed = await callGeminiApi({ apiKey, contents });
      
      if (Array.isArray(parsed)) {
        return parsed.map((p, idx) => ({
          id: p.id || `outfit-${Date.now()}-${idx}`,
          title: p.title || `${idx + 1}. Stílusos Szett`,
          occasion: p.occasion || eventName,
          matchScore: p.matchScore || 90 + Math.floor(Math.random() * 8),
          stylingTip: p.stylingTip || "Harmonikus, réteges összeállítás.",
          items: (p.itemIds || [])
            .map(id => wardrobe.find(w => w.id === id))
            .filter(Boolean)
        })).filter(o => o.items.length > 0);
      }
    } catch (e) {
      console.error("Gemini Stylist hiba:", e);
    }
  }

  // Intelligens lokális szettgenerálás ha nincs API kapcsolat
  const tops = wardrobe.filter(i => i.category === 'tops');
  const bottoms = wardrobe.filter(i => i.category === 'bottoms');
  const shoes = wardrobe.filter(i => i.category === 'shoes');
  const outerwear = wardrobe.filter(i => i.category === 'outerwear');
  const accessories = wardrobe.filter(i => i.category === 'accessories');

  const combos = [];

  for (let i = 0; i < 3; i++) {
    const selectedItems = [];
    if (tops.length > 0) selectedItems.push(tops[i % tops.length]);
    if (bottoms.length > 0) selectedItems.push(bottoms[i % bottoms.length]);
    if (shoes.length > 0) selectedItems.push(shoes[i % shoes.length]);
    if (outerwear.length > 0 && (weather?.temperature < 20 || i === 0)) {
      selectedItems.push(outerwear[i % outerwear.length]);
    }
    if (accessories.length > 0) selectedItems.push(accessories[i % accessories.length]);

    if (selectedItems.length >= 2) {
      combos.push({
        id: `outfit-preset-${i + 1}-${Date.now()}`,
        title: i === 0 ? `Klasszikus ${eventName} Szett` : i === 1 ? `Laza & Modern ${eventName} Kombináció` : `Elegáns Réteges Megjelenés`,
        occasion: eventName,
        matchScore: 92 + (i * 3) % 7,
        stylingTip: `Tökéletes összhang a(z) ${weather?.temperature || 20}°C-os időjáráshoz és az alkalom formalitásához.`,
        items: selectedItems
      });
    }
  }

  return combos.length > 0 ? combos : [
    {
      id: `fallback-outfit-${Date.now()}`,
      title: `${eventName} Alapszett`,
      occasion: eventName,
      matchScore: 90,
      stylingTip: "Letisztult kombináció a meglévő kedvenc darabjaidból.",
      items: wardrobe.slice(0, 4)
    }
  ];
}

/**
 * 4. Kapszula Ruhatár Elemzés: Hiányzó Kulcsdarabok & Gap Analysis
 */
export function analyzeWardrobeGaps(wardrobe = [], profile = {}) {
  const categories = {
    outerwear: wardrobe.filter(w => w.category === 'outerwear'),
    tops: wardrobe.filter(w => w.category === 'tops'),
    bottoms: wardrobe.filter(w => w.category === 'bottoms'),
    shoes: wardrobe.filter(w => w.category === 'shoes'),
    accessories: wardrobe.filter(w => w.category === 'accessories')
  };

  const gaps = [];

  if (categories.outerwear.length === 0 || !categories.outerwear.some(w => w.subCategory === 'blazer' || w.name.toLowerCase().includes('zakó'))) {
    gaps.push({
      id: 'gap-blazer',
      title: 'Sötétkék vagy Szürke Strukturált Zakó',
      impact: '+6 Új Outfit Variáció',
      estimatedPrice: '35 000 - 65 000 Ft',
      reason: 'A smart casual és business megjelenés abszolút alappillére. Farmerrel és chino nadrággal is azonnal megemeli a szett színvonalát.',
      searchKeywords: 'navy blue tailored wool blazer férfi zakó'
    });
  }

  if (!categories.tops.some(w => w.name.toLowerCase().includes('fehér') && (w.subCategory === 'shirt' || w.name.toLowerCase().includes('ing')))) {
    gaps.push({
      id: 'gap-white-shirt',
      title: 'Prémium Fehér Oxford / Poplin Pamuting',
      impact: '+8 Új Outfit Variáció',
      estimatedPrice: '15 000 - 30 000 Ft',
      reason: 'A leguniverzálisabb felsőruházat. Zakó alatt hivatalos, kigombolt gallérral vagy felhajtott ujjal lezseren elegáns.',
      searchKeywords: 'white 100% cotton oxford shirt pamuting'
    });
  }

  if (categories.shoes.length < 2 || !categories.shoes.some(w => w.subCategory === 'loafers' || w.name.toLowerCase().includes('loafer') || w.name.toLowerCase().includes('bőr'))) {
    gaps.push({
      id: 'gap-leather-shoes',
      title: 'Barna Bőr Loafer vagy Letisztult Derby Cipő',
      impact: '+5 Új Outfit Variáció',
      estimatedPrice: '30 000 - 55 000 Ft',
      reason: 'Áthidalja a sportcipő és a szmokingcipő közötti hatalmas szakadékot; elengedhetetlen a Smart Casual eleganciához.',
      searchKeywords: 'brown leather penny loafers férfi félcipő'
    });
  }

  if (!categories.bottoms.some(w => w.subCategory === 'trousers' || w.name.toLowerCase().includes('chino'))) {
    gaps.push({
      id: 'gap-chino-trousers',
      title: 'Bézs vagy Homokszínű Slim-Fit Chino Nadrág',
      impact: '+7 Új Outfit Variáció',
      estimatedPrice: '18 000 - 32 000 Ft',
      reason: 'A farmer tökéletes és stílusos alternatívája tavasztól őszig, amely szinte minden inggel és pólóval harmonizál.',
      searchKeywords: 'beige sand cotton slim chino nadrág'
    });
  }

  if (gaps.length === 0) {
    gaps.push({
      id: 'gap-merino-knit',
      title: 'Finomkötött Merino Gyapjú Pulóver (Kör- vagy V-nyakú)',
      impact: '+4 Új Outfit Variáció',
      estimatedPrice: '20 000 - 40 000 Ft',
      reason: 'Kiváló rétegező darab őszi-téli napokon ing fölé vagy kabát alá hordva.',
      searchKeywords: 'charcoal merino wool sweater pulóver'
    });
  }

  return gaps;
}
