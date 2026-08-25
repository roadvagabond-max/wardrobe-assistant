/**
 * Client-side High-Speed Image Optimizer
 * Compresses phone camera photos / large uploads to max 1024x1024px, JPEG 85% (~120KB)
 * for ultra-fast network transfer to Gemini Vision API while maintaining crystal-clear quality.
 */

export function optimizeImageForUpload(fileOrDataUrl, maxWidth = 1024, maxHeight = 1024, quality = 0.85) {
  return new Promise((resolve, reject) => {
    if (!fileOrDataUrl) return resolve(null);

    // If it's already a small string or remote URL, return as-is
    if (typeof fileOrDataUrl === 'string' && !fileOrDataUrl.startsWith('data:')) {
      return resolve(fileOrDataUrl);
    }

    const img = new Image();
    
    img.onload = () => {
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      // Scale down proportionally if larger than max bounds
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

      const optimizedBase64 = canvas.toDataURL('image/jpeg', quality);
      resolve(optimizedBase64);
    };

    img.onerror = (err) => {
      console.warn('Képtömörítési hiba, eredeti kép megtartása:', err);
      resolve(fileOrDataUrl);
    };

    if (typeof fileOrDataUrl === 'string') {
      img.src = fileOrDataUrl;
    } else if (fileOrDataUrl instanceof Blob || fileOrDataUrl instanceof File) {
      const reader = new FileReader();
      reader.onloadend = () => {
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(fileOrDataUrl);
    } else {
      resolve(fileOrDataUrl);
    }
  });
}
