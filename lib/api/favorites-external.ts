import { fetchWithHmac } from "./fetch-wrapper";
import { getApiUrl, isApiUrlConfigured } from "@utils/api-helpers";
import {
  parseFavoriteEventsPage,
  parseFavoriteStatus,
} from "@lib/validation/favorites";
import type {
  FavoriteEventsPageDTO,
  MutationResultDTO,
} from "types/api/favorites";

function authHeaders(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}` };
}

async function logBackendError(
  context: string,
  response: Response
): Promise<void> {
  const body = await response.text().catch(() => "<unreadable>");
  console.error(`${context}: HTTP ${response.status} — ${body}`);
}

function favoritesBaseUrl(): string | null {
  if (!isApiUrlConfigured()) return null;
  return `${getApiUrl()}/users/me/favorites/events`;
}

export async function listFavoriteEventsExternal(
  accessToken: string,
  page = 0,
  size = 50
): Promise<FavoriteEventsPageDTO | null> {
  const base = favoritesBaseUrl();
  if (!base) return null;

  try {
    const query = new URLSearchParams({
      page: String(page),
      size: String(size),
    }).toString();
    const response = await fetchWithHmac(`${base}?${query}`, {
      headers: authHeaders(accessToken),
    });
    if (!response.ok) {
      await logBackendError("listFavoriteEventsExternal", response);
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
  if (!eventId || !eventId.trim()) return null;
  const base = favoritesBaseUrl();
  if (!base) return null;

  try {
    const response = await fetchWithHmac(
      `${base}/${encodeURIComponent(eventId)}`,
      { headers: authHeaders(accessToken) }
    );
    if (!response.ok) {
      await logBackendError("isFavoriteEventExternal", response);
      return null;
    }
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
): Promise<MutationResultDTO> {
  if (!eventId || !eventId.trim()) return { ok: false, status: 0 };
  const base = favoritesBaseUrl();
  if (!base) return { ok: false, status: 0 };

  try {
    const response = await fetchWithHmac(
      `${base}/${encodeURIComponent(eventId)}`,
      {
        method: "POST",
        headers: authHeaders(accessToken),
        skipBodySigning: true,
      }
    );
    if (!response.ok) {
      await logBackendError("addFavoriteEventExternal", response);
    }
    return { ok: response.ok, status: response.status };
  } catch (error) {
    console.error("addFavoriteEventExternal: failed", error);
    return { ok: false, status: 0 };
  }
}

export async function removeFavoriteEventExternal(
  accessToken: string,
  eventId: string
): Promise<MutationResultDTO> {
  if (!eventId || !eventId.trim()) return { ok: false, status: 0 };
  const base = favoritesBaseUrl();
  if (!base) return { ok: false, status: 0 };

  try {
    const response = await fetchWithHmac(
      `${base}/${encodeURIComponent(eventId)}`,
      {
        method: "DELETE",
        headers: authHeaders(accessToken),
        skipBodySigning: true,
      }
    );
    if (!response.ok) {
      await logBackendError("removeFavoriteEventExternal", response);
    }
    return { ok: response.ok, status: response.status };
  } catch (error) {
    console.error("removeFavoriteEventExternal: failed", error);
    return { ok: false, status: 0 };
  }
}
