import { describe, it, expect } from "vitest";
import {
  addCacheKeyToNewsList,
  addCacheKeyToNewsDetail,
} from "@utils/news-cache";
import type {
  NewsSummaryResponseDTO,
  NewsDetailResponseDTO,
} from "types/api/news";

const summary: NewsSummaryResponseDTO = {
  id: "news-1",
  slug: "news-1",
  title: "Weekly highlights",
  description: "Some description",
  imageUrl: "https://cdn.example.com/news.jpg",
  startDate: "2024-01-01",
  endDate: "2024-01-07",
  readingTime: 4,
  visits: 10,
  updatedAt: "2024-01-02T00:00:00Z",
};

describe("addCacheKeyToNewsList", () => {
  it("appends cache keys to news summary images", () => {
    const [result] = addCacheKeyToNewsList([summary]);
    expect(result.imageUrl).toContain("v=2024-01-02T00%3A00%3A00Z");
  });

  it("falls back to slug when updatedAt is missing", () => {
    const item = { ...summary, updatedAt: undefined };
    const [result] = addCacheKeyToNewsList([item]);
    expect(result.imageUrl).toContain("v=news-1");
  });
});

describe("addCacheKeyToNewsDetail", () => {
  it("normalizes images for related events", () => {
    const detail: NewsDetailResponseDTO = {
      id: "detail-1",
      type: "WEEKLY",
      title: "News detail",
      description: "Full description",
      startDate: "2024-01-01",
      endDate: "2024-01-07",
      readingTime: 5,
      visits: 100,
      createdAt: "2024-01-01T00:00:00Z",
      events: [
        {
          id: "event-1",
          hash: "event-hash",
          slug: "event-1",
          title: "Event title",
          type: "FREE",
          url: "https://example.com/event-1",
          description: "Event description",
          imageUrl: "https://cdn.example.com/event.jpg",
          startDate: "2024-01-05",
          endDate: "2024-01-05",
          location: "Barcelona",
          visits: 5,
          origin: "MANUAL",
          categories: [],
        },
      ],
    };

    const result = addCacheKeyToNewsDetail(detail);
    expect(result.events[0].imageUrl).toContain("v=event-hash");
  });
});




