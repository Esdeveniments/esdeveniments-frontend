import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { connection } from "next/server";

const mockFetchNewsStrictExternal = vi.fn();
const mockFetchNewsBySlugExternal = vi.fn();
const mockFetchNewsCitiesStrictExternal = vi.fn();

vi.mock("@lib/api/news-external", () => ({
  fetchNewsStrictExternal: (...args: unknown[]) =>
    mockFetchNewsStrictExternal(...args),
  fetchNewsBySlugExternal: (...args: unknown[]) =>
    mockFetchNewsBySlugExternal(...args),
  fetchNewsCitiesStrictExternal: (...args: unknown[]) =>
    mockFetchNewsCitiesStrictExternal(...args),
}));

vi.mock("@utils/news-cache", () => ({
  addCacheKeyToNewsList: vi.fn((list: unknown[]) => list),
}));

vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
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
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetchNews returns paged news on success and caches by query", async () => {
    const mockData = {
      content: [
        { id: "1", title: "Notícia 1", slug: "noticia-1" },
        { id: "2", title: "Notícia 2", slug: "noticia-2" },
      ],
      currentPage: 0,
      pageSize: 10,
      totalElements: 2,
      totalPages: 1,
      last: true,
    };
    mockFetchNewsStrictExternal.mockResolvedValue(mockData);

    const { fetchNews } = await import("lib/api/news");
    const first = await fetchNews({ page: 0, size: 10 });
    const second = await fetchNews({ page: 0, size: 10 });

    expect(first.content).toHaveLength(2);
    expect(first.last).toBe(true);
    expect(second).toEqual(first);
    expect(mockFetchNewsStrictExternal).toHaveBeenCalledTimes(1);
    expect(connection).toHaveBeenCalledTimes(2);
  });

  it("fetchNews returns empty paged result on error without caching the failure", async () => {
    const mockData = {
      content: [{ id: "1", title: "Recovered", slug: "recovered" }],
      currentPage: 0,
      pageSize: 100,
      totalElements: 1,
      totalPages: 1,
      last: true,
    };
    mockFetchNewsStrictExternal
      .mockRejectedValueOnce(new Error("HTTP 500"))
      .mockResolvedValueOnce(mockData);

    const { fetchNews } = await import("lib/api/news");
    expect(await fetchNews({ page: 0 })).toEqual(EMPTY_PAGED);
    expect((await fetchNews({ page: 0 })).content).toHaveLength(1);
    expect(mockFetchNewsStrictExternal).toHaveBeenCalledTimes(2);
  });

  it("fetchNewsBySlug returns article on success and caches by slug", async () => {
    const mockArticle = {
      id: "1",
      title: "Test News",
      slug: "test-news",
      description: "content",
    };
    mockFetchNewsBySlugExternal.mockResolvedValue(mockArticle);

    const { fetchNewsBySlug } = await import("lib/api/news");
    const first = await fetchNewsBySlug("test-news");
    const second = await fetchNewsBySlug("test-news");

    expect(first).toEqual(mockArticle);
    expect(second).toEqual(mockArticle);
    expect(mockFetchNewsBySlugExternal).toHaveBeenCalledTimes(1);
    expect(mockFetchNewsBySlugExternal).toHaveBeenCalledWith("test-news", {
      skipConnection: true,
    });
  });

  it("fetchNewsBySlug returns null on 404 without pinning 404 in cache", async () => {
    const publishedArticle = { id: "2", title: "Published", slug: "new-slug" };
    mockFetchNewsBySlugExternal
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(publishedArticle);

    const { fetchNewsBySlug } = await import("lib/api/news");
    expect(await fetchNewsBySlug("new-slug")).toBeNull();
    expect(await fetchNewsBySlug("new-slug")).toEqual(publishedArticle);
    expect(mockFetchNewsBySlugExternal).toHaveBeenCalledTimes(2);
  });

  it("fetchNewsBySlug returns null on error unless throwOnError is set", async () => {
    mockFetchNewsBySlugExternal.mockRejectedValue(new Error("Network failure"));

    const { fetchNewsBySlug } = await import("lib/api/news");
    expect(await fetchNewsBySlug("test")).toBeNull();
    await expect(
      fetchNewsBySlug("test", { throwOnError: true }),
    ).rejects.toThrow("Network failure");
  });

  it("getNewsBySlugForMetadata skips connection() and throws on transient failure", async () => {
    mockFetchNewsBySlugExternal.mockRejectedValueOnce(new Error("HTTP 503"));

    const { getNewsBySlugForMetadata } = await import("lib/api/news");
    await expect(getNewsBySlugForMetadata("test")).rejects.toThrow("HTTP 503");
    expect(connection).not.toHaveBeenCalled();
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
    mockFetchNewsCitiesStrictExternal.mockResolvedValue(mockData);

    const { fetchNewsCities } = await import("lib/api/news");
    const result = await fetchNewsCities({ page: 0, size: 10 });

    expect(result.content).toHaveLength(1);
  });

  it("fetchNewsCities returns empty on error", async () => {
    mockFetchNewsCitiesStrictExternal.mockRejectedValue(new Error("HTTP 500"));

    const { fetchNewsCities } = await import("lib/api/news");
    const result = await fetchNewsCities();

    expect(result).toEqual(EMPTY_PAGED);
  });

  it("GET /api/news/[slug] returns upstream status with no-store on backend outage", async () => {
    const err = Object.assign(new Error("fetchNewsBySlug: HTTP 503"), {
      status: 503,
    });
    mockFetchNewsBySlugExternal.mockRejectedValueOnce(err);

    const { GET } = await import("app/api/news/[slug]/route");
    const response = await GET(new Request("https://example.com/api/news/a"), {
      params: Promise.resolve({ slug: "a" }),
    } as never);

    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
