import { describe, expect, test, vi, beforeEach } from "vitest";

import { getPlaceAliasOrInvalidPlaceRedirectUrl } from "@utils/place-alias-or-invalid-redirect";

import { getPlaceAliasRedirectUrl } from "@utils/place-alias-redirect";

vi.mock("@utils/place-alias-redirect", () => {
  return {
    getPlaceAliasRedirectUrl: vi.fn(),
  };
});

const getPlaceAliasRedirectUrlMock = vi.mocked(getPlaceAliasRedirectUrl);

describe("getPlaceAliasOrInvalidPlaceRedirectUrl", () => {
  beforeEach(() => {
    getPlaceAliasRedirectUrlMock.mockReset();
  });

  test("returns null for catalunya without calling deps", async () => {
    const fetchPlaceBySlug = vi.fn().mockResolvedValue({});

    const result = await getPlaceAliasOrInvalidPlaceRedirectUrl({
      place: "catalunya",
      locale: "ca",
      rawSearchParams: { search: "teatre" },
      buildTargetPath: (alias) => `/${alias}`,
      buildFallbackUrlForInvalidPlace: () => "/catalunya",
      fetchPlaceBySlug,
    });

    expect(result).toBeNull();
    expect(fetchPlaceBySlug).not.toHaveBeenCalled();
    expect(getPlaceAliasRedirectUrlMock).not.toHaveBeenCalled();
  });

  test("returns alias redirect when place does not exist and alias resolves", async () => {
    const fetchPlaceBySlug = vi.fn().mockResolvedValue(null);
    getPlaceAliasRedirectUrlMock.mockResolvedValue(
      "/ca/barcelona?search=teatre&distance=10"
    );

    const rawSearchParams = { search: "teatre", distance: "10" };

    const result = await getPlaceAliasOrInvalidPlaceRedirectUrl({
      place: "bcn",
      locale: "ca",
      rawSearchParams,
      buildTargetPath: (alias) => `/${alias}`,
      buildFallbackUrlForInvalidPlace: () => "/catalunya",
      fetchPlaceBySlug,
    });

    expect(result).toBe("/ca/barcelona?search=teatre&distance=10");
    expect(getPlaceAliasRedirectUrlMock).toHaveBeenCalledWith({
      place: "bcn",
      placeExists: false,
      locale: "ca",
      rawSearchParams,
      buildTargetPath: expect.any(Function),
    });
  });

  test("returns fallback url when place is invalid and no alias redirect", async () => {
    const fetchPlaceBySlug = vi.fn().mockResolvedValue(null);
    getPlaceAliasRedirectUrlMock.mockResolvedValue(null);

    const buildFallbackUrlForInvalidPlace = vi.fn(() => "/catalunya?search=x");

    const result = await getPlaceAliasOrInvalidPlaceRedirectUrl({
      place: "invalid-place",
      locale: "ca",
      rawSearchParams: { search: "x" },
      buildTargetPath: (alias) => `/${alias}`,
      buildFallbackUrlForInvalidPlace,
      fetchPlaceBySlug,
    });

    expect(result).toBe("/catalunya?search=x");
    expect(buildFallbackUrlForInvalidPlace).toHaveBeenCalledTimes(1);
  });

  test("returns null when place exists", async () => {
    const fetchPlaceBySlug = vi.fn().mockResolvedValue({ slug: "barcelona" });

    const result = await getPlaceAliasOrInvalidPlaceRedirectUrl({
      place: "barcelona",
      locale: "ca",
      rawSearchParams: { search: "x" },
      buildTargetPath: (alias) => `/${alias}`,
      buildFallbackUrlForInvalidPlace: () => "/catalunya",
      fetchPlaceBySlug,
    });

    expect(result).toBeNull();
    expect(getPlaceAliasRedirectUrlMock).not.toHaveBeenCalled();
  });

  test("treats fetch errors as unknown existence and still attempts alias redirect", async () => {
    const fetchPlaceBySlug = vi.fn().mockRejectedValue(new Error("boom"));
    getPlaceAliasRedirectUrlMock.mockResolvedValue("/ca/girona?lat=1&lon=2");

    const rawSearchParams = { lat: "1", lon: "2" };

    const result = await getPlaceAliasOrInvalidPlaceRedirectUrl({
      place: "gerona",
      locale: "ca",
      rawSearchParams,
      buildTargetPath: (alias) => `/${alias}`,
      buildFallbackUrlForInvalidPlace: () => "/catalunya",
      fetchPlaceBySlug,
    });

    expect(result).toBe("/ca/girona?lat=1&lon=2");
    expect(getPlaceAliasRedirectUrlMock).toHaveBeenCalledWith({
      place: "gerona",
      placeExists: undefined,
      locale: "ca",
      rawSearchParams,
      buildTargetPath: expect.any(Function),
    });
  });
});
