import { fetchWithHmac } from "./fetch-wrapper";
import { getApiUrl } from "@utils/api-helpers";
import {
  parseFavoriteEventsPage,
  parseFavoriteStatus,
} from "@lib/validation/favorites";
import type { FavoriteEventsPageDTO } from "types/api/favorites";

interface MutationResult {
  ok: boolean;
  status: number;
}

function authHeaders(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}` };
}

export async function listFavoriteEventsExternal(
  accessToken: string,
  page = 0,
  size = 50
): Promise<FavoriteEventsPageDTO | null> {
  const apiUrl = getApiUrl();
  if (!apiUrl) return null;

  try {
    const url = new URL(`${apiUrl}/users/me/favorites/events`);
    url.searchParams.set("page", String(page));
    url.searchParams.set("size", String(size));

    const response = await fetchWithHmac(url.toString(), {
      headers: authHeaders(accessToken),
    });
    if (!response.ok) {
      console.error(
        `listFavoriteEventsExternal: HTTP ${response.status}`
      );
      return null;
    }
    return parseFavoriteEventsPage(await response.json());
  } catch (error) {
    console.error("listFavoriteEventsExternal: failed", error);
    return null;
  }
}

export async function isFavoriteEventExternal(
  accessToken: string,
  eventId: string
): Promise<boolean | null> {
  const apiUrl = getApiUrl();
  if (!apiUrl) return null;

  try {
    const response = await fetchWithHmac(
      `${apiUrl}/users/me/favorites/events/${encodeURIComponent(eventId)}`,
      { headers: authHeaders(accessToken) }
    );
    if (!response.ok) return null;
    const parsed = parseFavoriteStatus(await response.json());
    return parsed?.favorite ?? null;
  } catch (error) {
    console.error("isFavoriteEventExternal: failed", error);
    return null;
  }
}

export async function addFavoriteEventExternal(
  accessToken: string,
  eventId: string
): Promise<MutationResult> {
  const apiUrl = getApiUrl();
  if (!apiUrl) return { ok: false, status: 0 };

  try {
    const response = await fetchWithHmac(
      `${apiUrl}/users/me/favorites/events/${encodeURIComponent(eventId)}`,
      {
        method: "POST",
        headers: authHeaders(accessToken),
        skipBodySigning: true,
      }
    );
    return { ok: response.ok, status: response.status };
  } catch (error) {
    console.error("addFavoriteEventExternal: failed", error);
    return { ok: false, status: 0 };
  }
}

export async function removeFavoriteEventExternal(
  accessToken: string,
  eventId: string
): Promise<MutationResult> {
  const apiUrl = getApiUrl();
  if (!apiUrl) return { ok: false, status: 0 };

  try {
    const response = await fetchWithHmac(
      `${apiUrl}/users/me/favorites/events/${encodeURIComponent(eventId)}`,
      {
        method: "DELETE",
        headers: authHeaders(accessToken),
        skipBodySigning: true,
      }
    );
    return { ok: response.ok, status: response.status };
  } catch (error) {
    console.error("removeFavoriteEventExternal: failed", error);
    return { ok: false, status: 0 };
  }
}
