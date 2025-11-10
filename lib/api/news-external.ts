import { fetchWithHmac } from "./fetch-wrapper";
import type {
  PagedResponseDTO as PagedNewsResponseDTO,
  NewsSummaryResponseDTO,
  NewsDetailResponseDTO,
} from "types/api/news";

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
  const query = new URLSearchParams();
  if (typeof params.page === "number") query.set("page", String(params.page));
  if (typeof params.size === "number") query.set("size", String(params.size));
  if (params.place) query.set("place", params.place);
  const res = await fetchWithHmac(`${api}/news?${query.toString()}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as PagedNewsResponseDTO<NewsSummaryResponseDTO>;
}

export async function fetchNewsBySlugExternal(
  slug: string
): Promise<NewsDetailResponseDTO | null> {
  const api = process.env.NEXT_PUBLIC_API_URL;
  if (!api) return null;
  const res = await fetchWithHmac(`${api}/news/${slug}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as NewsDetailResponseDTO;
}

