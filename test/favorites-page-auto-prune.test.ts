import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const autoPruneProps: Array<{ slugsToRemove: string[] }> = [];

vi.mock("@utils/i18n-seo", () => ({
  getLocaleSafely: vi.fn(async () => "ca"),
}));

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async () => (key: string) => key),
}));

vi.mock("@utils/favorites", () => ({
  MAX_FAVORITES: 50,
  getFavoritesFromCookies: vi.fn(async () => [] as string[]),
}));

vi.mock("@utils/event-helpers", () => ({
  filterActiveEvents: vi.fn((events: unknown[]) => events),
  isEventActive: vi.fn((_event: unknown) => true),
}));

vi.mock("@lib/api/events", () => ({
  fetchEventBySlugWithStatus: vi.fn(async (_slug: string) => ({
    event: null,
    notFound: false,
  })),
}));

vi.mock("@components/ui/card/CardServer", () => ({
  default: function CardServerMock() {
    return null;
  },
}));

vi.mock("@components/ui/list", () => ({
  default: function ListMock(props: { children?: unknown }) {
    return React.createElement("div", null, props.children);
  },
}));

vi.mock("@components/ui/common/noEventsFound", () => ({
  default: function NoEventsFoundMock() {
    return null;
  },
}));

vi.mock("@components/ui/hybridEventsList/HeadingLayout", () => ({
  default: function HeadingLayoutMock() {
    return null;
  },
}));

vi.mock("@components/partials/seo-meta", () => ({
  buildPageMeta: vi.fn(() => ({})),
}));

vi.mock("./../app/preferits/FavoritesAutoPrune", () => ({
  default: function FavoritesAutoPruneMock(props: { slugsToRemove: string[] }) {
    autoPruneProps.push({ slugsToRemove: props.slugsToRemove });
    return null;
  },
}));

function createEventDetail(slug: string) {
  return {
    id: `id-${slug}`,
    hash: `hash-${slug}`,
    slug,
    title: `Title ${slug}`,
    type: "FREE" as const,
    url: "https://example.com",
    description: "desc",
    imageUrl: "https://example.com/img.jpg",
    startDate: "2030-01-01",
    startTime: null,
    endDate: "2030-01-02",
    endTime: null,
    location: "loc",
    visits: 0,
    origin: "MANUAL" as const,
    categories: [],
    city: {
      id: 1,
      name: "City",
      slug: "city",
      latitude: 0,
      longitude: 0,
      postalCode: "00000",
      rssFeed: null,
      enabled: true,
    },
    region: { id: 1, name: "Region", slug: "region" },
    province: { id: 1, name: "Province", slug: "province" },
  };
}

describe("Favorites page auto-prune", () => {
  beforeEach(() => {
    autoPruneProps.length = 0;
    vi.clearAllMocks();
  });

  it("includes 404 (deleted) slugs in auto-prune", async () => {
    const { getFavoritesFromCookies } = await import("@utils/favorites");
    const { fetchEventBySlugWithStatus } = await import("@lib/api/events");
    const { filterActiveEvents, isEventActive } = await import(
      "@utils/event-helpers"
    );

    const deletedSlug = "deleted-slug";
    const expiredSlug = "expired-slug";
    const okSlug = "ok-slug";
    const transientSlug = "transient-slug";

    const expiredEvent = createEventDetail(expiredSlug);
    const okEvent = createEventDetail(okSlug);

    vi.mocked(getFavoritesFromCookies).mockResolvedValue([
      deletedSlug,
      expiredSlug,
      okSlug,
      transientSlug,
    ]);

    vi.mocked(fetchEventBySlugWithStatus).mockImplementation(async (slug) => {
      if (slug === deletedSlug) return { event: null, notFound: true };
      if (slug === transientSlug) return { event: null, notFound: false };
      if (slug === expiredSlug) return { event: expiredEvent, notFound: false };
      if (slug === okSlug) return { event: okEvent, notFound: false };
      return { event: null, notFound: false };
    });

    vi.mocked(isEventActive).mockImplementation((event: unknown) => {
      const e = event as { slug?: string };
      return e.slug === okSlug;
    });

    vi.mocked(filterActiveEvents).mockImplementation((events: unknown[]) => {
      return events.filter((event) => (event as { slug?: string }).slug === okSlug);
    });

    const { default: FavoritsPage } = await import("@app/preferits/page");
    await FavoritsPage();

    expect(autoPruneProps).toHaveLength(1);
    expect(new Set(autoPruneProps[0].slugsToRemove)).toEqual(
      new Set([deletedSlug, expiredSlug])
    );
  });

  it("does not prune non-404 failures", async () => {
    const { getFavoritesFromCookies } = await import("@utils/favorites");
    const { fetchEventBySlugWithStatus } = await import("@lib/api/events");
    const { filterActiveEvents } = await import("@utils/event-helpers");

    const transientSlug = "transient-slug";
    const okSlug = "ok-slug";
    const okEvent = createEventDetail(okSlug);

    vi.mocked(getFavoritesFromCookies).mockResolvedValue([
      transientSlug,
      transientSlug,
      okSlug,
    ]);

    vi.mocked(fetchEventBySlugWithStatus).mockImplementation(async (slug) => {
      if (slug === transientSlug) return { event: null, notFound: false };
      if (slug === okSlug) return { event: okEvent, notFound: false };
      return { event: null, notFound: false };
    });

    vi.mocked(filterActiveEvents).mockImplementation((events: unknown[]) => events);

    const { default: FavoritsPage } = await import("@app/preferits/page");
    await FavoritsPage();

    expect(autoPruneProps).toHaveLength(1);
    expect(autoPruneProps[0].slugsToRemove).toEqual([]);
  });
});
