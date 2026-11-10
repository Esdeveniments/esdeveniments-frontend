import { createKeyedCache } from "@lib/api/cache";
import { PROXY_LIST_TTL_MS, PROXY_TIMEOUT_MS } from "@lib/api/proxy-list";
import { isApiUrlConfigured } from "@utils/api-helpers";
import { isExpiredEvent } from "@utils/event-helpers";
import { isFestaMajorTitle } from "@utils/festa-major-name";
import { parseDateFromIso } from "@utils/schema-helpers";
import { fetchEventBySlug } from "./events-external";

// An expired act stays expired, so an answer can be kept as long as the lists.
const { cache: expiredFestaActTownCache } = createKeyedCache<string | null>(
  PROXY_LIST_TTL_MS,
  { maxEntries: 5000 },
);

/**
 * The town whose festa major hub an expired festa major act moves to. Null
 * when the event isn't one, isn't expired or is deleted, and when the backend
 * fails or is slow: the event page is then served as before.
 */
export async function getExpiredFestaActTown(
  slug: string,
): Promise<string | null> {
  if (!isApiUrlConfigured()) return null;
  return expiredFestaActTownCache(slug, async (key) => {
    const event = await fetchEventBySlug(String(key), {
      signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
    });
    const town = event?.city?.slug;
    // Many events have no end date: fall back to the start, as the events
    // sitemap does.
    return town &&
      isFestaMajorTitle(event.title) &&
      isExpiredEvent(parseDateFromIso(event.endDate || event.startDate, true))
      ? town
      : null;
  });
}
