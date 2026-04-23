import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@utils/api-helpers", () => ({
  getInternalApiUrl: vi.fn((path: string) =>
    Promise.resolve(`http://localhost:3000${path}`),
  ),
  buildNewsQuery: vi.fn((params: Record<string, unknown>) =>
    new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]),
    ).toString(),
  ),
  getVercelProtectionBypassHeaders: vi.fn(() => ({})),
}));

vi.mock("@utils/news-cache", () => ({
  addCacheKeyToNewsList: vi.fn((list: unknown[]) => list),
  addCacheKeyToNewsDetail: vi.fn((detail: unknown) => detail),
}));

vi.mock("../cache/tags", () => ({
  newsTag: "news",
  newsPlaceTag: (p: string) => `news:${p}`,
  newsSlugTag: (s: string) => `news:slug:${s}`,
}));

vi.mock("react", async () => {
  const actual = await vi.importActual("react");
  return {
    ...actual,
    cache: (fn: Function) => fn,
  };
});

const EMPTY_PAGED = {
  content: [],
  currentPage: 0,
  pageSize: 0,
  totalElements: 0,
  totalPages: 0,
  last: true,
};

describe("lib/api/news", () => {
  const ENV_BACKUP = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com";
  });

  afterEach(() => {
    process.env = { ...ENV_BACKUP };
    vi.restoreAllMocks();
  });

  it("fetchNews returns paged news on success", async () => {
    const mockData = {
      content: [
        { id: 1, title: "Notícia 1", slug: "noticia-1" },
        { id: 2, title: "Notícia 2", slug: "noticia-2" },
      ],
      currentPage: 0,
      pageSize: 10,
      totalElements: 2,
      totalPages: 1,
      last: true,
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      }),
    );

    const { fetchNews } = await import("lib/api/news");
    const result = await fetchNews({ page: 0, size: 10 });

    expect(result.content).toHaveLength(2);
    expect(result.last).toBe(true);
  });

  it("fetchNews returns empty paged result on error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      }),
    );

    const { fetchNews } = await import("lib/api/news");
    const result = await fetchNews({ page: 0 });

    expect(result).toEqual(EMPTY_PAGED);
  });

  it("fetchNews returns empty paged result on network error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network failure")),
    );

    const { fetchNews } = await import("lib/api/news");
    const result = await fetchNews({ page: 0 });

    expect(result).toEqual(EMPTY_PAGED);
  });

  it("fetchNewsBySlug returns article on success", async () => {
    const mockArticle = {
      id: 1,
      title: "Test News",
      slug: "test-news",
      body: "content",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockArticle),
      }),
    );

    const { fetchNewsBySlug } = await import("lib/api/news");
    const result = await fetchNewsBySlug("test-news");

    expect(result).toEqual(mockArticle);
  });

  it("fetchNewsBySlug returns null on 404", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      }),
    );

    const { fetchNewsBySlug } = await import("lib/api/news");
    const result = await fetchNewsBySlug("nonexistent");

    expect(result).toBeNull();
  });

  it("fetchNewsBySlug returns null on network error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network failure")),
    );

    const { fetchNewsBySlug } = await import("lib/api/news");
    const result = await fetchNewsBySlug("test");

    expect(result).toBeNull();
  });

  it("fetchNewsCities returns paged cities on success", async () => {
    const mockData = {
      content: [{ id: 1, name: "Barcelona", slug: "barcelona" }],
      currentPage: 0,
      pageSize: 10,
      totalElements: 1,
      totalPages: 1,
      last: true,
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      }),
    );

    const { fetchNewsCities } = await import("lib/api/news");
    const result = await fetchNewsCities({ page: 0, size: 10 });

    expect(result.content).toHaveLength(1);
  });

  it("fetchNewsCities returns empty on error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      }),
    );

    const { fetchNewsCities } = await import("lib/api/news");
    const result = await fetchNewsCities();

    expect(result).toEqual(EMPTY_PAGED);
  });
});
