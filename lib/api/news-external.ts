import { fetchWithHmac } from "./fetch-wrapper";
import { buildNewsQuery } from "@utils/api-helpers";
import type {
  PagedResponseDTO as PagedNewsResponseDTO,
  NewsSummaryResponseDTO,
  NewsDetailResponseDTO,
} from "types/api/news";
import type { FetchNewsParams } from "@lib/api/news";

export interface FetchNewsParamsExternal {
  page?: number;
  size?: number;
  place?: string;
}

export async function fetchNewsExternal(
  params: FetchNewsParamsExternal
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
    const query = buildNewsQuery(params as FetchNewsParams, false);
    const res = await fetchWithHmac(`${api}/news?${query.toString()}`);
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
    const res = await fetchWithHmac(`${api}/news/${slug}`);
    if (res.status === 404) return null;
    if (!res.ok) {
      console.error(`fetchNewsBySlugExternal(${slug}): HTTP ${res.status}`);
      return null;
    }
    return (await res.json()) as NewsDetailResponseDTO;
  } catch (error) {
    console.error(`fetchNewsBySlugExternal(${slug}): failed`, error);
    return null;
  }
}

