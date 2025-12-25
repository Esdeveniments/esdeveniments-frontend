/**
 * Edge-safe slug sanitation helpers.
 *
 * Kept dependency-free (no i18n/message imports) so it can be used from
 * middleware and other edge runtimes without inflating bundle size.
 */

/** Lowercases, strips diacritics, handles Catalan l·l and apostrophes, collapses to ascii-friendly slugs. */
export function sanitize(input: string): string {
  if (!input) return "";
  const s = input
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .replace(/·/g, "")
    .replace(/['’]+/g, " ")
    .replace(/[–—―]/g, "-")
    .replace(/&/g, " i ")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "n-a";
}

/**
 * Legacy sanitize variant used only for matching incoming slugs from older content.
 * Differs from sanitize() by removing apostrophes instead of spacing/hyphenating them.
 * Example: "L'Escala" -> "lescala" (legacy) vs "l-escala" (current).
 */
export function sanitizeLegacyApostrophe(input: string): string {
  if (!input) return "";
  const s = input
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .replace(/·/g, "")
    .replace(/['’]+/g, "")
    .replace(/[–—―]/g, "-")
    .replace(/&/g, " i ")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "n-a";
}
