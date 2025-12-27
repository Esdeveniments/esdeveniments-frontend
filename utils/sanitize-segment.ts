/**
 * Edge-safe slug sanitation helpers.
 *
 * Kept dependency-free (no i18n/message imports) so it can be used from
 * middleware and other edge runtimes without inflating bundle size.
 */

const MAX_SEGMENT_LENGTH = 512;

function sanitizeWithApostropheReplacement(
  input: string,
  apostropheReplacement: string
): string {
  if (!input) return "";

  const trimmed = input.trim().slice(0, MAX_SEGMENT_LENGTH);
  const s = trimmed
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .replace(/·/g, "")
    .replace(/['’]+/g, apostropheReplacement)
    .replace(/[–—―]/g, "-")
    .replace(/&/g, " i ")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+/g, "")
    .replace(/-+$/g, "");

  return s || "n-a";
}

/** Lowercases, strips diacritics, handles Catalan l·l and apostrophes, collapses to ascii-friendly slugs. */
export function sanitize(input: string): string {
  return sanitizeWithApostropheReplacement(input, " ");
}

/**
 * Legacy sanitize variant used only for matching incoming slugs from older content.
 * Differs from sanitize() by removing apostrophes instead of spacing/hyphenating them.
 * Example: "L'Escala" -> "lescala" (legacy) vs "l-escala" (current).
 */
export function sanitizeLegacyApostrophe(input: string): string {
  return sanitizeWithApostropheReplacement(input, "");
}
