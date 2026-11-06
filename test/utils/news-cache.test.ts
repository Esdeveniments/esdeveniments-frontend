import { describe, it, expect } from "vitest";
import { addCacheKeyToNewsList } from "@utils/news-cache";
import type { NewsSummaryResponseDTO } from "types/api/news";

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
