// Component test for PlacePageExploreNav's gating + visibility contract.
//
// This replaces the live-preview e2e (e2e/place-page-explore-nav.spec.ts),
// which asserted the nav against uncontrolled backend data. After #313 made
// the nav conditional on a place having >= SITEMAP_MIN_EVENTS_FOR_EXPANSION
// events, that e2e broke in any test-data environment (a place can legitimately
// fall below the threshold) and rotted as test events aged out. The nav's
// link/href correctness is already covered deterministically by
// test/url-filters.test.ts and test/date-filter-badges.test.tsx; the only
// uncovered piece was this component's own gating/visibility logic, tested here
// with controlled inputs instead of live data.
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import type { CategorySummaryResponseDTO } from "types/api/category";

vi.mock("@utils/i18n-seo", () => ({
  getLocaleSafely: async () => "ca",
}));

// Return the key itself so assertions never depend on message content.
vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));

// Stub the children to identifiable markers — their own rendering (links,
// hrefs) is covered by DateFilterBadges/CategoryQuicklinks-level tests. Here we
// only assert which sections this component chooses to render.
vi.mock("@components/ui/serverEventsCategorized/DateFilterBadges", () => ({
  DateFilterBadges: () => <div data-testid="date-badges" />,
  createDateFilterBadgeLabels: () => ({}),
}));
vi.mock("@components/ui/placePageExploreNav/CategoryQuicklinks", () => ({
  default: () => <div data-testid="category-links" />,
}));

import PlacePageExploreNav from "@components/ui/placePageExploreNav/PlacePageExploreNav";

const categories = [
  { slug: "musica", name: "Concerts" },
  { slug: "teatre", name: "Teatre" },
] as unknown as CategorySummaryResponseDTO[];

async function renderNav(
  props: Partial<Parameters<typeof PlacePageExploreNav>[0]> = {},
) {
  const ui = await PlacePageExploreNav({
    place: "barcelona",
    placeLabel: "Barcelona",
    categories,
    ...props,
  });
  return render(ui);
}

describe("PlacePageExploreNav gating + visibility", () => {
  it("renders nothing when the place is not expandable (thin)", async () => {
    const { container } = await renderNav({ expandable: false });
    expect(container).toBeEmptyDOMElement();
  });

  it("shows date badges and category links on a bare place page", async () => {
    const { queryByTestId } = await renderNav();
    expect(queryByTestId("date-badges")).toBeInTheDocument();
    expect(queryByTestId("category-links")).toBeInTheDocument();
  });

  it("hides date badges once a date is selected", async () => {
    const { queryByTestId } = await renderNav({ date: "avui" });
    expect(queryByTestId("date-badges")).not.toBeInTheDocument();
    expect(queryByTestId("category-links")).toBeInTheDocument();
  });

  it("keeps date badges and category links when a category is selected and others remain", async () => {
    const { queryByTestId } = await renderNav({ category: "musica" });
    expect(queryByTestId("date-badges")).toBeInTheDocument();
    expect(queryByTestId("category-links")).toBeInTheDocument();
  });

  it("still shows other categories when fully filtered (date + category)", async () => {
    const { queryByTestId } = await renderNav({
      date: "avui",
      category: "musica",
    });
    expect(queryByTestId("date-badges")).not.toBeInTheDocument();
    expect(queryByTestId("category-links")).toBeInTheDocument();
  });

  it("renders nothing when a date is set and the selected category is the only one", async () => {
    const { container } = await renderNav({
      date: "avui",
      category: "musica",
      categories: [
        { slug: "musica", name: "Concerts" },
      ] as unknown as CategorySummaryResponseDTO[],
    });
    expect(container).toBeEmptyDOMElement();
  });
});
