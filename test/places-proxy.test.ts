import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PlaceResponseDTO } from "types/api/place";

const fetchPlaceBySlugExternal = vi.fn();
const fetchPlacesAggregatedExternal = vi.fn();
vi.mock("@lib/api/places-external", () => ({
  fetchPlaceBySlugExternal,
  fetchPlacesAggregatedExternal,
  PLACES_LIST_CACHE_KEY: "places:aggregated",
}));
vi.mock("../lib/api/places-external", () => ({
  fetchPlaceBySlugExternal,
  fetchPlacesAggregatedExternal,
  PLACES_LIST_CACHE_KEY: "places:aggregated",
}));

const places: PlaceResponseDTO[] = [
  { id: 1, type: "CITY", name: "Sant Cugat del Vallès", slug: "sant-cugat-del-valles" },
  { id: 2, type: "CITY", name: "Barcelona", slug: "barcelona" },
];

const load = async () => (await import("@lib/api/places-proxy")).resolvePlaceForProxy;

// A new process: fresh modules and an empty shared cache store (the place
// list lives on globalThis, so resetModules alone keeps it).
function freshProcess() {
  vi.resetModules();
  delete (globalThis as Record<symbol, unknown>)[
    Symbol.for("esdeveniments.cache.slots")
  ];
}

describe("resolvePlaceForProxy", () => {
  beforeEach(() => {
    freshProcess();
    fetchPlaceBySlugExternal.mockReset();
    fetchPlacesAggregatedExternal.mockReset();
    fetchPlacesAggregatedExternal.mockResolvedValue(places);
  });

  it("answers listed places from the cached list, without a per-slug call", async () => {
    expect(await (await load())("barcelona")).toEqual({ kind: "exists" });
    expect(fetchPlaceBySlugExternal).not.toHaveBeenCalled();
  });

  it("looks up places missing from the list (e.g. provinces)", async () => {
    fetchPlaceBySlugExternal.mockResolvedValue({ id: 3, type: "PROVINCE", name: "Girona", slug: "girona" });
    expect(await (await load())("girona")).toEqual({ kind: "exists" });
  });

  it("returns the canonical slug for an alias", async () => {
    fetchPlaceBySlugExternal.mockResolvedValue(null);
    fetchPlacesAggregatedExternal.mockResolvedValue(places);
    expect(await (await load())("santcugatdelvalles")).toEqual({
      kind: "alias",
      slug: "sant-cugat-del-valles",
    });
  });

  it("returns missing for an unknown place", async () => {
    fetchPlaceBySlugExternal.mockResolvedValue(null);
    fetchPlacesAggregatedExternal.mockResolvedValue(places);
    expect(await (await load())("no-such-place")).toEqual({ kind: "missing" });
  });

  it("fails open on errors or an empty place list", async () => {
    fetchPlaceBySlugExternal.mockRejectedValueOnce(new Error("HTTP 500"));
    expect(await (await load())("a-place")).toEqual({ kind: "unknown" });

    freshProcess();
    fetchPlaceBySlugExternal.mockClear();
    fetchPlacesAggregatedExternal.mockRejectedValue(new Error("HTTP 500"));
    expect(await (await load())("c-place")).toEqual({ kind: "unknown" });
    expect(fetchPlaceBySlugExternal).not.toHaveBeenCalled();

    freshProcess();
    fetchPlacesAggregatedExternal.mockResolvedValue([]);
    expect(await (await load())("b-place")).toEqual({ kind: "unknown" });
  });

  it("skips the backend for a while after a failure", async () => {
    vi.useFakeTimers();
    try {
      const resolve = await load();
      fetchPlacesAggregatedExternal.mockRejectedValueOnce(new Error("timeout"));
      expect(await resolve("barcelona")).toEqual({ kind: "unknown" });
      expect(await resolve("barcelona")).toEqual({ kind: "unknown" });
      expect(fetchPlacesAggregatedExternal).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(31_000);
      expect(await resolve("barcelona")).toEqual({ kind: "exists" });
      expect(fetchPlacesAggregatedExternal).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("shares one list call between concurrent cold requests", async () => {
    const resolve = await load();
    const results = await Promise.all([resolve("barcelona"), resolve("barcelona")]);
    expect(results).toEqual([{ kind: "exists" }, { kind: "exists" }]);
    expect(fetchPlacesAggregatedExternal).toHaveBeenCalledTimes(1);
  });

  it("aborts its own per-slug lookup but not the shared list fetch", async () => {
    fetchPlaceBySlugExternal.mockResolvedValue(null);
    await (await load())("no-such-place");
    expect(fetchPlacesAggregatedExternal.mock.calls[0][0]?.signal).toBeUndefined();
    expect(fetchPlaceBySlugExternal.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });

  // The place list is shared with the startup warm-up and fetchPlaces, which
  // run under fetchWithHmac's 10 s timeout. The proxy must still give up at
  // its own deadline, and its deadline must not cut the shared fetch short.
  it("fails open at its deadline when it joins someone else's slow fetch", async () => {
    let finish!: (places: PlaceResponseDTO[]) => void;
    fetchPlacesAggregatedExternal.mockImplementationOnce(
      () => new Promise((resolve) => (finish = resolve)),
    );
    const { warmPlacesCache } = await import("@lib/api/places");
    const warm = warmPlacesCache();

    const start = Date.now();
    expect(await (await load())("barcelona")).toEqual({ kind: "unknown" });
    expect(Date.now() - start).toBeLessThan(2500);

    finish(places);
    await warm;
    const { fetchPlaces } = await import("@lib/api/places");
    expect(await fetchPlaces()).toEqual(places);
    expect(fetchPlacesAggregatedExternal).toHaveBeenCalledTimes(1);
  });

  it("doesn't hand [] to a caller that joins the proxy's fetch", async () => {
    let finish!: (places: PlaceResponseDTO[]) => void;
    fetchPlacesAggregatedExternal.mockImplementationOnce(
      () => new Promise((resolve) => (finish = resolve)),
    );
    const proxyResult = (await load())("barcelona");
    const { fetchPlaces } = await import("@lib/api/places");
    const joined = fetchPlaces();

    expect(await proxyResult).toEqual({ kind: "unknown" });
    finish(places);
    expect(await joined).toEqual(places);
  });
});
