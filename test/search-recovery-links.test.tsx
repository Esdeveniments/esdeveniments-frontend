import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import SearchRecoveryLinks from "@components/ui/hybridEventsList/SearchRecoveryLinks";

const mocks = vi.hoisted(() => ({
  segments: { place: "catalunya", date: "tots", category: "tots" },
  queryParams: { search: "blaned" } as Record<string, string | undefined>,
  places: [
    { label: "Blanes", value: "blanes" },
    { label: "Cardedeu", value: "cardedeu" },
  ],
  setLoading: vi.fn(),
  sendGoogleEvent: vi.fn(),
}));

vi.mock("@components/context/UrlFiltersContext", () => ({
  useSharedUrlFilters: () => ({
    segments: mocks.segments,
    queryParams: mocks.queryParams,
  }),
}));

vi.mock("@components/context/FilterLoadingContext", () => ({
  useFilterLoading: () => ({ setLoading: mocks.setLoading }),
}));

vi.mock("@components/hooks/useSearchPlaces", () => ({
  useSearchPlaces: () => mocks.places,
}));

vi.mock("@utils/analytics", () => ({
  sendGoogleEvent: (...args: unknown[]) => mocks.sendGoogleEvent(...args),
}));

vi.mock("@utils/browser", () => ({
  scheduleIdleCallback: (cb: () => void) => cb(),
}));

describe("SearchRecoveryLinks", () => {
  beforeEach(() => {
    mocks.segments = { place: "catalunya", date: "tots", category: "tots" };
    mocks.queryParams = { search: "blaned" };
    mocks.setLoading.mockClear();
    mocks.sendGoogleEvent.mockClear();
  });

  it("renders suggested place link on /catalunya when search is a place typo", () => {
    render(<SearchRecoveryLinks />);

    const nav = screen.getByTestId("search-place-suggestions");
    expect(nav).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Blanes" });
    expect(link).toHaveAttribute("href", "/blanes");

    fireEvent.click(link);
    expect(mocks.sendGoogleEvent).toHaveBeenCalledWith(
      "zero_results_recovery",
      { action: "place_suggestion", place_slug: "blanes" },
    );
  });

  it("renders both place suggestion and filter widening when scoped to another town", () => {
    mocks.segments = { place: "cardedeu", date: "avui", category: "musica" };
    render(<SearchRecoveryLinks />);

    expect(screen.getByRole("link", { name: "Blanes" })).toHaveAttribute(
      "href",
      "/blanes/avui/musica",
    );
    const allLinks = screen.getAllByRole("link");
    expect(allLinks).toHaveLength(4);
    fireEvent.click(allLinks[1]);
    expect(mocks.sendGoogleEvent).toHaveBeenCalledWith(
      "zero_results_recovery",
      expect.objectContaining({
        place_slug: "cardedeu",
        category_slug: "musica",
      }),
    );
  });
});
