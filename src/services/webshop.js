/**
 * Webshop Link & Image Import Service
 * Fetches OpenGraph product images and converts remote images for Gemini Vision analysis.
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
 * Fetches a remote image and converts it into a base64 DataURL
 * with automatic CORS proxy fallback.
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

  // 3. Fallback: return image URL directly
  return imageUrl;
}

/**
 * Extracts the product preview image from a webshop page URL or direct image URL.
 */
export async function extractImageFromWebshopUrl(url) {
  const cleanUrl = url.trim();
  if (!cleanUrl) throw new Error('Kérlek adj meg egy érvényes webshop linket vagy képcímet!');

  // A) If already a direct image URL (jpg, png, webp, avif, gif)
  if (/\.(jpeg|jpg|png|webp|avif|gif)($|\?)/i.test(cleanUrl)) {
    return cleanUrl;
  }

  // B) Try scraping OpenGraph og:image from the webshop HTML via CORS proxy
  const proxyEndpoints = [
    (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
    (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`
  ];

  for (const getProxyUrl of proxyEndpoints) {
    try {
      const res = await fetch(getProxyUrl(cleanUrl), {
        headers: { 'Accept': 'text/html,application/xhtml+xml' }
      });
      
      if (res.ok) {
        const html = await res.text();
        
        // Find og:image, twitter:image, or main product image meta tags
        const match = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
          || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
          || html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)
          || html.match(/<meta[^>]+property=["']og:image:secure_url["'][^>]+content=["']([^"']+)["']/i);

        if (match && match[1]) {
          let extractedUrl = match[1].replace(/&amp;/g, '&');
          if (extractedUrl.startsWith('//')) {
            extractedUrl = 'https:' + extractedUrl;
          } else if (extractedUrl.startsWith('/')) {
            try {
              const urlObj = new URL(cleanUrl);
              extractedUrl = `${urlObj.origin}${extractedUrl}`;
            } catch (_) {}
          }
          return extractedUrl;
        }
      }
    } catch (e) {
      console.warn('Webshop scraper hiba a proxy-n keresztül:', e);
    }
  }

  // C) If HTML metadata scraping failed, return the URL to try loading directly
  return cleanUrl;
}
