import {
  ListEvent,
  EventSummaryResponseDTO,
  AdEvent,
  CategorizedEvents,
  EventDetailResponseDTO,
} from "../../types/api/event";

export async function fetchEvents(
  params: Record<string, any>
): Promise<EventSummaryResponseDTO[]> {
  // Prepare params: always send page and size, only include others if non-empty
  const query: Record<string, any> = {};
  query.page = typeof params.page === "number" ? params.page : 0;
  query.size = typeof params.maxResults === "number" ? params.maxResults : 10;
  // Add other params if present and non-empty
  if (params.q) query.q = params.q;
  if (params.town) query.town = params.town;
  if (params.zone) query.zone = params.zone;
  if (params.category) query.category = params.category;

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/events?` + new URLSearchParams(query)
  );
  const data = await response.json();
  return data.content || [];
}

export async function fetchEventById(
  uuid: string
): Promise<EventDetailResponseDTO> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/events/${uuid}`
  );
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
}

export async function updateEventById(
  uuid: string,
  data: any
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

export async function createEvent(data: any): Promise<EventDetailResponseDTO> {
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
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/events/categorized`
  );
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
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
