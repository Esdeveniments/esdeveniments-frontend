import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { DateFilterBadges } from "../components/ui/serverEventsCategorized/DateFilterBadges";
import type { CategorySummaryResponseDTO } from "../types/api/category";
import type { URLFilterState } from "../types/url-filters";

// Mock buildCanonicalUrl to verify it's called with correct params
const mockBuildCanonicalUrl = vi.fn(
  (
    params: Partial<URLFilterState>,
    _categories?: CategorySummaryResponseDTO[]
  ) => {
    const { place, byDate, category } = params;
    if (category) {
      return `/${place}/${byDate}/${category}`;
    }
    return `/${place}/${byDate}`;
  }
);

vi.mock("@utils/url-filters", () => ({
  buildCanonicalUrl: (
    params: Partial<URLFilterState>,
    categories?: CategorySummaryResponseDTO[]
  ) => {
    return mockBuildCanonicalUrl(params, categories);
  },
}));

// Mock Badge component to verify props
vi.mock("@components/ui/common/badge", () => ({
  default: ({
    href,
    ariaLabel,
    children,
  }: {
    href: string;
    ariaLabel?: string;
    children: React.ReactNode;
  }) => (
    <a href={href} aria-label={ariaLabel} data-testid="date-filter-badge">
      {children}
    </a>
  ),
}));

describe("DateFilterBadges", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders all three date filter badges", () => {
      render(
        <DateFilterBadges
          placeSlug="barcelona"
          contextName="Barcelona"
        />
      );

      expect(screen.getByText("Avui")).toBeInTheDocument();
      expect(screen.getByText("Demà")).toBeInTheDocument();
      expect(screen.getByText("Cap de setmana")).toBeInTheDocument();
    });

    it("renders with correct nav aria-label by default", () => {
      render(
        <DateFilterBadges
          placeSlug="barcelona"
          contextName="Barcelona"
        />
      );

      const nav = screen.getByRole("navigation");
      expect(nav).toHaveAttribute("aria-label", "Vegeu també");
    });

    it("renders with custom nav aria-label when provided", () => {
      render(
        <DateFilterBadges
          placeSlug="barcelona"
          contextName="Barcelona"
          ariaLabel="Explora Barcelona per data"
        />
      );

      const nav = screen.getByRole("navigation");
      expect(nav).toHaveAttribute("aria-label", "Explora Barcelona per data");
    });
  });

  describe("URL generation without category", () => {
    it("generates correct URLs for place-only filters", () => {
      render(
        <DateFilterBadges
          placeSlug="barcelona"
          contextName="Barcelona"
        />
      );

      expect(mockBuildCanonicalUrl).toHaveBeenCalledTimes(3);
      expect(mockBuildCanonicalUrl).toHaveBeenCalledWith(
        { place: "barcelona", byDate: "avui" },
        undefined
      );
      expect(mockBuildCanonicalUrl).toHaveBeenCalledWith(
        { place: "barcelona", byDate: "dema" },
        undefined
      );
      expect(mockBuildCanonicalUrl).toHaveBeenCalledWith(
        { place: "barcelona", byDate: "cap-de-setmana" },
        undefined
      );
    });

    it("generates correct hrefs for badges", () => {
      render(
        <DateFilterBadges
          placeSlug="girona"
          contextName="Girona"
        />
      );

      const badges = screen.getAllByTestId("date-filter-badge");
      expect(badges[0]).toHaveAttribute("href", "/girona/avui");
      expect(badges[1]).toHaveAttribute("href", "/girona/dema");
      expect(badges[2]).toHaveAttribute("href", "/girona/cap-de-setmana");
    });
  });

  describe("URL generation with category", () => {
    const categories: CategorySummaryResponseDTO[] = [
      { id: 1, name: "Concerts", slug: "concerts" },
    ];

    it("generates correct URLs with category slug", () => {
      render(
        <DateFilterBadges
          placeSlug="catalunya"
          categorySlug="concerts"
          categories={categories}
          contextName="Concerts"
        />
      );

      expect(mockBuildCanonicalUrl).toHaveBeenCalledTimes(3);
      expect(mockBuildCanonicalUrl).toHaveBeenCalledWith(
        { place: "catalunya", byDate: "avui", category: "concerts" },
        categories
      );
      expect(mockBuildCanonicalUrl).toHaveBeenCalledWith(
        { place: "catalunya", byDate: "dema", category: "concerts" },
        categories
      );
      expect(mockBuildCanonicalUrl).toHaveBeenCalledWith(
        {
          place: "catalunya",
          byDate: "cap-de-setmana",
          category: "concerts",
        },
        categories
      );
    });

    it("generates correct hrefs for badges with category", () => {
      render(
        <DateFilterBadges
          placeSlug="catalunya"
          categorySlug="concerts"
          categories={categories}
          contextName="Concerts"
        />
      );

      const badges = screen.getAllByTestId("date-filter-badge");
      expect(badges[0]).toHaveAttribute("href", "/catalunya/avui/concerts");
      expect(badges[1]).toHaveAttribute("href", "/catalunya/dema/concerts");
      expect(badges[2]).toHaveAttribute(
        "href",
        "/catalunya/cap-de-setmana/concerts"
      );
    });
  });

  describe("Aria label generation", () => {
    it("generates correct aria labels for place-only context", () => {
      render(
        <DateFilterBadges
          placeSlug="barcelona"
          contextName="Barcelona"
        />
      );

      const badges = screen.getAllByTestId("date-filter-badge");
      expect(badges[0]).toHaveAttribute(
        "aria-label",
        "Veure activitats d'avui a Barcelona"
      );
      expect(badges[1]).toHaveAttribute(
        "aria-label",
        "Veure activitats de demà a Barcelona"
      );
      expect(badges[2]).toHaveAttribute(
        "aria-label",
        "Veure activitats aquest cap de setmana a Barcelona"
      );
    });

    it("generates correct aria labels for category context", () => {
      const categories: CategorySummaryResponseDTO[] = [
        { id: 1, name: "Teatre", slug: "teatre" },
      ];

      render(
        <DateFilterBadges
          placeSlug="catalunya"
          categorySlug="teatre"
          categories={categories}
          contextName="Teatre"
        />
      );

      const badges = screen.getAllByTestId("date-filter-badge");
      expect(badges[0]).toHaveAttribute(
        "aria-label",
        "Veure activitats d'avui per la categoria Teatre"
      );
      expect(badges[1]).toHaveAttribute(
        "aria-label",
        "Veure activitats de demà per la categoria Teatre"
      );
      expect(badges[2]).toHaveAttribute(
        "aria-label",
        "Veure activitats aquest cap de setmana per la categoria Teatre"
      );
    });
  });

  describe("Edge cases", () => {
    it("handles categorySlug without categories array", () => {
      render(
        <DateFilterBadges
          placeSlug="catalunya"
          categorySlug="festivals"
          contextName="Festivals"
        />
      );

      // Should still generate URLs with category
      expect(mockBuildCanonicalUrl).toHaveBeenCalledWith(
        { place: "catalunya", byDate: "avui", category: "festivals" },
        undefined
      );
    });

    it("handles empty categories array", () => {
      render(
        <DateFilterBadges
          placeSlug="catalunya"
          categorySlug="concerts"
          categories={[]}
          contextName="Concerts"
        />
      );

      expect(mockBuildCanonicalUrl).toHaveBeenCalledWith(
        { place: "catalunya", byDate: "avui", category: "concerts" },
        []
      );
    });
  });
});

