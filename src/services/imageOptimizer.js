/**
 * Client-side High-Speed Image Optimizer & Base64 Converter
 * Ensures any image (local file, camera capture, or remote webshop URL)
 * is converted to optimized Base64 JPEG so Gemini Vision can directly see the garment pixels.
 */

export async function ensureBase64Image(fileOrUrl, maxWidth = 520, maxHeight = 520, quality = 0.72) {
  if (!fileOrUrl) return null;

  // 1. If it's already a base64 Data URL, optimize it
  if (typeof fileOrUrl === 'string' && fileOrUrl.startsWith('data:')) {
    return optimizeBase64String(fileOrUrl, maxWidth, maxHeight, quality);
  }

  // 2. If it's a File or Blob
  if (fileOrUrl instanceof Blob || fileOrUrl instanceof File) {
    const base64 = await readFileAsDataUrl(fileOrUrl);
    return optimizeBase64String(base64, maxWidth, maxHeight, quality);
  }

  // 3. If it's a remote HTTP/HTTPS URL
  if (typeof fileOrUrl === 'string' && fileOrUrl.startsWith('http')) {
    // Only attempt canvas load with timeout
    try {
      const base64FromCanvas = await new Promise((resolve) => {
        const timer = setTimeout(() => resolve(null), 800); // 800ms fast timeout
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          clearTimeout(timer);
          try {
            const canvas = document.createElement('canvas');
            canvas.width = Math.min(img.naturalWidth || img.width, maxWidth);
            canvas.height = Math.min(img.naturalHeight || img.height, maxHeight);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', quality));
          } catch (_) {
            resolve(null);
          }
        };
        img.onerror = () => {
          clearTimeout(timer);
          resolve(null);
        };
        img.src = fileOrUrl;
      });

      if (base64FromCanvas) return base64FromCanvas;
    } catch (_) {}

    return null;
  }

  return fileOrUrl;
}

function readFileAsDataUrl(blobOrFile) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blobOrFile);
  });
}

function optimizeBase64String(dataUrl, maxWidth, maxHeight, quality) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export const optimizeImageForUpload = ensureBase64Image;

/**
 * Intelligent Fallback & Default Garment Photography Engine
 * Provides authentic, high-resolution sartorial packshots matching the garment category and color tone.
 */
export function getSmartGarmentImage(category = 'outerwear', colorName = 'bézs', subCategory = '') {
  const normColor = (colorName || '').toLowerCase();
  const normCat = (category || '').toLowerCase();

  const CATALOG = {
    outerwear: {
      sand: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=640&q=80',
      beige: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=640&q=80',
      navy: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=640&q=80',
      blue: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=640&q=80',
      black: 'https://images.unsplash.com/photo-1555069519-127aadedf1ee?w=640&q=80',
      grey: 'https://images.unsplash.com/photo-1598808503746-f34c53b9323e?w=640&q=80',
      brown: 'https://images.unsplash.com/photo-1548883354-7622d03aca27?w=640&q=80',
      default: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=640&q=80'
    },
    tops: {
      white: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=640&q=80',
      blue: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=640&q=80',
      navy: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=640&q=80',
      black: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=640&q=80',
      beige: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=640&q=80',
      default: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=640&q=80'
    },
    knitwear: {
      grey: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=640&q=80',
      black: 'https://images.unsplash.com/photo-1620799139834-6b8f844fbe61?w=640&q=80',
      beige: 'https://images.unsplash.com/photo-1584273143981-41c073dfe8f8?w=640&q=80',
      navy: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=640&q=80',
      default: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=640&q=80'
    },
    bottoms: {
      sand: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=640&q=80',
      beige: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=640&q=80',
      navy: 'https://images.unsplash.com/photo-1542272604-780c96856592?w=640&q=80',
      blue: 'https://images.unsplash.com/photo-1542272604-780c96856592?w=640&q=80',
      grey: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=640&q=80',
      black: 'https://images.unsplash.com/photo-1517445312882-bc9910d016b7?w=640&q=80',
      default: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=640&q=80'
    },
    shoes: {
      brown: 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=640&q=80',
      black: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=640&q=80',
      white: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=640&q=80',
      default: 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=640&q=80'
    },
    accessories: {
      brown: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=640&q=80',
      black: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=640&q=80',
      default: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=640&q=80'
    }
  };

  const catDict = CATALOG[normCat] || CATALOG.outerwear;

  if (normColor.includes('homok') || normColor.includes('sand')) return catDict.sand || catDict.beige || catDict.default;
  if (normColor.includes('bézs') || normColor.includes('beige') || normColor.includes('krém') || normColor.includes('ecru')) return catDict.beige || catDict.default;
  if (normColor.includes('navy') || normColor.includes('sötétkék')) return catDict.navy || catDict.blue || catDict.default;
  if (normColor.includes('kék') || normColor.includes('blue')) return catDict.blue || catDict.navy || catDict.default;
  if (normColor.includes('fekete') || normColor.includes('black')) return catDict.black || catDict.default;
  if (normColor.includes('szürke') || normColor.includes('grey') || normColor.includes('gray')) return catDict.grey || catDict.default;
  if (normColor.includes('fehér') || normColor.includes('white')) return catDict.white || catDict.default;
  if (normColor.includes('barna') || normColor.includes('brown')) return catDict.brown || catDict.default;

  return catDict.default;
}
