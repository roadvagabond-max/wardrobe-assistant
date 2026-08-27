/**
 * Smart Product Code (SKU) & Webshop Metadata / Image Extraction Service
 * Supports full URLs and raw Product Codes (SKU) from Next Direct, Zara, Reserved, Massimo Dutti, H&M, ASOS, Mango.
 * Automatically verifies live CDN image endpoints and falls back seamlessly.
 */

// Helper to filter out favicons, icons and badges
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

// Detect anti-bot error pages
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
 * Helper to test which candidate CDN image loads successfully in browser
 */
export function findFirstWorkingImageUrl(candidateUrls = [], timeoutMs = 2500) {
  if (!candidateUrls || candidateUrls.length === 0) return Promise.resolve(null);

  const validUrls = candidateUrls.filter(Boolean).filter(u => !isFaviconOrLogo(u));
  if (validUrls.length === 0) return Promise.resolve(null);

  return new Promise((resolve) => {
    let resolved = false;
    let pendingCount = validUrls.length;

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(validUrls[0] || null);
      }
    }, timeoutMs);

    validUrls.forEach((url) => {
      const img = new Image();
      img.onload = () => {
        if (!resolved && img.naturalWidth > 50 && img.naturalHeight > 50) {
          resolved = true;
          clearTimeout(timer);
          resolve(url);
        }
      };
      img.onerror = () => {
        pendingCount--;
        if (pendingCount <= 0 && !resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve(validUrls[0] || null);
        }
      };
      img.src = url;
    });
  });
}

/**
 * Intelligent URL & Raw Product Code (SKU) Parser
 */
export function parseWebshopUrlOrCode(rawInput) {
  const input = (rawInput || '').trim();
  const parsed = {
    brand: '',
    productCode: '',
    title: '',
    description: '',
    images: [],
    imageUrl: '',
    isDirectCode: false
  };

  if (!input) return parsed;

  const isUrl = input.startsWith('http://') || input.startsWith('https://') || input.includes('.com') || input.includes('.hu') || input.includes('.co.uk');

  // Case A: RAW PRODUCT CODE / SKU INPUT (e.g. "AA6536", "SU458397", "Next AA6536", "512HR-09M", "01887411")
  if (!isUrl) {
    parsed.isDirectCode = true;
    const clean = input.replace(/^(next|zara|reserved|h&m|hm|massimo)\s+/i, '').trim();

    // 1. Next Direct Pattern (e.g. "AA6536", "SU458397", "U38123", "123-456", "123456")
    if (/^([a-zA-Z]{1,3}[0-9]{3,7}|[0-9]{3,4}-?[0-9]{3,4})$/i.test(clean) || /next/i.test(input)) {
      const codeUpper = clean.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const codeLower = codeUpper.toLowerCase();
      parsed.brand = 'Next Direct';
      parsed.productCode = codeUpper;
      parsed.title = `Next Termék (#${codeUpper})`;
      parsed.images = [
        `https://xcdn.next.co.uk/COMMON/Items/Default/Default/ItemImages/AltItemShot/315x472/${codeUpper}.jpg`,
        `https://xcdn.next.co.uk/COMMON/Items/Default/Default/ItemImages/Search/224x336/${codeUpper}.jpg`,
        `https://xcdn.next.co.uk/common/items/default/default/itemimages/altitemshot/315x472/${codeLower}.jpg`,
        `https://xcdn.next.co.uk/common/items/default/default/itemimages/search/224x336/${codeLower}.jpg`,
        `https://xcdn.next.co.uk/COMMON/Items/Default/Default/ItemImages/AltItemShot/315x472/${codeUpper}s.jpg`,
        `https://xcdn.next.co.uk/common/items/default/default/itemimages/altitemshot/315x472/${codeLower}s.jpg`
      ];
      parsed.imageUrl = parsed.images[0];
      return parsed;
    }

    // 2. Reserved / LPP Pattern (e.g. "512HR-09M")
    if (/^[0-9]{3,4}[a-z]{1,2}-?[0-9]{2,3}[a-z]?$/i.test(clean)) {
      parsed.brand = 'Reserved';
      parsed.productCode = clean.toUpperCase();
      parsed.title = `Reserved Termék (#${parsed.productCode})`;
      return parsed;
    }

    // 3. Zara / Massimo Dutti / H&M numeric code
    if (/^[0-9]{7,11}$/.test(clean)) {
      parsed.productCode = clean;
      parsed.title = `Termék (#${clean})`;
      return parsed;
    }

    parsed.productCode = clean;
    parsed.title = `Termékkód: ${clean}`;
    return parsed;
  }

  // Case B: FULL WEB URL INPUT
  try {
    const fullUrl = input.startsWith('http') ? input : `https://${input}`;
    const urlObj = new URL(fullUrl);
    const host = urlObj.hostname.toLowerCase();
    const pathname = urlObj.pathname;

    // 1. Next Direct / Next UK / Next Hungary
    if (host.includes('nextdirect') || host.includes('next.co.uk') || host.includes('next.hu')) {
      parsed.brand = 'Next Direct';
      const segments = pathname.split('/').filter(Boolean);
      
      const lastSeg = segments[segments.length - 1] || '';
      const secondLastSeg = segments[segments.length - 2] || '';
      
      const codeCandidate = lastSeg.split('#')[0].replace(/[^a-zA-Z0-9]/g, '');
      const styleCandidate = secondLastSeg.replace(/[^a-zA-Z0-9]/g, '');

      const codeUpper = codeCandidate.toUpperCase();
      const codeLower = codeCandidate.toLowerCase();
      const styleUpper = styleCandidate.toUpperCase();
      const styleLower = styleCandidate.toLowerCase();

      if (codeUpper) {
        parsed.productCode = codeUpper;
        parsed.title = `Next Termék (#${codeUpper})`;
        
        parsed.images = [
          `https://xcdn.next.co.uk/COMMON/Items/Default/Default/ItemImages/AltItemShot/315x472/${codeUpper}.jpg`,
          `https://xcdn.next.co.uk/COMMON/Items/Default/Default/ItemImages/Search/224x336/${codeUpper}.jpg`,
          `https://xcdn.next.co.uk/common/items/default/default/itemimages/altitemshot/315x472/${codeLower}.jpg`,
          `https://xcdn.next.co.uk/common/items/default/default/itemimages/search/224x336/${codeLower}.jpg`,
          `https://xcdn.next.co.uk/COMMON/Items/Default/Default/ItemImages/AltItemShot/315x472/${codeUpper}s.jpg`,
          `https://xcdn.next.co.uk/common/items/default/default/itemimages/altitemshot/315x472/${codeLower}s.jpg`,
          styleUpper ? `https://xcdn.next.co.uk/COMMON/Items/Default/Default/ItemImages/AltItemShot/315x472/${styleUpper}.jpg` : '',
          styleLower ? `https://xcdn.next.co.uk/common/items/default/default/itemimages/altitemshot/315x472/${styleLower}.jpg` : ''
        ].filter(Boolean);
        parsed.imageUrl = parsed.images[0];
      }
    }

    // 2. Zara
    else if (host.includes('zara.com')) {
      parsed.brand = 'Zara';
      const match = pathname.match(/\/([a-z0-9-]+)-p([0-9]+)\.html/i);
      if (match) {
        const slug = match[1].replace(/--\d+$/, '').replace(/-/g, ' ');
        parsed.productCode = match[2];
        parsed.title = slug.charAt(0).toUpperCase() + slug.slice(1);
      }
    }

    // 3. Reserved / Mohito / Sinsay
    else if (host.includes('reserved.com') || host.includes('mohito.com') || host.includes('sinsay.com')) {
      parsed.brand = host.includes('reserved') ? 'Reserved' : host.includes('mohito') ? 'Mohito' : 'Sinsay';
      const segments = pathname.split('/').filter(Boolean);
      const lastSeg = segments[segments.length - 1] || '';
      const codeMatch = lastSeg.match(/([0-9]{3,4}[a-z]{1,2}-[0-9]{2,3}[a-z]?)/i);
      
      if (codeMatch) {
        const code = codeMatch[1].toUpperCase();
        parsed.productCode = code;
        const slugName = lastSeg.replace(codeMatch[0], '').replace(/[-_]/g, ' ').trim();
        parsed.title = slugName ? slugName.charAt(0).toUpperCase() + slugName.slice(1) : `${parsed.brand} #${code}`;
      }
    }

    // 4. Massimo Dutti
    else if (host.includes('massimodutti.com')) {
      parsed.brand = 'Massimo Dutti';
      const match = pathname.match(/\/([a-z0-9-]+)-p([0-9]+)\.html/i);
      if (match) {
        const slug = match[1].replace(/--\d+$/, '').replace(/-/g, ' ');
        parsed.productCode = match[2];
        parsed.title = slug.charAt(0).toUpperCase() + slug.slice(1);
      }
    }

    // 5. H&M
    else if (host.includes('hm.com')) {
      parsed.brand = 'H&M';
      const match = pathname.match(/productpage\.([0-9]+)\.html/i);
      if (match) {
        parsed.productCode = match[1];
        parsed.title = `H&M Termék (#${match[1]})`;
      }
    }

    // 6. ASOS / Mango
    else if (host.includes('asos.com') || host.includes('mango.com')) {
      parsed.brand = host.includes('asos') ? 'ASOS' : 'Mango';
      const segments = pathname.split('/').filter(Boolean);
      const lastSeg = segments[segments.length - 1] || '';
      parsed.title = lastSeg.replace(/[-_]/g, ' ');
    }
  } catch (e) {
    console.warn('URL parsing hiba:', e);
  }

  return parsed;
}

export const parseWebshopUrl = parseWebshopUrlOrCode;

/**
 * Extracts product metadata, descriptions, and high-resolution images
 * Works seamlessly with full URLs and raw Product Codes (SKU)
 */
export async function extractWebshopData(rawUrlOrCode) {
  const cleanInput = (rawUrlOrCode || '').trim();
  if (!cleanInput) throw new Error('Kérlek adj meg egy érvényes webshop linket vagy termékkódot (pl. Next AA6536)!');

  // Case 1: Direct Image URL
  if (/\.(jpeg|jpg|png|webp|avif)($|\?)/i.test(cleanInput)) {
    return {
      imageUrl: cleanInput,
      images: [cleanInput],
      title: '',
      description: '',
      brand: ''
    };
  }

  // 1. Run smart URL & Product Code Parser
  const parsed = parseWebshopUrlOrCode(cleanInput);

  // If candidate images exist (e.g. Next CDN patterns), check which one works live
  let validatedImageUrl = parsed.imageUrl;
  if (parsed.images && parsed.images.length > 0) {
    try {
      const workingUrl = await findFirstWorkingImageUrl(parsed.images, 1200); // 1.2s fast check
      if (workingUrl) {
        validatedImageUrl = workingUrl;
      }
    } catch (_) {}
  }

  let extractedData = {
    imageUrl: validatedImageUrl || parsed.imageUrl || '',
    images: parsed.images && parsed.images.length > 0 ? parsed.images : [],
    title: parsed.title || '',
    description: '',
    brand: parsed.brand || '',
    productCode: parsed.productCode || '',
    rawText: ''
  };

  // FAST PATH: If direct product code or direct image is already known, return immediately without slow web scraping!
  if (parsed.isDirectCode && (extractedData.productCode || extractedData.imageUrl)) {
    extractedData.rawText = `Márka: ${extractedData.brand || 'Next Direct'}, Hivatalos Cikkszám / Termékkód (Product Code): ${extractedData.productCode}`;
    return extractedData;
  }

  // If it's a URL, perform fast parallel metadata scraping with 1.8s timeout
  const isUrl = cleanInput.startsWith('http://') || cleanInput.startsWith('https://') || cleanInput.includes('.com') || cleanInput.includes('.hu') || cleanInput.includes('.co.uk');
  
  if (isUrl) {
    const fullUrl = cleanInput.startsWith('http') ? cleanInput : `https://${cleanInput}`;

    const fetchWithTimeout = async (url, headers = {}, timeoutMs = 1800) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, { headers, signal: controller.signal });
        clearTimeout(id);
        return res;
      } catch (e) {
        clearTimeout(id);
        return null;
      }
    };

    // Run Microlink and Jina in parallel for maximum speed
    const [microlinkRes, jinaRes] = await Promise.allSettled([
      fetchWithTimeout(`https://api.microlink.io?url=${encodeURIComponent(fullUrl)}&meta=true`),
      fetchWithTimeout(`https://r.jina.ai/${fullUrl}`, { 'Accept': 'application/json' })
    ]);

    // Process Microlink result
    if (microlinkRes.status === 'fulfilled' && microlinkRes.value?.ok) {
      try {
        const json = await microlinkRes.value.json();
        if (json.status === 'success' && json.data) {
          const d = json.data;
          const candidateTitle = d.title || '';
          const candidateDesc = d.description || '';

          if (!isBotBlockedOrError(candidateTitle) && !isBotBlockedOrError(candidateDesc)) {
            if (!extractedData.title) extractedData.title = candidateTitle;
            if (!extractedData.description) extractedData.description = candidateDesc;
            if (!extractedData.brand && d.publisher) extractedData.brand = d.publisher;

            const candidateImage = d.image?.url || '';
            if (candidateImage && !isFaviconOrLogo(candidateImage)) {
              if (!extractedData.images.includes(candidateImage)) {
                extractedData.images.unshift(candidateImage);
              }
              if (!extractedData.imageUrl) extractedData.imageUrl = candidateImage;
            }
          }
        }
      } catch (_) {}
    }

    // Process Jina result
    if (jinaRes.status === 'fulfilled' && jinaRes.value?.ok) {
      try {
        const jinaJson = await jinaRes.value.json();
        if (jinaJson.data) {
          const jd = jinaJson.data;
          const jdTitle = jd.title || '';
          const jdDesc = jd.description || '';
          const jdContent = jd.content || '';

          if (!isBotBlockedOrError(jdTitle) && !isBotBlockedOrError(jdContent)) {
            if (!extractedData.title && jdTitle) extractedData.title = jdTitle;
            if (!extractedData.description && jdDesc) extractedData.description = jdDesc;
            extractedData.rawText = jdContent.slice(0, 1500);

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
      } catch (_) {}
    }
  }

  // Ensure primary image is chosen
  if (!extractedData.imageUrl && extractedData.images.length > 0) {
    extractedData.imageUrl = extractedData.images[0];
  }

  // If we have at least a product code or title, succeed!
  if (extractedData.productCode || extractedData.title || extractedData.imageUrl) {
    if (!extractedData.rawText && extractedData.productCode) {
      extractedData.rawText = `Márka: ${extractedData.brand || 'Next Direct'}, Hivatalos Cikkszám / Termékkód (Product Code): ${extractedData.productCode}`;
    }
    return extractedData;
  }

  throw new Error('Nem sikerült kinyerni a termék adatait. Kérlek másold be a termékkódot (pl. Next AA6536) vagy töltsd fel a képet!');
}
