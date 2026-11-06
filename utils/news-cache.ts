import type { NewsSummaryResponseDTO } from "types/api/news";
import { withImageCacheKey } from "./image-cache";

function normalizeSummaryImage(
  news: NewsSummaryResponseDTO
): NewsSummaryResponseDTO {
  if (!news.imageUrl) {
    return news;
  }

  const cacheKey = news.updatedAt || news.slug || news.id;
  if (!cacheKey) {
    return news;
  }

  return {
    ...news,
    imageUrl: withImageCacheKey(news.imageUrl, cacheKey),
  };
}

export function addCacheKeyToNewsList(
  response: NewsSummaryResponseDTO[]
): NewsSummaryResponseDTO[] {
  return response.map(normalizeSummaryImage);
}
