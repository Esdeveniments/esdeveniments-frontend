import { cache } from "react";
import { fetchEventCountExternal } from "@lib/api/events-external";
import { SITEMAP_MIN_EVENTS_FOR_EXPANSION } from "@utils/constants";
import type { PlaceType } from "types/common";

function needsEventCount(slug: string, type: PlaceType): boolean {
  return type === "town" && !!slug && slug !== "catalunya";
}

export function isExpandableByCount(
  slug: string,
  type: PlaceType,
  count: number | null,
): boolean {
  if (!needsEventCount(slug, type)) return true;
  return count === null || count >= SITEMAP_MIN_EVENTS_FOR_EXPANSION;
}

/**
 * Determines whether a place has enough event depth to warrant filter
 * expansion (date/category internal links and sitemap entries).
 *
 * REGIONs and the virtual "catalunya" slug always qualify (they aggregate
 * events from many cities). CITYs/towns qualify only when their total event
 * count meets the threshold.
 *
 * On API failure or unexpected error, returns true (fail-open) so transient
 * issues don't silently hide internal links or shrink the sitemap.
 *
 * Single source of truth: used by /[place] pages (SSR depth + noindex meta),
 * PlacePageShell (explore-nav internal links, via the events result's
 * placeIsExpandable), and app/sitemap-places/[...parts] (sitemap entries). All four surfaces stay in lock-step — if sitemap drops a
 * URL, the page also stops emitting internal links to it. Otherwise Googlebot
 * keeps discovering them via crawl, treats them as near-duplicates of the
 * parent, and buckets them as "Crawled — currently not indexed" (Dec 2025–May
 * 2026 GSC drop, ~93K URLs).
 *
 * The /[place] page skips the count call: its unfiltered events response
 * already carries `totalElements`, so it calls `isExpandableByCount` directly.
 *
 * Lives in `lib/seo/` rather than `utils/` because it depends on React caching
 * and API I/O; `utils/` is reserved for deterministic, side-effect-free
 * helpers.
 */
export const getPlaceExpandability = cache(
  async (slug: string, type: PlaceType): Promise<boolean> => {
    if (!needsEventCount(slug, type)) return true;
    try {
      return isExpandableByCount(slug, type, await fetchEventCountExternal(slug));
    } catch {
      // Fail open on unexpected errors so transient failures don't shrink
      // sitemap or hide internal links.
      return true;
    }
  },
);
