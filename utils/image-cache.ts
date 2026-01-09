import type { ImageProxyOptions } from "types/common";

const ABSOLUTE_URL_REGEX = /^https?:\/\//i;
const CACHE_PARAM = "v";
const MAX_URL_LENGTH = 2048;

function sanitizeUrlCandidate(imageUrl: string | null | undefined): string {
  if (!imageUrl || typeof imageUrl !== "string") {
    return "";
  }
  return imageUrl.trim();
}

/**
 * Check if URL looks like a legacy file handler BEFORE normalization.
 * Used to skip aggressive normalization (like double-slash collapsing).
 */
function looksLikeLegacyHandler(url: string): boolean {
  const lowerUrl = url.toLowerCase();
  return lowerUrl.includes(".ashx");
}

/**
 * Normalize external image URLs using string operations only (no URL object serialization).
 * This ensures byte-for-byte identical output on server (Node) and client (browser),
 * avoiding hydration mismatches caused by different URL serialization behaviors.
 *
 * - Trim whitespace
 * - Reject overly long / invalid URLs
 * - Normalize protocol-relative to https
 * - Collapse duplicate slashes in pathname (preserve protocol) - EXCEPT for legacy handlers
 * - Strip userinfo (credentials) for security
 */
export function normalizeExternalImageUrl(imageUrl: string): string {
  const trimmed = sanitizeUrlCandidate(imageUrl);
  if (!trimmed) {
    return "";
  }

  // Reject overly long URLs - return empty to trigger fallback image rather than broken truncated URL
  if (trimmed.length > MAX_URL_LENGTH) {
    return "";
  }

  // Handle protocol-relative
  if (trimmed.startsWith("//")) {
    return normalizeExternalImageUrl(`https:${trimmed}`);
  }

  // If it looks like a URL with protocol but not http/https, drop it
  if (trimmed.includes("://") && !ABSOLUTE_URL_REGEX.test(trimmed)) {
    return "";
  }

  // If not absolute, return trimmed as-is (relative URLs are allowed)
  if (!ABSOLUTE_URL_REGEX.test(trimmed)) {
    // Collapse duplicate slashes in relative paths
    return trimmed.replace(/\/{2,}/g, "/");
  }

  // For legacy file handlers, preserve URL structure exactly (don't collapse slashes)
  // These handlers may depend on specific URL patterns
  if (looksLikeLegacyHandler(trimmed)) {
    // Only do minimal normalization: lowercase protocol
    const protocolMatch = trimmed.match(/^(https?:\/\/)/i);
    if (protocolMatch) {
      return (
        protocolMatch[1].toLowerCase() + trimmed.slice(protocolMatch[1].length)
      );
    }
    return trimmed;
  }

  // --- String-based normalization for absolute URLs ---
  // Split into protocol + rest
  const protocolMatch = trimmed.match(/^(https?:\/\/)/i);
  if (!protocolMatch) {
    return trimmed;
  }
  const protocol = protocolMatch[1].toLowerCase(); // normalize to lowercase
  let rest = trimmed.slice(protocolMatch[1].length);

  // Strip userinfo (user:pass@) if present
  const atIndex = rest.indexOf("@");
  const slashIndex = rest.indexOf("/");
  if (atIndex !== -1 && (slashIndex === -1 || atIndex < slashIndex)) {
    rest = rest.slice(atIndex + 1);
  }

  // Find where the path starts
  const pathStart = rest.indexOf("/");
  if (pathStart === -1) {
    // No path, just host (possibly with query/hash)
    return `${protocol}${rest}`;
  }

  const hostPart = rest.slice(0, pathStart);
  let pathAndRest = rest.slice(pathStart);

  // Collapse duplicate slashes in pathname only (not in query or hash)
  const queryIndex = pathAndRest.indexOf("?");
  const hashIndex = pathAndRest.indexOf("#");
  const pathEnd =
    queryIndex !== -1
      ? queryIndex
      : hashIndex !== -1
      ? hashIndex
      : pathAndRest.length;
  const pathname = pathAndRest.slice(0, pathEnd).replace(/\/{2,}/g, "/");
  const suffix = pathAndRest.slice(pathEnd);

  return `${protocol}${hostPart}${pathname}${suffix}`;
}

/**
 * Detect if a URL is a legacy file handler (like ASP.NET .ashx) that doesn't
 * tolerate extra query parameters. These handlers:
 * - Use complex query strings with tokens/hashes as the file identifier
 * - May break if we add ?v=, &w=, &q= parameters
 *
 * Examples:
 * - l-h.cat/utils/obreFitxer.ashx?Fw9EVw48XS4qazCg7ARHmz...
 * - Any .ashx handler with existing query params
 * - URLs with long hash-like query params (20+ alphanumeric chars)
 */
export function isLegacyFileHandler(url: string): boolean {
  // Check for .ashx (ASP.NET generic handler) with query params
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes(".ashx?")) return true;

  const queryIndex = url.indexOf("?");
  if (queryIndex === -1) return false;

  const hashIndex = url.indexOf("#");
  const queryEnd = hashIndex !== -1 ? hashIndex : url.length;
  const queryString = url.slice(queryIndex + 1, queryEnd);

  // If query string is long and contains hash-like characters, it likely has its own cache key
  // Skip URLs that already have a ?v= param (we handle those separately)
  if (queryString.includes("v=")) return false;

  // Check for long query values that look like hashes/tokens (20+ chars of alphanumeric)
  const params = queryString.split("&");
  for (const param of params) {
    // A value can be the whole parameter if there's no '=', or the part after '='
    const value = param.includes("=")
      ? param.substring(param.indexOf("=") + 1)
      : param;
    if (/[a-zA-Z0-9]{20,}/.test(value)) {
      return true;
    }
  }
  return false;
}

/**
 * Appends (or replaces) a cache-busting query parameter to an image URL.
 * Uses string-based operations only to ensure SSR/client hydration consistency.
 * Uses the provided cacheKey (event hash, updatedAt, etc.) so that
 * CloudFront can keep a long TTL while still reflecting new uploads.
 *
 * Also normalizes protocol-relative URLs (//cdn.example.com/image.jpg) to HTTPS.
 *
 * Skips adding cache key for URLs that already have complex query strings
 * with inherent cache-busting (e.g., l-h.cat file handler URLs).
 */
export function withImageCacheKey(
  imageUrl: string,
  cacheKey?: string | number | null
): string {
  const normalizedUrl = normalizeExternalImageUrl(imageUrl);
  if (!normalizedUrl) {
    return normalizedUrl;
  }

  // If no cache key provided, return the normalized URL
  if (cacheKey === undefined || cacheKey === null) {
    return normalizedUrl;
  }

  // Skip URLs that are legacy file handlers (e.g., .ashx with token-like query strings)
  // These don't tolerate extra query params
  if (isLegacyFileHandler(normalizedUrl)) {
    return normalizedUrl;
  }

  const normalizedKey = String(cacheKey).trim();
  if (!normalizedKey) {
    return normalizedUrl;
  }

  const encodedKey = encodeURIComponent(normalizedKey);

  // Regex to find existing cache param (case-insensitive)
  const cacheParamRegex = new RegExp(`([?&])${CACHE_PARAM}=([^&#]*)`, "i");

  if (cacheParamRegex.test(normalizedUrl)) {
    // Replace existing cache param
    return normalizedUrl.replace(
      cacheParamRegex,
      `$1${CACHE_PARAM}=${encodedKey}`
    );
  }

  // Append new cache param
  // Check if URL has a hash - insert before it
  const hashIndex = normalizedUrl.indexOf("#");
  if (hashIndex !== -1) {
    const beforeHash = normalizedUrl.slice(0, hashIndex);
    const hash = normalizedUrl.slice(hashIndex);
    const separator = beforeHash.includes("?") ? "&" : "?";
    return `${beforeHash}${separator}${CACHE_PARAM}=${encodedKey}${hash}`;
  }

  const separator = normalizedUrl.includes("?") ? "&" : "?";
  return `${normalizedUrl}${separator}${CACHE_PARAM}=${encodedKey}`;
}

// Re-export ImageProxyOptions for consumers importing from this module
export type { ImageProxyOptions };

/**
 * Wrap an external absolute URL with the internal image proxy to avoid mixed content
 * and flaky TLS. Keeps relative URLs untouched.
 * Uses string operations only to avoid hydration mismatches from URL object serialization.
 *
 * @param imageUrl - The external image URL to proxy
 * @param options - Optional width and quality parameters for optimization
 */
export function toProxiedImageUrl(
  imageUrl: string,
  options?: ImageProxyOptions
): string {
  if (!imageUrl) return imageUrl;
  if (imageUrl.startsWith("/api/image-proxy")) return imageUrl;
  if (!ABSOLUTE_URL_REGEX.test(imageUrl)) return imageUrl;

  // Validate protocol using string check (avoid URL object for hydration consistency)
  const lowerUrl = imageUrl.toLowerCase();
  if (!lowerUrl.startsWith("http://") && !lowerUrl.startsWith("https://")) {
    return imageUrl;
  }

  let proxyUrl = `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;

  // Skip optimization parameters for legacy file handlers (e.g., .ashx)
  // These URLs don't benefit from our optimization and the extra params
  // could cause issues (though they're on our proxy URL, not upstream)
  // More importantly, these handlers often return images that shouldn't be resized
  if (!isLegacyFileHandler(imageUrl)) {
    // Add optimization parameters if provided
    if (options?.width) {
      proxyUrl += `&w=${options.width}`;
    }
    if (options?.quality) {
      proxyUrl += `&q=${options.quality}`;
    }
  }
  // Format param bypasses Accept header detection (CloudFront may not forward Accept)
  if (options?.format) {
    proxyUrl += `&format=${options.format}`;
  }

  return proxyUrl;
}

/**
 * Convenience helper: normalize, cache-key, and proxy an image URL.
 * Uses string-based operations to ensure SSR/client hydration consistency.
 *
 * @param imageUrl - The image URL to optimize
 * @param cacheKey - Optional cache key for cache busting (e.g., event hash)
 * @param options - Optional width, quality, and format parameters for optimization
 */
export function buildOptimizedImageUrl(
  imageUrl: string,
  cacheKey?: string | number | null,
  options?: ImageProxyOptions
): string {
  const trimmed = sanitizeUrlCandidate(imageUrl);
  if (!trimmed) return "";

  // Proxy ALL external absolute URLs (http, https, protocol-relative)
  // This ensures we control the upstream fetch and can strip ?v= cache keys
  // that some external servers reject.
  const shouldProxy =
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("//");

  if (shouldProxy) {
    // withImageCacheKey already handles all normalization (protocol-relative,
    // legacy handlers, slash collapsing) via normalizeExternalImageUrl
    const urlWithKey = withImageCacheKey(trimmed, cacheKey);

    return toProxiedImageUrl(urlWithKey, options);
  }

  // Non-proxied path (relative URLs): normalize and append cache key
  const normalized = normalizeExternalImageUrl(trimmed);
  if (!normalized) return trimmed;
  return cacheKey !== undefined
    ? withImageCacheKey(normalized, cacheKey)
    : normalized;
}

/**
 * Generate URLs for <picture> element sources with modern format fallbacks.
 * Returns WebP, AVIF, and JPEG URLs for progressive enhancement.
 * WebP is prioritized over AVIF for faster encoding and more reliable output.
 *
 * Usage:
 * ```tsx
 * const sources = buildPictureSourceUrls(imageUrl, cacheKey, { width, quality });
 * <picture>
 *   <source srcSet={sources.webp} type="image/webp" />
 *   <source srcSet={sources.avif} type="image/avif" />
 *   <img src={sources.fallback} alt="..." />
 * </picture>
 * ```
 */
export function buildPictureSourceUrls(
  imageUrl: string,
  cacheKey?: string | number | null,
  options?: Omit<ImageProxyOptions, "format">
): { avif: string; webp: string; fallback: string } {
  const baseOptions = options ?? {};

  return {
    avif: buildOptimizedImageUrl(imageUrl, cacheKey, {
      ...baseOptions,
      format: "avif",
    }),
    webp: buildOptimizedImageUrl(imageUrl, cacheKey, {
      ...baseOptions,
      format: "webp",
    }),
    fallback: buildOptimizedImageUrl(imageUrl, cacheKey, baseOptions), // JPEG (no format param)
  };
}
