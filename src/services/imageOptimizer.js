/**
 * Client-side High-Speed Image Optimizer & Base64 Converter
 * Ensures any image (local file, camera capture, or remote webshop URL)
 * is converted to optimized Base64 JPEG so Gemini Vision can directly see the garment pixels.
 */

export async function ensureBase64Image(fileOrUrl, maxWidth = 640, maxHeight = 640, quality = 0.75) {
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
