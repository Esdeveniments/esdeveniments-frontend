import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { filterPastEvents } from "@lib/api/events";
import { filterActiveEvents } from "@utils/event-helpers";
import type { EventSummaryResponseDTO, ListEvent } from "types/api/event";

const baseCity = {
  id: 1,
  name: "Barcelona",
  slug: "barcelona",
  latitude: 41.3851,
  longitude: 2.1734,
  postalCode: "08001",
  rssFeed: null,
  enabled: true,
};

const baseRegion = { id: 1, name: "Barcelona", slug: "barcelona" };
const baseProvince = { id: 1, name: "Barcelona", slug: "barcelona" };

const baseEvent: EventSummaryResponseDTO = {
  id: "event-base",
  hash: "hash-base",
  slug: "event-base",
  title: "Base Event",
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
  city: { ...baseCity },
  region: { ...baseRegion },
  province: { ...baseProvince },
  categories: [],
};

const buildEvent = (
  overrides: Partial<EventSummaryResponseDTO>
): EventSummaryResponseDTO => ({
  ...baseEvent,
  ...overrides,
  city: overrides.city ? { ...overrides.city } : { ...baseCity },
  region: overrides.region ? { ...overrides.region } : { ...baseRegion },
  province: overrides.province
    ? { ...overrides.province }
    : { ...baseProvince },
  categories: overrides.categories ?? [],
});

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2025-03-01T12:00:00Z"));
});

afterAll(() => {
  vi.useRealTimers();
});

describe("filterPastEvents", () => {
  it("removes timed events older than 24h while preserving live/upcoming ones", () => {
    const timedPast = buildEvent({
      id: "past-timed",
      slug: "past-timed",
      startDate: "2025-02-27",
      startTime: "10:00",
      endDate: "2025-02-27",
      endTime: "12:00",
    });

    const sameDayStillLive = buildEvent({
      id: "same-day-live",
      slug: "same-day-live",
      startDate: "2025-03-01",
      startTime: "09:00",
      endDate: "2025-03-01",
      endTime: "18:00",
    });

    const upcomingTimed = buildEvent({
      id: "upcoming-timed",
      slug: "upcoming-timed",
      startDate: "2025-03-02",
      endDate: "2025-03-02",
      startTime: "08:00",
    });

    const result = filterPastEvents([timedPast, sameDayStillLive, upcomingTimed]);

    expect(result.map((event) => event.slug)).toEqual([
      "same-day-live",
      "upcoming-timed",
    ]);
  });

  it("keeps multi-day all-day events that are still running", () => {
    const endedAllDay = buildEvent({
      id: "all-day-ended",
      slug: "all-day-ended",
      startDate: "2025-02-20",
      endDate: "2025-02-28",
      startTime: null,
      endTime: null,
    });

    const ongoingAllDay = buildEvent({
      id: "all-day-ongoing",
      slug: "all-day-ongoing",
      startDate: "2025-02-28",
      endDate: "2025-03-02",
      startTime: null,
      endTime: null,
    });

    const result = filterPastEvents([endedAllDay, ongoingAllDay]);

    expect(result.map((event) => event.slug)).toEqual(["all-day-ongoing"]);
  });
});

describe("filterActiveEvents", () => {
  it("filters out ads and past events from mixed list responses", () => {
    const adItem: ListEvent = {
      isAd: true,
      id: "ad-1",
    };

    const pastEvent = buildEvent({
      id: "list-past",
      slug: "list-past",
      startDate: "2025-02-15",
      endDate: "2025-02-15",
      startTime: "08:00",
      endTime: "10:00",
    });

    const activeEvent = buildEvent({
      id: "list-active",
      slug: "list-active",
      startDate: "2025-03-01",
      startTime: "09:00",
      endDate: "2025-03-01",
      endTime: "18:00",
    });

    const upcomingEvent = buildEvent({
      id: "list-upcoming",
      slug: "list-upcoming",
      startDate: "2025-03-03",
      endDate: "2025-03-03",
      startTime: "10:00",
    });

    const result = filterActiveEvents([
      adItem,
      pastEvent,
      activeEvent,
      upcomingEvent,
    ]);

    expect(result.map((event) => event.slug)).toEqual([
      "list-active",
      "list-upcoming",
    ]);
  });
});
