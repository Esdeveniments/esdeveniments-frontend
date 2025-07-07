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

export async function fetchEvents(
  params: FetchEventsParams
): Promise<PagedResponseDTO<EventSummaryResponseDTO>> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
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
  if (params.q) query.q = params.q;
  if (params.byDate) query.byDate = params.byDate;
  if (params.from) query.from = params.from;
  if (params.to) query.to = params.to;

  try {
    const filteredEntries = Object.entries(query)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)]);

    const queryString = new URLSearchParams(
      Object.fromEntries(filteredEntries)
    );
    const finalUrl = `${apiUrl}/events?${queryString}`;

    const response = await fetch(finalUrl);
    const data = await response.json();

    return data;
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

export async function fetchEventById(
  uuid: string
): Promise<EventDetailResponseDTO | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    console.error("NEXT_PUBLIC_API_URL is not defined");
    return null;
  }

  try {
    const response = await fetch(`${apiUrl}/events/${uuid}`);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
  } catch (error) {
    console.error("Error fetching event by ID:", error);
    return null;
  }
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
  data: EventCreateRequestDTO,
  imageFile?: File
): Promise<EventDetailResponseDTO> {
  const formData = new FormData();

  formData.append("request", JSON.stringify(data));

  if (imageFile) {
    formData.append("imageFile", imageFile);
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/events`, {
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
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    return {};
  }
  try {
    const params = new URLSearchParams();
    if (maxEventsPerCategory !== undefined) {
      params.append("maxEventsPerCategory", String(maxEventsPerCategory));
    }
    const queryString = params.toString();
    const finalUrl = `${apiUrl}/events/categorized${
      queryString ? `?${queryString}` : ""
    }`;
    const response = await fetch(finalUrl);

    const data = await response.json();

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return data;
  } catch (e) {
    console.error("Error fetching categorized events:", e);
    return {};
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
      } as AdEvent);
    }
  }
  return result;
}
