import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("next/cache", () => ({
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}));

vi.mock("@utils/api-helpers", () => ({
  getInternalApiUrl: vi.fn((path: string) =>
    Promise.resolve(`http://localhost:3000${path}`),
  ),
  getVercelProtectionBypassHeaders: vi.fn(() => ({})),
}));

import {
  fetchPlaceBySlugForMetadata,
  fetchRegionsWithCitiesForMetadata,
  getPlaceTypeAndLabelForMetadata,
} from "@lib/seo/place-metadata";

describe("fetchPlaceBySlugForMetadata", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the parsed place on success", async () => {
    const place = { id: 1, type: "CITY", name: "Sabadell", slug: "sabadell" };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: () => Promise.resolve(place),
      }),
    );
    const result = await fetchPlaceBySlugForMetadata("sabadell");
    expect(result).toEqual(place);
  });

  it("returns null on a 404", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ status: 404, ok: false }),
    );
    const result = await fetchPlaceBySlugForMetadata("nonexistent");
    expect(result).toBeNull();
  });

  it("throws on a non-404 error response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ status: 500, ok: false }),
    );
    await expect(fetchPlaceBySlugForMetadata("sabadell")).rejects.toThrow(
      "HTTP 500",
    );
  });
});

describe("fetchRegionsWithCitiesForMetadata", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the parsed regions on success", async () => {
    const regions = [{ id: 1, name: "Vallès Occidental", cities: [] }];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(regions),
      }),
    );
    const result = await fetchRegionsWithCitiesForMetadata();
    expect(result).toEqual(regions);
  });

  it("degrades to an empty array on a non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500 }),
    );
    const result = await fetchRegionsWithCitiesForMetadata();
    expect(result).toEqual([]);
  });
});

describe("getPlaceTypeAndLabelForMetadata", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ status: 404, ok: false }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns Catalunya for an empty place without any fetch", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockClear();
    const result = await getPlaceTypeAndLabelForMetadata("");
    expect(result).toEqual({ type: "region", label: "Catalunya" });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("falls back to a dehyphenated slug when the place and regions lookups both miss", async () => {
    const result = await getPlaceTypeAndLabelForMetadata("some-town");
    expect(result).toEqual({ type: "town", label: "Some Town" });
  });
});
