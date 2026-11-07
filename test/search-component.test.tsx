import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import Search from "../components/ui/search";
import { renderWithProviders } from "./utils/renderWithProviders";

const nav = vi.hoisted(() => ({ search: "" }));

vi.mock("next/navigation", () => {
  const push = vi.fn();
  return {
    useRouter: () => ({ push }),
    useSearchParams: () => new URLSearchParams(nav.search),
    usePathname: () => "/",
  };
});

// avoid GA noise
vi.mock("../utils/analytics", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../utils/analytics")>()),
  sendGoogleEvent: vi.fn(),
}));

describe("Search component", () => {
  it("renders search input and accepts typing (black-box via testid)", () => {
    renderWithProviders(<Search />);
    const input = screen.getByTestId("search-input") as HTMLInputElement;
    expect(input).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "fira" } });
    expect(input.value).toBe("fira");
  });

  it("shows the new search term when the URL changes", () => {
    nav.search = "search=fira";
    const { rerender } = renderWithProviders(<Search />);
    const input = screen.getByTestId("search-input") as HTMLInputElement;
    expect(input.value).toBe("fira");

    fireEvent.change(input, { target: { value: "fir" } });
    expect(input.value).toBe("fir");

    nav.search = "search=concert";
    rerender(<Search />);
    expect(input.value).toBe("concert");
    nav.search = "";
  });
});
