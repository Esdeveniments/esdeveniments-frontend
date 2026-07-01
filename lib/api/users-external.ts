import { fetchWithHmac } from "./fetch-wrapper";
import { parseUserPublic } from "@lib/validation/user";
import { parsePagedEvents } from "@lib/validation/event";
import { getApiUrl } from "@utils/api-helpers";
import type { UserPublicResponseDTO } from "types/api/user";
import type {
  EventSummaryResponseDTO,
  PagedResponseDTO,
} from "types/api/event";

export async function getUserByUsernameExternal(
  username: string
): Promise<UserPublicResponseDTO | null> {
  if (!username || !username.trim()) return null;
  const apiUrl = getApiUrl();
  if (!apiUrl) return null;

  try {
    const response = await fetchWithHmac(
      `${apiUrl}/users/${encodeURIComponent(username)}`
    );
    if (response.status === 404) return null;
    if (!response.ok) {
      console.error(`getUserByUsernameExternal: HTTP ${response.status}`);
      return null;
    }
    return parseUserPublic(await response.json());
  } catch (error) {
    console.error("getUserByUsernameExternal: failed", error);
    return null;
  }
}

/**
 * Public listing of a user's events: GET /api/users/{username}/events.
 * Same paged shape as /events; the endpoint only accepts page & size.
 * Returns an empty page on error so the profile renders "no events" rather
 * than crashing.
 */
export async function getUserEventsExternal(
  username: string,
  page = 0,
  size = 12,
): Promise<PagedResponseDTO<EventSummaryResponseDTO>> {
  const empty: PagedResponseDTO<EventSummaryResponseDTO> = {
    content: [],
    currentPage: page,
    pageSize: size,
    totalElements: 0,
    totalPages: 0,
    last: true,
  };
  if (!username || !username.trim()) return empty;
  const apiUrl = getApiUrl();
  if (!apiUrl) return empty;

  try {
    const qs = new URLSearchParams({ page: String(page), size: String(size) });
    const response = await fetchWithHmac(
      `${apiUrl}/users/${encodeURIComponent(username)}/events?${qs.toString()}`,
    );
    if (!response.ok) {
      console.error(`getUserEventsExternal: HTTP ${response.status}`);
      return empty;
    }
    return parsePagedEvents(await response.json()) ?? empty;
  } catch (error) {
    console.error("getUserEventsExternal: failed", error);
    return empty;
  }
}
