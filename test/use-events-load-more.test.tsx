import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useEvents } from "@components/hooks/useEvents";
import type { UseEventsOptions } from "types/event";
import type { EventSummaryResponseDTO } from "types/api/event";

// Helper to create mock events
function createMockEvent(
  id: string,
  title: string,
  slug: string
): EventSummaryResponseDTO {
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
    region: {
      id: 1,
      name: "Barcelona",
      slug: "barcelona",
    },
    province: {
      id: 1,
      name: "Barcelona",
      slug: "barcelona",
    },
    categories: [],
  };
}

// Simple harness to exercise the hook without rendering app UI
function EventsHarness(props: UseEventsOptions) {
  const { events, hasMore, loadMore, isLoading } = useEvents(props);
  return (
    <div>
      <div data-testid="count">{events.length}</div>
      <div data-testid="hasMore">{String(hasMore)}</div>
      <div data-testid="loading">{String(isLoading)}</div>
      <button onClick={loadMore}>Load</button>
    </div>
  );
}

import { SWRConfig } from "swr";

describe("useEvents load more (integration)", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.resetModules();
    // Mock fetch for /api/events
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      // First activation fetch should be page=0 (SWR uses 0-based indexing)
      const u = new URL(url, "http://localhost");
      const page = u.searchParams.get("page");

      const base = {
        totalElements: 4,
        totalPages: 2,
        pageSize: 10,
      };

      // Page 0 is the SSR/fallback page (should not be requested due to fallbackData)
      if (page === "0") {
        return new Response(
          JSON.stringify({
            content: [
              createMockEvent("1", "Event 1", "e1"),
              createMockEvent("2", "Event 2", "e2"),
            ],
            currentPage: 0,
            last: false,
            ...base,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (page === "1") {
        return new Response(
          JSON.stringify({
            content: [
              createMockEvent("3", "Event 3", "e3"),
              createMockEvent("4", "Event 4", "e4"),
            ],
            currentPage: 1,
            last: false,
            ...base,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (page === "2") {
        return new Response(
          JSON.stringify({
            content: [createMockEvent("5", "Event 5", "e5")],
            currentPage: 2,
            last: true,
            totalElements: 5,
            totalPages: 3,
            pageSize: 10,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      // Unexpected page
      return new Response(
        JSON.stringify({
          content: [],
          currentPage: 0,
          last: true,
          totalElements: 0,
          totalPages: 0,
          pageSize: 10,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("activates on first click and fetches next pages with filters", async () => {
    const fallback = [
      createMockEvent("1", "Event 1", "e1"),
      createMockEvent("2", "Event 2", "e2"),
    ];

    render(
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
        <EventsHarness
          place="barcelona"
          category="music"
          date="avui"
          initialSize={10}
          fallbackData={fallback}
          serverHasMore={true}
        />
      </SWRConfig>
    );

    // Initially should show fallback data (2 events)
    await waitFor(() => {
      expect(screen.getByTestId("count").textContent).toBe("2");
      expect(screen.getByTestId("hasMore").textContent).toBe("true");
    });

    // First click activates and triggers fetch for page=1
    fireEvent.click(screen.getByText("Load"));
    await waitFor(
      () => {
        // The appended events should now include page 1 items (2 more)
        expect(screen.getByTestId("count").textContent).toBe("4");
      },
      { timeout: 3000 }
    );

    // Second click fetches another page (page=2) and becomes last
    fireEvent.click(screen.getByText("Load"));
    await waitFor(
      () => {
        // Total increases to 5 and hasMore turns false
        expect(screen.getByTestId("count").textContent).toBe("5");
        expect(screen.getByTestId("hasMore").textContent).toBe("false");
      },
      { timeout: 3000 }
    );
  });
});
