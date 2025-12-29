const ABSOLUTE_URL_REGEX = /^https?:\/\//i;
const CACHE_PARAM = "v";
const MAX_URL_LENGTH = 2048;

/**
 * Hosts with known broken SSL certificate chains (missing intermediate certs).
 * These are proxied through /api/image-proxy which bypasses strict SSL verification
 * (via NODE_TLS_REJECT_UNAUTHORIZED=0 on the server Lambda).
 * Add new hosts here when they have SSL issues preventing direct image loading.
 */
const BROKEN_SSL_HOSTNAMES = [
  ".altanet.org",
  ".biguesiriells.cat",
];

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

  // Reject overly long URLs
  if (trimmed.length > MAX_URL_LENGTH) {
    return trimmed.slice(0, MAX_URL_LENGTH);
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

/**
 * Wrap an external absolute URL with the internal image proxy to avoid mixed content
 * and flaky TLS. Keeps relative URLs untouched.
 */
export function toProxiedImageUrl(imageUrl: string): string {
  if (!imageUrl) return imageUrl;
  if (imageUrl.startsWith("/api/image-proxy")) return imageUrl;
  if (!ABSOLUTE_URL_REGEX.test(imageUrl)) return imageUrl;

  try {
    const urlObj = new URL(imageUrl);
    if (urlObj.protocol !== "http:" && urlObj.protocol !== "https:") {
      return imageUrl;
    }
    return `/api/image-proxy?url=${encodeURIComponent(urlObj.toString())}`;
  } catch {
    return imageUrl;
  }
}

/**
 * Convenience helper: normalize, cache-key, and proxy an image URL.
 */
export function buildOptimizedImageUrl(
  imageUrl: string,
  cacheKey?: string | number | null
): string {
  const trimmed = sanitizeUrlCandidate(imageUrl);
  if (!trimmed) return "";

  const shouldProxyByPrefix =
    trimmed.startsWith("http://") || trimmed.startsWith("//");

  // Some municipal hosting setups publish HTTPS URLs but ship an invalid TLS cert
  // (missing intermediate certificates in the chain). For these, the only workable
  // path is our proxy trying HTTPS first and falling back to HTTP.
  // Keep this narrowly-scoped to avoid proxying everything.
  const shouldProxyByHostname = (() => {
    try {
      const absolute = trimmed.startsWith("//") ? `https:${trimmed}` : trimmed;
      if (!ABSOLUTE_URL_REGEX.test(absolute)) return false;
      const parsed = new URL(absolute);
      return BROKEN_SSL_HOSTNAMES.some((suffix) =>
        parsed.hostname.endsWith(suffix)
      );
    } catch {
      return false;
    }
  })();

  const shouldProxy = shouldProxyByPrefix || shouldProxyByHostname;

  // If we intend to proxy, preserve original protocol where possible so the proxy
  // can retry HTTP when HTTPS is broken (common on misconfigured town sites).
  if (shouldProxy) {
    const absolute = trimmed.startsWith("//") ? `https:${trimmed}` : trimmed;
    try {
      const parsed = new URL(absolute);
      parsed.username = "";
      parsed.password = "";
      parsed.pathname = parsed.pathname.replace(/\/{2,}/g, "/");
      if (cacheKey !== undefined && cacheKey !== null) {
        const normalizedKey = String(cacheKey).trim();
        if (normalizedKey) parsed.searchParams.set(CACHE_PARAM, normalizedKey);
      }
      // Use the preserved protocol (http stays http). Protocol-relative becomes https.
      const preserved = parsed.toString();
      return toProxiedImageUrl(preserved);
    } catch {
      // Fail-open: if URL parsing fails, don't proxy
      return trimmed;
    }
  }

  // Non-proxied path: normalize (can prefer https) and append cache key
  const normalized = normalizeExternalImageUrl(trimmed);
  if (!normalized) return trimmed;
  return cacheKey !== undefined ? withImageCacheKey(normalized, cacheKey) : normalized;
}
