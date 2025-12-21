import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import { buildPlaceEventsPromise } from "app/[place]/page";
import { fetchEventsWithFallback } from "@lib/helpers/event-fallback";
import type { EventSummaryResponseDTO, PagedResponseDTO } from "types/api/event";
import { addLocalizedDateFields } from "@utils/mappers/event";
import { DEFAULT_LOCALE, type AppLocale } from "types/i18n";

vi.mock("@lib/helpers/event-fallback", () => ({
  fetchEventsWithFallback: vi.fn(),
}));

vi.mock("@lib/api/events", () => ({
  insertAds: (events: EventSummaryResponseDTO[]) => events,
}));

vi.mock("@components/partials/seo-meta", () => ({
  generateItemListStructuredData: vi.fn(() => ({})),
}));

vi.mock("types/api/isEventSummaryResponseDTO", () => ({
  isEventSummaryResponseDTO: () => true,
}));

const fetchEventsWithFallbackMock = vi.mocked(fetchEventsWithFallback);

const baseEvent: EventSummaryResponseDTO = {
  id: "event-1",
  hash: "hash-1",
  slug: "event-1",
  title: "Sample",
  type: "FREE",
  url: "https://example.com",
  description: "",
  imageUrl: "",
  startDate: "2025-03-01",
  startTime: null,
  endDate: "2025-03-01",
  endTime: null,
  location: "Barcelona",
  visits: 0,
  origin: "MANUAL",
  categories: [],
};

const buildEvent = (overrides: Partial<EventSummaryResponseDTO>): EventSummaryResponseDTO => ({
  ...baseEvent,
  ...overrides,
});

const emptyResponse: PagedResponseDTO<EventSummaryResponseDTO> = {
  content: [],
  currentPage: 0,
  pageSize: 10,
  totalElements: 0,
  totalPages: 0,
  last: true,
};

beforeAll(() => {
  vi.useFakeTimers();
});

afterAll(() => {
  vi.useRealTimers();
});

beforeEach(() => {
  vi.setSystemTime(new Date("2025-03-01T12:00:00Z"));
  vi.clearAllMocks();
});

describe("buildPlaceEventsPromise", () => {
  it("does not set a default from date when no filters", async () => {
    fetchEventsWithFallbackMock.mockResolvedValue({
      eventsResponse: emptyResponse,
      events: [],
      noEventsFound: true,
    });

    await buildPlaceEventsPromise({ place: "catalunya" });

    expect(fetchEventsWithFallbackMock).toHaveBeenCalledTimes(1);
    const args = fetchEventsWithFallbackMock.mock.calls[0][0];
    expect(args.initialParams.from).toBeUndefined();
    expect(args.regionFallback?.includeDateRange).toBe(true);
    expect(args.finalFallback?.includeDateRange).toBe(true);
  });

  it("returns API events as-is and preserves server hasMore flag", async () => {
    const eventA = buildEvent({ id: "a", slug: "a" });
    const eventB = buildEvent({ id: "b", slug: "b" });

    fetchEventsWithFallbackMock.mockResolvedValue({
      eventsResponse: {
        ...emptyResponse,
        content: [eventA, eventB],
        totalElements: 2,
        totalPages: 1,
        last: false,
      },
      events: [eventA, eventB],
      noEventsFound: false,
    });

    const result = await buildPlaceEventsPromise({ place: "catalunya" });

    const localized = addLocalizedDateFields(
      [eventA, eventB],
      DEFAULT_LOCALE as AppLocale
    );

    expect(result.events).toEqual(localized);
    expect(result.noEventsFound).toBe(false);
    expect(result.serverHasMore).toBe(true);
  });
});
