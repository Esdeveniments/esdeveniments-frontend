const ABSOLUTE_URL_REGEX = /^https?:\/\//i;
const DUMMY_BASE_URL = "https://cache-buster.local";
const CACHE_PARAM = "v";

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
  if (!imageUrl) {
    return imageUrl;
  }

  // Normalize protocol-relative URLs to HTTPS first
  // This handles URLs like //cdn.example.com/image.jpg from external sources
  let normalizedUrl = imageUrl;
  if (imageUrl.startsWith("//")) {
    normalizedUrl = `https:${imageUrl}`;
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
