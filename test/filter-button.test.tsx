import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import FilterButton from "../components/ui/filters/FilterButton";
import { FilterLoadingProvider } from "../components/context/FilterLoadingContext";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("FilterButton (black-box)", () => {
  it("renders remove icon when enabled and chevron when disabled", () => {
    const onOpenModal = vi.fn();
    const { rerender } = render(
      <FilterLoadingProvider>
        <FilterButton
          text="Categoria"
          enabled={true}
          removeUrl="/barcelona"
          onOpenModal={onOpenModal}
          testId="filter-pill-category"
        />
      </FilterLoadingProvider>
    );
    expect(
      screen.getByTestId("filter-pill-category-remove")
    ).toBeInTheDocument();

    rerender(
      <FilterLoadingProvider>
        <FilterButton
          text="Categoria"
          enabled={false}
          removeUrl="/barcelona"
          onOpenModal={onOpenModal}
          testId="filter-pill-category"
        />
      </FilterLoadingProvider>
    );
    // When disabled, remove icon should not be present
    expect(screen.queryByTestId("filter-pill-category-remove")).toBeNull();
  });

  it("calls onOpenModal when text is clicked", () => {
    const onOpenModal = vi.fn();
    render(
      <FilterLoadingProvider>
        <FilterButton
          text="Categoria"
          enabled={false}
          removeUrl="/barcelona"
          onOpenModal={onOpenModal}
          testId="filter-pill-category"
        />
      </FilterLoadingProvider>
    );
    fireEvent.click(screen.getByText("Categoria"));
    expect(onOpenModal).toHaveBeenCalledTimes(1);
  });
});
