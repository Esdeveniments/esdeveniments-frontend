import { fetchWithHmac } from "./fetch-wrapper";
import type {
  PagedResponseDTO as PagedNewsResponseDTO,
  NewsSummaryResponseDTO,
  NewsDetailResponseDTO,
} from "types/api/news";

export interface FetchNewsParams {
  page?: number;
  size?: number;
  place?: string;
}

export async function fetchNews(
  params: FetchNewsParams
): Promise<PagedNewsResponseDTO<NewsSummaryResponseDTO>> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    return {
      content: [],
      currentPage: 0,
      pageSize: 0,
      totalElements: 0,
      totalPages: 0,
      last: true,
    };
  }

  const query: Partial<FetchNewsParams> = {};
  query.page = typeof params.page === "number" ? params.page : 0;
  query.size = typeof params.size === "number" ? params.size : 100;
  if (params.place) query.place = params.place;

  try {
    const filteredEntries = Object.entries(query)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)]);

    const queryString = new URLSearchParams(
      Object.fromEntries(filteredEntries)
    );
    const finalUrl = `${apiUrl}/news?${queryString}`;

    const response = await fetchWithHmac(finalUrl, { next: { revalidate: 60 } });
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

export async function fetchNewsBySlug(
  slug: string
): Promise<NewsDetailResponseDTO | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    return null;
  }
  try {
    const response = await fetchWithHmac(`${apiUrl}/news/${slug}`, {
      next: { revalidate: 60 },
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
  } catch (e) {
    console.error("Error fetching news by slug:", e);
    return null;
  }
}
