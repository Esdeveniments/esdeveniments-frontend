import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import HybridEventsListClient from "@components/ui/hybridEventsList/HybridEventsListClient";
import { useEvents } from "@components/hooks/useEvents";
import { useSharedUrlFilters } from "@components/context/UrlFiltersContext";
import { sendGoogleEvent } from "@utils/analytics";
import { parseFiltersFromUrl } from "@utils/url-filters";
import { extractURLSegments } from "@utils/url-parsing";
import type { EventSummaryResponseDTO } from "types/api/event";

vi.mock("@components/hooks/useEvents", () => ({ useEvents: vi.fn() }));
vi.mock("@components/context/UrlFiltersContext", () => ({
  useSharedUrlFilters: vi.fn(),
}));
vi.mock("@utils/analytics", () => ({ sendGoogleEvent: vi.fn() }));
vi.mock("@components/hooks/useListingAnalytics", () => ({ default: vi.fn() }));
vi.mock("next/dynamic", () => ({
  default: () => (props: Record<string, unknown>) => (
    <div data-testid="client-cards">{JSON.stringify(props)}</div>
  ),
}));

const event: EventSummaryResponseDTO = {
  id: "existing-event",
  hash: "existing-hash",
  slug: "existing-event",
  title: "Already loaded event",
  isPromoted: false,
  url: null,
  description: "",
  imageUrl: null,
  startDate: "2026-10-25",
  startTime: null,
  endDate: "2026-10-25",
  endTime: null,
  location: "Barcelona",
  visits: 0,
  origin: "MANUAL",
  categories: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useSharedUrlFilters).mockReturnValue(
    parseFiltersFromUrl(
      extractURLSegments("/barcelona"),
      new URLSearchParams("search=music"),
    ),
  );
  vi.mocked(useEvents).mockReturnValue({
    events: [],
    totalEvents: 0,
    hasMore: false,
    isLoading: false,
    isLoadingMore: false,
    loadMore: vi.fn(),
    error: new Error("Failed to fetch events: 503"),
  });
});

describe("listing outage UI", () => {
  it("keeps loaded filtered cards visible alongside an error notice", () => {
    vi.mocked(useEvents).mockReturnValue({
      ...useEvents({ place: "barcelona" }),
      events: [event],
    });

    render(<HybridEventsListClient initialEvents={[]} place="barcelona" />);

    expect(screen.getByRole("alert")).toHaveTextContent("Error al carregar");
    expect(screen.getByTestId("client-cards")).toHaveTextContent(event.title);
  });

  it("shows an error on unfiltered pagination failures too", () => {
    vi.mocked(useSharedUrlFilters).mockReturnValue(
      parseFiltersFromUrl(extractURLSegments("/barcelona"), new URLSearchParams()),
    );

    render(<HybridEventsListClient initialEvents={[event]} place="barcelona" />);

    expect(screen.getByRole("alert")).toHaveTextContent("Error al carregar");
  });

  it("does not report an outage as loaded or zero search results", () => {
    render(<HybridEventsListClient initialEvents={[]} place="barcelona" />);

    expect(screen.getByRole("alert")).toBeVisible();
    expect(sendGoogleEvent).not.toHaveBeenCalledWith(
      "search_results_loaded",
      expect.anything(),
    );
    expect(sendGoogleEvent).not.toHaveBeenCalledWith("zero_results", expect.anything());
  });
});
