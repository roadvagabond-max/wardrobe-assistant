// Advanced Google Gemini Vision & Fashion Stylist Intelligence Engine

const getGeminiApiKey = () => {
  return import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('GEMINI_API_KEY') || '';
};

export const isGeminiConfigured = () => Boolean(getGeminiApiKey());

/**
 * 1. Deep Multimodal AI Garment Vision Analysis
 */
export async function analyzeClothingImage(imageBase64OrUrl) {
  const apiKey = getGeminiApiKey();

  if (apiKey && imageBase64OrUrl.startsWith('data:')) {
    try {
      const parts = imageBase64OrUrl.split(';base64,');
      const mimeType = parts[0].replace('data:', '') || 'image/jpeg';
      const base64Data = parts[1];

      const prompt = `Te egy sokoldalú, magasan képzett professzionális divattanácsadó és stílusszakértő vagy.
      Értsz minden fő stílusirányzathoz (pl. Casual, Smart Casual, Business, Streetwear, Old Money / Classic Elegance, Minimalist, Quiet Luxury, Vintage, Sprezzatura, Athleisure).
      Elemezd a fotón látható ruhadarabot objektíven és pontosan a tényleges stílusa szerint!
      Határozd meg a darab pontos típusát, valódi színét, anyagösszetételét, szezonalitását, formalitási szintjét, és adj egy hozzá illő, releváns szakértői stílustippet a viseléséhez.
      
      VÁLASZOLJ KIZÁRÓLAG ÉRVÉNYES JSON FORMÁTUMBAN:
      {
        "name": "Pontos és igényes magyar megnevezés (pl. 'Sötétkék Pamut Chino Nadrág', 'Oversized Kötött Pulóver', 'Klasszikus Gyapjú Zakó')",
        "category": "outerwear" | "tops" | "bottoms" | "shoes" | "accessories",
        "subCategory": "blazer" | "shirt" | "t-shirt" | "knitwear" | "hoodie" | "trousers" | "jeans" | "shorts" | "loafers" | "sneakers" | "boots" | "overcoat" | "jacket" | "other",
        "color": "Valódi fő szín magyarul",
        "colorHex": "#színkód",
        "material": "Részletes anyag és jelleg (pl. 100% Pamut, Gyapjú keverék, Len, Farmer/Denim, Bőr)",
        "qualityScore": 8.5,
        "season": ["tavasz", "nyar", "osz", "tel"],
        "formality": "Casual" | "Smart Casual" | "Business Casual" | "Business / Formal" | "Streetwear" | "Athleisure",
        "stylingTip": "Konkrét, a darab tényleges stílusához igazodó tanács a kombinálására",
        "tags": ["3-5 db releváns stílus, alkalom és anyag címke (pl. 'streetwear', 'minimal', 'irodai', 'pamut')"]
      }`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inlineData: { mimeType, data: base64Data } }
            ]
          }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      if (!response.ok) {
        const errBody = await response.text();
        console.error('Gemini API válasz:', response.status, errBody);
        throw new Error(`Gemini API hiba (${response.status}): ${errBody.slice(0, 200)}`);
      }

      const result = await response.json();
      console.log('Gemini nyers válasz:', JSON.stringify(result).slice(0, 500));
      const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error('A Gemini nem adott vissza elemzést. Próbálj egy tisztább fotót!');
      return JSON.parse(rawText);
    } catch (err) {
      console.error('Gemini Vision API hiba:', err);
      throw err;
    }
  }

  // Nincs API kulcs beállítva
  throw new Error('Nincs Gemini API kulcs beállítva! Add meg a beállításokban.');
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
      Meglévő ruhatára (${wardrobe.length} elem): ${JSON.stringify(wardrobe.map(w => ({ name: w.name, category: w.category, color: w.color })))}
      
      Végezd el a 3-Outfit Szabály tesztet! Készíts 3 komplett outfitet a meglévő ruhákból ezzel a darabbal párosítva.
      Válaszolj KIZÁRÓLAG JSON formátumban:
      {
        "compatibilityScore": 95,
        "verdict": "Erősen Ajánlott" | "Érdemes Megfontolni" | "Gondold Át",
        "verdictSummary": "Részletes szakmai indoklás",
        "stylingTip": "Kiemelt stylist tipp",
        "outfits": [
          { "title": "1. Outfit", "occasion": "Alkalom", "stylingTip": "Tipp", "items": [] }
        ]
      }`;

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      if (!res.ok) {
        const errBody = await res.text();
        console.error('Gemini 3-outfit API válasz:', res.status, errBody);
        throw new Error(`Gemini API hiba (${res.status}): ${errBody.slice(0, 200)}`);
      }

      const d = await res.json();
      console.log('Gemini 3-outfit nyers válasz:', JSON.stringify(d).slice(0, 500));
      const t = d.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!t) throw new Error('A Gemini nem adott vissza outfit javaslatokat.');
      return JSON.parse(t);
    } catch(e) {
      console.error("Gemini 3-outfit hiba:", e);
      throw e;
    }
  }

  throw new Error('Nincs Gemini API kulcs beállítva! Add meg a beállításokban.');
}
