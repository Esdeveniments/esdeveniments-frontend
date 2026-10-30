import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import NavigationFiltersModal from "@components/ui/filtersModal/NavigationFiltersModal";
import type { ModalProps } from "types/props";
import type { URLQueryParams } from "types/url-filters";
import type { buildFilterUrl } from "@utils/url-filters";

// The modal and select are loaded via next/dynamic; in unit tests we just need a
// predictable wrapper that exposes the action button.
vi.mock("next/dynamic", () => {
  return {
    default:
      () =>
      (props: unknown) => {
        const p = props as Partial<ModalProps>;

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
const mockBuildFilterUrl = vi.fn<typeof buildFilterUrl>(() => "/catalunya");
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
    buildFilterUrl: (...args: Parameters<typeof buildFilterUrl>) =>
      mockBuildFilterUrl(...args),
  };
});

import * as nextIntl from "next-intl";

const segments = { place: "catalunya", date: "tots", category: "tots" };

function renderModal(currentQueryParams: URLQueryParams) {
  const props = {
    isOpen: true,
    onClose: vi.fn(),
    currentSegments: segments,
    userLocation: undefined,
    categories: [],
  };
  const view = render(
    <NavigationFiltersModal {...props} currentQueryParams={currentQueryParams} />
  );
  return {
    rerender: (next: URLQueryParams) =>
      view.rerender(<NavigationFiltersModal {...props} currentQueryParams={next} />),
  };
}

function appliedRange() {
  fireEvent.click(screen.getByTestId("modal-action"));
  const changes = mockBuildFilterUrl.mock.lastCall?.[2];
  return { from: changes?.from, to: changes?.to };
}

describe("NavigationFiltersModal - date range", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(nextIntl, "useLocale").mockReturnValue("ca");
    window.history.pushState({}, "", "/catalunya");
  });

  it("applies the range from the URL", () => {
    renderModal({ from: "2026-11-01", to: "2026-11-05" });
    expect(appliedRange()).toEqual({ from: "2026-11-01", to: "2026-11-05" });
  });

  it("ignores a to date without a from date", () => {
    renderModal({ to: "2026-11-05" });
    expect(appliedRange()).toEqual({ from: undefined, to: undefined });
  });

  it("follows a new range while open", () => {
    const { rerender } = renderModal({ from: "2026-11-01", to: "2026-11-05" });
    rerender({ from: "2026-11-01", to: "2026-11-09" });
    expect(appliedRange()).toEqual({ from: "2026-11-01", to: "2026-11-09" });
    rerender({ from: "2026-11-03", to: "2026-11-09" });
    expect(appliedRange()).toEqual({ from: "2026-11-03", to: "2026-11-09" });
  });
});
