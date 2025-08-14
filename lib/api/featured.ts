import { fetchEvents } from "@lib/api/events";
import type { EventSummaryResponseDTO, PagedResponseDTO } from "types/api/event";
import { isEventSummaryResponseDTO } from "types/api/isEventSummaryResponseDTO";

export const FEATURED_EVENTS_FETCH_SIZE = 6;
export const MIN_FEATURED_EVENTS_TO_DISPLAY = 3;

export async function fetchFeaturedEvents(params: {
  place?: string;
  category?: string;
  size?: number;
}): Promise<EventSummaryResponseDTO[]> {
  if (process.env.NEXT_PUBLIC_FEATURE_PROMOTED !== "1") {
    return [];
  }
  const size = params.size ?? FEATURED_EVENTS_FETCH_SIZE;
  try {
    const primary = await fetchEvents({ page: 0, size, place: params.place, category: params.category });
    let items: EventSummaryResponseDTO[] = (primary?.content || []).filter(isEventSummaryResponseDTO);

    if (items.length >= MIN_FEATURED_EVENTS_TO_DISPLAY) return items;

    // Fallback 1: drop category if present
    if (params.category) {
      const res = await fetchEvents({ page: 0, size, place: params.place });
      items = (res?.content || []).filter(isEventSummaryResponseDTO);
      if (items.length >= MIN_FEATURED_EVENTS_TO_DISPLAY) return items;
    }

    // Fallback 2: drop place if present
    if (params.place) {
      const res = await fetchEvents({ page: 0, size });
      items = (res?.content || []).filter(isEventSummaryResponseDTO);
      if (items.length >= MIN_FEATURED_EVENTS_TO_DISPLAY) return items;
    }

    return items;
  } catch (e) {
    console.error("Failed to fetch featured events:", e);
    return [];
  }
}