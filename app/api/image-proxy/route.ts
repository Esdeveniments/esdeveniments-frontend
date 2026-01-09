/**
 * Generic image proxy to handle flaky/insecure external images.
 * - HTTPS-first; retries HTTP if original was HTTP-only.
 * - Validates protocol and URL length to reduce SSRF risk.
 * - Enforces timeouts and size guard; falls back to 1x1 PNG.
 * - Supports image optimization: resizing, format conversion (WebP/AVIF), quality control
 */
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { Agent } from "undici";
import {
  normalizeExternalImageUrl,
  isLegacyFileHandler,
} from "@utils/image-cache";
// Dynamic import to avoid Turbopack bundling issues with native modules in Lambda
import type { Sharp } from "sharp";

const MAX_BYTES = 5_000_000; // 5MB guard
const TIMEOUT_MS = 5000;
const SNIFF_BYTES = 64;
const ONE_YEAR = 31536000;

// Image optimization defaults
const DEFAULT_QUALITY = 40; // Reduced from 50 for better compression (WebP/JPEG handle this well)
const MAX_WIDTH = 1920;
const CARD_WIDTH = 500; // Reduced from 700 - cards display at ~280px, 500 covers 2x retina
const MIN_SIZE_FOR_OPTIMIZATION = 10_000; // 10KB - skip optimization for tiny images
const ANIMATED_GIF_FRAME_THRESHOLD = 1; // If GIF has more than 1 frame, skip optimization

/** Cache control header based on whether URL has cache-busting key */
function getCacheControl(hasCacheKey: boolean): string {
  return hasCacheKey
    ? `public, max-age=${ONE_YEAR}, s-maxage=${ONE_YEAR}, immutable`
    : "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800";
}

// Some municipal sites ship an incomplete TLS certificate chain (missing intermediate certs).
// Node's TLS verification rejects these, so we selectively bypass verification only for
// known-bad hosts.
const BROKEN_TLS_HOST_SUFFIXES = [
  ".altanet.org",
  ".biguesiriells.cat",
  ".l-h.cat",
];

const insecureTlsDispatcher = new Agent({
  connect: {
    rejectUnauthorized: false,
  },
});

function shouldBypassTlsVerification(candidateUrl: string): boolean {
  try {
    const parsed = new URL(candidateUrl);
    if (parsed.protocol !== "https:") return false;
    return BROKEN_TLS_HOST_SUFFIXES.some((suffix) =>
      parsed.hostname.endsWith(suffix)
    );
  } catch {
    return false;
  }
}

function buildPlaceholder(status = 502) {
  // Return empty response (not valid image data) so browser triggers onerror
  // This allows ClientImage to show ImgDefault fallback
  return new NextResponse(null, {
    status,
    headers: {
      // Do not cache fallbacks: if we return an error once, we don't want
      // CloudFront/Service Worker to keep serving it after the upstream recovers.
      "Cache-Control": "no-store, max-age=0",
      "X-Image-Proxy-Fallback": "1",
    },
  });
}

function isAbsoluteHttpUrl(candidate: string): boolean {
  return /^https?:\/\//i.test(candidate);
}

async function fetchWithTimeout(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const bypassTls = shouldBypassTlsVerification(url);
    const init: RequestInit & { dispatcher?: unknown } = {
      signal: controller.signal,
    };

    if (bypassTls) {
      init.dispatcher = insecureTlsDispatcher;
    }

    return await fetch(url, init as RequestInit);
  } catch (error) {
    throw new Error(`Fetch failed for ${url}`, { cause: error });
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeHeaderContentType(contentType: string | null): string {
  if (!contentType) return "";
  return contentType.split(";")[0]?.trim().toLowerCase() || "";
}

function sniffImageContentType(buffer: Buffer): string {
  if (buffer.length < 12) return "";

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // GIF: "GIF8"
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38
  ) {
    return "image/gif";
  }

  // WebP: "RIFF....WEBP"
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "image/webp";
  }

  // AVIF (ISO-BMFF): look for "ftypavif" early
  const head = buffer
    .subarray(0, Math.min(buffer.length, 64))
    .toString("binary");
  if (head.includes("ftypavif")) {
    return "image/avif";
  }

  return "";
}

function isAllowedRasterContentType(contentType: string): boolean {
  if (!contentType) return false;
  if (contentType === "image/svg+xml") return false;
  return contentType.startsWith("image/");
}

function hasStrongCacheKey(upstreamUrl: string): boolean {
  // Our app already appends ?v=<hash> to image URLs; when present we can safely
  // cache for a long time because updates change the URL.
  try {
    const urlObj = new URL(upstreamUrl);
    const v = urlObj.searchParams.get("v") || "";
    return v.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Strip our cache-busting `?v=` param before fetching from upstream.
 * Some external servers reject URLs with unexpected query params.
 * CloudFront still caches by the full proxy URL (with ?v=), so cache-busting
 * works on our side without affecting upstream servers.
 */
function stripCacheKeyForUpstream(imageUrl: string): string {
  try {
    const urlObj = new URL(imageUrl);
    urlObj.searchParams.delete("v");
    return urlObj.toString();
  } catch {
    return imageUrl;
  }
}

function buildFetchCandidates(
  absoluteUrl: string,
  originalWasHttp: boolean
): string[] {
  // Always try HTTPS first for non-localhost, then fall back to HTTP when applicable.
  try {
    const parsed = new URL(absoluteUrl);
    const isLocalhost =
      parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";

    const https = new URL(parsed.toString());
    https.protocol = "https:";

    const http = new URL(parsed.toString());
    http.protocol = "http:";

    // If localhost, prefer original protocol (usually http) and don't force https first.
    if (isLocalhost) {
      return [parsed.toString()];
    }

    // If input already https, only add http fallback when the original input was http.
    if (parsed.protocol === "https:") {
      return originalWasHttp
        ? [https.toString(), http.toString()]
        : [https.toString()];
    }

    // If input is http, still try https first, then http.
    if (parsed.protocol === "http:") {
      return [https.toString(), http.toString()];
    }

    return [parsed.toString()];
  } catch {
    return [absoluteUrl];
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawTarget = url.searchParams.get("url") || "";
  if (!rawTarget) return buildPlaceholder(400);

  // Parse optimization params
  const requestedWidth =
    parseInt(url.searchParams.get("w") || "", 10) || CARD_WIDTH;
  const requestedQuality =
    parseInt(url.searchParams.get("q") || "", 10) || DEFAULT_QUALITY;
  // Determine output format:
  // 1. Explicit format param takes priority (avif, webp, jpeg, png)
  // 2. Falls back to Accept header (but CloudFront may not forward it)
  // 3. Defaults to source format or JPEG
  const formatParam = url.searchParams.get("format")?.toLowerCase();
  const acceptHeader = request.headers.get("accept") || "";
  const preferAvif =
    formatParam === "avif" ||
    (!formatParam && acceptHeader.includes("image/avif"));
  const preferWebp =
    formatParam === "webp" ||
    (!formatParam && acceptHeader.includes("image/webp"));

  // Clamp values to reasonable limits
  const width = Math.min(Math.max(requestedWidth, 16), MAX_WIDTH);
  const quality = Math.min(Math.max(requestedQuality, 1), 100);

  // Normalize and validate
  const normalized = normalizeExternalImageUrl(rawTarget);
  if (!normalized || !isAbsoluteHttpUrl(normalized)) {
    return buildPlaceholder(400);
  }

  // Check if URL has cache key BEFORE stripping (for cache header logic later)
  const hasCacheKey = hasStrongCacheKey(normalized);

  // Strip ?v= before fetching upstream - some servers reject unknown query params.
  // Skip for legacy file handlers (.ashx) which have non-standard query strings
  // that get corrupted by URL object serialization (adds trailing "=").
  const upstreamUrl = isLegacyFileHandler(normalized)
    ? normalized
    : stripCacheKeyForUpstream(normalized);

  const originalWasHttp = (() => {
    try {
      const original = rawTarget.startsWith("//")
        ? `https:${rawTarget}`
        : rawTarget;
      return new URL(original).protocol === "http:";
    } catch {
      return false;
    }
  })();

  const candidates = buildFetchCandidates(upstreamUrl, originalWasHttp);

  for (const candidate of candidates) {
    try {
      const response = await fetchWithTimeout(candidate);
      if (!response.ok) continue;

      const contentLength = Number(response.headers.get("content-length"));
      if (!Number.isNaN(contentLength) && contentLength > MAX_BYTES) {
        continue;
      }

      const headerType = normalizeHeaderContentType(
        response.headers.get("content-type")
      );

      // Buffer the entire image for Sharp processing
      const body = response.body;
      if (!body) continue;

      const chunks: Uint8Array[] = [];
      const reader = body.getReader();
      let totalBytes = 0;
      let imageTooLarge = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        totalBytes += value.byteLength;
        if (totalBytes > MAX_BYTES) {
          await reader.cancel();
          imageTooLarge = true;
          break; // Exit the while loop
        }
        chunks.push(value);
      }

      if (imageTooLarge) {
        continue; // Continue to the next fetch candidate
      }

      const imageBuffer = Buffer.concat(chunks);
      if (imageBuffer.length === 0) continue;

      // Sniff content type
      const sniffBuffer = imageBuffer.subarray(
        0,
        Math.min(imageBuffer.length, SNIFF_BYTES)
      );
      const sniffedType = sniffImageContentType(sniffBuffer);

      const sourceType =
        (isAllowedRasterContentType(headerType) && headerType) ||
        (isAllowedRasterContentType(sniffedType) && sniffedType) ||
        "";
      if (!sourceType) continue;

      // Skip optimization for very small images (already optimized or icons)
      // and serve them directly - avoids overhead and potential size increase
      if (imageBuffer.length < MIN_SIZE_FOR_OPTIMIZATION) {
        return new NextResponse(new Uint8Array(imageBuffer), {
          status: 200,
          headers: {
            "Content-Type": sourceType,
            "Cache-Control": getCacheControl(hasCacheKey),
            "X-Image-Proxy-Optimized": "skipped-small",
          },
        });
      }

      // Process image with Sharp
      // Lambda: eval("require") bypasses Turbopack's module mangling
      try {
        const sharp = eval("require")("sharp") as typeof import("sharp");
        let sharpInstance: Sharp = sharp(imageBuffer);

        // Get image metadata to determine if resize is needed
        const metadata = await sharpInstance.metadata();
        const originalWidth = metadata.width || 0;

        // Skip optimization for animated GIFs to preserve animation
        const isAnimatedGif =
          sourceType === "image/gif" &&
          (metadata.pages ?? 1) > ANIMATED_GIF_FRAME_THRESHOLD;

        if (isAnimatedGif) {
          return new NextResponse(new Uint8Array(imageBuffer), {
            status: 200,
            headers: {
              "Content-Type": sourceType,
              "Cache-Control": getCacheControl(hasCacheKey),
              "X-Image-Proxy-Optimized": "skipped-animated",
            },
          });
        }

        // Only resize if image is larger than requested width
        if (originalWidth > width) {
          sharpInstance = sharpInstance.resize({
            width,
            withoutEnlargement: true,
            fit: "inside",
          });
        }

        // Determine output format and process
        let outputBuffer: Buffer;
        let outputContentType: string;

        if (preferAvif || preferWebp) {
          // WebP: excellent compression, fast encoding, reliable output
          // We always use WebP for modern formats - AVIF encoding is slower
          // and has caused issues with certain source images
          outputBuffer = await sharpInstance
            .webp({ quality, effort: 4 })
            .toBuffer();
          outputContentType = "image/webp";
        } else if (sourceType === "image/png") {
          // Keep PNG format for transparency (use default compressionLevel for speed)
          outputBuffer = await sharpInstance.png({ quality }).toBuffer();
          outputContentType = "image/png";
        } else if (sourceType === "image/gif") {
          // Keep GIF format if AVIF/WebP not preferred (legacy browsers)
          outputBuffer = await sharpInstance.gif().toBuffer();
          outputContentType = "image/gif";
        } else {
          // Default to JPEG for everything else
          outputBuffer = await sharpInstance
            .jpeg({ quality, mozjpeg: true })
            .toBuffer();
          outputContentType = "image/jpeg";
        }

        // Convert Buffer to Uint8Array for NextResponse compatibility
        const responseBody = new Uint8Array(outputBuffer);

        // Calculate savings for debugging
        const savingsPercent = Math.round(
          (1 - outputBuffer.length / imageBuffer.length) * 100
        );

        return new NextResponse(responseBody, {
          status: 200,
          headers: {
            "Content-Type": outputContentType,
            "Cache-Control": getCacheControl(hasCacheKey),
            Vary: "Accept", // Cache different formats separately
            "X-Image-Proxy-Optimized": "true",
            "X-Image-Proxy-Savings": `${savingsPercent}%`,
            "X-Image-Proxy-Original-Size": String(imageBuffer.length),
            "X-Image-Proxy-Final-Size": String(outputBuffer.length),
          },
        });
      } catch (sharpError) {
        // If Sharp processing fails, fall back to original image
        const errorMessage =
          sharpError instanceof Error ? sharpError.message : String(sharpError);
        console.error("[image-proxy] Sharp processing failed:", errorMessage);

        if (process.env.NODE_ENV === "production") {
          Sentry.captureException(sharpError, {
            tags: { route: "/api/image-proxy", stage: "sharp-processing" },
          });
        }

        // Return original image without processing
        // Use short cache to allow retry after transient Sharp failures
        // Sanitize error message for HTTP header (remove newlines, control chars, truncate)
        const sanitizedError = errorMessage
          .replace(/[\r\n\t]/g, " ")
          .replace(/[^\x20-\x7E]/g, "")
          .slice(0, 100);

        return new NextResponse(new Uint8Array(imageBuffer), {
          status: 200,
          headers: {
            "Content-Type": sourceType,
            "Cache-Control": "public, max-age=300, s-maxage=300",
            "X-Image-Proxy-Optimized": "fallback-sharp-error",
            "X-Image-Proxy-Error": sanitizedError || "unknown",
          },
        });
      }
    } catch (error) {
      if (process.env.NODE_ENV === "production") {
        Sentry.captureException(error, {
          tags: { route: "/api/image-proxy", candidate },
        });
      }
    }
  }

  return buildPlaceholder();
}
