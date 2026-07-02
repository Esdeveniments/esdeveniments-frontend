import { fetchWithHmac } from "./fetch-wrapper";
import { parseAuthenticatedUser, parseUserPublic } from "@lib/validation/user";
import { parsePagedEvents } from "@lib/validation/event";
import { getApiUrl, isApiUrlConfigured } from "@utils/api-helpers";
import type { AuthenticatedUserDTO, UserPublicResponseDTO } from "types/api/user";
import type {
  EventSummaryResponseDTO,
  PagedResponseDTO,
} from "types/api/event";

/**
 * Authenticated session profile: GET /api/auth/me. Backend-owned fields
 * (pictureUrl/pictureSource/role/lastLoginAt) that the Logto id_token can't
 * carry — the id_token has no concept of an in-app avatar upload or login
 * audit trail. Returns null on any failure so the caller can fall back to
 * the id_token-derived user rather than breaking the session.
 */
export async function getAuthenticatedUserExternal(
  accessToken: string
): Promise<AuthenticatedUserDTO | null> {
  if (!accessToken) return null;
  if (!isApiUrlConfigured()) return null;
  const apiUrl = getApiUrl();

  try {
    const response = await fetchWithHmac(`${apiUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "<unreadable>");
      console.error(
        `getAuthenticatedUserExternal: HTTP ${response.status} — ${body}`
      );
      return null;
    }
    return parseAuthenticatedUser(await response.json());
  } catch (error) {
    console.error("getAuthenticatedUserExternal: failed", error);
    return null;
  }
}

export async function getUserByUsernameExternal(
  username: string
): Promise<UserPublicResponseDTO | null> {
  if (!username || !username.trim()) return null;
  // Return null (no fetch) when the backend URL is genuinely unconfigured.
  // getApiUrl() falls back to a hardcoded default, so guarding on its result
  // is dead code and would fire a real request against the default host.
  if (!isApiUrlConfigured()) return null;
  const apiUrl = getApiUrl();

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
  const trimmed = username?.trim();
  if (!trimmed) return empty;
  // Return an empty page (no fetch) when the backend URL is unconfigured —
  // getApiUrl() falls back to a default host, so guarding on it is dead code.
  if (!isApiUrlConfigured()) return empty;
  const apiUrl = getApiUrl();

  try {
    const qs = new URLSearchParams({ page: String(page), size: String(size) });
    // No `next: { revalidate }` here — external wrappers must stay no-store
    // (repo cost rule). Matches getUserByUsernameExternal on the same page.
    const response = await fetchWithHmac(
      `${apiUrl}/users/${encodeURIComponent(trimmed)}/events?${qs.toString()}`,
    );
    // 404 = unknown user / no public events: a normal empty result, not an error.
    if (response.status === 404) return empty;
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
