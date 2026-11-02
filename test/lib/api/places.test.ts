import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: vi.fn(async () => {}),
}));

vi.mock("react", async () => {
  const actual = await vi.importActual("react");
  return {
    ...actual,
    cache: (fn: Function) => fn,
  };
});

describe("lib/api/places", () => {
  const ENV_BACKUP = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com";
  });

  afterEach(() => {
    process.env = { ...ENV_BACKUP };
    vi.restoreAllMocks();
  });

  it("fetchPlaceBySlug returns place data on success", async () => {
    const mockPlace = {
      id: 1,
      name: "Barcelona",
      slug: "barcelona",
      type: "CITY",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockPlace),
      }),
    );

    const { fetchPlaceBySlug } = await import("lib/api/places");
    const result = await fetchPlaceBySlug("barcelona");
    expect(result).toEqual(mockPlace);
  });

  it("fetchPlaceBySlug returns null on 404", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      }),
    );

    const { fetchPlaceBySlug } = await import("lib/api/places");
    const result = await fetchPlaceBySlug("nonexistent");
    expect(result).toBeNull();
  });

  it("fetchPlaces returns empty array when NEXT_PUBLIC_API_URL is missing", async () => {
    delete process.env.NEXT_PUBLIC_API_URL;

    const { fetchPlaces } = await import("lib/api/places");
    const result = await fetchPlaces();
    expect(result).toEqual([]);
  });

  it("fetchPlaces merges regions and cities from the backend", async () => {
    const byUrl = (url: string) =>
      url.endsWith("/places/regions")
        ? [{ id: 1, name: "Maresme", slug: "maresme" }]
        : [{ id: 2, name: "Girona", slug: "girona" }];
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) =>
        Promise.resolve({ ok: true, json: () => Promise.resolve(byUrl(String(url))) }),
      ),
    );

    const { fetchPlaces } = await import("lib/api/places");
    const result = await fetchPlaces();
    expect(result).toEqual([
      { id: 1, name: "Maresme", slug: "maresme", type: "REGION" },
      { id: 2, name: "Girona", slug: "girona", type: "CITY" },
    ]);
  });

  it("fetchPlaces does not cache a failure, so the next call retries", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ id: 2, name: "Girona", slug: "girona" }]),
      });
    vi.stubGlobal("fetch", fetchMock);

    const { fetchPlaces } = await import("lib/api/places");
    expect(await fetchPlaces()).toEqual([]);
    expect(await fetchPlaces()).toHaveLength(1);
  });

  it("fetchPlaces returns empty array on fetch error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      }),
    );

    const { fetchPlaces } = await import("lib/api/places");
    const result = await fetchPlaces();
    expect(result).toEqual([]);
  });

  it("clearPlacesCaches runs without error", async () => {
    const { clearPlacesCaches } = await import("lib/api/places");
    expect(() => clearPlacesCaches()).not.toThrow();
  });

  it("fetchPlaceBySlug encodes slug in URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ id: 1, name: "Sant Cugat", slug: "sant-cugat" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { fetchPlaceBySlug } = await import("lib/api/places");
    await fetchPlaceBySlug("sant cugat");

    // Verify the URL was encoded
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("sant%20cugat"),
      expect.anything(),
    );
  });
});
