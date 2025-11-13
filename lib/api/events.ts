import { cache } from "react";
import { fetchWithHmac } from "./fetch-wrapper";
import { getInternalApiUrl, buildEventsQuery } from "@utils/api-helpers";
import {
  parseEventDetail,
  parsePagedEvents,
  parseCategorizedEvents,
} from "@lib/validation/event";
import {
  ListEvent,
  EventSummaryResponseDTO,
  AdEvent,
  CategorizedEvents,
  EventDetailResponseDTO,
  EventUpdateRequestDTO,
  EventCreateRequestDTO,
  PagedResponseDTO,
} from "types/api/event";
import { FetchEventsParams } from "types/event";
import { computeTemporalStatus } from "@utils/event-status";

export async function fetchEvents(
  params: FetchEventsParams
): Promise<PagedResponseDTO<EventSummaryResponseDTO>> {
  try {
    const queryString = buildEventsQuery(params);
    const finalUrl = getInternalApiUrl(`/api/events?${queryString}`);

    const response = await fetch(finalUrl, {
      next: { revalidate: 300, tags: ["events"] },
    });
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
  imageFile?: File
): Promise<EventDetailResponseDTO> {
  const formData = new FormData();

  formData.append("request", JSON.stringify(data));

  if (imageFile) {
    formData.append("imageFile", imageFile);
  }

  const response = await fetchWithHmac(`${process.env.NEXT_PUBLIC_API_URL}/events`, {
    method: "POST",
    headers: {
      Accept: "application/json",
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("createEvent: error response:", errorText);
    throw new Error(
      `HTTP error! status: ${response.status}, body: ${errorText}`
    );
  }
  return response.json();
}

export async function fetchCategorizedEvents(
  maxEventsPerCategory?: number
): Promise<CategorizedEvents> {
  try {
    const params = new URLSearchParams();
    if (maxEventsPerCategory !== undefined) {
      params.append("maxEventsPerCategory", String(maxEventsPerCategory));
    }
    const finalUrl = getInternalApiUrl(`/api/events/categorized${params.toString() ? `?${params.toString()}` : ""}`);
    const response = await fetch(finalUrl, {
      next: { revalidate: 300, tags: ["events", "events:categorized"] },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unable to read error response");
      console.error(
        `fetchCategorizedEvents: HTTP error! status: ${response.status}, url: ${finalUrl}, error: ${errorText}`
      );
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    const validated = parseCategorizedEvents(data);
    if (!validated) {
      console.error(
        "fetchCategorizedEvents: validation failed, returning fallback"
      );
      return {};
    }
    return validated;
  } catch (e) {
    console.error("Error fetching categorized events:", e);
    if (e instanceof Error) {
      console.error("Error details:", e.message, e.stack);
    }
    return {};
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
