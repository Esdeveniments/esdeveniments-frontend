import { createHash } from "node:crypto";

/**
 * Generates a stable hash for a given text to be used as part of a cache key.
 * Uses SHA-256 and takes the first 16 characters of the hex digest.
 */
export function hashText(text: string): string {
  // Avoid using the full description as a cache key (memory-heavy).
  // A stable hash gives us a compact key while still deduplicating translations.
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

/**
 * Builds a cache key for a translation request.
 */
export function getCacheKey(text: string, targetLang: "en" | "es") {
  return `${targetLang}:${hashText(text)}`;
}
