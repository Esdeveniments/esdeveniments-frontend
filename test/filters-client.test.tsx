/**
 * Tests for FiltersClient component - ensures proper capitalization and translation
 * Prevents regressions in filter display text formatting
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import FiltersClient from "../components/ui/filters/FiltersClient";
import { renderWithProviders } from "./utils/renderWithProviders";
import type { RouteSegments } from "../types/url-filters";
import type { CategorySummaryResponseDTO } from "../types/api/category";
import { DEFAULT_FILTER_VALUE } from "../utils/constants";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock analytics
vi.mock("../utils/analytics", () => ({ sendGoogleEvent: vi.fn() }));

describe("FiltersClient - Date Filter Capitalization", () => {
  const baseProps = {
    segments: {
      place: "barcelona",
      date: DEFAULT_FILTER_VALUE,
      category: DEFAULT_FILTER_VALUE,
    } as RouteSegments,
    queryParams: {},
    categories: [] as CategorySummaryResponseDTO[],
    placeTypeLabel: { type: "" as const, label: "Barcelona" },
    onOpenModal: vi.fn(),
    labels: {
      triggerLabel: "Filtres",
      displayNameMap: {
        place: "Lloc",
        category: "Categoria",
        byDate: "Data",
        distance: "Distància",
        searchTerm: "Cerca",
      },
      byDates: {
        avui: "Avui",
        dema: "Demà",
        setmana: "Aquesta setmana",
        "cap-de-setmana": "Cap de setmana",
      },
      categoryLabelsBySlug: {},
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("displays 'Avui' with proper capitalization when date filter is 'avui'", () => {
    renderWithProviders(
      <FiltersClient
        {...baseProps}
        segments={{
          ...baseProps.segments,
          date: "avui",
        }}
      />
    );

    const datePill = screen.getByTestId("filter-pill-byDate");
    expect(datePill).toBeInTheDocument();
    expect(datePill).toHaveTextContent("Avui");
    // Ensure it's capitalized (first letter uppercase)
    expect(datePill.textContent).toMatch(/^Avui/);
  });

  it("displays 'Demà' with proper capitalization when date filter is 'dema'", () => {
    renderWithProviders(
      <FiltersClient
        {...baseProps}
        segments={{
          ...baseProps.segments,
          date: "dema",
        }}
      />
    );

    const datePill = screen.getByTestId("filter-pill-byDate");
    expect(datePill).toBeInTheDocument();
    expect(datePill).toHaveTextContent("Demà");
    expect(datePill.textContent).toMatch(/^Demà/);
  });

  it("displays 'Cap de setmana' with proper capitalization when date filter is 'cap-de-setmana'", () => {
    renderWithProviders(
      <FiltersClient
        {...baseProps}
        segments={{
          ...baseProps.segments,
          date: "cap-de-setmana",
        }}
      />
    );

    const datePill = screen.getByTestId("filter-pill-byDate");
    expect(datePill).toBeInTheDocument();
    expect(datePill).toHaveTextContent("Cap de setmana");
    // Ensure first word is capitalized
    expect(datePill.textContent).toMatch(/^Cap de setmana/);
  });

  it("displays 'Aquesta setmana' with proper capitalization when date filter is 'setmana'", () => {
    renderWithProviders(
      <FiltersClient
        {...baseProps}
        segments={{
          ...baseProps.segments,
          date: "setmana",
        }}
      />
    );

    const datePill = screen.getByTestId("filter-pill-byDate");
    expect(datePill).toBeInTheDocument();
    expect(datePill).toHaveTextContent("Aquesta setmana");
    expect(datePill.textContent).toMatch(/^Aquesta setmana/);
  });

  it("uses URL value (avui) for translation lookup, not labelKey (today)", () => {
    // This test ensures the fix: we use filters.byDate (URL value) not displayText (labelKey)
    const labelsWithSpy = {
      ...baseProps.labels,
      byDates: {
        avui: "Avui",
        dema: "Demà",
        setmana: "Aquesta setmana",
        "cap-de-setmana": "Cap de setmana",
      },
    };

    renderWithProviders(
      <FiltersClient
        {...baseProps}
        segments={{
          ...baseProps.segments,
          date: "avui",
        }}
        labels={labelsWithSpy}
      />
    );

    // If the lookup was using labelKey "today" instead of URL value "avui",
    // this would fail because "today" is not a key in byDates
    const datePill = screen.getByTestId("filter-pill-byDate");
    expect(datePill).toHaveTextContent("Avui");
  });
});

describe("FiltersClient - Place Name Capitalization", () => {
  const baseProps = {
    segments: {
      place: "barcelona",
      date: DEFAULT_FILTER_VALUE,
      category: DEFAULT_FILTER_VALUE,
    } as RouteSegments,
    queryParams: {},
    categories: [] as CategorySummaryResponseDTO[],
    onOpenModal: vi.fn(),
    labels: {
      triggerLabel: "Filtres",
      displayNameMap: {
        place: "Lloc",
        category: "Categoria",
        byDate: "Data",
        distance: "Distància",
        searchTerm: "Cerca",
      },
      byDates: {},
      categoryLabelsBySlug: {},
    },
  };

  it("displays place name with proper capitalization from placeTypeLabel", () => {
    renderWithProviders(
      <FiltersClient
        {...baseProps}
        placeTypeLabel={{ type: "", label: "Barcelona" }}
      />
    );

    const placePill = screen.getByTestId("filter-pill-place");
    expect(placePill).toBeInTheDocument();
    expect(placePill).toHaveTextContent("Barcelona");
    // Ensure first letter is uppercase
    expect(placePill.textContent).toMatch(/^Barcelona/);
  });

  it("displays multi-word place names with proper capitalization", () => {
    renderWithProviders(
      <FiltersClient
        {...baseProps}
        segments={{
          ...baseProps.segments,
          place: "sant-cugat-del-valles",
        }}
        placeTypeLabel={{ type: "", label: "Sant Cugat del Vallès" }}
      />
    );

    const placePill = screen.getByTestId("filter-pill-place");
    expect(placePill).toBeInTheDocument();
    expect(placePill).toHaveTextContent("Sant Cugat del Vallès");
    // Ensure first word is capitalized
    expect(placePill.textContent).toMatch(/^Sant Cugat del Vallès/);
  });
});

describe("FiltersClient - Category Name Capitalization", () => {
  const baseProps = {
    segments: {
      place: "barcelona",
      date: DEFAULT_FILTER_VALUE,
      category: "concerts",
    } as RouteSegments,
    queryParams: {},
    categories: [
      { slug: "concerts", name: "Concerts", id: 1 },
    ] as CategorySummaryResponseDTO[],
    placeTypeLabel: { type: "" as const, label: "Barcelona" },
    onOpenModal: vi.fn(),
    labels: {
      triggerLabel: "Filtres",
      displayNameMap: {
        place: "Lloc",
        category: "Categoria",
        byDate: "Data",
        distance: "Distància",
        searchTerm: "Cerca",
      },
      byDates: {},
      categoryLabelsBySlug: {
        concerts: "Concerts",
      },
    },
  };

  it("displays category name with proper capitalization", () => {
    renderWithProviders(<FiltersClient {...baseProps} />);

    const categoryPill = screen.getByTestId("filter-pill-category");
    expect(categoryPill).toBeInTheDocument();
    expect(categoryPill).toHaveTextContent("Concerts");
    // Ensure first letter is uppercase
    expect(categoryPill.textContent).toMatch(/^Concerts/);
  });

  it("displays multi-word category names with proper capitalization", () => {
    renderWithProviders(
      <FiltersClient
        {...baseProps}
        segments={{
          ...baseProps.segments,
          category: "teatre-i-dansa",
        }}
        categories={[
          { slug: "teatre-i-dansa", name: "Teatre i Dansa", id: 2 },
        ]}
        labels={{
          ...baseProps.labels,
          categoryLabelsBySlug: {
            "teatre-i-dansa": "Teatre i Dansa",
          },
        }}
      />
    );

    const categoryPill = screen.getByTestId("filter-pill-category");
    expect(categoryPill).toBeInTheDocument();
    expect(categoryPill).toHaveTextContent("Teatre i Dansa");
    // Ensure first word is capitalized
    expect(categoryPill.textContent).toMatch(/^Teatre i Dansa/);
  });
});

describe("FiltersClient - Distance Formatting", () => {
  const baseProps = {
    segments: {
      place: "barcelona",
      date: DEFAULT_FILTER_VALUE,
      category: DEFAULT_FILTER_VALUE,
    } as RouteSegments,
    queryParams: {
      distance: "25",
      lat: "41.3851",
      lon: "2.1734",
    },
    categories: [] as CategorySummaryResponseDTO[],
    placeTypeLabel: { type: "" as const, label: "Barcelona" },
    onOpenModal: vi.fn(),
    labels: {
      triggerLabel: "Filtres",
      displayNameMap: {
        place: "Lloc",
        category: "Categoria",
        byDate: "Data",
        distance: "Distància",
        searchTerm: "Cerca",
      },
      byDates: {},
      categoryLabelsBySlug: {},
    },
  };

  it("displays distance with proper format (number + ' km')", () => {
    renderWithProviders(<FiltersClient {...baseProps} />);

    const distancePill = screen.getByTestId("filter-pill-distance");
    expect(distancePill).toBeInTheDocument();
    expect(distancePill).toHaveTextContent("25 km");
    // Ensure format is correct
    expect(distancePill.textContent).toMatch(/^\d+\s+km/);
  });

  it("displays different distance values correctly", () => {
    renderWithProviders(
      <FiltersClient
        {...baseProps}
        queryParams={{
          ...baseProps.queryParams,
          distance: "10",
        }}
      />
    );

    const distancePill = screen.getByTestId("filter-pill-distance");
    expect(distancePill).toHaveTextContent("10 km");
  });
});

describe("FiltersClient - Multiple Filters Capitalization", () => {
  it("displays all active filters with proper capitalization simultaneously", () => {
    const props = {
      segments: {
        place: "barcelona",
        date: "avui",
        category: "concerts",
      } as RouteSegments,
      queryParams: {
        distance: "15",
        lat: "41.3851",
        lon: "2.1734",
      },
      categories: [
        { slug: "concerts", name: "Concerts", id: 1 },
      ] as CategorySummaryResponseDTO[],
      placeTypeLabel: { type: "" as const, label: "Barcelona" },
      onOpenModal: vi.fn(),
      labels: {
        triggerLabel: "Filtres",
        displayNameMap: {
          place: "Lloc",
          category: "Categoria",
          byDate: "Data",
          distance: "Distància",
          searchTerm: "Cerca",
        },
        byDates: {
          avui: "Avui",
          dema: "Demà",
          setmana: "Aquesta setmana",
          "cap-de-setmana": "Cap de setmana",
        },
        categoryLabelsBySlug: {
          concerts: "Concerts",
        },
      },
    };

    renderWithProviders(<FiltersClient {...props} />);

    // Verify all filters are displayed with proper capitalization
    expect(screen.getByTestId("filter-pill-place")).toHaveTextContent("Barcelona");
    expect(screen.getByTestId("filter-pill-byDate")).toHaveTextContent("Avui");
    expect(screen.getByTestId("filter-pill-category")).toHaveTextContent("Concerts");
    expect(screen.getByTestId("filter-pill-distance")).toHaveTextContent("15 km");
  });
});

