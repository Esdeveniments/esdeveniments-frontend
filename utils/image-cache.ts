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
 * Normalize external image URLs using string operations only (no URL object serialization).
 * This ensures byte-for-byte identical output on server (Node) and client (browser),
 * avoiding hydration mismatches caused by different URL serialization behaviors.
 *
 * - Trim whitespace
 * - Reject overly long / invalid URLs
 * - Normalize protocol-relative to https
 * - Collapse duplicate slashes in pathname (preserve protocol)
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
  const pathEnd = queryIndex !== -1 ? queryIndex : hashIndex !== -1 ? hashIndex : pathAndRest.length;
  const pathname = pathAndRest.slice(0, pathEnd).replace(/\/{2,}/g, "/");
  const suffix = pathAndRest.slice(pathEnd);

  return `${protocol}${hostPart}${pathname}${suffix}`;
}

/**
 * Appends (or replaces) a cache-busting query parameter to an image URL.
 * Uses string-based operations only to ensure SSR/client hydration consistency.
 * Uses the provided cacheKey (event hash, updatedAt, etc.) so that
 * CloudFront can keep a long TTL while still reflecting new uploads.
 *
 * Also normalizes protocol-relative URLs (//cdn.example.com/image.jpg) to HTTPS.
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

  const normalizedKey = String(cacheKey).trim();
  if (!normalizedKey) {
    return normalizedUrl;
  }

  const encodedKey = encodeURIComponent(normalizedKey);

  // Regex to find existing cache param (case-insensitive)
  const cacheParamRegex = new RegExp(`([?&])${CACHE_PARAM}=([^&#]*)`, "i");

  if (cacheParamRegex.test(normalizedUrl)) {
    // Replace existing cache param
    return normalizedUrl.replace(cacheParamRegex, `$1${CACHE_PARAM}=${encodedKey}`);
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
  
  // Add optimization parameters if provided
  if (options?.width) {
    proxyUrl += `&w=${options.width}`;
  }
  if (options?.quality) {
    proxyUrl += `&q=${options.quality}`;
  }

  return proxyUrl;
}

/**
 * Convenience helper: normalize, cache-key, and proxy an image URL.
 * Uses string-based operations to ensure SSR/client hydration consistency.
 * 
 * @param imageUrl - The image URL to optimize
 * @param cacheKey - Optional cache key for cache busting (e.g., event hash)
 * @param options - Optional width and quality parameters for optimization
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
    // Use string-based operations to avoid URL object serialization differences
    // between Node.js and browser (hydration mismatch with special chars like commas)
    let absolute = trimmed.startsWith("//") ? `https:${trimmed}` : trimmed;

    // Collapse duplicate slashes in pathname (after protocol)
    const protocolEnd = absolute.indexOf("://");
    if (protocolEnd !== -1) {
      const afterProtocol = absolute.slice(protocolEnd + 3);
      const hostEnd = afterProtocol.indexOf("/");
      if (hostEnd !== -1) {
        const host = afterProtocol.slice(0, hostEnd);
        const pathAndRest = afterProtocol.slice(hostEnd);
        // Split path from query/hash
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
        absolute = `${absolute.slice(0, protocolEnd + 3)}${host}${pathname}${suffix}`;
      }
    }

    // Add cache key using string operations
    const urlWithKey = cacheKey !== undefined && cacheKey !== null
      ? withImageCacheKey(absolute, cacheKey)
      : absolute;

    return toProxiedImageUrl(urlWithKey, options);
  }

  // Non-proxied path (relative URLs): normalize and append cache key
  const normalized = normalizeExternalImageUrl(trimmed);
  if (!normalized) return trimmed;
  return cacheKey !== undefined ? withImageCacheKey(normalized, cacheKey) : normalized;
}
