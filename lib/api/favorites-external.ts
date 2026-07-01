import { fetchWithHmac } from "./fetch-wrapper";
import { getApiUrl } from "@utils/api-helpers";
import { parsePagedEvents } from "@lib/validation/event";
import type {
  EventSummaryResponseDTO,
  PagedResponseDTO,
} from "types/api/event";

// Authenticated per-user favourites: GET/POST/DELETE /api/users/me/favorites/events.
// Every call forwards the caller's Bearer token to the backend (same pattern as
// getMeExternal). The token acquisition is left to the auth layer — these
// functions are provider-agnostic.
const FAVORITES_PATH = "/users/me/favorites/events";

function emptyPage(
  page: number,
  size: number,
): PagedResponseDTO<EventSummaryResponseDTO> {
  return {
    content: [],
    currentPage: page,
    pageSize: size,
    totalElements: 0,
    totalPages: 0,
    last: true,
  };
}

export async function fetchFavoriteEventsExternal(
  token: string,
  page = 0,
  size = 12,
): Promise<PagedResponseDTO<EventSummaryResponseDTO>> {
  const api = getApiUrl();
  try {
    const qs = new URLSearchParams({ page: String(page), size: String(size) });
    const res = await fetchWithHmac(`${api}${FAVORITES_PATH}?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      console.error(`fetchFavoriteEventsExternal: HTTP ${res.status}`);
      return emptyPage(page, size);
    }
    return parsePagedEvents(await res.json()) ?? emptyPage(page, size);
  } catch (error) {
    console.error("fetchFavoriteEventsExternal: failed", error);
    return emptyPage(page, size);
  }
}

export async function getFavoriteStatusExternal(
  token: string,
  eventId: string,
): Promise<boolean> {
  const api = getApiUrl();
  try {
    const res = await fetchWithHmac(
      `${api}${FAVORITES_PATH}/${encodeURIComponent(eventId)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) return false;
    const json = (await res.json()) as { favorite?: unknown } | null;
    return Boolean(json?.favorite);
  } catch (error) {
    console.error("getFavoriteStatusExternal: failed", error);
    return false;
  }
}

export async function setFavoriteExternal(
  token: string,
  eventId: string,
  favorite: boolean,
): Promise<boolean> {
  const api = getApiUrl();
  try {
    const res = await fetchWithHmac(
      `${api}${FAVORITES_PATH}/${encodeURIComponent(eventId)}`,
      {
        method: favorite ? "POST" : "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    return res.ok;
  } catch (error) {
    console.error("setFavoriteExternal: failed", error);
    return false;
  }
}
