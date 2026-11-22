import { cache } from "react";
import { connection } from "next/server";
import { cacheLife, cacheTag } from "next/cache";
import type {
  NewsSummaryResponseDTO,
  NewsDetailResponseDTO,
  FetchNewsParams,
} from "types/api/news";
import type { CitySummaryResponseDTO } from "types/api/city";
import type { PagedResponseDTO } from "types/api/event";
import type { ServerReaderOptions } from "types/api/internal";
import { buildNewsQuery, emptyPagedResponse } from "@utils/api-helpers";
import { addCacheKeyToNewsList } from "@utils/news-cache";
import { newsTag, newsSlugTag } from "../cache/tags";
import { createKeyedCache } from "./cache";
import {
  fetchNewsBySlugExternal,
  fetchNewsCitiesStrictExternal,
  fetchNewsStrictExternal,
} from "./news-external";

// Re-export for backward compatibility
export type { FetchNewsParams } from "types/api/news";

const NEWS_LIST_TTL_MS = 10 * 60 * 1000; // 10 minutes
const NEWS_CITIES_TTL_MS = 60 * 60 * 1000; // 1 hour
const NEWS_DETAIL_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const { cache: newsListCache } = createKeyedCache<
  PagedResponseDTO<NewsSummaryResponseDTO>
>(NEWS_LIST_TTL_MS, { maxEntries: 500, globalKey: "news:list" });

const { cache: newsCitiesCache } = createKeyedCache<
  PagedResponseDTO<CitySummaryResponseDTO>
>(NEWS_CITIES_TTL_MS, { maxEntries: 100, globalKey: "news:cities" });

// Shared across Server Components and GET /api/news/[slug] (24h TTL) to avoid
// incrementing backend article visits on refresh. `storeEmpty: false` ensures a
// genuine 404 is not pinned for 24h if an article is published shortly after.
export const { cache: newsDetailCache } =
  createKeyedCache<NewsDetailResponseDTO | null>(NEWS_DETAIL_TTL_MS, {
    storeEmpty: false,
    maxEntries: 5000,
    globalKey: "news:detail",
  });

export async function fetchNews(
  params: FetchNewsParams,
): Promise<PagedResponseDTO<NewsSummaryResponseDTO>> {
  // Keep the request-time signal fetchWithHmac gives on a cache miss so a warm
  // in-memory cache cannot change what Next.js prerenders.
  await connection();
  const normalized: FetchNewsParams = {
    page: params.page ?? 0,
    size: params.size ?? 100,
    ...(params.place ? { place: params.place } : {}),
  };
  const cacheKey = buildNewsQuery(normalized).toString();
  try {
    return await newsListCache(cacheKey, async () => {
      const data = await fetchNewsStrictExternal(normalized);
      return {
        ...data,
        content: addCacheKeyToNewsList(data.content),
      };
    });
  } catch (e) {
    console.error("Error fetching news:", e);
    return emptyPagedResponse();
  }
}

export async function fetchNewsBySlug(
  slug: string,
  options: ServerReaderOptions = {},
): Promise<NewsDetailResponseDTO | null> {
  // Keep the request-time signal fetchWithHmac gives on a cache miss so a warm
  // in-memory cache cannot change what Next.js prerenders. Outside try/catch so
  // prerender rejections propagate instead of being swallowed as null.
  if (!options.skipConnection) await connection();
  try {
    return await newsDetailCache(slug, () =>
      fetchNewsBySlugExternal(slug, { skipConnection: true }),
    );
  } catch (e) {
    console.error("Error fetching news by slug:", e);
    // Transient failure: re-throw for cached metadata readers so the error is
    // not cached as a null (a real 404 returned above, which is fine to cache).
    if (options.throwOnError) {
      throw e instanceof Error ? e : new Error(String(e));
    }
    return null;
  }
}

export async function fetchNewsCities(params?: {
  page?: number;
  size?: number;
}): Promise<PagedResponseDTO<CitySummaryResponseDTO>> {
  await connection();
  const normalized = params ?? {};
  const cacheKey = `${normalized.page ?? ""}:${normalized.size ?? ""}`;
  try {
    return await newsCitiesCache(cacheKey, () =>
      fetchNewsCitiesStrictExternal(normalized),
    );
  } catch (e) {
    console.error("Error fetching news cities:", e);
    return emptyPagedResponse();
  }
}

// Cached wrapper to deduplicate news fetches within the same request.
// Used by the page component (explicitly dynamic).
export const getNewsBySlug = cache(fetchNewsBySlug);

// Metadata-only reader: calls the backend wrapper directly with
// skipConnection: true so generateMetadata stays prerenderable under
// cacheComponents without looping back through /api/news/[slug].
export async function getNewsBySlugForMetadata(
  slug: string,
): Promise<NewsDetailResponseDTO | null> {
  "use cache";
  cacheTag(newsTag, newsSlugTag(slug));
  const detail = await fetchNewsBySlug(slug, {
    skipConnection: true,
    throwOnError: true,
  });
  if (!detail) {
    // Genuine 404: cache briefly so a newly-published article isn't stuck on
    // "not found" metadata for hours. "minutes" not "seconds" — seconds is a
    // PPR dynamic hole and would re-break the static shell.
    cacheLife("minutes");
    return null;
  }
  cacheLife("hours");
  return detail;
}
