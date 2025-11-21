import { cache } from "react";
import { captureException } from "@sentry/nextjs";
import { fetchWithHmac } from "./fetch-wrapper";
import { getInternalApiUrl, buildEventsQuery } from "@utils/api-helpers";
import { slugifySegment } from "@utils/string-helpers";
import {
  parseEventDetail,
  parsePagedEvents,
  parseCategorizedEvents,
} from "@lib/validation/event";
import {
  fetchCategorizedEventsExternal,
  fetchEventsExternal,
} from "./events-external";
import { getSanitizedErrorMessage } from "@utils/api-error-handler";
import { isBuildPhase } from "@utils/constants";
import { filterActiveEvents } from "@utils/event-helpers";
import {
  ListEvent,
  EventSummaryResponseDTO,
  AdEvent,
  CategorizedEvents,
  EventDetailResponseDTO,
  EventUpdateRequestDTO,
  EventCreateRequestDTO,
  PagedResponseDTO,
  E2EEventExtras,
  GlobalWithE2EStore,
} from "types/api/event";
import { FetchEventsParams } from "types/event";

const isE2ETestMode =
  process.env.E2E_TEST_MODE === "1" ||
  process.env.NEXT_PUBLIC_E2E_TEST_MODE === "1";

const getE2EGlobal = (): GlobalWithE2EStore => globalThis as GlobalWithE2EStore;

const e2eEventsStore = isE2ETestMode
  ? getE2EGlobal().__E2E_EVENTS__ ??
    (getE2EGlobal().__E2E_EVENTS__ = new Map<string, EventDetailResponseDTO>())
  : null;

async function fetchEventsInternal(
  params: FetchEventsParams
): Promise<PagedResponseDTO<EventSummaryResponseDTO>> {
  const fallbackResponse: PagedResponseDTO<EventSummaryResponseDTO> = {
    content: [],
    currentPage: params.page ?? 0,
    pageSize: params.size ?? 10,
    totalElements: 0,
    totalPages: 0,
    last: true,
  };

  const fetchExternalWithValidation = async () => {
    try {
      const data = await fetchEventsExternal(params);
      const validated = parsePagedEvents(data);
      if (!validated) {
        console.error("fetchEvents: external validation failed");
        return null;
      }
      return validated;
    } catch (error) {
      const errorMessage = getSanitizedErrorMessage(error);
      console.error("fetchEvents: external fetch failed", errorMessage);
      captureException(error, {
        tags: { section: "events-fetch", fallback: "external-fetch-failed" },
        extra: { params },
      });
      return null;
    }
  };

  if (isBuildPhase) {
    const externalResult = await fetchExternalWithValidation();
    return externalResult ?? fallbackResponse;
  }

  try {
    const queryString = buildEventsQuery(params);
    const finalUrl = getInternalApiUrl(`/api/events?${queryString}`);

    const response = await fetch(finalUrl, {
      next: { revalidate: 300, tags: ["events"] },
    });

    if (!response.ok) {
      const errorText = await response
        .text()
        .catch(() => "Unable to read error response");
      console.error(
        `fetchEvents: HTTP error! status: ${response.status}, url: ${finalUrl}, error: ${errorText}`
      );
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const validated = parsePagedEvents(data);
    if (!validated) {
      console.error("fetchEvents: validation failed, returning fallback");
      return fallbackResponse;
    }
    return validated;
  } catch (e) {
    console.error("Error fetching events via internal API:", e);
    captureException(e, {
      tags: { section: "events-fetch", fallback: "internal-api-failed" },
      extra: {
        params,
        fallbackTriggered: true,
      },
    });
    const externalResult = await fetchExternalWithValidation();
    if (!externalResult) {
      captureException(new Error("Both internal and external API failed"), {
        tags: { section: "events-fetch", fallback: "external-also-failed" },
        extra: { params },
      });
    }
    return externalResult ?? fallbackResponse;
  }
}

export const fetchEvents = cache(fetchEventsInternal);

export async function fetchEventBySlug(
  fullSlug: string
): Promise<EventDetailResponseDTO | null> {
  if (isE2ETestMode && e2eEventsStore?.has(fullSlug)) {
    return e2eEventsStore.get(fullSlug) ?? null;
  }
  try {
    // Read via internal API route (stable cache, HMAC stays server-side)
    const res = await fetch(getInternalApiUrl(`/api/events/${fullSlug}`), {
      next: { revalidate: 1800, tags: ["events", `event:${fullSlug}`] },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return parseEventDetail(await res.json());
  } catch (error) {
    console.error("Error fetching event by slug (internal):", error);
    return null;
  }
}

// Cached wrapper to deduplicate event fetches within the same request
// Used by both generateMetadata and the page component
export const getEventBySlug = cache(fetchEventBySlug);

export async function updateEventById(
  uuid: string,
  data: EventUpdateRequestDTO
): Promise<EventDetailResponseDTO> {
  const response = await fetchWithHmac(
    `${process.env.NEXT_PUBLIC_API_URL}/events/${uuid}`,
    {
      method: "PUT",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  );
  if (!response.ok) {
    const errorText = await response.text();
    console.error("updateEventById: error response:", errorText);
    throw new Error(
      `HTTP error! status: ${response.status}, body: ${errorText}`
    );
  }
  return response.json();
}

export async function createEvent(
  data: EventCreateRequestDTO,
  imageFile?: File,
  e2eExtras?: E2EEventExtras
): Promise<EventDetailResponseDTO> {
  if (isE2ETestMode && e2eEventsStore) {
    return createE2EEvent(data, e2eExtras);
  }

  const formData = new FormData();

  formData.append("request", JSON.stringify(data));

  if (imageFile) {
    formData.append("imageFile", imageFile);
  }

  const response = await fetchWithHmac(
    `${process.env.NEXT_PUBLIC_API_URL}/events`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("createEvent: error response:", errorText);
    throw new Error(
      `HTTP error! status: ${response.status}, body: ${errorText}`
    );
  }
  return response.json();
}

function createE2EEvent(
  data: EventCreateRequestDTO,
  extras?: E2EEventExtras
): EventDetailResponseDTO {
  const slug = `e2e-event-${Date.now()}`;
  const safeCityId = data.cityId || 1;
  const safeRegionId = data.regionId || 1;

  const fallbackCity = extras?.city ?? {
    id: safeCityId,
    name: `Ciutat ${safeCityId}`,
    slug: slugifySegment(`ciutat-${safeCityId}`),
    latitude: 41.3851,
    longitude: 2.1734,
    postalCode: "08001",
    rssFeed: null,
    enabled: true,
  };

  const fallbackRegion = extras?.region ?? {
    id: safeRegionId,
    name: `Regió ${safeRegionId}`,
    slug: slugifySegment(`regio-${safeRegionId}`),
  };

  const fallbackProvince = extras?.province ?? {
    id: fallbackRegion.id,
    name: fallbackRegion.name,
    slug: fallbackRegion.slug,
  };

  const categories =
    extras?.categories && extras.categories.length > 0
      ? extras.categories
      : data.categories.map((id, index) => ({
          id,
          name: `Categoria ${id || index + 1}`,
          slug: `categoria-${id || index + 1}`,
        }));

  const event: EventDetailResponseDTO = {
    id: slug,
    hash: `hash-${slug}`,
    slug,
    title: data.title,
    type: data.type,
    url: data.url || "",
    description: data.description,
    imageUrl: data.imageUrl || "",
    startDate: data.startDate,
    startTime: data.startTime,
    endDate: data.endDate,
    endTime: data.endTime,
    location: data.location,
    visits: 0,
    origin: "MANUAL",
    city: fallbackCity,
    region: fallbackRegion,
    province: fallbackProvince,
    categories,
    relatedEvents: [],
    metaTitle: data.title,
    metaDescription: data.description,
  };

  e2eEventsStore?.set(slug, event);
  return event;
}

/**
 * Fetch events categorized by category.
 * During build phase (SSG), calls external API directly to avoid internal proxy issues.
 * At runtime (ISR/SSR), uses internal API proxy for better caching and security.
 */
export async function fetchCategorizedEvents(
  maxEventsPerCategory?: number
): Promise<CategorizedEvents> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    console.warn(
      "fetchCategorizedEvents: NEXT_PUBLIC_API_URL not set, returning empty object"
    );
    return {};
  }

  // During build phase, bypass internal proxy and call external API directly
  // This ensures SSG pages (homepage) can fetch data during next build
  if (isBuildPhase) {
    try {
      const data = await fetchCategorizedEventsExternal(maxEventsPerCategory);
      const validated = parseCategorizedEvents(data);
      if (!validated) {
        console.error("fetchCategorizedEvents: Build phase validation failed");
        return {};
      }
      return validated;
    } catch (e) {
      console.error(
        "fetchCategorizedEvents: Build phase external fetch failed:",
        e
      );
      return {};
    }
  }

  // Runtime: use internal API proxy
  // If internal API fails (e.g., during build when server isn't running), fallback to external
  try {
    const params = new URLSearchParams();
    if (maxEventsPerCategory !== undefined) {
      params.append("maxEventsPerCategory", String(maxEventsPerCategory));
    }
    const finalUrl = getInternalApiUrl(
      `/api/events/categorized${
        params.toString() ? `?${params.toString()}` : ""
      }`
    );
    const response = await fetch(finalUrl, {
      next: { revalidate: 300, tags: ["events", "events:categorized"] },
    });

    if (!response.ok) {
      const errorText = await response
        .text()
        .catch(() => "Unable to read error response");
      console.error(
        `fetchCategorizedEvents: HTTP error! status: ${response.status}, url: ${finalUrl}, error: ${errorText}`
      );
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    const validated = parseCategorizedEvents(data);
    if (!validated) {
      console.error("fetchCategorizedEvents: Runtime validation failed");
      return {};
    }
    return validated;
  } catch {
    // If internal API fails, try external API as fallback (handles edge cases)
    try {
      const data = await fetchCategorizedEventsExternal(maxEventsPerCategory);
      const validated = parseCategorizedEvents(data);
      return validated || {};
    } catch (fallbackError) {
      // Sanitize error logging to prevent information disclosure
      const errorMessage = getSanitizedErrorMessage(fallbackError);
      console.error(
        "fetchCategorizedEvents: Both internal and external API failed:",
        errorMessage
      );
      return {};
    }
  }
}

// Cached wrapper to deduplicate categorized events within the same request
// Mirrors existing pattern used for events/news slugs
export const getCategorizedEvents = cache(fetchCategorizedEvents);

/**
 * Filter out past events from an array of events.
 * Delegates to the shared filterActiveEvents helper to keep logic aligned.
 */
export function filterPastEvents(
  events: EventSummaryResponseDTO[]
): EventSummaryResponseDTO[] {
  return filterActiveEvents(events);
}

function insertAdsRandomly(
  events: EventSummaryResponseDTO[],
  ads: AdEvent[],
  minDistance = 4,
  maxDistance = 6,
  startFrom = 3
): ListEvent[] {
  const result: ListEvent[] = [...events];

  // Shuffle the ads for random distribution
  const shuffledAds = [...ads].sort(() => Math.random() - 0.5);

  // Track inserted positions to avoid conflicts
  const insertedIndexes: number[] = [];

  // Insert ads at calculated positions
  shuffledAds.forEach((ad, i) => {
    // Calculate the index for the ad based on the min and max distance
    let index =
      startFrom +
      i * minDistance +
      Math.floor(Math.random() * (maxDistance - minDistance + 1));

    // Adjust index to account for previously inserted ads
    insertedIndexes.forEach((insertedIndex) => {
      if (index >= insertedIndex) {
        index++;
      }
    });

    // Check if the index is valid
    if (index <= result.length) {
      // Insert the ad at the calculated index
      result.splice(index, 0, ad);
      // Add the index to the insertedIndexes array
      insertedIndexes.push(index);
      insertedIndexes.sort((a, b) => a - b); // Keep sorted for next iteration
    }
  });

  return result;
}

export function insertAds(
  events: EventSummaryResponseDTO[],
  adFrequencyRatio = 4 // 1 ad per 4 events, matching old behavior
): ListEvent[] {
  if (!events.length) {
    return [];
  }

  // Create ad events similar to old implementation
  const numberOfAds = Math.ceil(events.length / adFrequencyRatio);
  const ads: AdEvent[] = Array.from(
    { length: numberOfAds },
    (_, i) =>
      ({
        isAd: true,
        id: `ad-${i}`,
        images: [],
        location: "",
        slug: "",
      } as AdEvent)
  );

  return insertAdsRandomly(events, ads);
}

// Re-export for backward compatibility
export type { E2EEventExtras } from "types/api/event";
