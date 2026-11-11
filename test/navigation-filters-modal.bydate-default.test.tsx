/**
 * Regression test for NavigationFiltersModal byDate default value.
 *
 * 2026-03-07 bug: when no date was selected (localByDate = ""), the applyFilters
 * function used `localByDate || "avui"` which incorrectly defaulted to "avui"
 * instead of DEFAULT_FILTER_VALUE ("tots"). This meant deselecting a date filter
 * still produced a date-filtered URL.
 *
 * Fix: changed to `localByDate || DEFAULT_FILTER_VALUE`.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import NavigationFiltersModal from "@components/ui/filtersModal/NavigationFiltersModal";

// ---------- mocks ----------

vi.mock("next/dynamic", () => ({
  default:
    () =>
    (props: unknown) => {
      const p = props as {
        testId?: string;
        children?: React.ReactNode;
        onActionButtonClick?: () => void;
        actionButton?: string;
      };
      return (
        <div data-testid={p.testId ?? "dynamic"}>
          {p.children}
          {typeof p.onActionButtonClick === "function" && (
            <button
              type="button"
              data-testid="modal-action"
              onClick={() => p.onActionButtonClick?.()}
            >
              {p.actionButton ?? "Apply"}
            </button>
          )}
        </div>
      );
    },
}));

const mockPush = vi.fn();
vi.mock("../i18n/routing", async () => {
  const actual = await vi.importActual<typeof import("../i18n/routing")>(
    "../i18n/routing",
  );
  return { ...actual, useRouter: () => ({ push: mockPush }) };
});

const mockSetLoading = vi.fn();
vi.mock("@components/context/FilterLoadingContext", () => ({
  useFilterLoading: () => ({ setLoading: mockSetLoading }),
}));

// Spy on buildFilterUrl to capture the `changes` argument
const mockBuildFilterUrl = vi.fn().mockReturnValue("/catalunya");
vi.mock("@utils/url-filters", async () => {
  const actual = await vi.importActual<typeof import("@utils/url-filters")>(
    "@utils/url-filters",
  );
  return { ...actual, buildFilterUrl: (...args: unknown[]) => mockBuildFilterUrl(...args) };
});

import * as nextIntl from "next-intl";
import type { RegionsGroupedByCitiesResponseDTO } from "types/api/region";

// Region options load after the modal opens; tests swap in loaded data
let mockRegions: RegionsGroupedByCitiesResponseDTO[] | undefined;
vi.mock("@components/hooks/useGetRegionsWithCities", () => ({
  useGetRegionsWithCities: () => ({
    regionsWithCities: mockRegions,
    isLoading: false,
    isError: false,
  }),
}));

describe("NavigationFiltersModal - byDate default value regression", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(nextIntl, "useLocale").mockReturnValue("ca");
    // Set window.location so the "no-op" guard doesn't short-circuit
    // (buildFilterUrl returns "/catalunya", window must differ for navigation to fire)
    window.history.pushState({}, "", "/catalunya/avui");
  });

  it("applies DEFAULT_FILTER_VALUE ('tots') when no date is selected, not 'avui'", async () => {
    render(
      <NavigationFiltersModal
        isOpen
        onClose={vi.fn()}
        currentSegments={{
          place: "catalunya",
          date: "tots",
          category: "tots",
        }}
        currentQueryParams={{}}
        userLocation={undefined}
        categories={[]}
      />,
    );

    // Click "Apply" without selecting any date → localByDate = "" → should become "tots"
    fireEvent.click(screen.getByTestId("modal-action"));

    expect(mockBuildFilterUrl).toHaveBeenCalledTimes(1);

    // buildFilterUrl(segments, queryParams, changes) — we inspect `changes` (3rd arg)
    const changes = mockBuildFilterUrl.mock.calls[0][2] as Record<
      string,
      unknown
    >;
    expect(changes.byDate).toBe("tots");
  });

  it("preserves selected date when one is chosen", async () => {
    // Start with date = "avui" so localByDate initialises to "avui"
    render(
      <NavigationFiltersModal
        isOpen
        onClose={vi.fn()}
        currentSegments={{
          place: "catalunya",
          date: "avui",
          category: "tots",
        }}
        currentQueryParams={{}}
        userLocation={undefined}
        categories={[]}
      />,
    );

    // Apply with the existing "avui" date
    fireEvent.click(screen.getByTestId("modal-action"));

    expect(mockBuildFilterUrl).toHaveBeenCalledTimes(1);
    const changes = mockBuildFilterUrl.mock.calls[0][2] as Record<
      string,
      unknown
    >;
    expect(changes.byDate).toBe("avui");
  });
});

describe("NavigationFiltersModal - price", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(nextIntl, "useLocale").mockReturnValue("ca");
    window.history.pushState({}, "", "/catalunya/avui");
  });

  const applyWith = (price: string | undefined, click?: string) => {
    render(
      <NavigationFiltersModal
        isOpen
        onClose={vi.fn()}
        currentSegments={{ place: "catalunya", date: "tots", category: "tots" }}
        currentQueryParams={price ? { price } : {}}
        userLocation={undefined}
        categories={[]}
      />,
    );
    if (click) fireEvent.click(document.getElementById(click)!);
    fireEvent.click(screen.getByTestId("modal-action"));
    return (mockBuildFilterUrl.mock.calls[0][2] as Record<string, unknown>).price;
  };

  it("applies the chosen price", () => {
    expect(applyWith(undefined, "price-gratis")).toBe("gratis");
  });

  it("keeps the price from the URL", () => {
    expect(applyWith("pagament")).toBe("pagament");
  });

  it("clears the price when the selected option is clicked again", () => {
    expect(applyWith("pagament", "price-pagament")).toBe("tots");
  });

  it("keeps the chosen price when place options finish loading", () => {
    mockRegions = undefined;
    const props = {
      isOpen: true,
      onClose: vi.fn(),
      currentSegments: { place: "granollers", date: "tots", category: "tots" },
      currentQueryParams: {},
      userLocation: undefined,
      categories: [],
    };
    const { rerender } = render(<NavigationFiltersModal {...props} />);
    fireEvent.click(document.getElementById("price-gratis")!);

    mockRegions = [
      {
        id: 1,
        name: "Vallès Oriental",
        cities: [
          { id: 2, value: "granollers", label: "Granollers", latitude: 41.6, longitude: 2.29 },
        ],
      },
    ];
    // The modal is memoized; in the app the SWR hook re-renders it
    rerender(
      <NavigationFiltersModal
        {...props}
        currentSegments={{ ...props.currentSegments }}
      />,
    );
    fireEvent.click(screen.getByTestId("modal-action"));

    expect(
      (mockBuildFilterUrl.mock.calls[0][2] as Record<string, unknown>).price,
    ).toBe("gratis");
  });
});
