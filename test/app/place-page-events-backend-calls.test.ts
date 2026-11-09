import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildPlaceEventsPromise } from "app/[locale]/[place]/page";
import { getPlaceTypeAndLabelCached } from "@utils/helpers";
import type { EventSummaryResponseDTO } from "types/api/event";

vi.mock("next/cache", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/cache")>()),
  cacheLife: vi.fn(),
}));

vi.mock("@utils/helpers", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@utils/helpers")>()),
  getPlaceTypeAndLabelCached: vi.fn(),
}));

const event = (i: number): EventSummaryResponseDTO => ({
  id: `event-${i}`,
  hash: `hash-${i}`,
  slug: `event-${i}`,
  title: `Event ${i}`,
  isPromoted: false,
  url: "https://example.com",
  description: "",
  imageUrl: "",
  startDate: "2026-11-01",
  startTime: null,
  endDate: "2026-11-01",
  endTime: null,
  location: "Begues",
  visits: 0,
  origin: "MANUAL",
  categories: [],
});

function mockEventsBackend(totalElements: number, status = 200) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    if (status !== 200) return new Response("down", { status });
    const url = new URL(String(input));
    const size = Number(url.searchParams.get("size"));
    const count = Math.min(size, totalElements);
    return new Response(
      JSON.stringify({
        content: Array.from({ length: count }, (_, i) => event(i)),
        currentPage: 0,
        pageSize: size,
        totalElements,
        totalPages: Math.ceil(totalElements / size),
        last: count >= totalElements,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  });
  vi.stubGlobal("fetch", fetchMock);
  return () =>
    fetchMock.mock.calls
      .map(([input]) => new URL(String(input)))
      .filter((url) => url.pathname.endsWith("/events"))
      .map((url) => url.searchParams);
}

const realEvents = (events: unknown[]) =>
  events.filter((e) => (e as { isAd?: boolean }).isAd !== true);

beforeEach(() => {
  vi.mocked(getPlaceTypeAndLabelCached).mockResolvedValue({
    type: "town",
    label: "Begues",
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("buildPlaceEventsPromise backend calls for a town", () => {
  it("should read a thin town's count from the events response in one call", async () => {
    const eventsCalls = mockEventsBackend(20);

    const result = await buildPlaceEventsPromise({ place: "begues" });

    const calls = eventsCalls();
    expect(calls).toHaveLength(1);
    expect(calls[0].get("place")).toBe("begues");
    expect(calls[0].get("size")).toBe("30");
    expect(result.placeIsExpandable).toBe(false);
    expect(result.ssrPageSize).toBe(12);
    expect(realEvents(result.events)).toHaveLength(12);
    expect(result.serverHasMore).toBe(true);
  });

  it("should keep the rich first page for an expandable town in one call", async () => {
    const eventsCalls = mockEventsBackend(50);

    const result = await buildPlaceEventsPromise({ place: "sabadell" });

    const calls = eventsCalls();
    expect(calls).toHaveLength(1);
    expect(calls[0].get("place")).toBe("sabadell");
    expect(calls[0].get("size")).toBe("30");
    expect(result.placeIsExpandable).toBe(true);
    expect(result.ssrPageSize).toBe(30);
    expect(realEvents(result.events)).toHaveLength(30);
    expect(result.serverHasMore).toBe(true);
  });

  it("should report no more events when a thin town fits in the first page", async () => {
    mockEventsBackend(12);

    const result = await buildPlaceEventsPromise({ place: "begues" });

    expect(realEvents(result.events)).toHaveLength(12);
    expect(result.serverHasMore).toBe(false);
  });

  it("should hide explore links for a town with no events", async () => {
    const eventsCalls = mockEventsBackend(0);

    const result = await buildPlaceEventsPromise({ place: "begues" });

    expect(eventsCalls().some((q) => q.get("size") === "1")).toBe(true);
    expect(result.placeIsExpandable).toBe(false);
  });

  it("should keep explore links when the events API is down", async () => {
    mockEventsBackend(0, 500);

    const result = await buildPlaceEventsPromise({ place: "begues" });

    expect(result.noEventsFound).toBe(true);
    expect(result.placeIsExpandable).toBe(true);
  });
});
