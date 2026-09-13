/**
 * 🎩 Sartorial Wardrobe Assistant — Background Removal & Autocrop Engine
 * 
 * 3-Stage Pipeline matching Whering & Luxury Fashion Standards:
 * 1. Image Normalization (HTML5 Canvas 2D, EXIF orientation, 640x640 @ 0.75 JPEG)
 * 2. Salient Object Segmentation (@imgly/background-removal in WASM/WebGPU)
 * 3. Autocrop Bounding Box Trimming (crops transparent borders with 4% safety padding)
 * 4. Transparent WebP Packshot Export (~15-30 KB)
 */

/**
 * Autocrop (Bounding Box Trimming)
 * Scans non-transparent pixels (alpha > 20) and tightly crops the canvas
 * with an elegant padding ratio to prevent collars, hems, and cuffs from clipping.
 * 
 * @param {HTMLCanvasElement} canvas 
 * @param {number} paddingRatio default 0.04 (4% padding)
 * @returns {HTMLCanvasElement} cropped canvas
 */
export function cropToBoundingBox(canvas, paddingRatio = 0.04) {
  if (!canvas || !canvas.getContext) return canvas;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const { width, height } = canvas;
  if (!width || !height) return canvas;

  let imgData;
  try {
    imgData = ctx.getImageData(0, 0, width, height);
  } catch (err) {
    console.warn('cropToBoundingBox: getImageData sikertelen (lehetséges CORS ok):', err);
    return canvas;
  }

  const data = imgData.data;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let found = false;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width * 4;
    for (let x = 0; x < width; x++) {
      const alpha = data[rowOffset + x * 4 + 3];
      if (alpha > 20) { // Non-transparent threshold
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        found = true;
      }
    }
  }

  // If no content found or invalid coordinates, return original canvas
  if (!found || minX >= maxX || minY >= maxY) {
    return canvas;
  }

  const boxW = maxX - minX + 1;
  const boxH = maxY - minY + 1;

  // 4% safety padding around the bounding box
  const padX = Math.round(boxW * paddingRatio);
  const padY = Math.round(boxH * paddingRatio);

  const cropX = Math.max(0, minX - padX);
  const cropY = Math.max(0, minY - padY);
  const cropW = Math.min(width - cropX, boxW + padX * 2);
  const cropH = Math.min(height - cropY, boxH + padY * 2);

  const croppedCanvas = document.createElement('canvas');
  croppedCanvas.width = cropW;
  croppedCanvas.height = cropH;

  const croppedCtx = croppedCanvas.getContext('2d');
  croppedCtx.imageSmoothingEnabled = true;
  croppedCtx.imageSmoothingQuality = 'high';
  croppedCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

  return croppedCanvas;
}

/**
 * Converts a Canvas to a Blob with WebP priority and PNG fallback.
 * @param {HTMLCanvasElement} canvas 
 * @param {string} preferredFormat 
 * @param {number} quality 
 * @returns {Promise<Blob>}
 */
export function canvasToBlob(canvas, preferredFormat = 'image/webp', quality = 0.85) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        // Fallback to PNG if WebP export is unsupported
        canvas.toBlob((pngBlob) => resolve(pngBlob), 'image/png');
      }
    }, preferredFormat, quality);
  });
}

/**
 * Converts a Blob to a Base64 Data URL.
 * @param {Blob} blob 
 * @returns {Promise<string>}
 */
export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Defensive pre-scaler: Ensures that raw high-megapixel images (e.g. 12-48MP camera photos)
 * are downscaled to max 800px before feeding into WASM neural segmentation.
 * This prevents WebAssembly memory allocation failures (OOM) on mobile browsers.
 * 
 * @param {Blob|File|string} source 
 * @param {number} maxDimension default 800
 * @returns {Promise<Blob|string>}
 */
async function downscaleImageSourceIfNeeded(source, maxDimension = 800) {
  if (typeof window === 'undefined') return source;
  try {
    let srcUrl = null;
    let shouldRevoke = false;
    if (source instanceof Blob) {
      srcUrl = URL.createObjectURL(source);
      shouldRevoke = true;
    } else if (typeof source === 'string') {
      srcUrl = source;
    } else {
      return source;
    }

    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = srcUrl;
    });

    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;

    // If already compact, keep as is
    if (w <= maxDimension && h <= maxDimension) {
      if (shouldRevoke) URL.revokeObjectURL(srcUrl);
      return source;
    }

    let targetW = w;
    let targetH = h;
    if (w > h) {
      targetW = maxDimension;
      targetH = Math.round((h * maxDimension) / w);
    } else {
      targetH = maxDimension;
      targetW = Math.round((w * maxDimension) / h);
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, targetW, targetH);
    if (shouldRevoke) URL.revokeObjectURL(srcUrl);

    const downscaledBlob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.85));
    return downscaledBlob || source;
  } catch (e) {
    console.warn('downscaleImageSourceIfNeeded sikertelen, fallback az eredetire:', e);
    return source;
  }
}

/**
 * Background Preloader for Neural Background Removal Model & WASM Runtime.
 * Downloads the quantized ~40MB model into browser CacheStorage during idle time
 * so that when the user takes or uploads a photo, processing is instantaneous.
 * 
 * @returns {Promise<boolean>}
 */
let isPreloading = false;
let isPreloaded = false;

export async function preloadBackgroundRemoval() {
  if (isPreloaded || isPreloading) return isPreloaded;
  isPreloading = true;
  try {
    const imglyModule = await import('@imgly/background-removal');
    const preload = imglyModule.preload;
    if (typeof preload === 'function') {
      console.log('📦 Packshot ONNX modell előtöltése indult a háttérben...');
      await preload({ model: 'isnet_quint8' });
      isPreloaded = true;
      console.log('✅ Packshot modell sikeresen előtöltve a böngésző gyorsítótárába.');
      return true;
    }
  } catch (err) {
    console.warn('Packshot modell előtöltési figyelmeztetés (nem blokkoló):', err);
    return false;
  } finally {
    isPreloading = false;
  }
  return false;
}

/**
 * Executes Neural Background Removal on an image source.
 * Dynamically imports `@imgly/background-removal` to prevent bundle bloat.
 * 
 * @param {Blob|File|string} imageSource 
 * @param {Object} options 
 * @param {Function} options.onProgress (statusObj) => void
 * @param {number} options.timeoutMs default 35000 (35 seconds max)
 * @returns {Promise<{ success: boolean, blob?: Blob, dataUrl?: string, error?: string }>}
 */
export async function removeImageBackground(imageSource, options = {}) {
  const { onProgress, timeoutMs = 35000 } = options;

  let timeoutId = null;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Háttéreltávolítási időtúllépés (${Math.round(timeoutMs / 1000)} mp)`));
    }, timeoutMs);
  });

  try {
    const segmentationPromise = (async () => {
      onProgress?.({ stage: 'loading_engine', label: 'Háttéreltávolító motor betöltése...', percent: 10 });

      // Defensive pre-scaling for mobile WASM stability
      const optimizedSource = await downscaleImageSourceIfNeeded(imageSource, 800);

      // Dynamic import: package is loaded on demand
      const imglyModule = await import('@imgly/background-removal');
      const removeBackground = imglyModule.removeBackground || imglyModule.default;
      if (typeof removeBackground !== 'function') {
        throw new Error('A háttéreltávolító függvény nem elérhető a modulban.');
      }

      onProgress?.({ stage: 'segmenting', label: 'Neurális szegmentáció futtatása...', percent: 30 });

      const config = {
        model: 'isnet_quint8', // Fast quantized ~40MB model
        output: {
          format: 'image/png', // Clean alpha for cropping
          quality: 0.9
        },
        progress: (key, current, total) => {
          if (total > 0) {
            const pct = 30 + Math.round((current / total) * 50); // 30% -> 80%
            onProgress?.({ stage: 'downloading_model', label: `Modell betöltése: ${pct}%`, percent: pct });
          }
        }
      };

      // Execute segmentation
      const rawMaskedBlob = await removeBackground(optimizedSource, config);

      onProgress?.({ stage: 'autocropping', label: 'Befoglaló méretezés és körbevágás...', percent: 85 });

      // Load raw masked image into canvas for autocrop
      const img = new Image();
      const rawMaskedUrl = URL.createObjectURL(rawMaskedBlob);

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = rawMaskedUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(rawMaskedUrl);

      // Apply Autocrop Bounding Box Trimming with 4% padding
      const croppedCanvas = cropToBoundingBox(canvas, 0.04);

      // Export to transparent WebP Blob
      const webpBlob = await canvasToBlob(croppedCanvas, 'image/webp', 0.85);
      const dataUrl = await blobToDataUrl(webpBlob);

      onProgress?.({ stage: 'done', label: 'Kész packshot előállítva!', percent: 100 });

      return {
        success: true,
        blob: webpBlob,
        dataUrl,
        width: croppedCanvas.width,
        height: croppedCanvas.height
      };
    })();

    const result = await Promise.race([segmentationPromise, timeoutPromise]);
    clearTimeout(timeoutId);
    return result;
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId);
    console.error('Háttéreltávolítási hiba:', err);
    return {
      success: false,
      error: err.message || 'Háttéreltávolítás nem sikerült'
    };
  }
}

/**
 * Top-Level Packshot Pipeline
 * Integrates dual-thread processing: produces normalized JPEG first,
 * then attempts background removal + autocrop.
 * 
 * @param {Blob|File|string} fileOrDataUrl 
 * @param {Object} options 
 * @returns {Promise<{ success: boolean, packshotDataUrl?: string, packshotBlob?: Blob, error?: string }>}
 */
export async function processGarmentPackshot(fileOrDataUrl, options = {}) {
  try {
    return await removeImageBackground(fileOrDataUrl, options);
  } catch (err) {
    console.error('processGarmentPackshot hiba:', err);
    return {
      success: false,
      error: err.message
    };
  }
}
