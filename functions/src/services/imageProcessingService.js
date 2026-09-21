/**
 * 🎩 Sartorial Wardrobe Assistant — Image Processing & RMBG-1.4 SOTA Neural Packshot Service
 * 
 * 1. SOTA Neural Segmentation with briaai/RMBG-1.4 running locally via Transformers.js (ONNX)
 * 2. Shared Promise Singleton: Eliminates concurrent download race conditions between warm-up & uploads
 * 3. Alpha Thresholding & Hardening: Solidifies fabric folds/shadows, preventing dark background burn-through
 * 4. Sharp Autocrop (trim empty borders) & High-Resolution WebP Generation (1000x1000 @ 90 quality)
 */

import sharp from "sharp";

let pipelinePromise = null;

/**
 * Singleton pipeline loader with a shared promise to prevent race conditions or duplicate memory usage.
 */
export async function getSegmenterPipeline() {
  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      console.log("🚀 [RMBG-1.4] Inicializálás megkezdése a Cloud Functions környezetben...");
      const { pipeline, env } = await import("@huggingface/transformers");

      // Ensure writeable cache dir on Linux Cloud Functions container
      env.cacheDir = process.env.TRANSFORMERS_CACHE || "/tmp/.transformers_cache";
      env.allowLocalModels = true;

      const segmenter = await pipeline("image-segmentation", "briaai/RMBG-1.4");
      console.log("✅ [RMBG-1.4] Modell sikeresen betöltve a memóriába.");
      return segmenter;
    })().catch((err) => {
      console.error("❌ [RMBG-1.4] Pipeline betöltési hiba:", err.message);
      pipelinePromise = null; // Reset so subsequent requests can retry
      throw err;
    });
  }
  return pipelinePromise;
}

/**
 * Pre-downloads and warms up the RMBG-1.4 model into container memory.
 */
export async function warmUpRMBGModel() {
  console.log("🔥 [RMBG-1.4] Előmelegítés (warm-up) hívás érkezett...");
  await getSegmenterPipeline();
  return { ready: true, model: "briaai/RMBG-1.4" };
}

/**
 * Executes neural background removal via briaai/RMBG-1.4 on local Node.js ONNX
 * 
 * @param {Buffer} inputBuffer - Raw binary image buffer (JPEG/PNG/WebP, 1024px)
 * @returns {Promise<Buffer>} - PNG buffer with transparent background (RGBA)
 */
export async function removeBackgroundWithRMBG(inputBuffer) {
  if (!inputBuffer || !Buffer.isBuffer(inputBuffer)) {
    throw new Error("Érvénytelen képpuffer az AI szegmentáláshoz.");
  }

  const segmenter = await getSegmenterPipeline();
  const { RawImage } = await import("@huggingface/transformers");

  const inputBlob = new Blob([inputBuffer], { type: "image/jpeg" });
  const rawInput = await RawImage.fromBlob(inputBlob);

  const output = await segmenter(rawInput);

  let maskData = null;
  let maskWidth = 0;
  let maskHeight = 0;
  let rgbaBuffer = null;

  // Case 1: output is already a single RawImage
  if (output && output.data && output.width && output.height) {
    if (output.channels === 4) {
      rgbaBuffer = await sharp(Buffer.from(output.data), {
        raw: { width: output.width, height: output.height, channels: 4 }
      }).png().toBuffer();
    } else {
      maskData = Buffer.from(output.data);
      maskWidth = output.width;
      maskHeight = output.height;
    }
  } 
  // Case 2: output is an array of segments or masks (e.g. [{ mask: RawImage }])
  else if (Array.isArray(output) && output.length > 0) {
    const first = output[0];
    const target = first.mask || first;
    if (target && target.data && target.width && target.height) {
      if (target.channels === 4) {
        rgbaBuffer = await sharp(Buffer.from(target.data), {
          raw: { width: target.width, height: target.height, channels: 4 }
        }).png().toBuffer();
      } else {
        maskData = Buffer.from(target.data);
        maskWidth = target.width;
        maskHeight = target.height;
      }
    }
  }

  // If we extracted a grayscale mask (1 channel), combine it with the original RGB image
  if (!rgbaBuffer && maskData && maskWidth > 0 && maskHeight > 0) {
    const baseRgb = await sharp(inputBuffer)
      .resize(maskWidth, maskHeight, { fit: "fill" })
      .removeAlpha()
      .raw()
      .toBuffer();

    const combined = Buffer.alloc(maskWidth * maskHeight * 4);
    for (let i = 0, j = 0; i < maskData.length; i++, j += 3) {
      const p = i * 4;
      combined[p] = baseRgb[j];         // R
      combined[p + 1] = baseRgb[j + 1]; // G
      combined[p + 2] = baseRgb[j + 2]; // B
      combined[p + 3] = maskData[i];    // A
    }

    rgbaBuffer = await sharp(combined, {
      raw: { width: maskWidth, height: maskHeight, channels: 4 }
    }).png().toBuffer();
  }

  if (!rgbaBuffer) {
    throw new Error("A szegmentáló modell nem adott vissza értelmezhető maszkot vagy képadatot.");
  }

  return rgbaBuffer;
}

/**
 * Cleans up the alpha channel to prevent crease/shadow transparency,
 * preserves sharp garment edges (e.g. tie tip, lapels), autocrops empty margins,
 * and exports high-quality 1000×1000 px square packshot with center gravity.
 *
 * @param {Buffer} pngWithAlphaBuffer - PNG buffer from RMBG-1.4
 * @param {Object|null} garmentBox - Optional relative bounding box {ymin, xmin, ymax, xmax} (0–1 scale)
 *   If provided, pixels outside this box will be zeroed (alpha=0) to remove non-garment body parts
 *   (e.g. socks below trousers, hands beside top, trouser leg below shoe).
 * @returns {Promise<Buffer>} - 1000×1000 px centered WebP packshot buffer
 */
export async function cleanUpMaskAndCrop(pngWithAlphaBuffer, garmentBox = null) {
  if (!pngWithAlphaBuffer || !Buffer.isBuffer(pngWithAlphaBuffer)) {
    throw new Error("Érvénytelen PNG puffer a maszk-tisztításhoz.");
  }

  // 1. Ensure alpha channel exists
  const image = sharp(pngWithAlphaBuffer).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;

  // 2. Optional Garment Bounding Box Alpha Zeroing
  // Removes non-garment body parts outside the garment's detected bounding box.
  // Works universally: socks below trousers, hands beside a top, trouser leg below a shoe, etc.
  if (garmentBox && typeof garmentBox === "object") {
    const { ymin = 0, xmin = 0, ymax = 1, xmax = 1 } = garmentBox;
    // Convert relative 0–1 coords to pixel coords with a small 2% tolerance buffer
    const BUFFER = 0.02;
    const pxYmin = Math.max(0, Math.floor((ymin - BUFFER) * H));
    const pxXmin = Math.max(0, Math.floor((xmin - BUFFER) * W));
    const pxYmax = Math.min(H, Math.ceil((ymax + BUFFER) * H));
    const pxXmax = Math.min(W, Math.ceil((xmax + BUFFER) * W));

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (y < pxYmin || y > pxYmax || x < pxXmin || x > pxXmax) {
          const idx = (y * W + x) * 4 + 3;
          data[idx] = 0; // Zero out alpha for pixels outside garment box
        }
      }
    }
    console.log(`[cleanUpMaskAndCrop] garmentBox applied: rows ${pxYmin}–${pxYmax}, cols ${pxXmin}–${pxXmax} of ${W}×${H}`);
  }

  // 3. Alpha Thresholding & Hardening
  // Prevents dark background burn-through on garment folds while keeping sharp edges
  for (let i = 3; i < data.length; i += 4) {
    const a = data[i];
    if (a <= 25) {
      data[i] = 0; // Clean transparent background (noise cutoff)
    } else if (a >= 60) {
      data[i] = 255; // 100% solid fabric (eliminates dark bleed)
    } else {
      // Smooth edge antialiasing
      data[i] = Math.round(((a - 25) / 35) * 255);
    }
  }

  // 4. Autocrop empty borders, then upscale/downscale the garment to fill 92% of a 1000×1000 canvas.
  // fit:'inside' with withoutEnlargement:false ensures small photos (taken from a distance)
  // are cleanly scaled up to 920px.
  // fit:'contain' with transparent background + position:'centre' places it squarely in the middle
  // with an elegant 40px (4%) breathing border on the longest side.
  return await sharp(data, {
    raw: { width: W, height: H, channels: 4 }
  })
    .trim({ threshold: 25 })
    .resize(920, 920, {
      fit: "inside",
      withoutEnlargement: false
    })
    .resize(1000, 1000, {
      fit: "contain",
      position: "centre",
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .webp({ quality: 90 })
    .toBuffer();
}
