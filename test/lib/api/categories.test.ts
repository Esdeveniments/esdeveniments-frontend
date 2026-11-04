import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock modules before importing
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: vi.fn(async () => {}),
}));

vi.mock("lib/validation/category", () => ({
  parseCategories: vi.fn((data: unknown) => data),
}));

vi.mock("react", async () => {
  const actual = await vi.importActual("react");
  return {
    ...actual,
    cache: (fn: Function) => fn,
  };
});

describe("lib/api/categories", () => {
  const ENV_BACKUP = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve([
            { id: 1, name: "Música", slug: "musica" },
            { id: 2, name: "Teatre", slug: "teatre" },
          ]),
      }),
    );
  });

  afterEach(() => {
    process.env = { ...ENV_BACKUP };
    vi.restoreAllMocks();
  });

  it("fetchCategories uses fallback API URL when NEXT_PUBLIC_API_URL is missing", async () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    const { fetchCategories } = await import("lib/api/categories");
    const result = await fetchCategories();
    // With getApiUrl() fallback to api-defaults.json, the fetch still works
    expect(result.length).toBeGreaterThan(0);
  });

  it("fetchCategories makes fetch call and returns parsed data", async () => {
    const { fetchCategories } = await import("lib/api/categories");
    const result = await fetchCategories();
    expect(result).toHaveLength(2);
    expect(result[0]).toHaveProperty("slug", "musica");
  });

  it("fetchCategories returns empty array on fetch error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      }),
    );
    const { fetchCategories } = await import("lib/api/categories");
    const result = await fetchCategories();
    expect(result).toEqual([]);
  });

  it("does not cache a failure, so the next call retries", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ id: 1, name: "Música", slug: "musica" }]),
      });
    vi.stubGlobal("fetch", fetchMock);
    const { fetchCategories } = await import("lib/api/categories");
    expect(await fetchCategories()).toEqual([]);
    expect(await fetchCategories()).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("caches a successful list", async () => {
    const { fetchCategories } = await import("lib/api/categories");
    await fetchCategories();
    await fetchCategories();
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it("clearCategoriesCaches runs without error", async () => {
    const { clearCategoriesCaches } = await import("lib/api/categories");
    expect(() => clearCategoriesCaches()).not.toThrow();
  });
});
