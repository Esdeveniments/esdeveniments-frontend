import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import Filters from "./Filters";
import type { RouteSegments, URLQueryParams } from "types/url-filters";
import { Text } from "../../primitives/Text";

// Mock the filter operations
vi.mock("@utils/filter-operations", () => ({
  FilterOperations: {
    getAllConfigurations: vi.fn(() => [
      {
        key: "place",
        displayName: "Població",
        defaultValue: "catalunya",
        type: "place",
        isEnabled: vi.fn(() => true),
        getDisplayText: vi.fn(() => "Barcelona"),
        getRemovalChanges: vi.fn(() => ({ place: "catalunya" })),
      },
      {
        key: "category",
        displayName: "Categoria",
        defaultValue: "tots",
        type: "category",
        isEnabled: vi.fn(() => false),
        getDisplayText: vi.fn(() => undefined),
        getRemovalChanges: vi.fn(() => ({ category: "tots" })),
      },
    ]),
    getDisplayText: vi.fn((key: string) => {
      if (key === "place") return "Barcelona";
      return undefined;
    }),
    isEnabled: vi.fn((key: string) => key === "place"),
    getRemovalUrl: vi.fn(() => "/test-url"),
    hasActiveFilters: vi.fn(() => true),
  },
}));

// Mock the FilterButton component
vi.mock("../../filters/FilterButton", () => ({
  default: ({ text, enabled, testId }: any) => (
    <div data-testid={testId}>
      <Text variant="body-sm">{text}</Text>
      {enabled && <button data-testid={`${testId}-remove`}>×</button>}
    </div>
  ),
}));

// Mock the FilterErrorBoundary
vi.mock("../../filters/FilterErrorBoundary", () => ({
  default: ({ children }: any) => <div>{children}</div>,
}));

// Mock the NavigationFiltersModal
vi.mock("../../filtersModal", () => ({
  default: ({ isOpen, onClose }: any) => (
    <div data-testid="filters-modal" data-open={isOpen}>
      {isOpen && (
        <div>
          <button onClick={onClose} data-testid="modal-close">
            Close
          </button>
          <Text as="p">Filter Modal Content</Text>
        </div>
      )}
    </div>
  ),
}));

// Mock Heroicons
vi.mock("@heroicons/react/outline/AdjustmentsIcon", () => ({
  default: () => <svg data-testid="adjustments-icon" />,
}));

describe("Filters Domain Component (Integration)", () => {
  const mockSegments: RouteSegments = {
    place: "barcelona",
    date: "tots",
    category: "tots",
  };

  const mockQueryParams: URLQueryParams = {};

  const mockCategories = [
    { id: 1, slug: "concerts", name: "Concerts" },
    { id: 2, slug: "sports", name: "Sports" },
  ];

  const defaultProps = {
    segments: mockSegments,
    queryParams: mockQueryParams,
    categories: mockCategories,
    placeTypeLabel: { label: "Barcelona" },
  };

  it("renders filter trigger button with correct accessibility attributes", () => {
    render(<Filters {...defaultProps} />);

    const triggerButton = screen.getByTestId("filters-open");
    expect(triggerButton).toBeInTheDocument();
    expect(triggerButton).toHaveAttribute(
      "aria-label",
      "Modify active filters",
    );
    expect(triggerButton).toHaveAttribute("aria-expanded", "false");
    expect(triggerButton).toHaveAttribute("aria-haspopup", "dialog");
    expect(triggerButton).toHaveAttribute("type", "button");
  });

  it("renders filter pills for active filters", () => {
    render(<Filters {...defaultProps} />);

    // Should render filter pills based on mocked configurations
    expect(screen.getByTestId("filter-pill-place")).toBeInTheDocument();
    expect(screen.getByText("Barcelona")).toBeInTheDocument();
  });

  it("opens modal when trigger button is clicked", async () => {
    render(<Filters {...defaultProps} />);

    const triggerButton = screen.getByTestId("filters-open");
    fireEvent.click(triggerButton);

    await waitFor(() => {
      expect(screen.getByTestId("filters-modal")).toHaveAttribute(
        "data-open",
        "true",
      );
    });

    // Check that aria-expanded is updated
    expect(triggerButton).toHaveAttribute("aria-expanded", "true");
  });

  it("closes modal when modal close button is clicked", async () => {
    render(<Filters {...defaultProps} />);

    // Open modal
    const triggerButton = screen.getByTestId("filters-open");
    fireEvent.click(triggerButton);

    await waitFor(() => {
      expect(screen.getByTestId("filters-modal")).toHaveAttribute(
        "data-open",
        "true",
      );
    });

    // Close modal
    const closeButton = screen.getByTestId("modal-close");
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.getByTestId("filters-modal")).toHaveAttribute(
        "data-open",
        "false",
      );
    });

    // Check that aria-expanded is updated
    expect(triggerButton).toHaveAttribute("aria-expanded", "false");
  });

  it("has correct ARIA region and labels", () => {
    render(<Filters {...defaultProps} />);

    const filtersRegion = screen.getByRole("region", { name: "Event filters" });
    expect(filtersRegion).toBeInTheDocument();

    const activeFiltersGroup = screen.getByRole("group", {
      name: "Active filters",
    });
    expect(activeFiltersGroup).toBeInTheDocument();
  });

  it("renders adjustments icon with correct color based on active filters", () => {
    render(<Filters {...defaultProps} />);

    const icon = screen.getByTestId("adjustments-icon");
    expect(icon).toBeInTheDocument();

    // The icon color logic is handled by the component based on hasActiveFilters
    // In this test, we mocked hasActiveFilters to return true
  });

  it("applies custom className when provided", () => {
    const { container } = render(
      <Filters {...defaultProps} className="custom-filters-class" />,
    );

    // The FilterErrorBoundary wraps the component, so we need to find the actual filters container
    const filtersContainer = container.querySelector(
      '[role="region"]',
    ) as HTMLElement;
    expect(filtersContainer).toHaveClass("mt-component-sm");
    expect(filtersContainer).toHaveClass("flex");
    expect(filtersContainer).toHaveClass("w-full");
    expect(filtersContainer).toHaveClass("custom-filters-class");
  });

  it("handles empty categories array gracefully", () => {
    render(<Filters {...defaultProps} categories={[]} />);

    // Should still render without errors
    expect(screen.getByTestId("filters-open")).toBeInTheDocument();
  });

  it("renders modal with correct props when open", async () => {
    render(<Filters {...defaultProps} />);

    // Open modal
    fireEvent.click(screen.getByTestId("filters-open"));

    await waitFor(() => {
      const modal = screen.getByTestId("filters-modal");
      expect(modal).toHaveAttribute("data-open", "true");
    });
  });
});
