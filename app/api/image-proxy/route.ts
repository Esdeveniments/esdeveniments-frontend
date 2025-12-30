/**
 * Generic image proxy to handle flaky/insecure external images.
 * - HTTPS-first; retries HTTP if original was HTTP-only.
 * - Validates protocol and URL length to reduce SSRF risk.
 * - Enforces timeouts and size guard; falls back to 1x1 PNG.
 */
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { Agent } from "undici";
import { normalizeExternalImageUrl } from "@utils/image-cache";

const TRANSPARENT_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==";
const FALLBACK_BUFFER = Buffer.from(TRANSPARENT_PNG_BASE64, "base64");
const MAX_BYTES = 5_000_000; // 5MB guard
const TIMEOUT_MS = 5000;
const SNIFF_BYTES = 64;
const ONE_YEAR = 31536000;

// Some municipal sites ship an incomplete TLS certificate chain (missing intermediate certs).
// Node's TLS verification rejects these, so we selectively bypass verification only for
// known-bad hosts.
const BROKEN_TLS_HOST_SUFFIXES = [".altanet.org", ".biguesiriells.cat"];

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
  return new NextResponse(FALLBACK_BUFFER, {
    status,
    headers: {
      "Content-Type": "image/png",
      // Do not cache fallbacks: if we return the transparent pixel once, we don't want
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
    const init: RequestInit & { dispatcher?: unknown } = {
      signal: controller.signal,
    };

    if (shouldBypassTlsVerification(url)) {
      init.dispatcher = insecureTlsDispatcher;
    }

    return await fetch(url, init as RequestInit);
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

  // Normalize and validate
  const normalized = normalizeExternalImageUrl(rawTarget);
  if (!normalized || !isAbsoluteHttpUrl(normalized)) {
    return buildPlaceholder(400);
  }

  // Check if URL has cache key BEFORE stripping (for cache header logic later)
  const hasCacheKey = hasStrongCacheKey(normalized);

  // Strip ?v= before fetching upstream - some servers reject unknown query params
  const upstreamUrl = stripCacheKeyForUpstream(normalized);

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

      // Stream the image instead of buffering it: read a small prefix to sniff type,
      // then pipe the rest while enforcing an upper byte limit.
      const body = response.body;
      if (!body) continue;

      const reader = body.getReader();
      const firstRead = await reader.read();
      if (firstRead.done) continue;

      const firstChunk = Buffer.from(firstRead.value);
      if (firstChunk.length === 0) continue;

      // Sniff only the first bytes (avoid large allocations)
      const sniffBuffer =
        firstChunk.length > SNIFF_BYTES
          ? firstChunk.subarray(0, SNIFF_BYTES)
          : firstChunk;
      const sniffedType = sniffImageContentType(sniffBuffer);

      const finalType =
        (isAllowedRasterContentType(headerType) && headerType) ||
        (isAllowedRasterContentType(sniffedType) && sniffedType) ||
        "";
      if (!finalType) {
        // Not a valid raster image (or missing type). Cancel upstream stream.
        try {
          await reader.cancel();
        } catch {
          // ignore
        }
        continue;
      }

      let bytesSent = firstChunk.length;
      if (bytesSent > MAX_BYTES) {
        try {
          await reader.cancel();
        } catch {
          // ignore
        }
        continue;
      }

      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(firstChunk);
        },
        async pull(controller) {
          try {
            const next = await reader.read();
            if (next.done) {
              controller.close();
              return;
            }

            const chunk = next.value;
            bytesSent += chunk.byteLength;
            if (bytesSent > MAX_BYTES) {
              try {
                await reader.cancel();
              } catch {
                // ignore
              }
              // Terminate the stream: Next/Image will treat it as a failed image,
              // and our server-rendered fallback will remain visible.
              controller.error(new Error("Image too large"));
              return;
            }

            controller.enqueue(chunk);
          } catch (err) {
            controller.error(err);
          }
        },
        async cancel() {
          try {
            await reader.cancel();
          } catch {
            // ignore
          }
        },
      });

      const cacheControl = hasCacheKey
        ? // Align with infra strategy: long TTL + cache-busting via ?v=
          `public, max-age=${ONE_YEAR}, s-maxage=${ONE_YEAR}, immutable`
        : // Conservative default for unversioned upstream URLs
          "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800";

      return new NextResponse(stream, {
        status: 200,
        headers: {
          "Content-Type": finalType,
          "Cache-Control": cacheControl,
        },
      });
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
