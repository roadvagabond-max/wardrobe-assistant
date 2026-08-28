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
export function findFirstWorkingImageUrl(candidateUrls = [], timeoutMs = 1500) {
  if (!candidateUrls || candidateUrls.length === 0) return Promise.resolve(null);

  const validUrls = candidateUrls.filter(Boolean).filter(u => !isFaviconOrLogo(u));
  if (validUrls.length === 0) return Promise.resolve(null);

  return new Promise((resolve) => {
    let resolved = false;
    let pendingCount = validUrls.length;

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(null); // Resolve null if none loaded in time
      }
    }, timeoutMs);

    validUrls.forEach((url) => {
      const img = new Image();
      img.onload = () => {
        if (!resolved && img.naturalWidth > 40 && img.naturalHeight > 40) {
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
          resolve(null); // All failed, resolve null instead of a broken 404 URL
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

  // Case A: RAW PRODUCT CODE / SKU INPUT (e.g. "AA6536", "SU458397", "Y05725", "Y05-725", "512HR-09M")
  if (!isUrl) {
    parsed.isDirectCode = true;
    const clean = input.replace(/^(next|zara|reserved|h&m|hm|massimo)\s+/i, '').trim();

    // 1. Next Direct Pattern (e.g. "AA6536", "Y05725", "Y05-725", "SU458397", "123456")
    if (/^([a-zA-Z]{1,3}[0-9]{3,7}|[a-zA-Z]{1,2}[0-9]{2}-?[0-9]{3,4}|[0-9]{3,4}-?[0-9]{3,4})$/i.test(clean) || /next/i.test(input)) {
      const codeUpper = clean.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const codeLower = codeUpper.toLowerCase();
      
      // Handle hyphenated pattern (e.g. Y05-725)
      let hyphenCode = '';
      if (/^[A-Z][0-9]{5}$/.test(codeUpper)) {
        hyphenCode = `${codeUpper.slice(0, 3)}-${codeUpper.slice(3)}`;
      } else if (clean.includes('-')) {
        hyphenCode = clean.toUpperCase();
      }

      parsed.brand = 'Next Direct';
      parsed.productCode = codeUpper;
      parsed.title = `Next Termék (#${hyphenCode || codeUpper})`;
      parsed.imageUrl = '';
      parsed.images = [];
      return parsed;
    }

    // 2. Reserved / LPP Pattern (e.g. "512HR-09M")
    if (/^[0-9]{3,4}[a-z]{1,2}-?[0-9]{2,3}[a-z]?$/i.test(clean)) {
      parsed.brand = 'Reserved';
      parsed.productCode = clean.toUpperCase();
      parsed.title = `Reserved Termék (#${parsed.productCode})`;
      parsed.images = [];
      parsed.imageUrl = '';
      return parsed;
    }

    // 3. Zara / Massimo Dutti / H&M numeric code
    if (/^[0-9]{7,11}$/.test(clean)) {
      parsed.productCode = clean;
      parsed.title = `Termék (#${clean})`;
      parsed.images = [];
      parsed.imageUrl = '';
      return parsed;
    }

    parsed.productCode = clean;
    parsed.title = `Termékkód: ${clean}`;
    parsed.images = [];
    parsed.imageUrl = '';
    return parsed;
  }

  // Case B: FULL WEB URL INPUT (e.g. https://www.nextdirect.com/hu/en/style/su770039/y05725)
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
      const styleUpper = styleCandidate.toUpperCase();

      let hyphenCode = '';
      if (/^[A-Z][0-9]{5}$/.test(codeUpper)) {
        hyphenCode = `${codeUpper.slice(0, 3)}-${codeUpper.slice(3)}`;
      }

      if (codeUpper || styleUpper) {
        parsed.productCode = codeUpper || styleUpper;
        parsed.title = `Next Termék (#${hyphenCode || codeUpper || styleUpper})`;
        parsed.imageUrl = '';
        parsed.images = [];
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

/**
 * Normalizes brand names to merge variations like domain names (e.g. reserved.com, next.co.uk),
 * fabric / sub-brand labels (e.g. next(nova fides), Zara Man, Massimo Dutti Studio),
 * and differing capitalization into a single canonical brand identity.
 */
export function normalizeBrandName(rawBrand) {
  if (!rawBrand || typeof rawBrand !== 'string') return '';

  let brand = rawBrand.trim();
  if (!brand) return '';

  // 1. Remove URLs, protocol, query params and domain extensions (.com, .co.uk, .hu, etc.)
  brand = brand
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\.(com|co\.uk|hu|de|it|fr|es|eu|org|net|pl)(\/.*|\?.*)?$/i, '');

  // 2. Remove parenthetical descriptions, e.g. "Next (Nova Fides)", "Zara (Manteco)", "Reserved (Eco)"
  brand = brand.replace(/\s*\([^)]*\)/g, '').trim();

  // 3. Remove fabric/mill suffixes with hyphen or slash, e.g. "Next / Nova Fides", "Next - Italian Fabric"
  brand = brand.replace(/\s*[\/\-]\s*(nova fides|manteco|vitale barberis|lanificio|candiani|loropiana|fabric|wool|cotton|linen).*/i, '').trim();

  // 4. Normalized string for fast matching
  const lower = brand.toLowerCase().replace(/[^a-z0-9&]/g, '');

  // Canonical mapping for well-known brands
  if (/^next/i.test(lower)) return 'Next Direct';
  if (/^reserved/i.test(lower)) return 'Reserved';
  if (/^zara/i.test(lower)) return 'Zara';
  if (/^massimo/i.test(lower) || lower.includes('massimodutti')) return 'Massimo Dutti';
  if (/^h[&]?m/i.test(lower) || lower === 'hm' || lower.startsWith('handm')) return 'H&M';
  if (/^mango/i.test(lower)) return 'Mango';
  if (/^asos/i.test(lower)) return 'ASOS';
  if (/^boglioli/i.test(lower)) return 'Boglioli';
  if (/^eton/i.test(lower)) return 'Eton';
  if (/^incotex/i.test(lower)) return 'Incotex';
  if (/^suitsupply/i.test(lower) || lower.includes('suitsupply')) return 'Suitsupply';
  if (/^loropiana/i.test(lower) || lower.includes('loropiana')) return 'Loro Piana';
  if (/^brunello/i.test(lower) || lower === 'cucinelli') return 'Brunello Cucinelli';
  if (/^ralphlauren/i.test(lower) || lower.includes('poloralphlauren') || lower === 'polo') return 'Ralph Lauren';
  if (/^tommy/i.test(lower) || lower === 'hilfiger') return 'Tommy Hilfiger';
  if (/^calvinklein/i.test(lower) || lower === 'ck') return 'Calvin Klein';
  if (/^hugoboss/i.test(lower) || lower === 'boss' || lower === 'hugo') return 'Hugo Boss';
  if (/^cos(stores)?/i.test(lower)) return 'COS';
  if (/^arket/i.test(lower)) return 'Arket';
  if (/^uniqlo/i.test(lower)) return 'Uniqlo';
  if (/^mohito/i.test(lower)) return 'Mohito';
  if (/^sinsay/i.test(lower)) return 'Sinsay';
  if (/^tagliatore/i.test(lower)) return 'Tagliatore';
  if (/^carmina/i.test(lower)) return 'Carmina';
  if (/^rota/i.test(lower)) return 'Rota';
  if (/^aspesi/i.test(lower)) return 'Aspesi';
  if (/^commonprojects/i.test(lower)) return 'Common Projects';
  if (/^sunspel/i.test(lower)) return 'Sunspel';

  // 5. Generic cleaner: remove trailing noise words like "man", "men", "studio", "official", "store", "online", "collection"
  let cleaned = brand
    .replace(/\b(official|store|online|collection|fashion|apparel|clothing|design|studio|man|men|woman|women)\b/gi, '')
    .trim();

  if (!cleaned) cleaned = brand;

  // Title-case fallback
  return cleaned
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export const parseWebshopUrl = parseWebshopUrlOrCode;

/**
 * Universal Gemini-Native Webshop & SKU Extraction
 * Directly extracts structured brand and product code metadata from any webshop link or SKU code.
 * Eliminates all external scraping proxies (Microlink/Jina) to avoid falsified data, CORS errors, and timeouts.
 */
export async function extractWebshopData(rawInput = '') {
  const cleanInput = (rawInput || '').trim();
  if (!cleanInput) {
    return {
      imageUrl: '',
      images: [],
      title: '',
      description: '',
      brand: '',
      productCode: '',
      rawInput: '',
      rawText: ''
    };
  }

  // Case 1: Direct image URL (.jpg, .png, .webp)
  if (/\.(jpeg|jpg|png|webp|avif)($|\?)/i.test(cleanInput)) {
    return {
      imageUrl: cleanInput,
      images: [cleanInput],
      title: '',
      description: '',
      brand: '',
      productCode: '',
      rawInput: cleanInput,
      rawText: ''
    };
  }

  // Case 2: Parse URL or Product Code (Next, Zara, Reserved, H&M, Massimo Dutti, Mango, ASOS)
  const parsed = parseWebshopUrlOrCode(cleanInput);
  const normalizedBrand = normalizeBrandName(parsed.brand);

  return {
    imageUrl: parsed.imageUrl || '',
    images: parsed.images || [],
    title: parsed.title || '',
    description: '',
    brand: normalizedBrand || parsed.brand || '',
    productCode: parsed.productCode || '',
    rawInput: cleanInput,
    rawText: `Márka: ${normalizedBrand || parsed.brand || 'Webshop'}, Cikkszám / Termékkód: ${parsed.productCode || cleanInput}, Eredeti link: ${cleanInput}`
  };
}
