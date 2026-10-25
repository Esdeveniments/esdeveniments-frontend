import { fetchWithHmac } from "./fetch-wrapper";
import { parseEventDetail, parsePagedEvents } from "lib/validation/event";
import { buildEventsQuery, getApiUrl } from "@utils/api-helpers";
import type {
  EventDetailResponseDTO,
  EventSummaryResponseDTO,
  PagedResponseDTO,
  CategorizedEvents,
} from "types/api/event";
import type { FetchEventsParams } from "types/event";
import type { SafeFetchResult } from "types/fetch";

// IMPORTANT: Do NOT add `next: { revalidate }` to external fetches.
// This creates a separate cache entry for every unique URL.
// With 100+ places × categories × dates × pages, this caused a cost spike on Jan 20, 2026.
// Use `cache: "no-store"` (fetchWithHmac default) to avoid unbounded cache growth.
// Internal API routes handle caching via Cache-Control headers instead.

export async function fetchEventBySlug(
  slug: string,
): Promise<EventDetailResponseDTO | null> {
  const apiUrl = getApiUrl();
  try {
    // No `next: { revalidate }` - uses no-store to avoid cache explosion
    const response = await fetchWithHmac(`${apiUrl}/events/${slug}`);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const json = await response.json();
    return parseEventDetail(json);
  } catch (error) {
    console.error("Error fetching event by slug (external):", error);
    return null;
  }
}

export async function fetchEventsExternal(
  params: FetchEventsParams,
): Promise<PagedResponseDTO<EventSummaryResponseDTO>> {
  const { data } = await fetchEventsExternalResult(params);
  return data ?? {
    content: [],
    currentPage: 0,
    pageSize: 12,
    totalElements: 0,
    totalPages: 0,
    last: true,
  };
}

export async function fetchEventsExternalResult(
  params: FetchEventsParams,
): Promise<SafeFetchResult<PagedResponseDTO<EventSummaryResponseDTO>>> {
  const api = getApiUrl();
  try {
    const qs = buildEventsQuery(params);
    // No `next: { revalidate }` - uses no-store to avoid cache explosion
    const res = await fetchWithHmac(`${api}/events?${qs.toString()}`);
    if (!res.ok) {
      const error = new Error(`fetchEventsExternal: HTTP ${res.status}`);
      console.error(error.message);
      return {
        data: null,
        error,
        status: res.status >= 400 ? res.status : 502,
      };
    }
    const data = parsePagedEvents(await res.json());
    if (!data) {
      return {
        data: null,
        error: new Error("fetchEventsExternal: invalid paged events payload"),
        status: 502,
      };
    }
    return { data, error: null, status: 200 };
  } catch (error) {
    console.error("fetchEventsExternal: failed", error);
    const failure =
      error instanceof Error || error instanceof DOMException
        ? error
        : new Error(String(error));
    return {
      data: null,
      error: failure,
      status:
        failure.name === "AbortError" || failure.name === "TimeoutError"
          ? 504
          : 502,
    };
  }
}

export async function fetchCategorizedEventsExternal(
  maxEventsPerCategory?: number,
): Promise<CategorizedEvents> {
  const api = getApiUrl();
  try {
    const params = new URLSearchParams();
    if (maxEventsPerCategory !== undefined) {
      params.append("maxEventsPerCategory", String(maxEventsPerCategory));
    }
    const url = `${api}/events/categorized${params.toString() ? `?${params}` : ""}`;
    // No `next: { revalidate }` - uses no-store to avoid cache explosion
    const res = await fetchWithHmac(url);
    if (!res.ok) {
      console.error(`fetchCategorizedEventsExternal: HTTP ${res.status}`);
      return {};
    }
    return (await res.json()) as CategorizedEvents;
  } catch (error) {
    console.error("fetchCategorizedEventsExternal: failed", error);
    return {};
  }
}

/**
 * Fetches only the total event count for a place.
 * Returns the actual count (may be 0 for a real empty place) or null on API failure.
 * Unlike fetchEventsExternal, null explicitly signals "unknown" so callers can
 * distinguish a real zero from an error.
 */
export async function fetchEventCountExternal(
  place: string,
): Promise<number | null> {
  const api = getApiUrl();
  try {
    const qs = buildEventsQuery({ place, size: 1 });
    const res = await fetchWithHmac(`${api}/events?${qs.toString()}`);
    if (!res.ok) {
      console.error(`fetchEventCountExternal: HTTP ${res.status} for ${place}`);
      return null;
    }
    const payload = await res.json();
    const data = parsePagedEvents(payload);
    return data?.totalElements ?? null;
  } catch (error) {
    console.error("fetchEventCountExternal: failed", error);
    return null;
  }
}
