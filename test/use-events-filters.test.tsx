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

  it("does not use fallback data when filters are present, fetches fresh data", async () => {
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
              // Filtered queries should NOT use SSR fallback (it's for unfiltered data)
              fallbackData={[createMockEvent("f", "F", "f")]}
            />
          </React.Suspense>
        </SWRConfig>
      );
    });

    // Fallback data is NOT used when client filters are active (avoids stale SSR events)
    expect(screen.getByTestId("count").textContent).toBe("0");

    // Fetches fresh data
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    // After fetch completes, shows the fresh result
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

  it("includes type=FREE when price is gratis", async () => {
    const fetchSpy = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), "http://localhost");
      expect(url.searchParams.get("type")).toBe("FREE");
      return new Response(
        JSON.stringify({
          content: [createMockEvent("p1", "Free Event", "free-event")],
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
              place="barcelona"
              date="tots"
              price="gratis"
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

  it("includes type=PAID when price is pagament", async () => {
    const fetchSpy = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), "http://localhost");
      expect(url.searchParams.get("type")).toBe("PAID");
      return new Response(
        JSON.stringify({
          content: [createMockEvent("p2", "Paid Event", "paid-event")],
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
              place="barcelona"
              date="tots"
              price="pagament"
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

  it("does not include type when price is default", async () => {
    const fetchSpy = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), "http://localhost");
      expect(url.searchParams.has("type")).toBe(false);
      return new Response(
        JSON.stringify({
          content: [createMockEvent("p3", "Any Event", "any-event")],
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
              place="barcelona"
              date="tots"
              search="trigger"
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

  it("includes from/to in request when explicit dates are provided", async () => {
    const fetchSpy = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), "http://localhost");
      expect(url.searchParams.get("from")).toBe("2026-04-01");
      expect(url.searchParams.get("to")).toBe("2026-04-07");
      // Should not include byDate when explicit from is set
      expect(url.searchParams.has("byDate")).toBe(false);
      return new Response(
        JSON.stringify({
          content: [createMockEvent("d1", "Date Event", "date-event")],
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
              place="barcelona"
              date="tots"
              from="2026-04-01"
              to="2026-04-07"
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

  it("uses from as to when only from is provided", async () => {
    const fetchSpy = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), "http://localhost");
      expect(url.searchParams.get("from")).toBe("2026-05-15");
      expect(url.searchParams.get("to")).toBe("2026-05-15");
      return new Response(
        JSON.stringify({
          content: [createMockEvent("d2", "Single Date", "single-date")],
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
              place="barcelona"
              date="tots"
              from="2026-05-15"
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
