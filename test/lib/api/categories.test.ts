import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock modules before importing
vi.mock("@utils/api-helpers", () => ({
  getInternalApiUrl: vi.fn((path: string) =>
    Promise.resolve(`http://localhost:3000${path}`),
  ),
  getVercelProtectionBypassHeaders: vi.fn(() => ({})),
}));

vi.mock("lib/validation/category", () => ({
  parseCategories: vi.fn((data: unknown) => data),
}));

vi.mock("./categories-external", () => ({
  fetchCategoriesExternal: vi.fn(),
  fetchCategoryByIdExternal: vi.fn(),
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

  it("fetchCategories returns empty array when NEXT_PUBLIC_API_URL is missing", async () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    const { fetchCategories } = await import("lib/api/categories");
    const result = await fetchCategories();
    expect(result).toEqual([]);
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

  it("fetchCategoryById returns null on non-OK response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      }),
    );
    const { fetchCategoryById } = await import("lib/api/categories");
    const result = await fetchCategoryById(999);
    expect(result).toBeNull();
  });

  it("fetchCategoryById returns data on success", async () => {
    const mockCategory = { id: 1, name: "Música", slug: "musica" };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockCategory),
      }),
    );
    const { fetchCategoryById } = await import("lib/api/categories");
    const result = await fetchCategoryById(1);
    expect(result).toEqual(mockCategory);
  });

  it("clearCategoriesCaches runs without error", async () => {
    const { clearCategoriesCaches } = await import("lib/api/categories");
    expect(() => clearCategoriesCaches()).not.toThrow();
  });
});
