import {
  ListEvent,
  EventSummaryResponseDTO,
  AdEvent,
  CategorizedEvents,
  EventDetailResponseDTO,
  EventUpdateRequestDTO,
  EventCreateRequestDTO,
} from "types/api/event";
import { FetchEventsParams } from "types/event";

export async function fetchEvents(
  params: FetchEventsParams
): Promise<EventSummaryResponseDTO[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    // MOCK DATA or empty for build safety
    return [];
  }
  // Prepare params: always send page and size, only include others if non-empty
  const query: Partial<FetchEventsParams> = {};
  query.page = typeof params.page === "number" ? params.page : 0;
  query.maxResults =
    typeof params.maxResults === "number" ? params.maxResults : 10;
  // Add other params if present and non-empty
  if (params.q) query.q = params.q;
  if (params.town) query.town = params.town;
  if (params.zone) query.zone = params.zone;
  if (params.category) query.category = params.category;

  try {
    const response = await fetch(
      `${apiUrl}/events?` +
        new URLSearchParams(
          Object.fromEntries(
            Object.entries(query)
              .filter(([, v]) => v !== undefined)
              .map(([k, v]) => [k, String(v)])
          )
        )
    );
    const data = await response.json();
    return data.content || [];
  } catch (e) {
    console.error("Error fetching events:", e);
    return [];
  }
}

export async function fetchEventById(
  uuid: string
): Promise<EventDetailResponseDTO | null> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/events/${uuid}`
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
}

export async function updateEventById(
  uuid: string,
  data: EventUpdateRequestDTO
): Promise<EventDetailResponseDTO> {
  const response = await fetch(
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
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
}

export async function createEvent(
  data: EventCreateRequestDTO
): Promise<EventDetailResponseDTO> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/events`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
}

export interface CategorizedEventsApiResponse {
  categorizedEvents: CategorizedEvents;
  latestEvents?: EventSummaryResponseDTO[];
}

export async function fetchCategorizedEvents(): Promise<CategorizedEventsApiResponse> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    // MOCK DATA or empty for build safety
    return { categorizedEvents: {} };
  }
  try {
    const response = await fetch(`${apiUrl}/events/categorized`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
  } catch (e) {
    console.error("Error fetching categorized events:", e);
    return { categorizedEvents: {} };
  }
}

export function insertAds(
  events: EventSummaryResponseDTO[],
  adFrequency = 5
): ListEvent[] {
  const result: ListEvent[] = [];
  let adIndex = 0;
  for (let i = 0; i < events.length; i++) {
    result.push(events[i]);
    if ((i + 1) % adFrequency === 0) {
      result.push({
        isAd: true,
        id: `ad-${adIndex++}`,
        // Add any other AdEvent fields if needed
      } as AdEvent);
    }
  }
  return result;
}
