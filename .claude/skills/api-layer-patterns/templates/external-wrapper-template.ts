/**
 * External wrapper template: lib/api/RESOURCE-external.ts
 *
 * Replace RESOURCE / Resource with your names. Mirrors lib/api/events-external.ts.
 * Only internal routes (app/api/*) and the server reader lib/api/RESOURCE.ts
 * may import this file. Not type-checked by the project (.github is outside tsc).
 *
 * Never add `next: { revalidate, tags }` to fetchWithHmac: it turns on Next's fetch
 * cache with one entry per URL. Cache with Cache-Control in the internal route.
 */
import type {
  ResourceSummaryResponseDTO,
  ResourceDetailResponseDTO,
} from "types/api/RESOURCE";
import type { PagedResponseDTO } from "types/api/event";
import type { SafeFetchResult } from "types/fetch";
import { fetchWithHmac } from "lib/api/fetch-wrapper";
// Add buildResourceQuery next to buildEventsQuery in utils/api-helpers.ts.
import {
  getApiUrl,
  isApiUrlConfigured,
  buildResourceQuery,
} from "@utils/api-helpers";
import {
  parsePagedResources,
  parseResourceDetail,
} from "lib/validation/RESOURCE";

const EMPTY_PAGE: PagedResponseDTO<ResourceSummaryResponseDTO> = {
  content: [],
  currentPage: 0,
  pageSize: 0,
  totalElements: 0,
  totalPages: 0,
  last: true,
};

function failure<T>(error: unknown, status: number): SafeFetchResult<T> {
  const err = error instanceof Error ? error : new Error(String(error));
  return { data: null, error: err, status: status >= 400 ? status : 502 };
}

// Read with status: never throws. The internal route answers non-2xx +
// no-store when data is null, so the CDN never caches an outage.
export async function fetchResourcesExternalResult(
  params: Record<string, string | number | undefined>,
): Promise<SafeFetchResult<PagedResponseDTO<ResourceSummaryResponseDTO>>> {
  const query = buildResourceQuery(params); // URLSearchParams
  try {
    const res = await fetchWithHmac(`${getApiUrl()}/RESOURCE?${query}`);
    if (!res.ok) {
      console.error(`fetchResourcesExternal: HTTP ${res.status}`);
      return failure(new Error(`HTTP ${res.status}`), res.status);
    }
    const data = parsePagedResources(await res.json());
    if (!data) return failure(new Error("invalid payload"), 502);
    return { data, error: null, status: 200 };
  } catch (error) {
    console.error("fetchResourcesExternal: failed", error);
    return failure(error, 502);
  }
}

// Server-only callers that just want a safe empty value.
export async function fetchResourcesExternal(
  params: Record<string, string | number | undefined>,
): Promise<PagedResponseDTO<ResourceSummaryResponseDTO>> {
  const { data } = await fetchResourcesExternalResult(params);
  return data ?? EMPTY_PAGE;
}

// Detail read: status 404 means "not found"; any other null is a failure.
// The detail route and lib/api/RESOURCE.ts treat only status 404 as "not
// found", so a backend error is never cached as missing.
export async function fetchResourceBySlugExternalResult(
  slug: string,
): Promise<SafeFetchResult<ResourceDetailResponseDTO>> {
  try {
    const res = await fetchWithHmac(
      `${getApiUrl()}/RESOURCE/${encodeURIComponent(slug)}`,
    );
    if (!res.ok) {
      if (res.status !== 404) {
        console.error("fetchResourceBySlugExternal:", slug, "HTTP", res.status);
      }
      return failure(new Error(`HTTP ${res.status}`), res.status);
    }
    const data = parseResourceDetail(await res.json());
    if (!data) return failure(new Error("invalid payload"), 502);
    return { data, error: null, status: 200 };
  } catch (error) {
    console.error("fetchResourceBySlugExternal:", slug, "failed", error);
    return failure(error, 502);
  }
}

// Mutation: throws with the backend's error text. See lib/api/sponsors-external.ts.
export async function createResourceExternal(
  payload: unknown,
): Promise<ResourceDetailResponseDTO> {
  // getApiUrl() falls back to the prod default; never send a write there by accident.
  if (!isApiUrlConfigured()) {
    throw new Error("NEXT_PUBLIC_API_URL or API_URL is not set");
  }
  const res = await fetchWithHmac(`${getApiUrl()}/RESOURCE`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
    skipBodySigning: true, // the legacy backend verifies only timestamp + pathAndQuery
  });
  if (!res.ok) {
    const detail = (await res.text().catch(() => "<unreadable>")).slice(0, 200);
    console.error(`createResourceExternal: HTTP ${res.status}, body=${detail}`);
    throw new Error(`createResourceExternal: HTTP ${res.status}, ${detail}`);
  }
  const parsed = parseResourceDetail(await res.json());
  if (!parsed) throw new Error("createResourceExternal: invalid response");
  return parsed;
}
