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
    // MOCK DATA or empty for build safety
    return {
      content: [],
      currentPage: 0,
      pageSize: 10,
      totalElements: 0,
      totalPages: 0,
      last: true,
    };
  }
  // Prepare params: always send page and size, only include others if non-empty
  const query: Partial<FetchEventsParams> = {};
  query.page = typeof params.page === "number" ? params.page : 0;
  query.size = typeof params.size === "number" ? params.size : 10;

  // Add other params if present and non-empty
  if (params.place) query.place = params.place;
  if (params.category) query.category = params.category;
  if (params.lat) query.lat = params.lat;
  if (params.lon) query.lon = params.lon;
  if (params.radius) query.radius = params.radius;
  if (params.q) query.q = params.q;
  if (params.byDate) query.byDate = params.byDate;
  if (params.from) query.from = params.from;
  if (params.to) query.to = params.to;

  console.log("fetchEvents: input params:", params);
  console.log("fetchEvents: final query:", query);

  try {
    const filteredEntries = Object.entries(query)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)]);

    const queryString = new URLSearchParams(
      Object.fromEntries(filteredEntries)
    );
    const finalUrl = `${apiUrl}/events?${queryString}`;

    console.log("fetchEvents: final URL:", finalUrl);

    const response = await fetch(finalUrl);
    const data = await response.json();

    // console.log("fetchEvents: response:", data);

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

  // Debug: Log the data being sent
  console.log("createEvent: data to send:", data);
  console.log("createEvent: imageFile:", imageFile);

  // Add the request data as a JSON string
  formData.append("request", JSON.stringify(data));

  // Add the image file if provided
  if (imageFile) {
    formData.append("imageFile", imageFile);
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/events`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      // Note: Don't set Content-Type for FormData, let the browser set it with boundary
    },
    body: formData,
  });

  // Debug: Log response details
  console.log("createEvent: response status:", response.status);
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
    // MOCK DATA or empty for build safety
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
        // Add any other AdEvent fields if needed
      } as AdEvent);
    }
  }
  return result;
}
