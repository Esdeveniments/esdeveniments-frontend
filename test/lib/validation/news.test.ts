import { describe, expect, it, vi, beforeEach } from "vitest";
import { parseNewsDetail, parsePagedNews } from "@lib/validation/news";

// Trimmed from real GET /news and GET /news/{slug} payloads (11 Nov 2026).
const masnou = {
  id: 71,
  name: "El Masnou",
  slug: "el-masnou",
  latitude: 41.482766,
  longitude: 2.311523,
  postalCode: "08320",
  enabled: true,
};
const maresme = { id: 9, name: "Maresme", slug: "maresme" };
const summary = {
  id: "9dc507c4-30ce-42c4-b813-4bee245ec978",
  title: "Què fer la setmana del 9 al 13 de novembre del 2026 a El Masnou",
  startDate: "2026-11-09",
  endDate: "2026-11-13",
  description: "A El Masnou, del 9 al 13 de novembre de 2026, hi trobaràs activitats.",
  imageUrl: "https://cdn.example.com/news.jpg",
  readingTime: 4,
  visits: 12,
  slug: "que-fer-la-setmana-del-9-al-13-de-novembre-del-2026-a-el-masnou-9dc507c4",
  city: masnou,
  region: maresme,
};
const page = {
  currentPage: 0,
  pageSize: 10,
  totalElements: 2,
  totalPages: 1,
  last: true,
};

describe("parsePagedNews", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("contracts the place article and drops invalid items", () => {
    const result = parsePagedNews({
      ...page,
      content: [summary, { id: "broken" }],
    });

    expect(result?.content).toHaveLength(1);
    expect(result?.content[0].title).toBe(
      "Què fer la setmana del 9 al 13 de novembre del 2026 al Masnou"
    );
    expect(result?.content[0].description).toBe(
      "Al Masnou, del 9 al 13 de novembre de 2026, hi trobaràs activitats."
    );
    expect(result?.totalElements).toBe(2);
  });

  it("returns null for a broken page", () => {
    expect(parsePagedNews({ content: "oops" })).toBeNull();
  });
});

describe("parseNewsDetail", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  const { slug: _slug, imageUrl: _imageUrl, ...detailFields } = summary;
  const detail = {
    ...detailFields,
    type: "WEEKLY",
    createdAt: "2026-11-09T06:00:12.12",
    province: { id: 2, name: "Barcelona", slug: "barcelona-provincia" },
    events: [{ id: "broken-event" }],
    relatedNews: [{ ...summary, imageUrl: null }, { id: "broken" }],
  };

  it("contracts the place article in the article and its related news", () => {
    const result = parseNewsDetail(detail);

    expect(result?.title).toBe(
      "Què fer la setmana del 9 al 13 de novembre del 2026 al Masnou"
    );
    expect(result?.events).toEqual([]);
    expect(result?.relatedNews).toHaveLength(1);
    expect(result?.relatedNews?.[0].title).toBe(
      "Què fer la setmana del 9 al 13 de novembre del 2026 al Masnou"
    );
  });

  it("returns null for a broken article", () => {
    expect(parseNewsDetail({ ...detail, title: 42 })).toBeNull();
  });
});
