import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import FilterButton from "../components/ui/filters/FilterButton";
import { renderWithProviders } from "./utils/renderWithProviders";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
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

  it("scrolls both <body> and the window to top when removing", () => {
    const bodyScrollTo = vi.fn();
    const windowScrollTo = vi.fn();
    const originalBodyScrollTo = document.body.scrollTo;
    const originalWindowScrollTo = window.scrollTo;
    document.body.scrollTo = bodyScrollTo;
    window.scrollTo = windowScrollTo;
    try {
      renderWithProviders(
        <FilterButton
          text="Categoria"
          filterKey="category"
          enabled={true}
          removeUrl="/barcelona"
          onOpenModal={vi.fn()}
          testId="filter-pill-category"
        />
      );
      fireEvent.click(screen.getByTestId("filter-pill-category-remove"));
      expect(bodyScrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
      expect(windowScrollTo).toHaveBeenCalledWith({
        top: 0,
        behavior: "smooth",
      });
    } finally {
      document.body.scrollTo = originalBodyScrollTo;
      window.scrollTo = originalWindowScrollTo;
    }
  });

  it("exposes the chip and the remove action as separate named buttons", () => {
    const onOpenModal = vi.fn();
    renderWithProviders(
      <FilterButton
        text="Categoria"
        filterKey="category"
        enabled={true}
        removeUrl="/barcelona"
        onOpenModal={onOpenModal}
        testId="filter-pill-category"
      />
    );
    document.body.scrollTo = vi.fn();
    window.scrollTo = vi.fn();
    fireEvent.click(
      screen.getByRole("button", { name: "Elimina el filtre Categoria" })
    );
    expect(onOpenModal).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Categoria" }));
    expect(onOpenModal).toHaveBeenCalledTimes(1);
  });
});
