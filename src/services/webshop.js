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
    lower.includes('edgesuite') ||
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
 * Detect anti-bot block pages and errors
 */
function isBotBlockedOrError(text = '') {
  if (!text) return false;
  const lower = text.toLowerCase();
  return (
    lower.includes('access denied') ||
    lower.includes('403 forbidden') ||
    lower.includes('security challenge') ||
    lower.includes('just a moment') ||
    lower.includes('enable cookies') ||
    lower.includes('verify you are human') ||
    lower.includes('errors.edgesuite.net')
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
        const candidateTitle = d.title || '';
        const candidateDesc = d.description || '';

        if (!isBotBlockedOrError(candidateTitle) && !isBotBlockedOrError(candidateDesc)) {
          extractedData.title = candidateTitle;
          extractedData.description = candidateDesc;
          extractedData.brand = d.publisher || '';

          const candidateImage = d.image?.url || '';
          if (candidateImage && !isFaviconOrLogo(candidateImage)) {
            extractedData.imageUrl = candidateImage;
            extractedData.images.push(candidateImage);
          }
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
        const jdTitle = jd.title || '';
        const jdDesc = jd.description || '';
        const jdContent = jd.content || '';

        if (!isBotBlockedOrError(jdTitle) && !isBotBlockedOrError(jdContent)) {
          if (!extractedData.title && jdTitle) extractedData.title = jdTitle;
          if (!extractedData.description && jdDesc) extractedData.description = jdDesc;
          extractedData.rawText = jdContent.slice(0, 3000);

          // Find all real product image URLs in the Markdown content
          const imgMatches = Array.from(jdContent.matchAll(/!\[.*?\]\((https?:\/\/[^\s\)]+)\)/g));
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

  // If both failed or bot-blocked and no valid image/title found:
  if (!extractedData.imageUrl && !extractedData.title) {
    throw new Error('A webshop botvédelme (Akamai/Cloudflare) nem engedélyezte az automatikus linkolvasást. Kérlek másold be a termék fotójának a közvetlen címét (jobb klikk a képre ➔ Kép címének másolása), vagy töltsd fel a képet fotóként!');
  }

  return extractedData;
}
