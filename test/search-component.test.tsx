import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import Search from "../components/ui/search";
import { renderWithProviders } from "./utils/renderWithProviders";

vi.mock("next/navigation", () => {
  const push = vi.fn();
  return {
    useRouter: () => ({ push }),
    useSearchParams: () => new URLSearchParams(""),
    usePathname: () => "/",
  };
});

// avoid GA noise
vi.mock("../utils/analytics", () => ({ sendGoogleEvent: vi.fn() }));

describe("Search component", () => {
  it("renders search input and accepts typing (black-box via testid)", () => {
    renderWithProviders(<Search />);
    const input = screen.getByTestId("search-input") as HTMLInputElement;
    expect(input).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "fira" } });
    expect(input.value).toBe("fira");
  });
});
