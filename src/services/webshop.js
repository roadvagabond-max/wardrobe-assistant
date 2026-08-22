/**
 * Webshop Link, Metadata & Image Extraction Service
 * Uses Microlink API and Jina Reader API to extract official product titles,
 * descriptions, materials, and high-resolution packshot images.
 */

// Helper to convert an image URL into a base64 DataURL via an HTML Image element and Canvas
export function convertImageViaCanvas(imageUrl) {
  return new Promise((resolve) => {
    if (!imageUrl) return resolve('');
    if (imageUrl.startsWith('data:')) return resolve(imageUrl);

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        resolve(dataUrl);
      } catch (_) {
        // If crossOrigin is tainted by strict CDN, return the original URL
        resolve(imageUrl);
      }
    };

    img.onerror = () => {
      resolve(imageUrl);
    };

    img.src = imageUrl;
  });
}

/**
 * Filter out favicons, logos and invalid micro-images
 */
function isFaviconOrLogo(url = '') {
  const lower = url.toLowerCase();
  return (
    lower.includes('favicon') ||
    lower.includes('t1.gstatic.com') ||
    lower.includes('t0.gstatic.com') ||
    lower.endsWith('.ico') ||
    lower.includes('logo-') ||
    lower.includes('/logo.') ||
    lower.includes('apple-touch-icon')
  );
}

/**
 * Extracts product metadata and images from a webshop URL
 */
export async function extractWebshopData(url) {
  const cleanUrl = url.trim();
  if (!cleanUrl) throw new Error('Kérlek adj meg egy érvényes webshop linket vagy képcímet!');

  // Case 1: Direct Image URL
  if (/\.(jpeg|jpg|png|webp|avif|gif)($|\?)/i.test(cleanUrl)) {
    return {
      imageUrl: cleanUrl,
      images: [cleanUrl],
      title: '',
      description: '',
      brand: ''
    };
  }

  let extractedData = {
    imageUrl: '',
    images: [],
    title: '',
    description: '',
    brand: '',
    rawText: ''
  };

  // Case 2: Microlink API
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

        const candidateImage = d.image?.url || '';
        if (candidateImage && !isFaviconOrLogo(candidateImage)) {
          extractedData.imageUrl = candidateImage;
          extractedData.images.push(candidateImage);
        }
      }
    }
  } catch (e) {
    console.warn('Microlink figyelmeztetés:', e);
  }

  // Case 3: Jina Reader API (Fallback & Extra Product Images Extractor)
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

        // Find all product images in markdown content
        if (jd.content) {
          const imgMatches = Array.from(jd.content.matchAll(/!\[.*?\]\((https?:\/\/[^\s\)]+)\)/g));
          const foundUrls = imgMatches
            .map(m => m[1])
            .filter(u => !isFaviconOrLogo(u) && (u.includes('product') || u.includes('catalog') || u.includes('image') || u.includes('media') || /\.(jpe?g|png|webp)/i.test(u)));

          for (const u of foundUrls) {
            if (!extractedData.images.includes(u)) {
              extractedData.images.push(u);
            }
          }

          if (!extractedData.imageUrl && extractedData.images.length > 0) {
            // Prioritize packshot / clean item photos if keyword matches
            const packshot = extractedData.images.find(img => img.includes('_02') || img.includes('flat') || img.includes('packshot') || img.includes('still'));
            extractedData.imageUrl = packshot || extractedData.images[0];
          }
        }
      }
    }
  } catch (e) {
    console.warn('Jina Reader figyelmeztetés:', e);
  }

  // Fallback: If still no image, use cleanUrl
  if (!extractedData.imageUrl) {
    extractedData.imageUrl = cleanUrl;
  }
  if (extractedData.images.length === 0 && extractedData.imageUrl) {
    extractedData.images.push(extractedData.imageUrl);
  }

  return extractedData;
}
