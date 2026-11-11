import { fetchWithHmac } from "./fetch-wrapper";
import type {
  NewsSummaryResponseDTO,
  NewsDetailResponseDTO,
} from "types/api/news";
import type { FetchNewsParams } from "./news";
import type { CitySummaryResponseDTO } from "types/api/city";
import type { PagedResponseDTO } from "types/api/event";
import { buildNewsQuery, getApiUrl, emptyPagedResponse } from "@utils/api-helpers";
import { parseEventSummaryList } from "@lib/validation/event";
import { contractCatalanPlaceInText } from "@utils/string-helpers";

// IMPORTANT: Do NOT add `next: { revalidate }` to external fetches.
// This creates a separate cache entry for every unique URL.
// Use `cache: "no-store"` (fetchWithHmac default) to avoid unbounded cache growth.
// Internal API routes handle caching via Cache-Control headers instead.

// Backend titles and descriptions say "a El Masnou"; Catalan contracts it.
function withCatalanPlaceArticles<T extends NewsSummaryResponseDTO | NewsDetailResponseDTO>(
  news: T
): T {
  const fix = (text: string) =>
    [news.city?.name, news.region?.name].reduce<string>(
      (result, name) => contractCatalanPlaceInText(result, name),
      text
    );
  return { ...news, title: fix(news.title), description: fix(news.description) };
}

export async function fetchNewsExternal(
  params: FetchNewsParams
): Promise<PagedResponseDTO<NewsSummaryResponseDTO>> {
  const api = getApiUrl();
  try {
    // Use buildNewsQuery with setDefaults=false to match original behavior
    // (only add params if they're defined)
    const query = buildNewsQuery(params, false);
    // No `next: { revalidate }` - uses no-store to avoid cache explosion
    const res = await fetchWithHmac(`${api}/news?${query.toString()}`);
    if (!res.ok) {
      console.error(`fetchNewsExternal: HTTP ${res.status}`);
      return emptyPagedResponse();
    }
    const data = (await res.json()) as PagedResponseDTO<NewsSummaryResponseDTO>;
    return { ...data, content: (data.content ?? []).map(withCatalanPlaceArticles) };
  } catch (error) {
    console.error("fetchNewsExternal: failed", error);
    return emptyPagedResponse();
  }
}

export async function fetchNewsBySlugExternal(
  slug: string
): Promise<NewsDetailResponseDTO | null> {
  const api = getApiUrl();
  try {
    // No `next: { revalidate }` - uses no-store to avoid cache explosion
    const res = await fetchWithHmac(`${api}/news/${encodeURIComponent(slug)}`);
    if (res.status === 404) return null;
    if (!res.ok) {
      console.error("fetchNewsBySlugExternal:", slug, "HTTP", res.status);
      return null;
    }
    const data = (await res.json()) as NewsDetailResponseDTO;
    // Events render with the shared event card, so they get the same parser
    // (drops invalid items, adds image cache keys) as every other event list.
    return {
      ...withCatalanPlaceArticles(data),
      events: parseEventSummaryList(data.events ?? []),
      relatedNews: data.relatedNews?.map(withCatalanPlaceArticles),
    };
  } catch (error) {
    console.error("fetchNewsBySlugExternal:", slug, "failed", error);
    return null;
  }
}

export async function fetchNewsCitiesExternal(
  params: { page?: number; size?: number }
): Promise<PagedResponseDTO<CitySummaryResponseDTO>> {
  const api = getApiUrl();

  try {
    const query = new URLSearchParams();
    if (typeof params.page === "number") query.set("page", String(params.page));
    if (typeof params.size === "number") query.set("size", String(params.size));

    const url = query.toString()
      ? `${api}/news/cities?${query.toString()}`
      : `${api}/news/cities`;

    // No `next: { revalidate }` - uses no-store to avoid cache explosion
    const res = await fetchWithHmac(url);
    if (!res.ok) {
      console.error(`fetchNewsCitiesExternal: HTTP ${res.status}`);
      return emptyPagedResponse();
    }
    return (await res.json()) as PagedResponseDTO<CitySummaryResponseDTO>;
  } catch (error) {
    console.error("fetchNewsCitiesExternal: failed", error);
    return emptyPagedResponse();
  }
}
