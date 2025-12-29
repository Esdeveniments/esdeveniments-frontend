import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import FilterButton from "../components/ui/filters/FilterButton";
import { renderWithProviders } from "./utils/renderWithProviders";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("FilterButton (black-box)", () => {
  it("renders remove icon when enabled and chevron when disabled", () => {
    const onOpenModal = vi.fn();
    const { rerender } = renderWithProviders(
      <FilterButton
        text="Categoria"
        filterKey="category"
        enabled={true}
        removeUrl="/barcelona"
        onOpenModal={onOpenModal}
        testId="filter-pill-category"
      />
    );
    expect(
      screen.getByTestId("filter-pill-category-remove")
    ).toBeInTheDocument();

    rerender(
      <FilterButton
        text="Categoria"
        filterKey="category"
        enabled={false}
        removeUrl="/barcelona"
        onOpenModal={onOpenModal}
        testId="filter-pill-category"
      />
    );
    // When disabled, remove icon should not be present
    expect(screen.queryByTestId("filter-pill-category-remove")).toBeNull();
  });

  it("calls onOpenModal when text is clicked", () => {
    const onOpenModal = vi.fn();
    renderWithProviders(
      <FilterButton
        text="Categoria"
        filterKey="category"
        enabled={false}
        removeUrl="/barcelona"
        onOpenModal={onOpenModal}
        testId="filter-pill-category"
      />
    );
    fireEvent.click(screen.getByText("Categoria"));
    expect(onOpenModal).toHaveBeenCalledTimes(1);
  });
});
