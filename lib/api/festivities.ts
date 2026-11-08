import { cache } from "react";
import { connection } from "next/server";
import { cacheLife } from "next/cache";
import { captureException } from "@sentry/nextjs";
import type { EventSummaryResponseDTO } from "types/api/event";
import type {
  FestivityPageData,
  FestivitySeasons,
  FestivitySlug,
} from "types/festivity";
import { madridTodayYmd } from "@lib/dates";
import {
  buildFestivityPageData,
  getFestivityType,
  seasonWindow,
  seasonYearOf,
  selectSeasonEvents,
} from "@utils/festivity";
import { fetchAllEventPagesExternal } from "./events-external";

// A broad term ("fira") needs about 10 date windows a season; 30 is far above that.
const MAX_REQUESTS_PER_TERM = 30;
const TIMEOUT_MS = 8000;

/** Every event matching one of the type's terms in a season's window. Throws on any failed request. */
async function fetchSeason(
  slug: FestivitySlug,
  seasonYear: number,
): Promise<{ events: EventSummaryResponseDTO[]; complete: boolean }> {
  const window = seasonWindow(seasonYear);
  // One term at a time: each fetch already runs 4 requests in parallel.
  const events: EventSummaryResponseDTO[] = [];
  let complete = true;
  for (const term of getFestivityType(slug).terms) {
    const result = await fetchAllEventPagesExternal(
      { term, ...window },
      { maxRequests: MAX_REQUESTS_PER_TERM, timeout: TIMEOUT_MS },
    );
    events.push(...result.events);
    complete &&= result.complete;
  }
  return { events, complete };
}

// Keyed by primitives only: the type's RegExps can't be cache arguments.
// Up to 2 seasons × 3 terms × 30 requests per rebuild, so, like the festa
// major calendar, it isn't tagged with `events` (every publish would expire it
// with no stale copy) and refreshes in the background every hour.
async function getFestivitySeasons(
  slug: FestivitySlug,
  seasonYear: number,
): Promise<FestivitySeasons> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 });
  const type = getFestivityType(slug);
  const [current, previous] = await Promise.all([
    fetchSeason(slug, seasonYear),
    fetchSeason(slug, seasonYear - 1),
  ]);
  return {
    current: selectSeasonEvents(type, current.events, seasonYear).map(
      ({ event }) => event,
    ),
    previous: selectSeasonEvents(type, previous.events, seasonYear - 1).map(
      ({ act }) => act,
    ),
    complete: current.complete && previous.complete,
  };
}

/** A /<festivity> page. Deduped per request (metadata, page and sitemap). */
export const fetchFestivityPage = cache(
  async (slug: FestivitySlug): Promise<FestivityPageData> => {
    // The season depends on today, so read the clock after connection().
    await connection();
    const today = madridTodayYmd();
    const seasonYear = seasonYearOf(today);
    let seasons: FestivitySeasons | null = null;
    try {
      seasons = await getFestivitySeasons(slug, seasonYear);
    } catch (error) {
      captureException(error, {
        tags: { section: "festivities" },
        extra: { slug, seasonYear },
      });
    }
    return buildFestivityPageData({ slug, seasons, seasonYear, today });
  },
);
