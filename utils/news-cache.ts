import type {
  NewsSummaryResponseDTO,
  NewsDetailResponseDTO,
  NewsEventItemDTO,
} from "types/api/news";
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

function normalizeEventImage(event: NewsEventItemDTO): NewsEventItemDTO {
  if (!event.imageUrl) {
    return event;
  }

  const cacheKey = event.hash || event.slug || event.id;
  if (!cacheKey) {
    return event;
  }

  return {
    ...event,
    imageUrl: withImageCacheKey(event.imageUrl, cacheKey),
  };
}

export function addCacheKeyToNewsList(
  response: NewsSummaryResponseDTO[]
): NewsSummaryResponseDTO[] {
  return response.map(normalizeSummaryImage);
}

export function addCacheKeyToNewsDetail(
  detail: NewsDetailResponseDTO
): NewsDetailResponseDTO {
  const normalizedEvents = (detail.events || []).map(normalizeEventImage);
  return {
    ...detail,
    events: normalizedEvents,
  };
}




