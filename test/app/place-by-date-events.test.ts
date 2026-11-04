import { describe, it, expect, vi, afterEach } from "vitest";
import { buildPlaceByDateEventsPromise } from "app/[locale]/[place]/[byDate]/page";
import type { EventSummaryResponseDTO } from "types/api/event";
import type { PageData } from "types/common";

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

function mockEventsBackend(totalElements: number) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const size = Number(new URL(String(input)).searchParams.get("size"));
    const count = Math.min(size, totalElements);
    return Response.json({
      content: Array.from({ length: count }, (_, i) => event(i)),
      currentPage: 0,
      pageSize: size,
      totalElements,
      totalPages: Math.ceil(totalElements / size),
      last: count >= totalElements,
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return () =>
    fetchMock.mock.calls.map(([input]) => new URL(String(input)).searchParams);
}

const realEvents = (events: unknown[]) =>
  events.filter((e) => (e as { isAd?: boolean }).isAd !== true);

const pageData = {
  title: "t",
  subTitle: "s",
  metaTitle: "mt",
  metaDescription: "md",
  canonical: "https://www.esdeveniments.cat/begues/avui",
  notFoundTitle: "nf",
  notFoundDescription: "nfd",
} as PageData;

// The events fetch no longer waits for the event count: it always asks for
// the rich size and trims thin places once the count arrives.
function build(placeIsExpandablePromise: Promise<boolean>) {
  return buildPlaceByDateEventsPromise({
    place: "begues",
    actualDate: "avui",
    paramsForFetch: { page: 0, size: 30, place: "begues" },
    pageDataPromise: Promise.resolve(pageData),
    locale: "ca",
    placeIsExpandablePromise,
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("buildPlaceByDateEventsPromise", () => {
  it("starts the events fetch before the expandability check resolves", async () => {
    const calls = mockEventsBackend(20);
    let resolveExpandable!: (value: boolean) => void;
    const result = build(
      new Promise((resolve) => {
        resolveExpandable = resolve;
      }),
    );

    await vi.waitFor(() => expect(calls()).toHaveLength(1));
    expect(calls()[0].get("size")).toBe("30");
    resolveExpandable(false);
    await result;
  });

  it("trims a thin place to the thin page size and keeps load-more", async () => {
    mockEventsBackend(20);

    const result = await build(Promise.resolve(false));

    expect(result.ssrPageSize).toBe(12);
    expect(realEvents(result.events)).toHaveLength(12);
    expect(result.serverHasMore).toBe(true);
    expect(result.placeIsExpandable).toBe(false);
  });

  it("keeps the rich first page for an expandable place", async () => {
    mockEventsBackend(50);

    const result = await build(Promise.resolve(true));

    expect(result.ssrPageSize).toBe(30);
    expect(realEvents(result.events)).toHaveLength(30);
    expect(result.serverHasMore).toBe(true);
  });

  it("reports no more events when a thin place fits in the first page", async () => {
    mockEventsBackend(12);

    const result = await build(Promise.resolve(false));

    expect(realEvents(result.events)).toHaveLength(12);
    expect(result.serverHasMore).toBe(false);
  });
});
