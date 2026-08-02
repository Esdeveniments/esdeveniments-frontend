import { cache } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { fetchEventCountExternal } from "@lib/api/events-external";
import {
  getInternalApiUrl,
  getVercelProtectionBypassHeaders,
} from "@utils/api-helpers";
import { eventsTag } from "@lib/cache/tags";
import { SITEMAP_MIN_EVENTS_FOR_EXPANSION } from "@utils/constants";
import type { PlaceType } from "types/common";

async function resolvePlaceExpandability(
  slug: string,
  type: PlaceType,
  fetchCount: (slug: string) => Promise<number | null>,
): Promise<boolean> {
  if (type !== "town") return true;
  if (!slug || slug === "catalunya") return true;
  try {
    const count = await fetchCount(slug);
    return count === null || count >= SITEMAP_MIN_EVENTS_FOR_EXPANSION;
  } catch {
    // Fail open on unexpected errors so transient failures don't shrink
    // sitemap or hide internal links.
    return true;
  }
}

// Metadata-only count reader: hits the internal API route with a plain,
// tagged `fetch()` instead of `fetchEventCountExternal` (which goes through
// `fetchWithHmac`, and that calls `connection()` unconditionally). Calling a
// dynamic API from inside a "use cache" scope defeats the whole point of
// getPlaceExpandabilityForMetadata below — it would stay a resume-mismatch
// hazard despite the "use cache" wrapper.
async function fetchEventCountForMetadata(slug: string): Promise<number | null> {
  const url = await getInternalApiUrl(
    `/api/events?place=${encodeURIComponent(slug)}&size=1`,
    { preferConfiguredOrigin: true },
  );
  const response = await fetch(url, {
    headers: getVercelProtectionBypassHeaders(),
    next: { revalidate: 600, tags: [eventsTag] },
  });
  if (!response.ok) return null;
  const data = await response.json();
  return typeof data?.totalElements === "number" ? data.totalElements : null;
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
  (slug: string, type: PlaceType): Promise<boolean> =>
    resolvePlaceExpandability(slug, type, fetchEventCountExternal),
);

// Metadata-only reader: wraps the same check in `"use cache"` so
// generateMetadata stays prerenderable under cacheComponents. See
// docs/incidents/2026-06-13-cachecomponents-metadata-resume-mismatch.md.
export async function getPlaceExpandabilityForMetadata(
  slug: string,
  type: PlaceType,
): Promise<boolean> {
  "use cache";
  cacheTag(eventsTag);
  cacheLife("hours");
  return resolvePlaceExpandability(slug, type, fetchEventCountForMetadata);
}
