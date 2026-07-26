import { fetchWithHmac } from "./fetch-wrapper";
import { parseAuthenticatedUser, parseUserPublic } from "@lib/validation/user";
import { parsePagedEvents } from "@lib/validation/event";
import { parseProfileUpdateResponse } from "lib/validation/auth";
import { getApiUrl, isApiUrlConfigured } from "@utils/api-helpers";
import type {
  AuthenticatedUserDTO,
  ProfileUpdateRequestDTO,
  ProfileUpdateResponseDTO,
  UserPublicResponseDTO,
} from "types/api/user";
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
 * Patch the signed-in user's profile (username/displayName/bio).
 * Returns the updated ProfileUpdateResponseDTO. Backend returns 409 (taken)
 * for collision, 400 for validation — we surface the real status via re-throw
 * so the route handler can map it correctly without going through Zod parse.
 */
export async function patchMeProfileExternal(
  body: ProfileUpdateRequestDTO,
  accessToken: string,
): Promise<ProfileUpdateResponseDTO | null> {
  if (!accessToken || !isApiUrlConfigured()) return null;
  const apiUrl = getApiUrl();

  try {
    const response = await fetchWithHmac(`${apiUrl}/users/me/profile`, {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
      skipBodySigning: true,
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      // Keep the real status so callers can distinguish 409 (taken) from
      // validation (400) and auth (403). The route handler maps to the
      // user-visible status without going through Zod parse.
      const err = Object.assign(
        new Error(
          `patchMeProfileExternal: HTTP ${response.status} — ${text.slice(0, 200)}`,
        ),
        { status: response.status },
      );
      throw err;
    }
    return parseProfileUpdateResponse(await response.json());
  } catch (error) {
    if ((error as { status?: number })?.status) throw error;
    console.error("patchMeProfileExternal: failed", error);
    return null;
  }
}

/**
 * Upload the signed-in user's avatar (multipart/form-data, field `avatarFile`).
 * Returns `{ avatarUrl }` per backend handoff. Mirrors `uploadEventImage`:
 * 2 MB cap held at the route; the wrapper forwards whatever File the caller
 * passes and lets fetchWithHmac HMAC-sign over an empty body for FormData.
 */
export async function uploadUserAvatarExternal(
  file: File,
  accessToken: string,
): Promise<{ avatarUrl: string } | null> {
  if (!file || !accessToken || !isApiUrlConfigured()) return null;
  const apiUrl = getApiUrl();

  try {
    const formData = new FormData();
    formData.append("avatarFile", file);
    const response = await fetchWithHmac(`${apiUrl}/users/me/avatar`, {
      method: "POST",
      // fetch-wrapper ignores FormData bodies for signing (multipart bodies
      // can't be re-signed from a server-cloned stream). Backend uses HMAC
      // over the path+method only.
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error(
        `uploadUserAvatarExternal: HTTP ${response.status} — ${text.slice(0, 200)}`,
      );
      const err = Object.assign(
        new Error(`uploadUserAvatarExternal: HTTP ${response.status}`),
        { status: response.status },
      );
      throw err;
    }
    const json: unknown = await response.json().catch(() => null);
    const avatarUrl =
      json && typeof json === "object" && typeof (json as { avatarUrl?: unknown }).avatarUrl === "string"
        ? (json as { avatarUrl: string }).avatarUrl
        : null;
    return avatarUrl ? { avatarUrl } : null;
  } catch (error) {
    if ((error as { status?: number })?.status) throw error;
    console.error("uploadUserAvatarExternal: failed", error);
    return null;
  }
}

/** DELETE /api/users/me/avatar — clear the avatar.
 *  Throws with `.status` on non-ok so the route can map backend codes
 *  faithfully (a 401/403 stays 401/403 instead of being squashed to 502). */
export async function deleteUserAvatarExternal(
  accessToken: string,
): Promise<boolean> {
  if (!accessToken || !isApiUrlConfigured()) return false;
  const apiUrl = getApiUrl();
  try {
    const response = await fetchWithHmac(`${apiUrl}/users/me/avatar`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      skipBodySigning: true,
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      const err = Object.assign(
        new Error(
          `deleteUserAvatarExternal: HTTP ${response.status} — ${text.slice(0, 200)}`,
        ),
        { status: response.status },
      );
      throw err;
    }
    return true;
  } catch (error) {
    if ((error as { status?: number })?.status) throw error;
    console.error("deleteUserAvatarExternal: failed", error);
    return false;
  }
}

/**
 * Public listing of a user's events: GET /api/users/{username}/events.
 * Same paged shape as /events; the endpoint only accepts page & size.
 * Default size is 20 — matches the backend handoff and the
 * /[place] listing page size, so a public profile with many events
 * renders at the same density as the home page.
 * Returns an empty page on error so the profile renders "no events" rather
 * than crashing.
 */
export async function getUserEventsExternal(
  username: string,
  page = 0,
  size = 20,
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
