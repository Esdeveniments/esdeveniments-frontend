import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { EventSummaryResponseDTO } from "types/api/event";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async () => (key: string) => key),
}));

vi.mock("@lib/api/favorites-external", () => ({
  listFavoriteEventsByPeriodExternal: vi.fn(),
}));

vi.mock("@components/ui/card/CardServer", () => ({
  default: function CardServerMock() {
    return null;
  },
}));

vi.mock("@components/ui/list", () => ({
  default: function ListMock(_props: { children?: unknown }) {
    return null;
  },
}));

vi.mock("@components/ui/common/noEventsFound", () => ({
  default: function NoEventsFoundMock() {
    return null;
  },
}));

function makeEvent(slug: string): EventSummaryResponseDTO {
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
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("FavoritesEventsSection", () => {
  it("returns null when the backend call fails", async () => {
    const { listFavoriteEventsByPeriodExternal } = await import(
      "@lib/api/favorites-external"
    );
    vi.mocked(listFavoriteEventsByPeriodExternal).mockResolvedValue(null);

    const { default: FavoritesEventsSection } = await import(
      "@components/partials/FavoritesEventsSection"
    );

    const element = await FavoritesEventsSection({
      accessToken: "token",
      status: "past",
    });

    expect(element).toBeNull();
  });

  it("fetches the past period when status is past", async () => {
    const { listFavoriteEventsByPeriodExternal } = await import(
      "@lib/api/favorites-external"
    );
    vi.mocked(listFavoriteEventsByPeriodExternal).mockResolvedValue({
      content: [makeEvent("past-event")],
      currentPage: 0,
      pageSize: 50,
      totalElements: 1,
      totalPages: 1,
      last: true,
    });

    const { default: FavoritesEventsSection } = await import(
      "@components/partials/FavoritesEventsSection"
    );

    const element = await FavoritesEventsSection({
      accessToken: "token",
      status: "past",
    });

    expect(element).not.toBeNull();
    expect(vi.mocked(listFavoriteEventsByPeriodExternal)).toHaveBeenCalledWith(
      "token",
      "past",
      0,
      expect.any(Number)
    );
    if (element) renderToStaticMarkup(element);
  });
});
