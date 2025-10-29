import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useEvents } from "@components/hooks/useEvents";

// Simple harness to exercise the hook without rendering app UI
function EventsHarness(props: any) {
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
      // First activation fetch should be page=1
      const u = new URL(url, "http://localhost");
      const page = u.searchParams.get("page");

      const base = {
        totalElements: 4,
        totalPages: 2,
        pageSize: 10,
      };

      if (page === "1") {
        return new Response(
          JSON.stringify({
            content: [
              { id: "3", title: "Event 3", slug: "e3", location: "Loc", startDate: "2025-01-01", endDate: "2025-01-01" },
              { id: "4", title: "Event 4", slug: "e4", location: "Loc", startDate: "2025-01-02", endDate: "2025-01-02" },
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
            content: [
              { id: "5", title: "Event 5", slug: "e5", location: "Loc", startDate: "2025-01-03", endDate: "2025-01-03" },
            ],
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
        JSON.stringify({ content: [], currentPage: 0, last: true, totalElements: 0, totalPages: 0, pageSize: 10 }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("activates on first click and fetches next pages with filters", async () => {
    const fallback = [
      { id: "1", title: "Event 1", slug: "e1", location: "Loc", startDate: "2025-01-01", endDate: "2025-01-01" },
      { id: "2", title: "Event 2", slug: "e2", location: "Loc", startDate: "2025-01-02", endDate: "2025-01-02" },
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

    // First click activates and triggers fetch for page=1
    fireEvent.click(screen.getByText("Load"));
    await waitFor(() => {
      // The appended events should now include page 1 items (2 more)
      expect(screen.getByTestId("count").textContent).toBe("4");
    });

    // Second click fetches another page (page=2) and becomes last
    fireEvent.click(screen.getByText("Load"));
    await waitFor(() => {
      // Total increases to 5 and hasMore turns false
      expect(screen.getByTestId("count").textContent).toBe("5");
      expect(screen.getByTestId("hasMore").textContent).toBe("false");
    });
  });
});
