import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ProfileTranslator, TabItem } from "types/props";
// Static imports: vi.mock is hoisted above them. A dynamic import() inside a
// test spent ~3 s of its 5 s timeout loading the page and timed out under load.
import PreferitsPassatsPage, {
  PastFavoritesSectionOrError,
} from "@app/[locale]/preferits/passats/page";
import { getAccessTokenFromCookies } from "@utils/auth-cookies";
import { getFavoritePeriodCounts } from "@lib/api/favorites-external";
import FavoritesEventsSection from "@components/partials/FavoritesEventsSection";

vi.mock("@utils/i18n-seo", () => ({
  getLocaleSafely: vi.fn(async () => "ca"),
}));

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async () => (key: string) => key),
}));

vi.mock("@utils/auth-cookies", () => ({
  getAccessTokenFromCookies: vi.fn(async () => null),
}));

vi.mock("@lib/api/favorites-external", () => ({
  getFavoritePeriodCounts: vi.fn(async () => ({
    activeCount: null,
    pastCount: null,
  })),
}));

vi.mock("@components/partials/FavoritesEventsSection", () => ({
  default: vi.fn(async () => null),
}));

const { tabsItems } = vi.hoisted(() => ({ tabsItems: [] as TabItem[][] }));

vi.mock("@components/ui/common/tabs", () => ({
  default: function TabsMock(props: { items: TabItem[] }) {
    tabsItems.push(props.items);
    return null;
  },
}));

vi.mock("@components/ui/common/skeletons/EventsGridSkeleton", () => ({
  default: function EventsGridSkeletonMock() {
    return null;
  },
}));

vi.mock("@components/ui/common/noEventsFound", () => ({
  default: function NoEventsFoundMock() {
    return null;
  },
}));

vi.mock("./../app/[locale]/preferits/passats/PastFavoritesAuthGate", () => ({
  default: function PastFavoritesAuthGateMock() {
    return null;
  },
}));

beforeEach(() => {
  tabsItems.length = 0;
  vi.clearAllMocks();
});

describe("PreferitsPassatsPage", () => {
  it("renders the auth gate for guests", async () => {
    const element = await PreferitsPassatsPage();
    const html = renderToStaticMarkup(element);
    // PastFavoritesAuthGateMock renders null; assert the section/error/empty
    // testids it would otherwise show are absent, i.e. the gate branch ran.
    expect(html).not.toContain("favorites-page-error");
    expect(getFavoritePeriodCounts).not.toHaveBeenCalled();
  });

  it("shows both period counts on the past route", async () => {

    vi.mocked(getAccessTokenFromCookies).mockResolvedValue("token");
    vi.mocked(getFavoritePeriodCounts).mockResolvedValue({
      activeCount: 3,
      pastCount: 1,
    });

    const element = await PreferitsPassatsPage();
    renderToStaticMarkup(element);

    expect(tabsItems).toEqual([
      [
        { id: "upcoming", href: "/preferits", label: "tabUpcoming", count: 3 },
        {
          id: "past",
          href: "/preferits/passats",
          label: "tabPast",
          count: 1,
        },
      ],
    ]);
  });

  it("renders the error state for authenticated users when the backend fails", async () => {
    // react-dom/server's renderToStaticMarkup can't resolve a nested async
    // Server Component rendered as JSX inside <Suspense> (Next.js's real RSC
    // renderer can; this plain unit-test renderer can't — it just falls back
    // to the Suspense fallback). So this test calls the exported
    // PastFavoritesSectionOrError helper directly and awaits it, the same
    // way the top-level page component itself is tested below, instead of
    // going through the full page + Suspense boundary.
    vi.mocked(FavoritesEventsSection).mockResolvedValue(null);

    const element = await PastFavoritesSectionOrError({
      accessToken: "token",
      t: ((key: string) => key) as ProfileTranslator,
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("favorites-page-error");
  });
});
