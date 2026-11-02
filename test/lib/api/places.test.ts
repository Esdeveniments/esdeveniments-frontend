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

  it("fetchPlaces returns empty array when the backend fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));

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

  it("fetchPlaces does not cache a partial list when one endpoint fails", async () => {
    let regionsDown = true;
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (String(url).endsWith("/places/regions") && regionsDown) {
          return Promise.resolve({ ok: false, status: 500 });
        }
        const body = String(url).endsWith("/places/regions")
          ? [{ id: 1, name: "Maresme", slug: "maresme" }]
          : [{ id: 2, name: "Girona", slug: "girona" }];
        return Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
      }),
    );

    const { fetchPlaces } = await import("lib/api/places");
    expect(await fetchPlaces()).toEqual([]);
    regionsDown = false;
    expect(await fetchPlaces()).toHaveLength(2);
  });

  it("fetchPlaceBySlug throws on a server error, so callers can tell it from a 404", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));

    const { fetchPlaceBySlug } = await import("lib/api/places");
    await expect(fetchPlaceBySlug("barcelona")).rejects.toThrow("503");
  });

  it("fetchPlaceBySlug caches a 404 and skips bot-style slugs", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    vi.stubGlobal("fetch", fetchMock);

    const { fetchPlaceBySlug } = await import("lib/api/places");
    expect(await fetchPlaceBySlug("poble-que-no-existeix")).toBeNull();
    expect(await fetchPlaceBySlug("poble-que-no-existeix")).toBeNull();
    expect(await fetchPlaceBySlug("wp-admin.php")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
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

  it("fetchPlaceBySlug does not call the backend for a slug with spaces", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { fetchPlaceBySlug } = await import("lib/api/places");
    expect(await fetchPlaceBySlug("sant cugat")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
