import { fetchWithHmac } from "./fetch-wrapper";
import { fetchBackendDetailBySlug } from "./detail-external";
import type {
  NewsSummaryResponseDTO,
  NewsDetailResponseDTO,
  FetchNewsParams,
} from "types/api/news";
import type { CitySummaryResponseDTO } from "types/api/city";
import type { PagedResponseDTO } from "types/api/event";
import type { DetailFetchOptions } from "types/api/internal";
import { buildNewsQuery, getApiUrl, emptyPagedResponse } from "@utils/api-helpers";
import { parseNewsDetail, parsePagedNews } from "@lib/validation/news";
import { parsePagedCities } from "@lib/validation/city";

// IMPORTANT: Do NOT add `next: { revalidate }` to external fetches.
// This creates a separate cache entry for every unique URL.
// Use `cache: "no-store"` (fetchWithHmac default) to avoid unbounded cache growth.
// Internal API routes handle caching via Cache-Control headers instead.

async function fetchStrictPaged<T>(
  url: string,
  parse: (json: unknown) => PagedResponseDTO<T> | null,
  label: string,
): Promise<PagedResponseDTO<T>> {
  // No `next: { revalidate }` - uses no-store to avoid cache explosion
  const res = await fetchWithHmac(url);
  if (!res.ok) {
    throw new Error(`${label}: HTTP ${res.status}`);
  }
  const parsed = parse(await res.json());
  if (!parsed) {
    throw new Error(`${label}: invalid payload`);
  }
  return parsed;
}

export function fetchNewsStrictExternal(
  params: FetchNewsParams,
): Promise<PagedResponseDTO<NewsSummaryResponseDTO>> {
  const query = buildNewsQuery(params, false);
  return fetchStrictPaged(
    `${getApiUrl()}/news?${query.toString()}`,
    parsePagedNews,
    "fetchNewsExternal",
  );
}

export async function fetchNewsExternal(
  params: FetchNewsParams,
): Promise<PagedResponseDTO<NewsSummaryResponseDTO>> {
  try {
    return await fetchNewsStrictExternal(params);
  } catch (error) {
    console.error("fetchNewsExternal: failed", error);
    return emptyPagedResponse();
  }
}

export function fetchNewsBySlugExternal(
  slug: string,
  options: DetailFetchOptions = {},
): Promise<NewsDetailResponseDTO | null> {
  return fetchBackendDetailBySlug(
    "news",
    slug,
    parseNewsDetail,
    "fetchNewsBySlugExternal",
    options,
  );
}

export function fetchNewsCitiesStrictExternal(params: {
  page?: number;
  size?: number;
}): Promise<PagedResponseDTO<CitySummaryResponseDTO>> {
  const query = new URLSearchParams();
  if (typeof params.page === "number") query.set("page", String(params.page));
  if (typeof params.size === "number") query.set("size", String(params.size));

  const url = query.toString()
    ? `${getApiUrl()}/news/cities?${query.toString()}`
    : `${getApiUrl()}/news/cities`;

  return fetchStrictPaged(url, parsePagedCities, "fetchNewsCitiesExternal");
}

export async function fetchNewsCitiesExternal(params: {
  page?: number;
  size?: number;
}): Promise<PagedResponseDTO<CitySummaryResponseDTO>> {
  try {
    return await fetchNewsCitiesStrictExternal(params);
  } catch (error) {
    console.error("fetchNewsCitiesExternal: failed", error);
    return emptyPagedResponse();
  }
}
