/**
 * Detect event slugs corrupted by upstream RSS/XML feed imports.
 *
 * Observed in production (April 2026): source titles containing inline HTML
 * markup like `<link>https://...</link>` and `<description><![CDATA[...]]>`
 * were stripped of special characters by the backend slug generator but the
 * raw text was kept, producing slugs like:
 *
 *   "bibliobustitle-linkhttpswwwsbgcatactualitatagenda2400-bibliobushtmllink-
 *    descriptioncdata-2400-fri-27-mar-2026-..."
 *
 * GSC reported ~1,127 such 404 / soft-404 entries. Until the backend slug
 * generator is fixed (strip HTML before sluggifying), the frontend filters
 * these from the events sitemap and emits noindex on the detail page.
 *
 * Heuristics chosen to avoid false positives on legitimate long slugs while
 * catching the leak pattern: tokens ("httpswww", "linkdescription", "cdata")
 * that should never appear in a real Catalan event title slug, plus an
 * upper length bound. Real slugs cap around 80–100 chars in production.
 */
export function isMalformedEventSlug(slug: string | undefined | null): boolean {
  if (!slug) return true;
  if (slug.length > 120) return true;
  const lowered = slug.toLowerCase();
  return (
    lowered.includes("httpswww") ||
    lowered.includes("httpwww") ||
    lowered.includes("linkdescription") ||
    lowered.includes("linkhttps") ||
    lowered.includes("cdata")
  );
}
