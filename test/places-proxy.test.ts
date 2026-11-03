import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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
  });
  afterEach(() => vi.useRealTimers());

  it("returns exists for a known place", async () => {
    fetchPlaceBySlugExternal.mockResolvedValue(places[1]);
    expect(await (await load())("barcelona")).toEqual({ kind: "exists" });
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
    const resolve = await load();
    fetchPlaceBySlugExternal.mockRejectedValueOnce(new Error("HTTP 500"));
    expect(await resolve("a-place")).toEqual({ kind: "unknown" });

    fetchPlaceBySlugExternal.mockResolvedValue(null);
    fetchPlacesAggregatedExternal.mockResolvedValue([]);
    expect(await resolve("b-place")).toEqual({ kind: "unknown" });
  });

  it("fails open when the backend is slow", async () => {
    vi.useFakeTimers();
    fetchPlaceBySlugExternal.mockReturnValue(new Promise(() => {}));
    const pending = (await load())("slow-place");
    await vi.advanceTimersByTimeAsync(2000);
    expect(await pending).toEqual({ kind: "unknown" });
  });
});
