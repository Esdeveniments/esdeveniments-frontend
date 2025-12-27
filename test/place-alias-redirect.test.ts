import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@utils/place-alias", () => ({
  resolvePlaceSlugAlias: vi.fn(),
}));

vi.mock("@utils/i18n-seo", async () => {
  const actual = await vi.importActual<typeof import("@utils/i18n-seo")>(
    "@utils/i18n-seo"
  );

  return {
    ...actual,
    toLocalizedUrl: vi.fn(
      (path: string, locale: string) => `localized:${locale}:${path}`
    ),
  };
});

import { getPlaceAliasRedirectUrl } from "@utils/place-alias-redirect";
import { resolvePlaceSlugAlias } from "@utils/place-alias";
import { toLocalizedUrl } from "@utils/i18n-seo";

describe("getPlaceAliasRedirectUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when placeExists is true (no alias lookup)", async () => {
    const url = await getPlaceAliasRedirectUrl({
      place: "barcelona",
      placeExists: true,
      locale: "ca",
      rawSearchParams: { search: "jazz" },
      buildTargetPath: (alias) => `/${alias}`,
    });

    expect(url).toBeNull();
    expect(resolvePlaceSlugAlias).not.toHaveBeenCalled();
    expect(toLocalizedUrl).not.toHaveBeenCalled();
  });

  it("returns null when alias cannot be resolved", async () => {
    vi.mocked(resolvePlaceSlugAlias).mockResolvedValueOnce(null);

    const url = await getPlaceAliasRedirectUrl({
      place: "bcn",
      placeExists: false,
      locale: "ca",
      rawSearchParams: { search: "jazz" },
      buildTargetPath: (alias) => `/${alias}/avui`,
    });

    expect(url).toBeNull();
    expect(resolvePlaceSlugAlias).toHaveBeenCalledWith("bcn");
    expect(toLocalizedUrl).not.toHaveBeenCalled();
  });

  it("builds localized URL and preserves query params", async () => {
    vi.mocked(resolvePlaceSlugAlias).mockResolvedValueOnce("barcelona");

    const url = await getPlaceAliasRedirectUrl({
      place: "bcn",
      placeExists: undefined,
      locale: "en",
      rawSearchParams: { search: "jazz", distance: "50" },
      buildTargetPath: (alias) => `/${alias}/avui`,
    });

    expect(resolvePlaceSlugAlias).toHaveBeenCalledWith("bcn");
    expect(toLocalizedUrl).toHaveBeenCalledWith(
      "/barcelona/avui?search=jazz&distance=50",
      "en"
    );
    expect(url).toBe("localized:en:/barcelona/avui?search=jazz&distance=50");
  });

  it("builds localized URL without query when no params provided", async () => {
    vi.mocked(resolvePlaceSlugAlias).mockResolvedValueOnce("barcelona");

    const url = await getPlaceAliasRedirectUrl({
      place: "bcn",
      placeExists: false,
      locale: "ca",
      buildTargetPath: (alias) => `/${alias}`,
    });

    expect(toLocalizedUrl).toHaveBeenCalledWith("/barcelona", "ca");
    expect(url).toBe("localized:ca:/barcelona");
  });

  it("normalizes target paths to start with a leading slash", async () => {
    vi.mocked(resolvePlaceSlugAlias).mockResolvedValueOnce("barcelona");

    const url = await getPlaceAliasRedirectUrl({
      place: "bcn",
      placeExists: false,
      locale: "ca",
      rawSearchParams: { search: "x" },
      buildTargetPath: (alias) => `${alias}/avui`,
    });

    expect(toLocalizedUrl).toHaveBeenCalledWith(
      "/barcelona/avui?search=x",
      "ca"
    );
    expect(url).toBe("localized:ca:/barcelona/avui?search=x");
  });
});
