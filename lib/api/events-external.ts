import { fetchWithHmac } from "./fetch-wrapper";
import { parseEventDetail } from "lib/validation/event";
import { buildEventsQuery } from "@utils/api-helpers";
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
  try {
    const qs = buildEventsQuery(params);
    const res = await fetchWithHmac(`${api}/events?${qs.toString()}`);
    if (!res.ok) {
      console.error(`fetchEventsExternal: HTTP ${res.status}`);
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
  } catch (error) {
    console.error("fetchEventsExternal: failed", error);
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

export async function fetchCategorizedEventsExternal(
  maxEventsPerCategory?: number
): Promise<CategorizedEvents> {
  const api = process.env.NEXT_PUBLIC_API_URL;
  if (!api) return {};
  try {
    const params = new URLSearchParams();
    if (maxEventsPerCategory !== undefined) {
      params.append("maxEventsPerCategory", String(maxEventsPerCategory));
    }
    const url = `${api}/events/categorized${params.toString() ? `?${params}` : ""}`;
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
