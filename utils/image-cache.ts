const ABSOLUTE_URL_REGEX = /^https?:\/\//i;
const DUMMY_BASE_URL = "https://cache-buster.local";
const CACHE_PARAM = "v";
const MAX_URL_LENGTH = 2048;

function sanitizeUrlCandidate(imageUrl: string | null | undefined): string {
  if (!imageUrl || typeof imageUrl !== "string") {
    return "";
  }
  return imageUrl.trim();
}

/**
 * Normalize external image URLs:
 * - Trim whitespace
 * - Reject overly long / invalid URLs
 * - Normalize protocol-relative to https
 * - Collapse duplicate slashes in pathname (preserve protocol)
 * - Prefer https over http when the host is not localhost/127.0.0.1
 */
export function normalizeExternalImageUrl(imageUrl: string): string {
  const trimmed = sanitizeUrlCandidate(imageUrl);
  if (!trimmed) {
    return "";
  }

  // Handle protocol-relative
  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }

  // If it looks like a URL with protocol but not http/https, drop it
  if (trimmed.includes("://") && !ABSOLUTE_URL_REGEX.test(trimmed)) {
    return "";
  }

  // If not absolute, return trimmed as-is (relative URLs are allowed)
  if (!ABSOLUTE_URL_REGEX.test(trimmed)) {
    return trimmed;
  }

  try {
    const urlObj = new URL(trimmed);

    // Avoid userinfo (credentials) in URL to prevent SSRF-style surprises
    urlObj.username = "";
    urlObj.password = "";

    // Collapse duplicate slashes in pathname (keeping leading slash)
    urlObj.pathname = urlObj.pathname.replace(/\/{2,}/g, "/");

    // Encode pipe characters (|) in pathname to %7C for consistent hydration
    // This prevents server/client mismatch where browser encodes | but URL() doesn't
    urlObj.pathname = urlObj.pathname.replace(/\|/g, "%7C");

    return urlObj.toString();
  } catch {
    // Fail-open: keep the original trimmed URL so we don't break rendering
    // for upstreams that return slightly non-compliant but still fetchable URLs.
    return trimmed.length > MAX_URL_LENGTH ? trimmed.slice(0, MAX_URL_LENGTH) : trimmed;
  }
}

/**
 * Appends (or replaces) a cache-busting query parameter to an image URL.
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

  const isAbsolute = ABSOLUTE_URL_REGEX.test(normalizedUrl);

  try {
    const parsed = isAbsolute
      ? new URL(normalizedUrl)
      : new URL(normalizedUrl, DUMMY_BASE_URL);

    parsed.searchParams.set(CACHE_PARAM, normalizedKey);

    if (isAbsolute) {
      return parsed.toString();
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    // Fallback: naive string manipulation (covers protocol-relative or malformed URLs)
    const encodedKey = encodeURIComponent(normalizedKey);
    const cacheParamRegex = new RegExp(`([?\u0026])${CACHE_PARAM}=([^\u0026#]*)`, "i");

    if (cacheParamRegex.test(normalizedUrl)) {
      return normalizedUrl.replace(
        cacheParamRegex,
        `$1${CACHE_PARAM}=${encodedKey}`
      );
    }

    const separator = normalizedUrl.includes("?") ? "\u0026" : "?";
    return `${normalizedUrl}${separator}${CACHE_PARAM}=${encodedKey}`;
  }
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

  // Some municipal hosting setups publish HTTPS URLs but ship an invalid TLS cert.
  // For these, the only workable path is our proxy trying HTTPS first and falling
  // back to HTTP. Keep this narrowly-scoped to avoid proxying everything.
  const shouldProxyByHostname = (() => {
    try {
      const absolute = trimmed.startsWith("//") ? `https:${trimmed}` : trimmed;
      if (!ABSOLUTE_URL_REGEX.test(absolute)) return false;
      const parsed = new URL(absolute);
      return parsed.hostname.endsWith(".altanet.org");
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
