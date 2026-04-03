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
import { render, screen, fireEvent, act } from "@testing-library/react";

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

describe("NavigationFiltersModal - byDate default value regression", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(nextIntl, "useLocale").mockReturnValue("ca");
    // Set window.location so the "no-op" guard doesn't short-circuit
    // (buildFilterUrl returns "/catalunya", window must differ for navigation to fire)
    window.history.pushState({}, "", "/catalunya/avui");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("applies DEFAULT_FILTER_VALUE ('tots') when no date is selected, not 'avui'", async () => {
    vi.useFakeTimers();

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

    // Flush the setTimeout(0) that resets local state on open
    await act(async () => {
      vi.runOnlyPendingTimers();
    });

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
    vi.useFakeTimers();

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

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

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
