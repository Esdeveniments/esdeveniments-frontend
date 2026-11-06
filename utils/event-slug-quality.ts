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
 * Only the leak tokens count, never length: slugs end with the date and a
 * 36-char UUID, and 14% of real upcoming events have slugs over 120 chars
 * (up to 215, November 2026). A length cap noindexed them and dropped them
 * from the sitemap.
 */
export function isMalformedEventSlug(slug: string | undefined | null): boolean {
  if (!slug) return true;
  const lowered = slug.toLowerCase();
  return (
    lowered.includes("httpswww") ||
    lowered.includes("httpwww") ||
    lowered.includes("linkdescription") ||
    lowered.includes("linkhttps") ||
    lowered.includes("cdata")
  );
}
