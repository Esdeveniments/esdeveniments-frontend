import { fetchWithHmac } from "./fetch-wrapper";
import { parseEventDetail, parsePagedEvents } from "lib/validation/event";
import { buildEventsQuery, getApiUrl, emptyPagedResponse } from "@utils/api-helpers";
import { addDaysYmd, daysBetweenYmd } from "@utils/date-helpers";
import type {
  EventDetailResponseDTO,
  EventSummaryResponseDTO,
  PagedResponseDTO,
  CategorizedEvents,
} from "types/api/event";
import type {
  AllEventPages,
  AllEventPagesOptions,
  FetchEventsParams,
} from "types/event";
import type { SafeFetchResult } from "types/fetch";

// IMPORTANT: Do NOT add `next: { revalidate }` to external fetches.
// This creates a separate cache entry for every unique URL.
// With 100+ places × categories × dates × pages, this caused a cost spike on Jan 20, 2026.
// Use `cache: "no-store"` (fetchWithHmac default) to avoid unbounded cache growth.
// Internal API routes handle caching via Cache-Control headers instead.

// Status for a backend request that never got a response: 504 when it was
// aborted or timed out, 502 otherwise.
function transportFailureStatus(error: unknown): number {
  const name =
    error instanceof Error || error instanceof DOMException ? error.name : "";
  return name === "AbortError" || name === "TimeoutError" ? 504 : 502;
}

// Null only on a backend 404. Anything else (timeout, 5xx, invalid payload)
// throws an error carrying its HTTP status (`getErrorStatus`): callers cache
// a null as "not found" and the event page turns it into notFound() +
// noindex, so an outage must not look like one.
export async function fetchEventBySlug(
  slug: string,
  { signal }: Pick<RequestInit, "signal"> = {},
): Promise<EventDetailResponseDTO | null> {
  const apiUrl = getApiUrl();
  let response: Response;
  try {
    // No `next: { revalidate }` - uses no-store to avoid cache explosion
    response = await fetchWithHmac(
      `${apiUrl}/events/${encodeURIComponent(slug)}`,
      { signal },
    );
  } catch (error) {
    console.error("fetchEventBySlug (external): request failed", slug, error);
    throw Object.assign(
      new Error(`fetchEventBySlug: request failed for ${slug}`, {
        cause: error,
      }),
      { status: transportFailureStatus(error) },
    );
  }
  if (response.status === 404) return null;
  if (!response.ok) {
    console.error("fetchEventBySlug (external):", slug, "HTTP", response.status);
    // A 3xx arrives here (fetchWithHmac uses redirect: "manual"); report it
    // as a bad gateway so callers only ever see 4xx/5xx statuses.
    throw Object.assign(
      new Error(`fetchEventBySlug: HTTP ${response.status} for ${slug}`),
      { status: response.status >= 400 ? response.status : 502 },
    );
  }
  const event = parseEventDetail(await response.json().catch(() => null));
  if (!event) {
    console.error("fetchEventBySlug (external): invalid payload", slug);
    throw Object.assign(
      new Error(`fetchEventBySlug: invalid event payload for ${slug}`),
      { status: 502 },
    );
  }
  return event;
}

export async function fetchEventsExternal(
  params: FetchEventsParams,
): Promise<PagedResponseDTO<EventSummaryResponseDTO>> {
  const { data } = await fetchEventsExternalResult(params);
  return data ?? emptyPagedResponse(0, 12);
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
    return { data: null, error: failure, status: transportFailureStatus(error) };
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

const PARALLEL_REQUESTS = 4;
const MAX_PAGE_SIZE = 50; // the backend clamps larger pages
// Windows are cut to about half a page, so most fit on the first try.
const WINDOW_FILL = 0.5;

type PageTask = { from?: string; to?: string; page: number };

/** Equal day windows covering from..to, each expected to hold about half a page. */
function splitWindow(from: string, to: string, total: number, size: number) {
  const days = daysBetweenYmd(from, to) + 1;
  const parts = Math.min(days, Math.ceil(total / (size * WINDOW_FILL)));
  const step = Math.ceil(days / parts);
  const windows: PageTask[] = [];
  for (let offset = 0; offset < days; offset += step) {
    const end = addDaysYmd(from, Math.min(offset + step, days) - 1);
    windows.push({ from: addDaysYmd(from, offset), to: end, page: 0 });
  }
  return windows;
}

/**
 * Every event of a query. With from/to the backend returns rows in no fixed
 * order (Esdeveniments/esdeveniments-backend#63), so walking pages skips some
 * events and repeats others. Instead the date range is split until each
 * window fits in one page; only a single day (or a query without dates) that
 * still overflows is paged, deduped by id.
 *
 * For readers inside "use cache": skips connection() and throws on any failed
 * request, so a partial list is never cached. `complete` is false when the
 * request budget ran out or a paged window came back with fewer unique events
 * than its total.
 */
export async function fetchAllEventPagesExternal(
  params: Omit<FetchEventsParams, "page" | "size">,
  { maxRequests, pageSize = MAX_PAGE_SIZE, timeout }: AllEventPagesOptions,
): Promise<AllEventPages> {
  const size = Math.min(pageSize, MAX_PAGE_SIZE);
  const fetchPage = async ({ from, to, page }: PageTask) => {
    const qs = buildEventsQuery({ ...params, from, to, page, size });
    // No `next: { revalidate }` - uses no-store to avoid cache explosion
    const res = await fetchWithHmac(`${getApiUrl()}/events?${qs}`, {
      skipConnection: true,
      timeout,
    });
    if (!res.ok) throw new Error(`fetchAllEventPagesExternal: HTTP ${res.status}`);
    const data = parsePagedEvents(await res.json());
    if (!data) throw new Error("fetchAllEventPagesExternal: invalid payload");
    return data;
  };

  const byId = new Map<string, EventSummaryResponseDTO>();
  // Windows walked page by page: their unique ids must reach their total.
  const paged = new Map<string, { ids: Set<string>; total: number }>();
  const queue: PageTask[] = [{ from: params.from, to: params.to, page: 0 }];
  let requests = 0;

  while (queue.length > 0 && requests < maxRequests) {
    const batch = queue.splice(0, Math.min(PARALLEL_REQUESTS, maxRequests - requests));
    requests += batch.length;
    const results = await Promise.all(batch.map(fetchPage));
    batch.forEach((task, i) => {
      const { content, totalElements, totalPages } = results[i];
      for (const event of content) byId.set(event.id, event);
      const key = `${task.from}|${task.to}`;
      if (task.page > 0) {
        content.forEach((event) => paged.get(key)?.ids.add(event.id));
        return;
      }
      if (totalElements <= content.length) return;
      if (task.from && task.to && task.from < task.to) {
        queue.push(...splitWindow(task.from, task.to, totalElements, size));
        return;
      }
      paged.set(key, { ids: new Set(content.map((event) => event.id)), total: totalElements });
      for (let page = 1; page < totalPages; page++) {
        queue.push({ from: task.from, to: task.to, page });
      }
    });
  }

  const complete =
    queue.length === 0 &&
    [...paged.values()].every(({ ids, total }) => ids.size >= total);
  return { events: [...byId.values()], complete };
}
