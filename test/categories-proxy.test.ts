import { describe, it, expect, vi, beforeEach } from "vitest";

const fetchCategoriesExternal = vi.fn();
vi.mock("../lib/api/categories-external", () => ({ fetchCategoriesExternal }));

const teatre = { id: 1, name: "Teatre", slug: "teatre" };

const load = async () =>
  (await import("@lib/api/categories-proxy")).getCategoriesForProxy;

describe("getCategoriesForProxy", () => {
  beforeEach(() => {
    vi.resetModules();
    fetchCategoriesExternal.mockReset();
  });

  it("returns the categories and caches the list", async () => {
    fetchCategoriesExternal.mockResolvedValue([teatre]);
    const getCategories = await load();
    expect(await getCategories()).toEqual([teatre]);
    await getCategories();
    expect(fetchCategoriesExternal).toHaveBeenCalledTimes(1);
  });

  it("fails open on an empty list and backs off", async () => {
    vi.useFakeTimers();
    try {
      fetchCategoriesExternal.mockResolvedValueOnce([]);
      const getCategories = await load();
      expect(await getCategories()).toBeNull();
      expect(await getCategories()).toBeNull();
      expect(fetchCategoriesExternal).toHaveBeenCalledTimes(1);

      fetchCategoriesExternal.mockResolvedValue([teatre]);
      vi.advanceTimersByTime(31_000);
      expect(await getCategories()).toEqual([teatre]);
    } finally {
      vi.useRealTimers();
    }
  });
});
