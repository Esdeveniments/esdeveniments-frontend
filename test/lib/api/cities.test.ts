import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock modules before importing
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: vi.fn(async () => {}),
}));

vi.mock("lib/validation/city", () => ({
  parseCities: vi.fn((data: unknown) => data),
}));

vi.mock("react", async () => {
  const actual = await vi.importActual("react");
  return {
    ...actual,
    cache: (fn: Function) => fn,
  };
});

describe("lib/api/cities", () => {
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
            { id: 1, name: "Granollers", slug: "granollers" },
            { id: 2, name: "Vic", slug: "vic" },
          ]),
      }),
    );
  });

  afterEach(() => {
    process.env = { ...ENV_BACKUP };
    vi.restoreAllMocks();
  });

  it("fetchCities uses fallback API URL when NEXT_PUBLIC_API_URL is missing", async () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    const { fetchCities } = await import("lib/api/cities");
    const result = await fetchCities();
    // With getApiUrl() fallback to api-defaults.json, the fetch still works
    expect(result.length).toBeGreaterThan(0);
  });

  it("fetchCities makes fetch call and returns parsed data", async () => {
    const { fetchCities } = await import("lib/api/cities");
    const result = await fetchCities();
    expect(result).toHaveLength(2);
    expect(result[0]).toHaveProperty("slug", "granollers");
  });

  it("fetchCities returns empty array on fetch error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      }),
    );
    const { fetchCities } = await import("lib/api/cities");
    const result = await fetchCities();
    expect(result).toEqual([]);
  });

  it("does not cache a failure, so the next call retries", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ id: 1, name: "Granollers", slug: "granollers" }]),
      });
    vi.stubGlobal("fetch", fetchMock);
    const { fetchCities } = await import("lib/api/cities");
    expect(await fetchCities()).toEqual([]);
    expect(await fetchCities()).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("caches a successful list", async () => {
    const { fetchCities } = await import("lib/api/cities");
    await fetchCities();
    await fetchCities();
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it("clearCitiesCaches makes the next call fetch again", async () => {
    const { fetchCities, clearCitiesCaches } = await import("lib/api/cities");
    await fetchCities();
    clearCitiesCaches();
    await fetchCities();
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
  });
});
