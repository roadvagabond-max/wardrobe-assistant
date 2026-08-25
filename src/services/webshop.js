/**
 * Smart Product Code (SKU) & Webshop Metadata / Image Extraction Service
 * Parses product codes from Next, Zara, Reserved, Massimo Dutti, H&M, Mango, ASOS
 * and generates high-resolution open CDN image links while bypassing anti-bot blockers.
 */

// Helper to filter out favicons and badges
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
 * Intelligent URL & Product Code Parser
 * Extracts brand, product code / SKU, title slug, and direct CDN images
 */
export function parseWebshopUrl(rawUrl) {
  const url = rawUrl.trim();
  const parsed = {
    brand: '',
    productCode: '',
    title: '',
    description: '',
    images: [],
    imageUrl: ''
  };

  try {
    const urlObj = new URL(url);
    const host = urlObj.hostname.toLowerCase();
    const pathname = urlObj.pathname;

    // 1. Next Direct / Next UK
    if (host.includes('nextdirect') || host.includes('next.co.uk') || host.includes('next.hu')) {
      parsed.brand = 'Next Direct';
      // Path format: /hu/en/style/su458397/aa6536 or /g5980s2/123456
      const segments = pathname.split('/').filter(Boolean);
      const code = segments[segments.length - 1]?.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const styleCode = segments[segments.length - 2]?.toUpperCase();

      if (code) {
        parsed.productCode = code;
        parsed.title = `Next Termék (#${code})`;
        
        // High-res Next CDN pattern
        parsed.images = [
          `https://xcdn.next.co.uk/COMMON/Items/Default/Default/ItemImages/AltItemShot/315x472/${code}.jpg`,
          `https://xcdn.next.co.uk/COMMON/Items/Default/Default/ItemImages/Search/224x336/${code}.jpg`,
          `https://xcdn.next.co.uk/COMMON/Items/Default/Default/ItemImages/AltItemShot/315x472/${code}s.jpg`,
          styleCode ? `https://xcdn.next.co.uk/COMMON/Items/Default/Default/ItemImages/AltItemShot/315x472/${styleCode}.jpg` : ''
        ].filter(Boolean);
        parsed.imageUrl = parsed.images[0];
      }
    }

    // 2. Zara
    else if (host.includes('zara.com')) {
      parsed.brand = 'Zara';
      // Path format: /hu/hu/medium-weight-alap-polo--02-p01887411.html
      const match = pathname.match(/\/([a-z0-9-]+)-p([0-9]+)\.html/i);
      if (match) {
        const slug = match[1].replace(/--\d+$/, '').replace(/-/g, ' ');
        const pid = match[2];
        parsed.productCode = pid;
        parsed.title = slug.charAt(0).toUpperCase() + slug.slice(1);
      }
    }

    // 3. Reserved / Mohito / Sinsay (LPP Group)
    else if (host.includes('reserved.com') || host.includes('mohito.com') || host.includes('sinsay.com')) {
      parsed.brand = host.includes('reserved') ? 'Reserved' : host.includes('mohito') ? 'Mohito' : 'Sinsay';
      // Path format: /hu/hu/oltonyzako-512hr-09m or /512hr-09m
      const segments = pathname.split('/').filter(Boolean);
      const lastSeg = segments[segments.length - 1];
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
      // Path format: /hu_hu/productpage.1188337001.html
      const match = pathname.match(/productpage\.([0-9]+)\.html/i);
      if (match) {
        const pid = match[1];
        parsed.productCode = pid;
        parsed.title = `H&M Termék (#${pid})`;
      }
    }

    // 6. ASOS / Mango
    else if (host.includes('asos.com') || host.includes('mango.com')) {
      parsed.brand = host.includes('asos') ? 'ASOS' : 'Mango';
      const segments = pathname.split('/').filter(Boolean);
      const lastSeg = segments[segments.length - 1];
      parsed.title = lastSeg.replace(/[-_]/g, ' ');
    }
  } catch (e) {
    console.warn('URL parsing hiba:', e);
  }

  return parsed;
}

/**
 * Extracts product metadata, descriptions, and high-resolution images
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

  // 1. Run smart URL & Product Code Parser
  const parsedFromUrl = parseWebshopUrl(cleanUrl);

  let extractedData = {
    imageUrl: parsedFromUrl.imageUrl || '',
    images: [...parsedFromUrl.images],
    title: parsedFromUrl.title || '',
    description: '',
    brand: parsedFromUrl.brand || '',
    productCode: parsedFromUrl.productCode || '',
    rawText: ''
  };

  // 2. Try Microlink API (Structured OpenGraph Data)
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
          if (!extractedData.title) extractedData.title = candidateTitle;
          if (!extractedData.description) extractedData.description = candidateDesc;
          if (!extractedData.brand && d.publisher) extractedData.brand = d.publisher;

          const candidateImage = d.image?.url || '';
          if (candidateImage && !isFaviconOrLogo(candidateImage)) {
            if (!extractedData.images.includes(candidateImage)) {
              extractedData.images.unshift(candidateImage);
            }
            extractedData.imageUrl = candidateImage;
          }
        }
      }
    }
  } catch (e) {
    console.warn('Microlink scraping info:', e);
  }

  // 3. Try Jina Reader API (Deep Product Description & Image Extractor)
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

  // Set primary image if available
  if (!extractedData.imageUrl && extractedData.images.length > 0) {
    extractedData.imageUrl = extractedData.images[0];
  }

  // If both scraping and URL parser found nothing usable
  if (!extractedData.imageUrl && !extractedData.title && !extractedData.productCode) {
    throw new Error('A webshop botvédelme nem engedélyezte az automatikus linkolvasást. Kérlek másold be közvetlenül a termék fotójának címét (jobb klikk a képre ➔ Kép címének másolása), vagy töltsd fel a képet!');
  }

  return extractedData;
}
