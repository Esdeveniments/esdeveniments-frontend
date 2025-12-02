const ABSOLUTE_URL_REGEX = /^https?:\/\//i;
const DUMMY_BASE_URL = "https://cache-buster.local";
const CACHE_PARAM = "v";

/**
 * Appends (or replaces) a cache-busting query parameter to an image URL.
 * Uses the provided cacheKey (event hash, updatedAt, etc.) so that
 * CloudFront can keep a long TTL while still reflecting new uploads.
 */
export function withImageCacheKey(
  imageUrl: string,
  cacheKey?: string | number | null
): string {
  if (!imageUrl) {
    return imageUrl;
  }

  if (cacheKey === undefined || cacheKey === null) {
    return imageUrl;
  }

  const normalizedKey = String(cacheKey).trim();
  if (!normalizedKey) {
    return imageUrl;
  }

  const isAbsolute = ABSOLUTE_URL_REGEX.test(imageUrl);

  try {
    const parsed = isAbsolute
      ? new URL(imageUrl)
      : new URL(imageUrl, DUMMY_BASE_URL);

    parsed.searchParams.set(CACHE_PARAM, normalizedKey);

    if (isAbsolute) {
      return parsed.toString();
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    // Fallback: naive string manipulation (covers protocol-relative or malformed URLs)
    const encodedKey = encodeURIComponent(normalizedKey);
    const cacheParamRegex = new RegExp(`([?&])${CACHE_PARAM}=([^&#]*)`, "i");

    if (cacheParamRegex.test(imageUrl)) {
      return imageUrl.replace(
        cacheParamRegex,
        `$1${CACHE_PARAM}=${encodedKey}`
      );
    }

    const separator = imageUrl.includes("?") ? "&" : "?";
    return `${imageUrl}${separator}${CACHE_PARAM}=${encodedKey}`;
  }
}
