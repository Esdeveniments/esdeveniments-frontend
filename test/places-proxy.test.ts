import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PlaceResponseDTO } from "types/api/place";

const fetchPlaceBySlugExternal = vi.fn();
const fetchPlacesAggregatedExternal = vi.fn();
vi.mock("@lib/api/places-external", () => ({
  fetchPlaceBySlugExternal,
  fetchPlacesAggregatedExternal,
}));
vi.mock("../lib/api/places-external", () => ({
  fetchPlaceBySlugExternal,
  fetchPlacesAggregatedExternal,
}));

const places: PlaceResponseDTO[] = [
  { id: 1, type: "CITY", name: "Sant Cugat del Vallès", slug: "sant-cugat-del-valles" },
  { id: 2, type: "CITY", name: "Barcelona", slug: "barcelona" },
];

const load = async () => (await import("@lib/api/places-proxy")).resolvePlaceForProxy;

describe("resolvePlaceForProxy", () => {
  beforeEach(() => {
    vi.resetModules();
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

    vi.resetModules();
    fetchPlaceBySlugExternal.mockClear();
    fetchPlacesAggregatedExternal.mockRejectedValue(new Error("HTTP 500"));
    expect(await (await load())("c-place")).toEqual({ kind: "unknown" });
    expect(fetchPlaceBySlugExternal).not.toHaveBeenCalled();

    vi.resetModules();
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

  it("bounds both backend calls with one abort signal", async () => {
    fetchPlaceBySlugExternal.mockResolvedValue(null);
    await (await load())("no-such-place");
    const listSignal = fetchPlacesAggregatedExternal.mock.calls[0][0].signal;
    expect(listSignal).toBeInstanceOf(AbortSignal);
    expect(fetchPlaceBySlugExternal.mock.calls[0][1].signal).toBe(listSignal);
  });
});
