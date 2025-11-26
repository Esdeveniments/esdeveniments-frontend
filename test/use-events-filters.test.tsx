import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
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

    await act(async () => {
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

    await waitFor(() => {
      expect(screen.getByTestId("count").textContent).toBe("2");
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("uses fallback data immediately but revalidates when filters are present", async () => {
    const fetchSpy = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 20));
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
    globalThis.fetch = fetchSpy;

    await act(async () => {
      render(
        <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
          <React.Suspense fallback={<div>Loading...</div>}>
            <Harness
              place="catalunya"
              date="tots"
              search="foo"
              initialSize={10}
              // Filtered queries should still show SSR fallback while revalidating
              fallbackData={[createMockEvent("f", "F", "f")]}
            />
          </React.Suspense>
        </SWRConfig>
      );
    });

    // Should render immediately with fallback count
    expect(screen.getByTestId("count").textContent).toBe("1");

    // Fetches fresh data
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    // After fetch completes, shows the revalidated result
    await waitFor(() => expect(screen.getByTestId("count").textContent).toBe("1"));
  });

  it("includes distance/lat/lon in the request when provided", async () => {
    const fetchSpy = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), "http://localhost");
      expect(url.searchParams.get("radius")).not.toBeNull();
      expect(url.searchParams.get("lat")).toBe("41.6");
      expect(url.searchParams.get("lon")).toBe("2.35");
      // Should not include place when doing a radius search (backend uses radius over place)
      expect(url.searchParams.get("place")).toBeNull();
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

    await act(async () => {
      render(
        <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
          <React.Suspense fallback={<div>Loading...</div>}>
            <Harness
              place="cardedeu"
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

  it("keeps place when distance is present but coordinates are missing", async () => {
    const fetchSpy = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), "http://localhost");
      expect(url.searchParams.get("place")).toBe("cardedeu");
      expect(url.searchParams.get("radius")).toBeNull();
      expect(url.searchParams.get("lat")).toBeNull();
      expect(url.searchParams.get("lon")).toBeNull();
      return new Response(
        JSON.stringify({
          content: [createMockEvent("h", "H", "h")],
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

    await act(async () => {
      render(
        <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
          <React.Suspense fallback={<div>Loading...</div>}>
            <Harness
              place="cardedeu"
              date="tots"
              distance="15"
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

  it("includes place when no radius filter is set", async () => {
    const fetchSpy = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), "http://localhost");
      expect(url.searchParams.get("place")).toBe("cardedeu");
      expect(url.searchParams.get("radius")).toBeNull();
      return new Response(
        JSON.stringify({
          content: [createMockEvent("i", "I", "i")],
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

    await act(async () => {
      render(
        <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
          <React.Suspense fallback={<div>Loading...</div>}>
            <Harness
              place="cardedeu"
              date="tots"
              search="something"
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
