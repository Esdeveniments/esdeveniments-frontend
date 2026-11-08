import { cache } from "react";
import { connection } from "next/server";
import { cacheLife, cacheTag } from "next/cache";
import { captureException, captureMessage } from "@sentry/nextjs";
import type {
  FestaMajorCalendar,
  FestaMajorPageData,
  FestaMajorPlaceYears,
  FestaMajorPlacedAct,
  FestaMajorYearActs,
} from "types/festa-major";
import { FESTA_MAJOR_TERM } from "@utils/constants";
import { yearRange } from "@utils/festa-major";
import { buildFestaMajorPageData, toPlacedAct } from "@utils/festa-major-hub";
import { summarizeTowns } from "@utils/festa-major-calendar";
import { getPlaceTypeAndLabelCached } from "@utils/location-helpers";
import { madridTodayYmd } from "@lib/dates";
import { eventsTag, placeTag } from "@lib/cache/tags";
import { fetchAllEventPagesExternal } from "./events-external";

// Festa major acts are events whose title says "festa major". A town needs a
// request or a few a year, the biggest regions (Maresme, Vallès Oriental, ~245
// acts) about 21, all of Catalonia about 95 (≈1,300 acts in 2026).
const MAX_PLACE_REQUESTS = 40;
const MAX_CATALONIA_REQUESTS = 150;
const TIMEOUT_MS = 8000;

/**
 * Every festa major act of a year (in a place, or all of Catalonia). Throws on
 * any failed request. A read cut short by the cap is kept (not thrown: errors
 * aren't cached, so every visit would refetch) and reported, so the cap can
 * be raised.
 */
async function fetchYearActs(
  place: string | undefined,
  year: number,
  maxRequests: number,
): Promise<FestaMajorYearActs> {
  const { events, complete } = await fetchAllEventPagesExternal(
    { place, term: FESTA_MAJOR_TERM, ...yearRange(year) },
    { maxRequests, timeout: TIMEOUT_MS },
  );
  if (!complete) {
    captureMessage("festa major read cut short", {
      level: "warning",
      tags: { section: "festes-majors" },
      extra: { place: place ?? "catalunya", year, maxRequests },
    });
  }
  const acts = events
    .map(toPlacedAct)
    .filter((act): act is FestaMajorPlacedAct => act !== null);
  return { acts, complete };
}

async function getPlaceActs(
  place: string,
  year: number,
): Promise<FestaMajorYearActs> {
  "use cache";
  cacheTag(eventsTag, placeTag(place));
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 });
  return fetchYearActs(place, year, MAX_PLACE_REQUESTS);
}

// About 150 backend calls per rebuild, so it isn't tagged with `events` (every
// publish would rebuild it) and refreshes in the background every 6 hours,
// or every hour while it is cut short.
async function getCataloniaCalendar(
  currentYear: number,
): Promise<FestaMajorCalendar> {
  "use cache";
  const [current, previous] = await Promise.all([
    fetchYearActs(undefined, currentYear, MAX_CATALONIA_REQUESTS),
    fetchYearActs(undefined, currentYear - 1, MAX_CATALONIA_REQUESTS),
  ]);
  const complete = current.complete && previous.complete;
  cacheLife(
    complete
      ? { stale: 3600, revalidate: 21600, expire: 172800 }
      : { stale: 300, revalidate: 3600, expire: 86400 },
  );
  return summarizeTowns(current.acts, previous.acts, currentYear, complete);
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
      return {
        year,
        current: current.acts,
        previous: previous.acts,
        complete: current.complete && previous.complete,
      };
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

/** A /festa-major/<place> page. Deduped per request (metadata and page). */
export const fetchFestaMajorPage = cache(
  async (slug: string): Promise<FestaMajorPageData> => {
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
      currentYear: Number(today.slice(0, 4)),
      today,
    });
  },
);
