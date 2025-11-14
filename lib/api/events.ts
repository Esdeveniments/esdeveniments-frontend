import { cache } from "react";
import { fetchWithHmac } from "./fetch-wrapper";
import { getInternalApiUrl, buildEventsQuery } from "@utils/api-helpers";
import {
  parseEventDetail,
  parsePagedEvents,
  parseCategorizedEvents,
} from "@lib/validation/event";
import { fetchCategorizedEventsExternal } from "./events-external";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
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
import { computeTemporalStatus } from "@utils/event-status";

const isE2ETestMode = process.env.E2E_TEST_MODE === "1";

const getE2EGlobal = (): GlobalWithE2EStore => globalThis as GlobalWithE2EStore;

const e2eEventsStore = isE2ETestMode
  ? getE2EGlobal().__E2E_EVENTS__ ??
    (getE2EGlobal().__E2E_EVENTS__ = new Map<string, EventDetailResponseDTO>())
  : null;

export async function fetchEvents(
  params: FetchEventsParams
): Promise<PagedResponseDTO<EventSummaryResponseDTO>> {
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
      return {
        content: [],
        currentPage: 0,
        pageSize: 10,
        totalElements: 0,
        totalPages: 0,
        last: true,
      };
    }
    return validated;
  } catch (e) {
    console.error("Error fetching events:", e);
    return {
      content: [],
      currentPage: 0,
      pageSize: 10,
      totalElements: 0,
      totalPages: 0,
      last: true,
    };
  }
}

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

function normalizeSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createE2EEvent(
  data: EventCreateRequestDTO,
  extras?: E2EEventExtras
): EventDetailResponseDTO {
  // Helper sanitizers - keep this local and explicit to avoid pulling passthrough data
  const safeString = (v: unknown, d = ""): string => (typeof v === "string" ? v : d);
  const safeNullableString = (v: unknown, d: string | null = null): string | null => {
    if (v === null || v === undefined) return d;
    return typeof v === "string" ? v : d;
  };
  const safeNumber = (v: unknown, d = 0): number => {
    const n = Number(v as any);
    return Number.isFinite(n) ? n : d;
  };
  const safeBool = (v: unknown, d = false): boolean =>
    typeof v === "boolean" ? v : d;

  const slug = `e2e-event-${Date.now()}`;

  const safeCityId = safeNumber((data as any).cityId, 1);
  const safeRegionId = safeNumber((data as any).regionId, 1);

  // Build sanitized city/region/province from extras if provided, otherwise fallback defaults
  const extrasCity = extras?.city;
  const fallbackCity = {
    id: safeNumber(extrasCity?.id, safeCityId),
    name: safeString(extrasCity?.name, `Ciutat ${safeCityId}`),
    slug:
      safeString(extrasCity?.slug) ||
      normalizeSlug(safeString(extrasCity?.name, `ciutat-${safeCityId}`)),
    latitude: typeof extrasCity?.latitude === "number" ? extrasCity.latitude : 41.3851,
    longitude: typeof extrasCity?.longitude === "number" ? extrasCity.longitude : 2.1734,
    postalCode: safeString(extrasCity?.postalCode, "08001"),
    rssFeed:
      extrasCity && extrasCity.rssFeed !== undefined
        ? safeNullableString((extrasCity as any).rssFeed, null)
        : null,
    enabled: safeBool(extrasCity?.enabled, true),
  };

  const extrasRegion = extras?.region;
  const fallbackRegion = {
    id: safeNumber(extrasRegion?.id, safeRegionId),
    name: safeString(extrasRegion?.name, `Regió ${safeRegionId}`),
    slug:
      safeString(extrasRegion?.slug) ||
      normalizeSlug(safeString(extrasRegion?.name, `regio-${safeRegionId}`)),
  };

  const extrasProvince = extras?.province;
  const fallbackProvince = {
    id: safeNumber(extrasProvince?.id, fallbackRegion.id),
    name: safeString(extrasProvince?.name, fallbackRegion.name),
    slug: safeString(extrasProvince?.slug, fallbackRegion.slug),
  };

  // Categories: accept sanitized extras categories if they have the right shape, otherwise map from data.categories
  let categories: EventDetailResponseDTO["categories"] = [] as any;
  if (Array.isArray(extras?.categories) && extras!.categories.length > 0) {
    categories = extras!.categories
      .filter((c) => c && typeof (c as any).id === "number")
      .map((c, index) => ({
        id: safeNumber((c as any).id, index + 1),
        name: safeString((c as any).name, `Categoria ${(c as any).id || index + 1}`),
        slug: safeString((c as any).slug, `categoria-${(c as any).id || index + 1}`),
      }));
  } else if (Array.isArray((data as any).categories)) {
    categories = (data as any).categories.map((id: unknown, index: number) => ({
      id: safeNumber(id, index + 1),
      name: `Categoria ${safeNumber(id, index + 1)}`,
      slug: `categoria-${safeNumber(id, index + 1)}`,
    }));
  }

  // Sanitize top-level data fields
  const safeTitle = safeString((data as any).title, "Untitled event");
  const safeType = (data as any).type === "PAID" ? "PAID" : "FREE";
  const safeUrl = safeString((data as any).url, "");
  const safeDescription = safeString((data as any).description, "");
  const safeImageUrl = (data as any).imageUrl === null ? null : safeString((data as any).imageUrl, "");
  const safeStartDate = safeString((data as any).startDate, new Date().toISOString().slice(0, 10));
  const safeStartTime = safeNullableString((data as any).startTime, null);
  const safeEndDate = safeNullableString((data as any).endDate, null) || safeStartDate;
  const safeEndTime = safeNullableString((data as any).endTime, null);
  const safeLocation = safeString((data as any).location, "");

  const event: EventDetailResponseDTO = {
    id: slug,
    hash: `hash-${slug}`,
    slug,
    title: safeTitle,
    type: safeType,
    url: safeUrl,
    description: safeDescription,
    imageUrl: safeImageUrl as any,
    startDate: safeStartDate,
    startTime: safeStartTime,
    endDate: safeEndDate,
    endTime: safeEndTime,
    location: safeLocation,
    visits: 0,
    origin: "MANUAL",
    city: fallbackCity,
    region: fallbackRegion,
    province: fallbackProvince,
    categories,
    relatedEvents: [],
    metaTitle: safeTitle,
    metaDescription: safeDescription,
  };

  // Validate final shape loosely using existing parser - if it fails, do not store attacker data
  const validated = parseEventDetail(event);
  if (!validated) {
    console.error("createE2EEvent: constructed event failed validation, aborting");
    throw new Error("createE2EEvent: invalid event payload");
  }

  e2eEventsStore?.set(slug, validated);
  return validated;
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
  // Detection: Check if NEXT_PHASE is set, or if we're in production build context
  const isBuildPhase =
    process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD ||
    (process.env.NODE_ENV === "production" && !process.env.VERCEL_URL);

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
      console.error(
        "fetchCategorizedEvents: Both internal and external API failed:",
        fallbackError
      );
      return {};
    }
  }
}

// Cached wrapper to deduplicate categorized events within the same request
// Mirrors existing pattern used for events/news slugs
export const getCategorizedEvents = cache(fetchCategorizedEvents);

/**
 * Filter out past events from an array of events
 * Uses computeTemporalStatus to determine if an event is past
 */
export function filterPastEvents(
  events: EventSummaryResponseDTO[]
): EventSummaryResponseDTO[] {
  return events.filter((event) => {
    const status = computeTemporalStatus(
      event.startDate,
      event.endDate,
      undefined,
      event.startTime,
      event.endTime
    );
    return status.state !== "past";
  });
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
