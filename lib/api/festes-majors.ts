import { cache } from "react";
import { connection } from "next/server";
import { cacheLife, cacheTag } from "next/cache";
import { captureException } from "@sentry/nextjs";
import type {
  FestaMajorCalendar,
  FestaMajorPageData,
  FestaMajorPlaceYears,
  FestaMajorPlacedAct,
} from "types/festa-major";
import { FESTA_MAJOR_TERM } from "@utils/constants";
import { yearRange } from "@utils/festa-major";
import { buildFestaMajorPageData, toPlacedAct } from "@utils/festa-major-hub";
import { summarizeTowns } from "@utils/festa-major-calendar";
import { getPlaceTypeAndLabelCached } from "@utils/location-helpers";
import { madridTodayYmd } from "@lib/dates";
import { eventsTag, placeTag } from "@lib/cache/tags";
import { fetchAllEventPagesExternal } from "./events-external";

// Festa major acts are events whose title says "festa major". A town or region
// needs a request or a few a year; all of Catalonia about 95 requests
// (≈1,300 acts in 2026).
const MAX_PLACE_REQUESTS = 20;
const MAX_CATALONIA_REQUESTS = 150;
const TIMEOUT_MS = 8000;

/** Every festa major act of a year (in a place, or all of Catalonia). Throws on any failed request. */
async function fetchYearActs(
  place: string | undefined,
  year: number,
  maxRequests: number,
): Promise<FestaMajorPlacedAct[]> {
  const { events } = await fetchAllEventPagesExternal(
    { place, term: FESTA_MAJOR_TERM, ...yearRange(year) },
    { maxRequests, timeout: TIMEOUT_MS },
  );
  return events
    .map(toPlacedAct)
    .filter((act): act is FestaMajorPlacedAct => act !== null);
}

async function getPlaceActs(
  place: string,
  year: number,
): Promise<FestaMajorPlacedAct[]> {
  "use cache";
  cacheTag(eventsTag, placeTag(place));
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 });
  return fetchYearActs(place, year, MAX_PLACE_REQUESTS);
}

// About 150 backend calls per rebuild, so it isn't tagged with `events` (every
// publish would rebuild it) and refreshes in the background every 6 hours.
async function getCataloniaCalendar(
  currentYear: number,
): Promise<FestaMajorCalendar> {
  "use cache";
  cacheLife({ stale: 3600, revalidate: 21600, expire: 172800 });
  const [current, previous] = await Promise.all([
    fetchYearActs(undefined, currentYear, MAX_CATALONIA_REQUESTS),
    fetchYearActs(undefined, currentYear - 1, MAX_CATALONIA_REQUESTS),
  ]);
  return summarizeTowns(current, previous, currentYear);
}

/** The Madrid year. Callers render by it, so read it after connection(). */
async function currentYear(): Promise<number> {
  await connection();
  return Number(madridTodayYmd().slice(0, 4));
}

const report = (error: unknown, extra: Record<string, unknown>): null => {
  captureException(error, { tags: { section: "festes-majors" }, extra });
  return null;
};

/**
 * This and last year's acts of a town or region; build views with
 * buildTownData / summarizeTowns. null when the backend failed, which is not
 * the same as no acts. Deduped per request (metadata and page).
 */
export const fetchFestaMajorPlace = cache(
  async (place: string): Promise<FestaMajorPlaceYears | null> => {
    const year = await currentYear();
    try {
      const [current, previous] = await Promise.all([
        getPlaceActs(place, year),
        getPlaceActs(place, year - 1),
      ]);
      return { year, current, previous };
    } catch (error) {
      return report(error, { place, year });
    }
  },
);

/** The Catalonia-wide calendar. null when the backend failed. */
export const fetchFestaMajorCalendar = cache(
  async (): Promise<FestaMajorCalendar | null> => {
    const year = await currentYear();
    try {
      return await getCataloniaCalendar(year);
    } catch (error) {
      return report(error, { year });
    }
  },
);

/** A /festa-major/<place>[/<festa>] page. Deduped per request (metadata and page). */
export const fetchFestaMajorPage = cache(
  async (slug: string, festaKey?: string): Promise<FestaMajorPageData> => {
    // Postpone the prerender here: otherwise the place lookup starts, hits
    // its own connection() and logs the prerender's rejection as an error.
    await connection();
    const [place, years] = await Promise.all([
      getPlaceTypeAndLabelCached(slug),
      fetchFestaMajorPlace(slug),
    ]);
    const today = madridTodayYmd();
    return buildFestaMajorPageData({
      place: {
        slug,
        label: place.label,
        type: place.type === "region" ? "region" : "town",
        regionSlug: place.regionSlug ?? null,
        regionLabel: place.regionLabel ?? null,
      },
      years,
      festaKey,
      currentYear: Number(today.slice(0, 4)),
      today,
    });
  },
);
