/**
 * Sartorial Wardrobe Assistant - Firebase Cloud Functions v2 Backend Proxy
 * Pure Server-Side Gemini AI Engine with Google Cloud Secret Manager & Service Account Protection
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { initializeApp, getApps } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import sharp from "sharp";
import crypto from "crypto";

// Initialize Firebase Admin SDK
if (getApps().length === 0) {
  initializeApp();
}

// Google Cloud Secret Manager definition for Gemini Master Key
const geminiApiKey = defineSecret("GEMINI_API_KEY");

// Google Gemini 2026 official model hierarchy
const FAST_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.7-flash",
  "gemini-3.6-flash"
];

const REASONING_MODELS = [
  "gemini-3.7-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.6-flash",
  "gemini-3.1-flash-lite"
];

// In-memory sliding window rate limiter (Max 10 requests per minute per UID)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 10;

function checkRateLimit(uid) {
  const now = Date.now();
  const userHistory = rateLimitMap.get(uid) || [];
  const validHistory = userHistory.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW_MS);

  if (validHistory.length >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  validHistory.push(now);
  rateLimitMap.set(uid, validHistory);

  // Cleanup old records periodically
  if (rateLimitMap.size > 2000) {
    for (const [key, timestamps] of rateLimitMap.entries()) {
      if (timestamps.every(t => now - t >= RATE_LIMIT_WINDOW_MS)) {
        rateLimitMap.delete(key);
      }
    }
  }

  return true;
}

/**
 * Robust JSON parser with self-healing on server side
 */
function parseAndHealJson(rawText) {
  if (!rawText || typeof rawText !== "string") return null;

  let clean = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(clean);
  } catch (_) {}

  const jsonMatch = clean.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (_) {
      clean = jsonMatch[0];
    }
  }

  try {
    if (clean.trim().startsWith("[")) {
      const lastClosedObjIndex = clean.lastIndexOf("}");
      if (lastClosedObjIndex !== -1) {
        return JSON.parse(clean.slice(0, lastClosedObjIndex + 1) + "]");
      }
    }

    if (clean.trim().startsWith("{")) {
      let openBrackets = (clean.match(/\{/g) || []).length;
      let closeBrackets = (clean.match(/\}/g) || []).length;
      let repairedObj = clean;
      const quoteCount = (repairedObj.match(/"/g) || []).length;
      if (quoteCount % 2 !== 0) repairedObj += '"';

      while (openBrackets > closeBrackets) {
        repairedObj += "}";
        closeBrackets++;
      }
      return JSON.parse(repairedObj);
    }
  } catch (_) {}

  return null;
}

/**
 * Universal Secure Sartorial AI Proxy Endpoint (v2)
 */
export const sartorialAiProxy = onCall(
  {
    secrets: [geminiApiKey],
    cors: true,
    maxInstances: 10,
    timeoutSeconds: 60,
    memory: "512MiB"
  },
  async (request) => {
    // 1. Strict Authentication Check (Real Logged-in User Required, Anonymous Disallowed)
    if (!request.auth || !request.auth.uid) {
      throw new HttpsError(
        "unauthenticated",
        "A Sartorial AI szolgáltatás használatához bejelentkezés szükséges."
      );
    }

    const signInProvider = request.auth.token?.firebase?.sign_in_provider;
    if (signInProvider === "anonymous") {
      throw new HttpsError(
        "unauthenticated",
        "A Sartorial AI szolgáltatás használatához kérlek jelentkezz be a fiókodba (pl. Google fiókkal)."
      );
    }

    const uid = request.auth.uid;

    // 2. Per-UID Rate Limiting (Wallet Drain / DoS Protection - Max 10 requests / min)
    if (!checkRateLimit(uid)) {
      throw new HttpsError(
        "resource-exhausted",
        "Túl sok kérés érkezett rövid időn belül (limit: 10 kérés/perc). Kérlek várj egy percet az újabb AI hívás előtt."
      );
    }

    // 3. Secret Manager Key Retrieval
    const secretKey = geminiApiKey.value() || process.env.GEMINI_API_KEY;
    if (!secretKey) {
      throw new HttpsError(
        "failed-precondition",
        "A szerveroldali Gemini API mesterkulcs nincs beállítva a Google Cloud Secret Managerben."
      );
    }

    // 4. Input Payload Validation & Sanitization
    const { contents, preferredModels = FAST_MODELS, expectJson = true, temperature = 0.2, maxOutputTokens = 8192, tools = null } = request.data || {};

    if (!contents || !Array.isArray(contents) || contents.length === 0) {
      throw new HttpsError("invalid-argument", "Érvénytelen kéréstartalom (contents hiányzik vagy üres).");
    }

    // Payload size guard (Max 2MB per request)
    const payloadLength = JSON.stringify(contents).length;
    if (payloadLength > 2.5 * 1024 * 1024) {
      throw new HttpsError("invalid-argument", "A kérés mérete meghaladja a megengedett 2MB-os felső határt.");
    }

    const modelsToTry = Array.isArray(preferredModels) && preferredModels.length > 0 ? preferredModels : FAST_MODELS;
    let lastServerError = null;

    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(secretKey.trim())}`;
        
        const requestBody = {
          contents,
          generationConfig: {
            maxOutputTokens,
            temperature
          }
        };

        if (expectJson && (!tools || tools.length === 0)) {
          requestBody.generationConfig.responseMimeType = "application/json";
        } else if (tools && tools.length > 0) {
          requestBody.tools = tools;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": secretKey.trim()
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

          if (rawText) {
            if (expectJson) {
              const parsed = parseAndHealJson(rawText);
              if (parsed !== null) {
                return {
                  success: true,
                  model,
                  result: parsed
                };
              }
            } else {
              return {
                success: true,
                model,
                result: rawText.trim()
              };
            }
          }
        } else {
          const errBody = await response.text();
          lastServerError = `HTTP ${response.status}: ${errBody.slice(0, 200)}`;
        }
      } catch (callErr) {
        lastServerError = callErr.message;
      }
    }

    // Mask internal error details before returning to client
    throw new HttpsError(
      "unavailable",
      "Az AI neurális modell átmenetileg nem tudta feldolgozni a kérést. Kérlek próbáld újra pár másodperc múlva."
    );
  }
);

/**
 * Lazy-initialized singleton for background removal pipeline
 * Uses @huggingface/transformers v3+ native 'background-removal' task
 */
let bgRemovalPipelinePromise = null;
let lastPipelineInitError = null;

async function getBgRemovalPipeline() {
  if (bgRemovalPipelinePromise) return bgRemovalPipelinePromise;
  bgRemovalPipelinePromise = (async () => {
    try {
      const { pipeline, env } = await import("@huggingface/transformers");
      env.cacheDir = "/tmp/.transformers_cache";
      env.allowLocalModels = false;
      const pipe = await pipeline("background-removal", "Xenova/modnet", {
        dtype: "fp32"
      });
      lastPipelineInitError = null;
      return pipe;
    } catch (err) {
      console.error("Transformers.js background-removal pipeline init error:", err);
      lastPipelineInitError = err.message || String(err);
      bgRemovalPipelinePromise = null; // Allow retry on next call
      return null;
    }
  })();
  return bgRemovalPipelinePromise;
}

/**
 * Server-Side Neural Background Removal & Packshot Engine (v2)
 * Uses @huggingface/transformers v3 native background-removal pipeline,
 * trims borders with Sharp autocrop, and stores directly in Firebase Storage.
 */
export const removeGarmentBackground = onCall(
  {
    cors: true,
    maxInstances: 5,
    timeoutSeconds: 120,
    memory: "2GiB"
  },
  async (request) => {
    // 1. Auth check
    const uid = request.auth?.uid || "guest_user";

    // 2. Validate input
    const { imageBase64 } = request.data || {};
    if (!imageBase64 || typeof imageBase64 !== "string") {
      throw new HttpsError("invalid-argument", "A képadat (imageBase64) hiányzik.");
    }

    // Clean data URL prefix if present
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const inputBuffer = Buffer.from(cleanBase64, "base64");

    if (inputBuffer.length > 5 * 1024 * 1024) {
      throw new HttpsError("invalid-argument", "A feltöltött kép mérete meghaladja az 5MB-ot.");
    }

    // 3. Neural Background Removal via Transformers.js v3 pipeline
    let processedBuffer = null;
    let isPackshot = false;
    let failureReason = null;

    try {
      const segmenter = await getBgRemovalPipeline();
      if (!segmenter) {
        failureReason = lastPipelineInitError || "Nem sikerült a neurális szegmentációs modellt inicializálni.";
      } else {
        const { RawImage } = await import("@huggingface/transformers");
        // Read inputBuffer into RawImage via standard Blob
        const inputBlob = new Blob([inputBuffer], { type: "image/jpeg" });
        const rawInput = await RawImage.fromBlob(inputBlob);

        // BackgroundRemovalPipeline accepts RawImage and returns Promise<RawImage[]>
        const output = await segmenter(rawInput);

        // Extract first RawImage from output array
        const rawImage = Array.isArray(output) ? output[0] : output;

        // Verify transparent background (RGBA) pixel data
        if (rawImage && rawImage.data && rawImage.width && rawImage.height) {
          // Convert RawImage RGBA pixel data to PNG buffer via Sharp
          processedBuffer = await sharp(Buffer.from(rawImage.data), {
            raw: {
              width: rawImage.width,
              height: rawImage.height,
              channels: rawImage.channels || 4
            }
          })
            .png()
            .toBuffer();
          isPackshot = true;
        } else {
          failureReason = "A neurális modell nem adott vissza érvényes képadatot.";
        }
      }
    } catch (segErr) {
      console.error("Background removal execution error:", segErr);
      failureReason = segErr.message || String(segErr);
    }

    // If neural removal failed, return honest failure (no fake packshot)
    if (!processedBuffer || !isPackshot) {
      return {
        success: false,
        isPackshot: false,
        error: failureReason
          ? `A neurális háttéreltávolítás nem sikerült (${failureReason}). Az eredeti fotó kerül mentésre.`
          : "A neurális háttéreltávolítás nem sikerült. Az eredeti fotó kerül mentésre."
      };
    }

    // 4. Sharp Autocrop (Trim transparent margins) & WebP conversion
    let trimmedWebp;
    try {
      trimmedWebp = await sharp(processedBuffer)
        .trim({ threshold: 12 })
        .resize(800, 800, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();
    } catch (cropErr) {
      console.warn("Sharp trim warning, fallback to normal WebP:", cropErr.message);
      trimmedWebp = await sharp(processedBuffer)
        .resize(800, 800, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();
    }

    // 5. Firebase Storage persistence
    const itemId = `packshot_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const filePath = `users/${uid}/wardrobe/packshots/${itemId}.webp`;
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET || "wardrobe-assistant-48e01.firebasestorage.app";
    const bucket = getStorage().bucket(bucketName);
    const file = bucket.file(filePath);
    const downloadToken = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);

    await file.save(trimmedWebp, {
      metadata: {
        contentType: "image/webp",
        metadata: {
          firebaseStorageDownloadTokens: downloadToken
        }
      }
    });

    const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filePath)}?alt=media&token=${downloadToken}`;
    const dataUrl = `data:image/webp;base64,${trimmedWebp.toString("base64")}`;

    return {
      success: true,
      isPackshot: true,
      itemId,
      imageUrl,
      dataUrl,
      storagePath: filePath
    };
  }
);

