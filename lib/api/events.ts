import { cache } from "react";
import { captureException } from "@sentry/nextjs";
import { formatMegabytes } from "@utils/constants";
import { getValidAccessToken } from "@utils/auth-cookies";
import { fetchWithHmac } from "./fetch-wrapper";
import { decodeSafeJwtClaims } from "./users-external";
import {
  getInternalApiUrl,
  buildEventsQuery,
  getVercelProtectionBypassHeaders,
  getApiUrl,
  isApiUrlConfigured,
  emptyPagedResponse,
} from "@utils/api-helpers";
import { slugifySegment } from "@utils/string-helpers";
import { eventsTag, eventTag } from "@lib/cache/tags";
import type { InternalOriginOptions } from "types/api/internal";
import { cacheLife, cacheTag } from "next/cache";
import {
  parseEventDetail,
  parsePagedEvents,
  parseCategorizedEvents,
} from "@lib/validation/event";
import {
  fetchCategorizedEventsExternal,
  fetchEventsExternalResult,
} from "./events-external";
import { getSanitizedErrorMessage } from "@utils/api-error-handler";
import {
  EVENT_IMAGE_UPLOAD_TOO_LARGE_ERROR,
  MAX_TOTAL_UPLOAD_BYTES,
} from "@utils/constants";
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
import type { UploadImageResponse } from "types/upload";
import { isE2ETestMode } from "@utils/env";
import { UploadImageResponseSchema } from "@lib/validation/upload";

const getE2EGlobal = (): GlobalWithE2EStore => globalThis as GlobalWithE2EStore;

const e2eEventsStore = isE2ETestMode
  ? (getE2EGlobal().__E2E_EVENTS__ ??
    (getE2EGlobal().__E2E_EVENTS__ = new Map<string, EventDetailResponseDTO>()))
  : null;

/**
 * Shared guard for authenticated endpoints: validates API URL and auth cookie.
 * `forceRefresh` renews a token the backend already rejected.
 */
export async function requireAuth({
  forceRefresh = false,
}: { forceRefresh?: boolean } = {}): Promise<{ apiUrl: string; authToken: string }> {
  if (!isApiUrlConfigured()) {
    throw new Error(
      "NEXT_PUBLIC_API_URL is not set — refusing to run mutation against default production URL",
    );
  }
  const authToken = await getValidAccessToken({ forceRefresh });
  if (!authToken) {
    const err = new Error("Authentication required");
    (err as Error & { status: number }).status = 401;
    throw err;
  }
  return { apiUrl: getApiUrl(), authToken };
}

const ensureImageWithinLimit = (imageFile: File, maxBytes = MAX_TOTAL_UPLOAD_BYTES) => {
  if (imageFile.size > maxBytes) {
    console.warn(
      `ensureImageWithinLimit: image ${formatMegabytes(
        imageFile.size,
      )}MB exceeds limit ${formatMegabytes(maxBytes)}MB`,
    );
    throw new Error(EVENT_IMAGE_UPLOAD_TOO_LARGE_ERROR);
  }
};

async function fetchEventsInternal(
  params: FetchEventsParams,
): Promise<PagedResponseDTO<EventSummaryResponseDTO>> {
  const { data, error } = await fetchEventsExternalResult(params);
  if (data) return data;
  captureException(error ?? new Error("fetchEvents: no data"), {
    tags: { section: "events-fetch", fallback: "external-fetch-failed" },
    extra: { params },
  });
  return emptyPagedResponse(params.page ?? 0, params.size ?? 12);
}

export const fetchEvents = cache(fetchEventsInternal);

// fetchEvents is not cached (no-store, so each query does not get its own
// fetch-cache entry), and every listing render waits for the backend. This
// reader caches one events page per query
// (no locale in it) in the shared cache handler. It throws on failure so an
// error is never cached; fetchEventsCached then falls back to fetchEvents.
const CACHED_EVENTS_TIMEOUT_MS = 8000;

async function getCachedEventsPage(
  query: string,
): Promise<PagedResponseDTO<EventSummaryResponseDTO>> {
  "use cache";
  cacheTag(eventsTag);
  cacheLife({ stale: 300, revalidate: 600, expire: 3600 });
  const res = await fetchWithHmac(`${getApiUrl()}/events?${query}`, {
    skipConnection: true,
    timeout: CACHED_EVENTS_TIMEOUT_MS,
  });
  if (!res.ok) throw new Error(`getCachedEventsPage: HTTP ${res.status}`);
  const page = parsePagedEvents(await res.json());
  if (!page) throw new Error("getCachedEventsPage: invalid payload");
  return page;
}

export async function fetchEventsCached(
  params: FetchEventsParams,
): Promise<PagedResponseDTO<EventSummaryResponseDTO>> {
  const startedAt = Date.now();
  try {
    return await getCachedEventsPage(buildEventsQuery(params).toString());
  } catch (error) {
    captureException(error, {
      tags: { section: "events-fetch", fallback: "cached-read-failed" },
      extra: { params },
    });
    // Errors thrown inside "use cache" reach us without their type in
    // production, so detect a timeout by the time spent. A retry would only
    // time out again and double the wait on each fallback stage.
    if (Date.now() - startedAt >= CACHED_EVENTS_TIMEOUT_MS) {
      return emptyPagedResponse(params.page ?? 0, params.size ?? 12);
    }
    return fetchEvents(params);
  }
}

export async function fetchEventBySlug(
  fullSlug: string,
  options: InternalOriginOptions = {},
): Promise<EventDetailResponseDTO | null> {
  if (isE2ETestMode && e2eEventsStore?.has(fullSlug)) {
    return e2eEventsStore.get(fullSlug) ?? null;
  }
  try {
    // Read via internal API route (stable cache, HMAC stays server-side)
    // Use getInternalApiUrl which resolves the correct internal origin
    const internalApiUrl = await getInternalApiUrl(`/api/events/${fullSlug}`, {
      preferConfiguredOrigin: options.preferConfiguredOrigin,
    });

    const res = await fetch(internalApiUrl, {
      headers: getVercelProtectionBypassHeaders(),
      next: { revalidate: 1800, tags: [eventsTag, eventTag(fullSlug)] },
    });

    if (res.status === 404) {
      console.warn(
        `fetchEventBySlug: Event not found (404) for slug: ${fullSlug}`,
      );
      return null;
    }
    if (!res.ok) {
      const errorText = await res.text().catch(() => "No error text");
      console.error(
        `fetchEventBySlug: HTTP error! status: ${res.status}, url: ${internalApiUrl}, body: ${errorText}`,
      );
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return parseEventDetail(await res.json());
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      `Error fetching event by slug (internal) for ${fullSlug}:`,
      errorMessage,
    );
    // Transient failure: re-throw for cached metadata readers so the error is
    // not cached as a null (a real 404 returned above, which is fine to cache).
    if (options.throwOnError) {
      throw error instanceof Error ? error : new Error(errorMessage);
    }
    return null;
  }
}

export async function fetchEventBySlugWithStatus(fullSlug: string): Promise<{
  event: EventDetailResponseDTO | null;
  notFound: boolean;
}> {
  if (isE2ETestMode && e2eEventsStore?.has(fullSlug)) {
    return { event: e2eEventsStore.get(fullSlug) ?? null, notFound: false };
  }

  try {
    const internalApiUrl = await getInternalApiUrl(`/api/events/${fullSlug}`);

    const res = await fetch(internalApiUrl, {
      headers: getVercelProtectionBypassHeaders(),
      next: { revalidate: 1800, tags: [eventsTag, eventTag(fullSlug)] },
    });

    if (res.status === 404) {
      console.warn(
        `fetchEventBySlugWithStatus: Event not found (404) for slug: ${fullSlug}`,
      );
      return { event: null, notFound: true };
    }

    if (!res.ok) {
      const errorText = await res.text().catch(() => "No error text");
      console.error(
        `fetchEventBySlugWithStatus: HTTP error! status: ${res.status}, url: ${internalApiUrl}, body: ${errorText}`,
      );
      return { event: null, notFound: false };
    }

    return { event: parseEventDetail(await res.json()), notFound: false };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      `Error fetching event by slug (internal) for ${fullSlug}:`,
      errorMessage,
    );
    return { event: null, notFound: false };
  }
}

// Cached reader for the event page and its metadata: resolves the API origin
// from configuration instead of request headers(), so both stay prerenderable
// under cacheComponents. Reading headers() in metadata would make its boundary
// dynamic and mismatch the static shell ("Expected the resume to render <div>
// ... but instead it rendered <__next_metadata_boundary__>").
export async function getCachedEventBySlug(
  slug: string,
): Promise<EventDetailResponseDTO | null> {
  "use cache";
  // cacheComponents: metadata must read CACHED data to be prerenderable. React
  // cache() is only request memoization, so a revalidated fetch under it still
  // counts as runtime I/O → no static shell → PPR resume mismatch. "use cache"
  // marks it cached; preferConfiguredOrigin keeps headers() out (forbidden here).
  cacheTag(eventsTag, eventTag(slug));
  const event = await fetchEventBySlug(slug, {
    preferConfiguredOrigin: true,
    throwOnError: true,
  });
  if (!event) {
    // Genuine 404: cache briefly so a newly-created event isn't stuck on
    // "not found" metadata for hours. "minutes" not "seconds" — seconds is a
    // PPR dynamic hole and would re-break the static shell.
    cacheLife("minutes");
    return null;
  }
  cacheLife("hours");
  return event;
}

export async function updateEventById(
  id: string,
  data: EventUpdateRequestDTO,
): Promise<EventDetailResponseDTO> {
  const { apiUrl, authToken } = await requireAuth();

  const response = await fetchWithHmac(
    `${apiUrl}/events/${id}`,
    {
      method: "PUT",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(data),
      skipBodySigning: true,
    },
  );
  if (!response.ok) {
    const errorText = await response.text();
    console.error("updateEventById: error response:", errorText);
    throw new Error(
      `HTTP error! status: ${response.status}, body: ${errorText}`,
    );
  }
  return response.json();
}

export async function deleteEventById(id: string): Promise<void> {
  const { apiUrl, authToken } = await requireAuth();

  const response = await fetchWithHmac(
    `${apiUrl}/events/${id}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      skipBodySigning: true,
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("deleteEventById: error response:", errorText);
    throw new Error(
      `HTTP error! status: ${response.status}, body: ${errorText}`,
    );
  }
}

/**
 * POST /events is multipart: an `event` part (JSON, must be typed
 * application/json or the backend answers 415) and an optional `imageFile`.
 * fetch sets the multipart Content-Type with its boundary; never set it here.
 */
export function buildCreateEventFormData(
  data: EventCreateRequestDTO,
  imageFile?: File | null,
): FormData {
  const formData = new FormData();
  formData.append(
    "event",
    new Blob([JSON.stringify(data)], { type: "application/json" }),
  );
  if (imageFile) {
    formData.append("imageFile", imageFile);
  }
  return formData;
}

export async function createEvent(
  data: EventCreateRequestDTO,
  imageFile?: File | null,
  e2eExtras?: E2EEventExtras,
): Promise<EventDetailResponseDTO> {
  if (imageFile) {
    ensureImageWithinLimit(imageFile);
  }

  if (isE2ETestMode && e2eEventsStore) {
    return createE2EEvent(data, imageFile, e2eExtras);
  }

  const { apiUrl, authToken } = await requireAuth();

  const response = await fetchWithHmac(`${apiUrl}/events`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: buildCreateEventFormData(data, imageFile),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "<unreadable>");
    // 2026-07-26 round-5 diagnostic: mirror getAuthenticatedUserExternal so
    // server-side logs (and Sentry) expose the redacted JWT iss/aud/exp/sub
    // the backend actually rejected. Lets us tell "stale audience" (401) from
    // "profile incomplete" (403) without a second round-trip.
    const safeClaims = decodeSafeJwtClaims(authToken);
    // The backend error body can echo back submitted event fields (title,
    // description, url, ...) in validation messages, or leak internal
    // details in an unexpected failure — keep the raw body in the
    // server-side console.error below, but don't forward it to Sentry
    // (a third-party service). Status + length are enough to diagnose from
    // there; the full body is still one grep away in the app's own logs.
    captureException(
      new Error(`createEvent: HTTP ${response.status}`),
      {
        tags: { section: "events-mutation", endpoint: "createEvent" },
        extra: {
          status: response.status,
          bodyLength: errorText.length,
          accessTokenClaims: safeClaims,
        },
      },
    );
    // 2026-07-26 round-10 (mirror of uploadEventImage): surface the
    // WWW-Authenticate header so Spring's resource-server rejection reason
    // (RFC 6750) is one-grep root-caused. The body's empty on resource-server
    // failures; the header names invalid_token / insufficient_scope / etc.
    console.error(
      `createEvent: HTTP ${response.status} \u2014 body=${errorText.slice(0, 200)} \u2014 www-authenticate=${response.headers.get("www-authenticate") ?? "<none>"} \u2014 access_token=${safeClaims}`,
    );
    // Attach `.status` so callers (actions.ts) can distinguish 401 (stale
    // Bearer) from 403 (profileCompleted gate) and route accordingly.
    const err = Object.assign(
      new Error(`HTTP error! status: ${response.status}, body: ${errorText}`),
      { status: response.status },
    );
    throw err;
  }
  return response.json();
}

/** PUT /events/{uuid}/image — replaces the cover. Owner or admin only. */
export async function replaceEventImage(
  eventId: string,
  imageFile: File,
): Promise<UploadImageResponse> {
  ensureImageWithinLimit(imageFile);
  if (isE2ETestMode) {
    return { url: `https://example.com/${imageFile.name}`, publicId: "e2e-image" };
  }
  const { apiUrl, authToken } = await requireAuth();

  const formData = new FormData();
  formData.append("imageFile", imageFile);
  const response = await fetchWithHmac(
    `${apiUrl}/events/${encodeURIComponent(eventId)}/image`,
    {
      method: "PUT",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: formData,
    },
  );
  if (!response.ok) {
    const errorText = await response.text().catch(() => "<unreadable>");
    console.error(
      `replaceEventImage: HTTP ${response.status} -- body=${errorText.slice(0, 200)}`,
    );
    if (response.status === 413) {
      throw new Error(EVENT_IMAGE_UPLOAD_TOO_LARGE_ERROR);
    }
    throw Object.assign(
      new Error(`HTTP error! status: ${response.status}`),
      { status: response.status },
    );
  }
  let payload: unknown;
  try {
    payload = await response.json();
  } catch (cause) {
    throw new Error("Event image replace returned an invalid response", { cause });
  }
  const parsed = UploadImageResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("Event image replace returned an invalid response", { cause: parsed.error });
  }
  return parsed.data;
}

/** DELETE /events/{uuid}/image — removes the cover (imageUrl becomes null). */
export async function deleteEventImage(eventId: string): Promise<void> {
  if (isE2ETestMode) return;
  const { apiUrl, authToken } = await requireAuth();

  const response = await fetchWithHmac(
    `${apiUrl}/events/${encodeURIComponent(eventId)}/image`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${authToken}` },
      skipBodySigning: true,
    },
  );
  if (!response.ok) {
    const errorText = await response.text().catch(() => "<unreadable>");
    console.error(
      `deleteEventImage: HTTP ${response.status} -- body=${errorText.slice(0, 200)}`,
    );
    throw Object.assign(
      new Error(`HTTP error! status: ${response.status}`),
      { status: response.status },
    );
  }
}

function createE2EEvent(
  data: EventCreateRequestDTO,
  imageFile: File | null | undefined,
  extras?: E2EEventExtras,
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
    name: `Region ${safeRegionId}`,
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
    isPromoted: false,
    url: data.url,
    description: data.description,
    imageUrl: imageFile ? `https://example.com/${imageFile.name}` : null,
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
 * Fetch events categorized by category, straight from the backend (no-store;
 * the home page caches its render).
 */
export async function fetchCategorizedEvents(
  maxEventsPerCategory?: number,
): Promise<CategorizedEvents> {
  try {
    const data = await fetchCategorizedEventsExternal(maxEventsPerCategory);
    const validated = parseCategorizedEvents(data);
    if (validated && Object.keys(validated).length > 0) {
      return validated;
    }
    console.error("fetchCategorizedEvents: validation failed or empty");
  } catch (e) {
    console.error(
      "fetchCategorizedEvents: external fetch failed:",
      getSanitizedErrorMessage(e),
    );
  }
  return isE2ETestMode ? buildE2EFallbackCategorizedEvents() : {};
}

// Cached wrapper to deduplicate categorized events within the same request
// Mirrors existing pattern used for events/news slugs
export const getCategorizedEvents = cache(fetchCategorizedEvents);

function buildE2EFallbackCategorizedEvents(): CategorizedEvents {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const placeholderEvent: EventSummaryResponseDTO = {
    id: "e2e-fallback",
    hash: "e2e-fallback",
    slug: "e2e-fallback",
    title: "Esdeveniment de prova E2E",
    isPromoted: false,
    url: "https://example.com",
    description: "Esdeveniment de prova per a E2E.",
    imageUrl: "https://via.placeholder.com/800x600",
    startDate: now.toISOString(),
    startTime: null,
    endDate: tomorrow.toISOString(),
    endTime: null,
    location: "Barcelona",
    visits: 0,
    origin: "MANUAL",
    city: {
      id: 1,
      name: "Barcelona",
      slug: "barcelona",
      latitude: 41.3851,
      longitude: 2.1734,
      postalCode: "08001",
      rssFeed: null,
      enabled: true,
    },
    region: { id: 1, name: "Barcelona", slug: "barcelona" },
    province: { id: 1, name: "Barcelona", slug: "barcelona" },
    categories: [
      {
        id: 1,
        name: "música",
        slug: "musica",
      },
    ],
  };

  return {
    musica: [placeholderEvent],
  };
}

/**
 * Filter out past events from an array of events.
 * Delegates to the shared filterActiveEvents helper to keep logic aligned.
 */
export function filterPastEvents(
  events: EventSummaryResponseDTO[],
): EventSummaryResponseDTO[] {
  return filterActiveEvents(events);
}

/**
 * Insert ads at deterministic positions in the event list.
 * Uses fixed spacing instead of Math.random() to ensure the component tree
 * is identical across renders — required for cacheComponents (RSC resumption).
 */
function insertAdsDeterministic(
  events: EventSummaryResponseDTO[],
  ads: AdEvent[],
  spacing = 5,
  startFrom = 3,
): ListEvent[] {
  const result: ListEvent[] = [...events];

  ads.forEach((ad, i) => {
    // Fixed position: startFrom + i * spacing, adjusted for prior insertions
    const index = startFrom + i * (spacing + 1);
    if (index <= result.length) {
      result.splice(index, 0, ad);
    }
  });

  return result;
}

export function insertAds(
  events: EventSummaryResponseDTO[],
  adFrequencyRatio = 4, // 1 ad per 4 events, matching old behavior
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
      }) as AdEvent,
  );

  return insertAdsDeterministic(events, ads);
}

// Re-export for backward compatibility
export type { E2EEventExtras } from "types/api/event";
