/**
 * Webshop Link, Metadata & Image Extraction Service
 * Uses Microlink API and Jina Reader API to bypass bot protections
 * and extract official product titles, descriptions, materials, and high-res images.
 */

// Helper to convert a Blob into a base64 DataURL
export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Fetches a remote image and converts it into a base64 DataURL.
 */
export async function fetchRemoteImageAsBase64(imageUrl) {
  if (!imageUrl) throw new Error('Üres kép URL.');
  if (imageUrl.startsWith('data:')) return imageUrl;

  // 1. Direct fetch attempt
  try {
    const res = await fetch(imageUrl, { mode: 'cors' });
    if (res.ok) {
      const blob = await res.blob();
      if (blob.type.startsWith('image/')) {
        return await blobToBase64(blob);
      }
    }
  } catch (_) {}

  // 2. CORS Proxy attempts
  const proxyEndpoints = [
    (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
    (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`
  ];

  for (const getProxyUrl of proxyEndpoints) {
    try {
      const res = await fetch(getProxyUrl(imageUrl));
      if (res.ok) {
        const blob = await res.blob();
        if (blob.size > 100) {
          return await blobToBase64(blob);
        }
      }
    } catch (_) {}
  }

  return imageUrl;
}

/**
 * Comprehensive Webshop Data Extractor
 * Extracts: title, description (materials, composition), and product image URL.
 */
export async function extractWebshopData(url) {
  const cleanUrl = url.trim();
  if (!cleanUrl) throw new Error('Kérlek adj meg egy érvényes webshop linket vagy képcímet!');

  // Case 1: Direct Image URL
  if (/\.(jpeg|jpg|png|webp|avif|gif)($|\?)/i.test(cleanUrl)) {
    return {
      imageUrl: cleanUrl,
      title: '',
      description: '',
      brand: ''
    };
  }

  let extractedData = {
    imageUrl: '',
    title: '',
    description: '',
    brand: '',
    rawText: ''
  };

  // Case 2: Microlink API (Industry Standard Headless Link Metadata Engine)
  try {
    const microlinkUrl = `https://api.microlink.io?url=${encodeURIComponent(cleanUrl)}&meta=true`;
    const res = await fetch(microlinkUrl);
    if (res.ok) {
      const json = await res.json();
      if (json.status === 'success' && json.data) {
        const d = json.data;
        extractedData.title = d.title || '';
        extractedData.description = d.description || '';
        extractedData.brand = d.publisher || '';
        extractedData.imageUrl = d.image?.url || d.logo?.url || '';
      }
    }
  } catch (e) {
    console.warn('Microlink scraping figyelmeztetés:', e);
  }

  // Case 3: Jina Reader API (Fallback / Supplementary Text Extractor)
  if (!extractedData.description || !extractedData.imageUrl) {
    try {
      const jinaUrl = `https://r.jina.ai/${cleanUrl}`;
      const jinaRes = await fetch(jinaUrl, {
        headers: { 'Accept': 'application/json' }
      });

      if (jinaRes.ok) {
        const jinaJson = await jinaRes.json();
        if (jinaJson.data) {
          const jd = jinaJson.data;
          if (!extractedData.title && jd.title) extractedData.title = jd.title;
          if (!extractedData.description && jd.description) extractedData.description = jd.description;
          extractedData.rawText = (jd.content || '').slice(0, 3000);

          // Find first image in markdown if not already found
          if (!extractedData.imageUrl && jd.content) {
            const imgMatch = jd.content.match(/!\[.*?\]\((https?:\/\/[^\s\)]+)\)/);
            if (imgMatch && imgMatch[1]) {
              extractedData.imageUrl = imgMatch[1];
            }
          }
        }
      }
    } catch (e) {
      console.warn('Jina Reader scraping figyelmeztetés:', e);
    }
  }

  // Fallback: If no image extracted, use URL as image URL
  if (!extractedData.imageUrl) {
    extractedData.imageUrl = cleanUrl;
  }

  return extractedData;
}
