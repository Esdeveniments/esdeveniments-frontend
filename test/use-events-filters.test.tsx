import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
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
  const { events } = useEvents(props);
  return (
    <div>
      <div data-testid="count">{events.length}</div>
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

    await React.act(async () => {
      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <Harness
            place="catalunya"
            date="tots"
            search="cardedeu"
            initialSize={10}
            fallbackData={[]}
          />
        </React.Suspense>
      );
    });

    const count = await screen.findByTestId("count", {}, { timeout: 3000 });
    expect(count.textContent).toBe("2");
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

    await React.act(async () => {
      render(
        <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
          <React.Suspense fallback={<div>Loading...</div>}>
            <Harness
              place="catalunya"
              date="tots"
              search="foo"
              initialSize={10}
              // Even if we pass fallbackData, it must be ignored for filtered queries
              fallbackData={[createMockEvent("f", "F", "f")]}
            />
          </React.Suspense>
        </SWRConfig>
      );
    });

    // Immediately after render, it should suspend (show loading) instead of showing fallback data
    expect(screen.getByText("Loading...")).toBeInTheDocument();

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

    await React.act(async () => {
      render(
        <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
          <React.Suspense fallback={<div>Loading...</div>}>
            <Harness
              place="catalunya"
              date="tots"
              search="abc"
              distance="28"
              lat="41.6"
              lon="2.35"
              initialSize={10}
            />
          </React.Suspense>
        </SWRConfig>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("count").textContent).toBe("1");
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
