import { connection } from "next/server";
import type { EventSummaryResponseDTO } from "types/api/event";
import type { NextEditionQuery } from "types/event";
import { madridTodayYmd } from "@lib/dates";
import { addDaysYmd } from "@utils/date-helpers";
import {
  pickNextEdition,
  seriesKey,
  seriesSearchTerm,
} from "@utils/event-series";
import { createKeyedCache } from "./cache";
import { fetchEventsExternalResult } from "./events-external";

// One search per ended event, kept 6 h. Bounded: crawlers visit many old events.
const nextEditionCache = createKeyedCache<EventSummaryResponseDTO | null>(
  6 * 60 * 60 * 1000,
  { maxEntries: 5000 },
);

/**
 * The next edition of an ended event: the earliest upcoming event in its town
 * whose title only differs by year or edition number. It searches the title's
 * unchanged part with no `place` (with both set, the backend missed events:
 * `place=cardedeu&term=foc` found no Festa del Foc) and filters the town here.
 * Throws on a failed search so an outage isn't cached as "no next edition".
 */
export async function fetchNextEdition(
  event: NextEditionQuery,
): Promise<EventSummaryResponseDTO | null> {
  if (!seriesKey(event.title)) return null;
  await connection();
  return nextEditionCache.cache(event.slug, async () => {
    const from = madridTodayYmd();
    const search = async (place?: string) => {
      const { data, error } = await fetchEventsExternalResult({
        term: seriesSearchTerm(event.title),
        from,
        to: addDaysYmd(from, 400),
        size: 50,
        ...(place && { place }),
      });
      if (!data) throw error ?? new Error("fetchNextEdition: no data");
      return data;
    };
    const page = await search();
    const next = pickNextEdition(event, page.content);
    // A common title ("Fira de Nadal") can fill more than one page, and the
    // page has no stable order (esdeveniments-backend#63): retry in the town.
    if (next || page.last) return next;
    return pickNextEdition(event, (await search(event.citySlug)).content);
  });
}
