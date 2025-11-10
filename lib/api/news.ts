import { cache } from "react";
import type {
  PagedResponseDTO as PagedNewsResponseDTO,
  NewsSummaryResponseDTO,
  NewsDetailResponseDTO,
} from "types/api/news";
import { createKeyedCache } from "./cache";
import { getInternalApiUrl } from "@utils/api-helpers";
import { newsTag, newsPlaceTag, newsSlugTag } from "../cache/tags";
import type { CacheTag } from "types/cache";

export interface FetchNewsParams {
  page?: number;
  size?: number;
  place?: string;
}

// Cache for checking if place has news (24h TTL)
const placeHasNewsCache = createKeyedCache<boolean>(86400000);

export async function fetchNews(
  params: FetchNewsParams
): Promise<PagedNewsResponseDTO<NewsSummaryResponseDTO>> {
  // Use internal API route for stable caching

  const query: Partial<FetchNewsParams> = {};
  query.page = typeof params.page === "number" ? params.page : 0;
  query.size = typeof params.size === "number" ? params.size : 100;
  if (params.place) query.place = params.place;

  try {
    const filteredEntries = Object.entries(query)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)]);

    const queryString = new URLSearchParams(Object.fromEntries(filteredEntries));
    const finalUrl = getInternalApiUrl(`/api/news?${queryString}`);

    const tags: CacheTag[] = [newsTag];
    if (params.place) {
      tags.push(newsPlaceTag(params.place));
    }
    const response = await fetch(finalUrl, {
      next: { revalidate: 60, tags },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
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

/**
 * Lightweight check if a place has any news articles.
 * Cached for 24h to minimize API calls.
 * @param place - The place slug to check
 * @returns boolean indicating if the place has news
 */
export async function hasNewsForPlace(place: string): Promise<boolean> {
  // Catalunya always has news (main news page)
  if (place === "catalunya" || !place) {
    return true;
  }

  // Internal route; if errors, return false

  return placeHasNewsCache(place, async () => {
    try {
      // Fetch only 1 item to check existence
      const queryString = new URLSearchParams({
        page: "0",
        size: "1",
        place,
      });
      const finalUrl = getInternalApiUrl(`/api/news?${queryString}`);

      const response = await fetch(finalUrl, {
        next: { revalidate: 3600, tags: [newsTag, newsPlaceTag(place)] },
      });
      if (!response.ok) {
        return false;
      }
      const data: PagedNewsResponseDTO<NewsSummaryResponseDTO> =
        await response.json();
      return data.content.length > 0;
    } catch (e) {
      console.error("Error checking news for place:", place, e);
      return false;
    }
  });
}

export async function fetchNewsBySlug(
  slug: string
): Promise<NewsDetailResponseDTO | null> {
  // Internal route
  try {
    const response = await fetch(getInternalApiUrl(`/api/news/${slug}`), {
      next: { revalidate: 60, tags: [newsTag, newsSlugTag(slug)] },
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
  } catch (e) {
    console.error("Error fetching news by slug:", e);
    return null;
  }
}

// Cached wrapper to deduplicate news fetches within the same request
// Used by both generateMetadata and the page component
export const getNewsBySlug = cache(fetchNewsBySlug);
