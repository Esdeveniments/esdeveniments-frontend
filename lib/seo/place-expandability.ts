import { cache } from "react";
import { fetchEventCountExternal } from "@lib/api/events-external";
import { SITEMAP_MIN_EVENTS_FOR_EXPANSION } from "@utils/constants";
import type { PlaceType } from "types/common";

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
 * PlacePageShell (explore-nav internal links), and app/sitemap-places/[...parts]
 * (sitemap entries). All four surfaces stay in lock-step — if sitemap drops a
 * URL, the page also stops emitting internal links to it. Otherwise Googlebot
 * keeps discovering them via crawl, treats them as near-duplicates of the
 * parent, and buckets them as "Crawled — currently not indexed" (Dec 2025–May
 * 2026 GSC drop, ~93K URLs).
 *
 * Lives in `lib/seo/` rather than `utils/` because it depends on React caching
 * and API I/O; `utils/` is reserved for deterministic, side-effect-free
 * helpers.
 */
export const getPlaceExpandability = cache(
  async (slug: string, type: PlaceType): Promise<boolean> => {
    if (type !== "town") return true;
    if (!slug || slug === "catalunya") return true;
    try {
      const count = await fetchEventCountExternal(slug);
      return count === null || count >= SITEMAP_MIN_EVENTS_FOR_EXPANSION;
    } catch {
      // Fail open on unexpected errors so transient failures don't shrink
      // sitemap or hide internal links.
      return true;
    }
  },
);
