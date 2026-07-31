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

// Backend contract confirmed live on PRE (LESSONS.md: "The profile events
// endpoint takes period=active|past, not status=upcoming|past"): `period` is
// required on this endpoint too, or the backend returns HTTP 500
// "Required request parameter 'period' ... is not present". There's no
// "all periods" value, and MAX_FAVORITES-sized single-page callers (route.ts,
// preferits/page.tsx) need both active and past items in one merged list —
// the page renders active events and separately prunes expired ones — so
// fetch both periods and merge rather than picking one.
async function fetchFavoritesPeriod(
  base: string,
  accessToken: string,
  period: "active" | "past",
  page: number,
  size: number
): Promise<FavoriteEventsPageDTO | null> {
  try {
    const query = new URLSearchParams({
      page: String(page),
      size: String(size),
      period,
    }).toString();
    const response = await fetchWithHmac(`${base}?${query}`, {
      headers: authHeaders(accessToken),
    });
    if (!response.ok) {
      await logBackendError(`listFavoriteEventsExternal(period=${period})`, response);
      return null;
    }
    return parseFavoriteEventsPage(await response.json());
  } catch (error) {
    console.error(`listFavoriteEventsExternal(period=${period}): failed`, error);
    return null;
  }
}

export async function listFavoriteEventsExternal(
  accessToken: string,
  page = 0,
  size = 50
): Promise<FavoriteEventsPageDTO | null> {
  const base = favoritesBaseUrl();
  if (!base) return null;

  const [activePage, pastPage] = await Promise.all([
    fetchFavoritesPeriod(base, accessToken, "active", page, size),
    fetchFavoritesPeriod(base, accessToken, "past", page, size),
  ]);
  // Either leg failing means the list is incomplete — surface unavailable
  // rather than a partial list that looks complete.
  if (activePage === null || pastPage === null) return null;

  return {
    content: [...activePage.content, ...pastPage.content],
    currentPage: page,
    pageSize: size,
    totalElements: activePage.totalElements + pastPage.totalElements,
    totalPages: Math.max(activePage.totalPages, pastPage.totalPages),
    last: activePage.last && pastPage.last,
  };
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
