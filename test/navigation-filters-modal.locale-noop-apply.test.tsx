import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

import NavigationFiltersModal from "@components/ui/filtersModal/NavigationFiltersModal";

// The modal and select are loaded via next/dynamic; in unit tests we just need a
// predictable wrapper that exposes the action button.
vi.mock("next/dynamic", () => {
  return {
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
  };
});

const mockPush = vi.fn();
vi.mock("../i18n/routing", async () => {
  const actual = await vi.importActual<typeof import("../i18n/routing")>(
    "../i18n/routing"
  );
  return {
    ...actual,
    useRouter: () => ({ push: mockPush }),
  };
});

const mockSetLoading = vi.fn();
vi.mock("@components/context/FilterLoadingContext", () => {
  return {
    useFilterLoading: () => ({ setLoading: mockSetLoading }),
  };
});

vi.mock("@utils/url-filters", async () => {
  const actual = await vi.importActual<typeof import("@utils/url-filters")>(
    "@utils/url-filters"
  );
  return {
    ...actual,
    buildFilterUrl: () => "/catalunya",
  };
});

import * as nextIntl from "next-intl";

describe("NavigationFiltersModal - Locale no-op apply", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(nextIntl, "useLocale").mockReturnValue("es");
    window.history.pushState({}, "", "/es/catalunya");
  });

  it("does not set loading or navigate when applying unchanged filters on a locale-prefixed URL", async () => {
    vi.useFakeTimers();
    render(
      <NavigationFiltersModal
        isOpen
        onClose={vi.fn()}
        currentSegments={{ place: "catalunya", date: "tots", category: "tots" }}
        currentQueryParams={{}}
        userLocation={undefined}
        categories={[]}
      />
    );

    // The component resets local state with setTimeout(0) on open.
    // Flush it to avoid act() warnings and mimic settled UI state.
    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    fireEvent.click(screen.getByTestId("modal-action"));

    expect(mockSetLoading).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();

    vi.useRealTimers();
  });
});
