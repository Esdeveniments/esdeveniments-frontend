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
 * On API failure, returns true (fail-open) so transient errors don't silently
 * hide internal links.
 *
 * MUST stay in sync with the policy in app/sitemap-places/[...parts]/route.ts.
 * If sitemap excludes /[place]/[date] and /[place]/[category] URLs for a slug,
 * the place page must also stop emitting internal links to those URLs —
 * otherwise Googlebot keeps discovering them via crawl, treats them as
 * near-duplicates of the parent, and buckets them as "Crawled — currently
 * not indexed" (Dec 2025–May 2026 GSC drop, ~93K URLs).
 */
export const getPlaceExpandability = cache(
  async (slug: string, type: PlaceType): Promise<boolean> => {
    if (type !== "town") return true;
    if (!slug || slug === "catalunya") return true;
    const count = await fetchEventCountExternal(slug);
    return count === null || count >= SITEMAP_MIN_EVENTS_FOR_EXPANSION;
  },
);
