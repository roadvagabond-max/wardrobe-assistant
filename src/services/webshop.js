/**
 * Webshop Link, Metadata & Image Extraction Service
 * Uses Microlink API and Jina Reader API to extract official product titles,
 * descriptions, materials, and high-resolution packshot images.
 */

/**
 * Filter out favicons, badges, partner logos, and non-product graphics
 */
function isFaviconOrLogo(url = '') {
  if (!url) return true;
  const lower = url.toLowerCase();
  return (
    lower.includes('favicon') ||
    lower.includes('gstatic.com') ||
    lower.endsWith('.ico') ||
    lower.endsWith('.svg') ||
    lower.includes('akamai') ||
    lower.includes('logo') ||
    lower.includes('badge') ||
    lower.includes('trustpilot') ||
    lower.includes('payment') ||
    lower.includes('visa') ||
    lower.includes('mastercard') ||
    lower.includes('apple-touch-icon') ||
    lower.includes('banner') ||
    lower.includes('sprite') ||
    lower.includes('avatar')
  );
}

/**
 * Extracts product metadata and clean images from a webshop URL
 */
export async function extractWebshopData(url) {
  const cleanUrl = url.trim();
  if (!cleanUrl) throw new Error('Kérlek adj meg egy érvényes webshop linket vagy képcímet!');

  // Case 1: Direct Image URL
  if (/\.(jpeg|jpg|png|webp|avif)($|\?)/i.test(cleanUrl)) {
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

  // Case 2: Microlink API (Structured Metadata)
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
    console.warn('Microlink scraping info:', e);
  }

  // Case 3: Jina Reader API (Deep Product Description & Image Extractor)
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

        // Find all real product image URLs in the Markdown content
        if (jd.content) {
          const imgMatches = Array.from(jd.content.matchAll(/!\[.*?\]\((https?:\/\/[^\s\)]+)\)/g));
          const foundUrls = imgMatches
            .map(m => m[1])
            .filter(u => !isFaviconOrLogo(u) && (u.includes('product') || u.includes('catalog') || u.includes('media') || u.includes('image') || /\.(jpe?g|png|webp)/i.test(u)));

          for (const u of foundUrls) {
            if (!extractedData.images.includes(u)) {
              extractedData.images.push(u);
            }
          }

          if (!extractedData.imageUrl && extractedData.images.length > 0) {
            extractedData.imageUrl = extractedData.images[0];
          }
        }
      }
    }
  } catch (e) {
    console.warn('Jina Reader scraping info:', e);
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
