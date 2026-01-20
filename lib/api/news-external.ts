import { fetchWithHmac } from "./fetch-wrapper";
import type {
  PagedResponseDTO as PagedNewsResponseDTO,
  NewsSummaryResponseDTO,
  NewsDetailResponseDTO,
} from "types/api/news";
import type { FetchNewsParams } from "./news";
import type { CitySummaryResponseDTO } from "types/api/city";
import type { PagedResponseDTO } from "types/api/event";
import { buildNewsQuery } from "@utils/api-helpers";

// External fetches use `next: { revalidate }` to allow static generation during build.
// Without this, fetchWithHmac defaults to `cache: "no-store"` which makes routes dynamic.
const NEWS_REVALIDATE = 3600; // 1 hour (same as internal API)

export async function fetchNewsExternal(
  params: FetchNewsParams
): Promise<PagedNewsResponseDTO<NewsSummaryResponseDTO>> {
  const api = process.env.NEXT_PUBLIC_API_URL;
  if (!api) {
    return {
      content: [],
      currentPage: 0,
      pageSize: 0,
      totalElements: 0,
      totalPages: 0,
      last: true,
    };
  }
  try {
    // Use buildNewsQuery with setDefaults=false to match original behavior
    // (only add params if they're defined)
    const query = buildNewsQuery(params, false);
    const res = await fetchWithHmac(`${api}/news?${query.toString()}`, {
      next: { revalidate: NEWS_REVALIDATE, tags: ["news"] },
    });
    if (!res.ok) {
      console.error(`fetchNewsExternal: HTTP ${res.status}`);
      return {
        content: [],
        currentPage: 0,
        pageSize: 0,
        totalElements: 0,
        totalPages: 0,
        last: true,
      };
    }
    return (await res.json()) as PagedNewsResponseDTO<NewsSummaryResponseDTO>;
  } catch (error) {
    console.error("fetchNewsExternal: failed", error);
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

export async function fetchNewsBySlugExternal(
  slug: string
): Promise<NewsDetailResponseDTO | null> {
  const api = process.env.NEXT_PUBLIC_API_URL;
  if (!api) return null;
  try {
    const res = await fetchWithHmac(`${api}/news/${slug}`, {
      next: { revalidate: NEWS_REVALIDATE, tags: ["news", `news:${slug}`] },
    });
    if (res.status === 404) return null;
    if (!res.ok) {
      console.error("fetchNewsBySlugExternal:", slug, "HTTP", res.status);
      return null;
    }
    return (await res.json()) as NewsDetailResponseDTO;
  } catch (error) {
    console.error("fetchNewsBySlugExternal:", slug, "failed", error);
    return null;
  }
}

export async function fetchNewsCitiesExternal(
  params: { page?: number; size?: number }
): Promise<PagedResponseDTO<CitySummaryResponseDTO>> {
  const api = process.env.NEXT_PUBLIC_API_URL;
  if (!api) {
    return {
      content: [],
      currentPage: 0,
      pageSize: 0,
      totalElements: 0,
      totalPages: 0,
      last: true,
    };
  }

  try {
    const query = new URLSearchParams();
    if (typeof params.page === "number") query.set("page", String(params.page));
    if (typeof params.size === "number") query.set("size", String(params.size));

    const url = query.toString()
      ? `${api}/news/cities?${query.toString()}`
      : `${api}/news/cities`;

    const res = await fetchWithHmac(url, {
      next: { revalidate: NEWS_REVALIDATE, tags: ["news", "news:cities"] },
    });
    if (!res.ok) {
      console.error(`fetchNewsCitiesExternal: HTTP ${res.status}`);
      return {
        content: [],
        currentPage: 0,
        pageSize: 0,
        totalElements: 0,
        totalPages: 0,
        last: true,
      };
    }
    return (await res.json()) as PagedResponseDTO<CitySummaryResponseDTO>;
  } catch (error) {
    console.error("fetchNewsCitiesExternal: failed", error);
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
