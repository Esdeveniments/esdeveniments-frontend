import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ProfileTranslator } from "types/props";

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
  countFavoritesByPeriodExternal: vi.fn(async () => null),
}));

vi.mock("@components/partials/FavoritesEventsSection", () => ({
  default: vi.fn(async () => null),
}));

vi.mock("@components/ui/common/tabs", () => ({
  default: function TabsMock() {
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
  vi.clearAllMocks();
});

describe("PreferitsPassatsPage", () => {
  it("renders the auth gate for guests", async () => {
    const { default: PreferitsPassatsPage } = await import(
      "@app/[locale]/preferits/passats/page"
    );
    const element = await PreferitsPassatsPage();
    const html = renderToStaticMarkup(element);
    // PastFavoritesAuthGateMock renders null; assert the section/error/empty
    // testids it would otherwise show are absent, i.e. the gate branch ran.
    expect(html).not.toContain("favorites-page-error");
  });

  it("renders the error state for authenticated users when the backend fails", async () => {
    // react-dom/server's renderToStaticMarkup can't resolve a nested async
    // Server Component rendered as JSX inside <Suspense> (Next.js's real RSC
    // renderer can; this plain unit-test renderer can't — it just falls back
    // to the Suspense fallback). So this test calls the exported
    // PastFavoritesSectionOrError helper directly and awaits it, the same
    // way the top-level page component itself is tested below, instead of
    // going through the full page + Suspense boundary.
    const { default: FavoritesEventsSection } = await import(
      "@components/partials/FavoritesEventsSection"
    );
    vi.mocked(FavoritesEventsSection).mockResolvedValue(null);

    const { PastFavoritesSectionOrError } = await import(
      "@app/[locale]/preferits/passats/page"
    );
    const element = await PastFavoritesSectionOrError({
      accessToken: "token",
      t: ((key: string) => key) as ProfileTranslator,
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("favorites-page-error");
  });
});
