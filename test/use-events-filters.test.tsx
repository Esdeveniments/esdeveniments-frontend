import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { useEvents } from "@components/hooks/useEvents";
import type { UseEventsOptions } from "types/event";
import type { EventSummaryResponseDTO } from "types/api/event";

function createMockEvent(id: string, title: string, slug: string): EventSummaryResponseDTO {
  return {
    id,
    hash: `hash-${id}`,
    slug,
    title,
    type: "FREE",
    url: `https://example.com/${slug}`,
    description: "",
    imageUrl: "",
    startDate: "2025-01-01",
    startTime: null,
    endDate: "2025-01-01",
    endTime: null,
    location: "Barcelona",
    visits: 0,
    origin: "MANUAL",
    city: {
      id: 1,
      name: "Barcelona",
      slug: "barcelona",
      latitude: 41.3851,
      longitude: 2.1734,
      postalCode: "08001",
      rssFeed: null,
      enabled: true,
    },
    region: { id: 1, name: "Barcelona", slug: "barcelona" },
    province: { id: 1, name: "Barcelona", slug: "barcelona" },
    categories: [],
  };
}

function Harness(props: UseEventsOptions) {
  const { events, isLoading } = useEvents(props);
  return (
    <div>
      <div data-testid="count">{events.length}</div>
      <div data-testid="loading">{String(isLoading)}</div>
    </div>
  );
}

describe("useEvents filtered behaviour", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("fetches immediately on mount when search filter is present", async () => {
    const fetchSpy = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), "http://localhost");
      const page = url.searchParams.get("page");
      const term = url.searchParams.get("term");
      // Assert correct term and initial page=0
      expect(term).toBe("cardedeu");
      expect(page).toBe("0");
      return new Response(
        JSON.stringify({
          content: [
            createMockEvent("a", "A", "a"),
            createMockEvent("b", "B", "b"),
          ],
          currentPage: 0,
          pageSize: 10,
          totalElements: 2,
          totalPages: 1,
          last: true,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;
    globalThis.fetch = fetchSpy;

    render(
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
        <Harness
          place="catalunya"
          date="tots"
          search="cardedeu"
          initialSize={10}
          fallbackData={[]}
        />
      </SWRConfig>
    );

    await waitFor(() => {
      expect(screen.getByTestId("count").textContent).toBe("2");
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("does not use SSR fallback when filters are present (initially empty then fetch)", async () => {
    // Slow fetch to observe initial state
    globalThis.fetch = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 50));
      return new Response(
        JSON.stringify({
          content: [createMockEvent("x", "X", "x")],
          currentPage: 0,
          pageSize: 10,
          totalElements: 1,
          totalPages: 1,
          last: true,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    render(
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
        <Harness
          place="catalunya"
          date="tots"
          search="foo"
          initialSize={10}
          // Even if we pass fallbackData, it must be ignored for filtered queries
          fallbackData={[createMockEvent("f", "F", "f")]}
        />
      </SWRConfig>
    );

    // Immediately after render, no fallback should be shown
    expect(screen.getByTestId("count").textContent).toBe("0");

    await waitFor(() => {
      expect(screen.getByTestId("count").textContent).toBe("1");
    });
  });

  it("includes distance/lat/lon in the request when provided", async () => {
    const fetchSpy = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), "http://localhost");
      expect(url.searchParams.get("radius")).not.toBeNull();
      expect(url.searchParams.get("lat")).toBe("41.6");
      expect(url.searchParams.get("lon")).toBe("2.35");
      return new Response(
        JSON.stringify({
          content: [createMockEvent("g", "G", "g")],
          currentPage: 0,
          pageSize: 10,
          totalElements: 1,
          totalPages: 1,
          last: true,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;
    globalThis.fetch = fetchSpy;

    render(
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
        <Harness
          place="catalunya"
          date="tots"
          search="abc"
          distance="28"
          lat="41.6"
          lon="2.35"
          initialSize={10}
        />
      </SWRConfig>
    );

    await waitFor(() => {
      expect(screen.getByTestId("count").textContent).toBe("1");
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
