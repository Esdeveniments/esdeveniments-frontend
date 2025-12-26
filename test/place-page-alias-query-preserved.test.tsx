import { describe, expect, test, vi, beforeEach } from "vitest";

vi.mock("next/navigation", () => {
  return {
    redirect: vi.fn(() => {
      throw new Error("NEXT_REDIRECT");
    }),
    notFound: vi.fn(() => {
      throw new Error("NOT_FOUND");
    }),
  };
});

vi.mock("@utils/i18n-seo", () => {
  return {
    getLocaleSafely: vi.fn(async () => "ca"),
    toLocalizedUrl: (url: string) => url,
  };
});

vi.mock("next-intl/server", () => {
  return {
    getTranslations: vi.fn(async () => (key: string) => key),
  };
});

vi.mock("@utils/route-validation", () => {
  return {
    validatePlaceOrThrow: vi.fn(() => undefined),
    validatePlaceForMetadata: vi.fn(() => ({ isValid: true })),
  };
});

vi.mock("@lib/api/categories", () => {
  return {
    fetchCategories: vi.fn(async () => []),
  };
});

vi.mock("@lib/api/news", () => {
  return {
    hasNewsForPlace: vi.fn(async () => false),
  };
});

vi.mock("@lib/helpers/event-fallback", () => {
  return {
    fetchEventsWithFallback: vi.fn(async () => ({
      eventsResponse: { last: true },
      events: [],
      noEventsFound: false,
    })),
  };
});

vi.mock("@utils/helpers", () => {
  return {
    getPlaceTypeAndLabelCached: vi.fn(async () => ({ type: "", label: "X" })),
  };
});

vi.mock("@components/partials/generatePagesData", () => {
  return {
    generatePagesData: vi.fn(async () => ({
      title: "t",
      subTitle: "s",
      metaTitle: "mt",
      metaDescription: "md",
      canonical: "http://example.com/x",
      notFoundTitle: "nf",
      notFoundDescription: "nfd",
    })),
  };
});

vi.mock("@lib/api/events", () => {
  return {
    insertAds: <T,>(events: T[]) => events,
  };
});

vi.mock("types/api/isEventSummaryResponseDTO", () => {
  return {
    isEventSummaryResponseDTO: () => true,
  };
});

vi.mock("@components/partials/seo-meta", () => {
  return {
    buildPageMeta: vi.fn(() => ({})),
    generateItemListStructuredData: vi.fn(() => ({})),
    generateWebPageSchema: vi.fn(() => ({})),
  };
});

vi.mock("@components/partials/PlacePageShell", () => {
  return {
    __esModule: true,
    default: () => null,
  };
});

vi.mock("@lib/api/places", () => {
  return {
    fetchPlaceBySlug: vi.fn(async () => null),
  };
});

vi.mock("@utils/place-alias-or-invalid-redirect", () => {
  return {
    getPlaceAliasOrInvalidPlaceRedirectUrl: vi.fn(),
  };
});

import Page from "app/[place]/page";
import { redirect } from "next/navigation";
import { getPlaceAliasOrInvalidPlaceRedirectUrl } from "@utils/place-alias-or-invalid-redirect";

const redirectMock = vi.mocked(redirect);
const redirectHelperMock = vi.mocked(getPlaceAliasOrInvalidPlaceRedirectUrl);

describe("/[place] alias redirects preserve query", () => {
  beforeEach(() => {
    redirectMock.mockClear();
    redirectHelperMock.mockReset();
  });

  test("passes raw searchParams into alias/invalid redirect helper", async () => {
    const rawSearchParams = { search: "teatre", distance: "10", lat: "1", lon: "2" };

    redirectHelperMock.mockImplementation(async (args) => {
      expect(args.rawSearchParams).toEqual(rawSearchParams);
      return "/ca/barcelona?search=teatre&distance=10&lat=1&lon=2";
    });

    await expect(
      Page({
        params: Promise.resolve({ place: "bcn" }),
        searchParams: Promise.resolve(rawSearchParams),
      })
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectHelperMock).toHaveBeenCalledTimes(1);
    expect(redirectMock).toHaveBeenCalledWith(
      "/ca/barcelona?search=teatre&distance=10&lat=1&lon=2"
    );
  });
});
