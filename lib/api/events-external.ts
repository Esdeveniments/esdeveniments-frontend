import { fetchWithHmac } from "./fetch-wrapper";
import { parseEventDetail } from "lib/validation/event";
import type {
  EventDetailResponseDTO,
  EventSummaryResponseDTO,
  PagedResponseDTO,
  CategorizedEvents,
} from "types/api/event";
import type { FetchEventsParams } from "types/event";

export async function fetchEventBySlug(slug: string): Promise<EventDetailResponseDTO | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    console.error("NEXT_PUBLIC_API_URL is not defined");
    return null;
  }
  try {
    const response = await fetchWithHmac(`${apiUrl}/events/${slug}`, {
      // Edge cache controlled by caller (internal route)
    });
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
  params: FetchEventsParams
): Promise<PagedResponseDTO<EventSummaryResponseDTO>> {
  const api = process.env.NEXT_PUBLIC_API_URL;
  if (!api) {
    return {
      content: [],
      currentPage: 0,
      pageSize: 10,
      totalElements: 0,
      totalPages: 0,
      last: true,
    };
  }
  const query: Partial<FetchEventsParams> = {};
  query.page = typeof params.page === "number" ? params.page : 0;
  query.size = typeof params.size === "number" ? params.size : 10;
  if (params.place) query.place = params.place;
  if (params.category) query.category = params.category;
  if (params.lat) query.lat = params.lat;
  if (params.lon) query.lon = params.lon;
  if (params.radius) query.radius = params.radius;
  if (params.term) query.term = params.term;
  if (params.byDate) query.byDate = params.byDate;
  if (params.from) query.from = params.from;
  if (params.to) query.to = params.to;
  const qs = new URLSearchParams(
    Object.fromEntries(
      Object.entries(query)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    )
  );
  const res = await fetchWithHmac(`${api}/events?${qs.toString()}`);
  if (!res.ok) {
    return {
      content: [],
      currentPage: 0,
      pageSize: 10,
      totalElements: 0,
      totalPages: 0,
      last: true,
    };
  }
  return (await res.json()) as PagedResponseDTO<EventSummaryResponseDTO>;
}

export async function fetchCategorizedEventsExternal(
  maxEventsPerCategory?: number
): Promise<CategorizedEvents> {
  const api = process.env.NEXT_PUBLIC_API_URL;
  if (!api) return {};
  const params = new URLSearchParams();
  if (maxEventsPerCategory !== undefined) {
    params.append("maxEventsPerCategory", String(maxEventsPerCategory));
  }
  const url = `${api}/events/categorized${params.toString() ? `?${params}` : ""}`;
  const res = await fetchWithHmac(url);
  if (!res.ok) return {};
  return (await res.json()) as CategorizedEvents;
}
