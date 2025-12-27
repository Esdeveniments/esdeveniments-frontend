import { cache } from "react";
import type {
  PagedResponseDTO as PagedNewsResponseDTO,
  NewsSummaryResponseDTO,
  NewsDetailResponseDTO,
  FetchNewsParams,
} from "types/api/news";
import type { CitySummaryResponseDTO } from "types/api/city";
import type { PagedResponseDTO } from "types/api/event";
import {
  getInternalApiUrl,
  buildNewsQuery,
  getVercelProtectionBypassHeaders,
} from "@utils/api-helpers";
import { newsTag, newsPlaceTag, newsSlugTag } from "../cache/tags";
import type { CacheTag } from "types/cache";
import { addCacheKeyToNewsList, addCacheKeyToNewsDetail } from "@utils/news-cache";

// Re-export for backward compatibility
export type { FetchNewsParams } from "types/api/news";

export async function fetchNews(
  params: FetchNewsParams
): Promise<PagedNewsResponseDTO<NewsSummaryResponseDTO>> {
  // Use internal API route for stable caching

  try {
    const queryString = buildNewsQuery(params);
    const finalUrl = await getInternalApiUrl(`/api/news?${queryString}`);

    const tags: CacheTag[] = [newsTag];
    if (params.place) {
      tags.push(newsPlaceTag(params.place));
    }
    const response = await fetch(finalUrl, {
      headers: getVercelProtectionBypassHeaders(),
      next: { revalidate: 60, tags },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data: PagedNewsResponseDTO<NewsSummaryResponseDTO> =
      await response.json();
    return {
      ...data,
      content: addCacheKeyToNewsList(data.content),
    };
  } catch (e) {
    console.error("Error fetching news:", e);
    return {
      content: [],
      currentPage: 0,
      pageSize: 0,
      totalElements: 0,
      totalPages: 0,
      last: true,
    };
  }
}

export async function fetchNewsBySlug(
  slug: string
): Promise<NewsDetailResponseDTO | null> {
  // Internal route
  try {
    const url = await getInternalApiUrl(`/api/news/${slug}`);
    const response = await fetch(url, {
      headers: getVercelProtectionBypassHeaders(),
      next: { revalidate: 60, tags: [newsTag, newsSlugTag(slug)] },
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data: NewsDetailResponseDTO = await response.json();
    return addCacheKeyToNewsDetail(data);
  } catch (e) {
    console.error("Error fetching news by slug:", e);
    return null;
  }
}

export async function fetchNewsCities(params?: {
  page?: number;
  size?: number;
}): Promise<PagedResponseDTO<CitySummaryResponseDTO>> {
  try {
    const query = new URLSearchParams();
    if (typeof params?.page === "number") query.set("page", String(params.page));
    if (typeof params?.size === "number") query.set("size", String(params.size));

    const qs = query.toString();
    const finalUrl = await getInternalApiUrl(
      qs ? `/api/news/cities?${qs}` : `/api/news/cities`
    );

    const response = await fetch(finalUrl, {
      headers: getVercelProtectionBypassHeaders(),
      next: { revalidate: 3600, tags: [newsTag] },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return (await response.json()) as PagedResponseDTO<CitySummaryResponseDTO>;
  } catch (e) {
    console.error("Error fetching news cities:", e);
    return {
      content: [],
      currentPage: 0,
      pageSize: 0,
      totalElements: 0,
      totalPages: 0,
      last: true,
    };
  }
}

// Cached wrapper to deduplicate news fetches within the same request
// Used by both generateMetadata and the page component
export const getNewsBySlug = cache(fetchNewsBySlug);
