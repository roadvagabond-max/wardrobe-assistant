/**
 * 🎩 Sartorial Wardrobe Assistant — Image Processing & BiRefNet Neural Packshot Service
 * 
 * 1. SOTA Neural Segmentation with BiRefNet (ZhengPeng7/BiRefNet) on Hugging Face Inference API
 * 2. Alpha Thresholding & Hardening: Solidifies fabric folds/shadows, preventing dark background burn-through
 * 3. Sharp Autocrop (trim empty borders) & High-Resolution WebP Generation (1000x1000 @ 90 quality)
 */

import sharp from "sharp";

const BIREFNET_MODEL = "ZhengPeng7/BiRefNet";
const HF_ROUTER_URL = `https://router.huggingface.co/hf-inference/models/${BIREFNET_MODEL}`;
const HF_FALLBACK_URL = `https://api-inference.huggingface.co/models/${BIREFNET_MODEL}`;

/**
 * Executes neural background removal via BiRefNet on Hugging Face Inference API
 * 
 * @param {Buffer} inputBuffer - Raw binary image buffer (JPEG/PNG/WebP, 1024px)
 * @param {string} hfToken - Hugging Face API Token from Google Cloud Secret Manager
 * @returns {Promise<Buffer>} - PNG buffer with transparent background (RGBA)
 */
export async function removeBackgroundWithBiRefNet(inputBuffer, hfToken) {
  if (!inputBuffer || !Buffer.isBuffer(inputBuffer)) {
    throw new Error("Érvénytelen képpuffer az AI szegmentáláshoz.");
  }

  const endpoints = [HF_ROUTER_URL, HF_FALLBACK_URL];
  let lastError = null;

  for (const endpoint of endpoints) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
      const headers = {
        "Content-Type": "image/jpeg",
        "x-wait-for-model": "true"
      };

      if (hfToken && typeof hfToken === "string" && hfToken.trim().length > 0) {
        headers["Authorization"] = `Bearer ${hfToken.trim()}`;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: inputBuffer,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        const pngBuffer = Buffer.from(arrayBuffer);
        
        if (pngBuffer.length < 100) {
          throw new Error("A BiRefNet modell által visszaadott képadat túl rövid vagy üres.");
        }

        return pngBuffer;
      }

      const errorText = await response.text();
      lastError = `HTTP ${response.status}: ${errorText.slice(0, 300)}`;

      // If unauthorized or bad request on first endpoint, don't retry same failure
      if (response.status === 401 || response.status === 403) {
        throw new Error(`Hugging Face jogosultsági hiba (${response.status}). Kérlek ellenőrizd a HF_TOKEN kulcsot a Secret Managerben!`);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        lastError = "A BiRefNet modell időtúllépést adott (45s).";
      } else {
        lastError = err.message || String(err);
      }
    }
  }

  throw new Error(`Nem sikerült a BiRefNet háttéreltávolítás: ${lastError || "Ismeretlen hiba"}`);
}

/**
 * Cleans up the alpha channel to prevent crease/shadow transparency,
 * autocrops transparent margins, and exports high-quality 1000px WebP.
 * 
 * @param {Buffer} pngWithAlphaBuffer - PNG buffer from BiRefNet
 * @returns {Promise<Buffer>} - High-res trimmed WebP buffer
 */
export async function cleanUpMaskAndCrop(pngWithAlphaBuffer) {
  if (!pngWithAlphaBuffer || !Buffer.isBuffer(pngWithAlphaBuffer)) {
    throw new Error("Érvénytelen PNG puffer a maszk-tisztításhoz.");
  }

  // 1. Alfa-csatorna meglétének biztosítása
  const image = sharp(pngWithAlphaBuffer).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

  // 2. Alfa-küszöbölés & keményítés (Alpha Thresholding)
  // Meggátolja, hogy a zakó redői és árnyékai félig átlátszóvá (0.2–0.5) váljanak,
  // ami a sötét hátteren fekete beégésként / foltként látszódna.
  for (let i = 3; i < data.length; i += 4) {
    const a = data[i];
    if (a <= 25) {
      data[i] = 0; // Teljesen átlátszó háttér (zajszűrés)
    } else if (a >= 60) {
      data[i] = 255; // 100% tömör ruhafelület (megszünteti a fekete átütéseket)
    } else {
      // Finom élátmenet a szegélyeken (antialiasing)
      data[i] = Math.round(((a - 25) / 35) * 255);
    }
  }

  // 3. Rekonstruálás, Autocrop (trim threshold: 25), átméretezés és WebP kódolás
  return await sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4
    }
  })
    .trim({ threshold: 25 })
    .resize(1000, 1000, {
      fit: "inside",
      withoutEnlargement: true
    })
    .webp({ quality: 90 })
    .toBuffer();
}
