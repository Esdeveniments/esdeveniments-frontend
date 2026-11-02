/**
 * External wrapper template: lib/api/RESOURCE-external.ts
 *
 * Replace RESOURCE / Resource with your names. Mirrors lib/api/categories-external.ts.
 * Only internal routes (app/api/*) and the isBuildPhase branch of lib/api/RESOURCE.ts
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
import { fetchWithHmac } from "lib/api/fetch-wrapper";
// Add buildResourceQuery next to buildEventsQuery in utils/api-helpers.ts.
import { getApiUrl, buildResourceQuery } from "@utils/api-helpers";
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

// Read: never throws, returns a safe empty value.
export async function fetchResourcesExternal(
  params: Record<string, string | number | undefined>,
): Promise<PagedResponseDTO<ResourceSummaryResponseDTO>> {
  const query = buildResourceQuery(params); // URLSearchParams
  try {
    const res = await fetchWithHmac(`${getApiUrl()}/RESOURCE?${query}`);
    if (!res.ok) {
      console.error(`fetchResourcesExternal: HTTP ${res.status}`);
      return EMPTY_PAGE;
    }
    return parsePagedResources(await res.json()) ?? EMPTY_PAGE;
  } catch (error) {
    console.error("fetchResourcesExternal: failed", error);
    return EMPTY_PAGE;
  }
}

export async function fetchResourceBySlugExternal(
  slug: string,
): Promise<ResourceDetailResponseDTO | null> {
  try {
    const res = await fetchWithHmac(
      `${getApiUrl()}/RESOURCE/${encodeURIComponent(slug)}`,
    );
    if (!res.ok) {
      if (res.status !== 404) {
        console.error("fetchResourceBySlugExternal:", slug, "HTTP", res.status);
      }
      return null;
    }
    return parseResourceDetail(await res.json());
  } catch (error) {
    console.error("fetchResourceBySlugExternal:", slug, "failed", error);
    return null;
  }
}

// Mutation: throws with the backend's error text. See lib/api/sponsors-external.ts.
export async function createResourceExternal(
  payload: unknown,
): Promise<ResourceDetailResponseDTO> {
  const res = await fetchWithHmac(`${getApiUrl()}/RESOURCE`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
    skipBodySigning: true, // legacy HMAC signs only timestamp + pathAndQuery
  });
  if (!res.ok) {
    const detail = (await res.text().catch(() => "<unreadable>")).slice(0, 200);
    throw new Error(`createResourceExternal: HTTP ${res.status}, ${detail}`);
  }
  const parsed = parseResourceDetail(await res.json());
  if (!parsed) throw new Error("createResourceExternal: invalid response");
  return parsed;
}
