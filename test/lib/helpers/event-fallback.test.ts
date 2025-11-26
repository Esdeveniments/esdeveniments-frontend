import { describe, it, expect, beforeEach, vi } from "vitest";
import type {
  PagedResponseDTO,
  EventSummaryResponseDTO,
} from "types/api/event";
import { fetchEventsWithFallback } from "@lib/helpers/event-fallback";
import { twoWeeksDefault } from "@lib/dates";
import type { FetchEventsParams } from "types/event";

vi.mock("@lib/api/events", () => ({
  fetchEvents: vi.fn(),
}));

vi.mock("@lib/api/regions", () => ({
  fetchRegionsWithCities: vi.fn(),
  fetchRegions: vi.fn(),
}));

import { fetchEvents } from "@lib/api/events";
import {
  fetchRegionsWithCities,
  fetchRegions,
} from "@lib/api/regions";

const mockFetchEvents = vi.mocked(fetchEvents);
const mockFetchRegionsWithCities = vi.mocked(fetchRegionsWithCities);
const mockFetchRegions = vi.mocked(fetchRegions);

function createEvent(id: string): EventSummaryResponseDTO {
  return {
    id,
    hash: id,
    slug: id,
    title: `Event ${id}`,
    type: "FREE",
    url: `https://example.com/${id}`,
    description: "demo",
    imageUrl: "",
    startDate: "2024-01-01",
    startTime: null,
    endDate: "2024-01-01",
    endTime: null,
    location: "Somewhere",
    visits: 0,
    origin: "MANUAL",
    categories: [],
  };
}

function createResponse(
  events: EventSummaryResponseDTO[]
): PagedResponseDTO<EventSummaryResponseDTO> {
  return {
    content: events,
    currentPage: 0,
    pageSize: 10,
    totalElements: events.length,
    totalPages: 1,
    last: true,
  };
}

describe("fetchEventsWithFallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns initial results when events exist", async () => {
    const initialEvents = [createEvent("1")];
    mockFetchEvents.mockResolvedValueOnce(createResponse(initialEvents));

    const result = await fetchEventsWithFallback({
      place: "barcelona",
      initialParams: { page: 0, size: 10 },
    });

    expect(result.events).toEqual(initialEvents);
    expect(result.noEventsFound).toBe(false);
    expect(mockFetchEvents).toHaveBeenCalledTimes(1);
    expect(mockFetchRegionsWithCities).not.toHaveBeenCalled();
  });

  it("falls back to region events when city has a parent region", async () => {
    mockFetchEvents
      .mockResolvedValueOnce(createResponse([]))
      .mockResolvedValueOnce(createResponse([createEvent("fallback")]));

    mockFetchRegionsWithCities.mockResolvedValue([
      {
        id: 10,
        name: "Region",
        cities: [
          {
            id: 1,
            value: "barcelona",
            label: "Barcelona",
            latitude: 1,
            longitude: 1,
          },
        ],
      },
    ]);
    mockFetchRegions.mockResolvedValue([
      { id: 10, name: "Region", slug: "catalunya-central" },
    ]);

    const dateRange = twoWeeksDefault();
    const result = await fetchEventsWithFallback({
      place: "barcelona",
      initialParams: { page: 0, size: 10 },
      regionFallback: {
        includeDateRange: true,
        dateRangeFactory: () => dateRange,
      },
    });

    expect(result.events).toHaveLength(1);
    expect(result.noEventsFound).toBe(true);
    expect(mockFetchEvents).toHaveBeenCalledTimes(2);
    const regionCall = mockFetchEvents.mock.calls[1][0] as FetchEventsParams;
    expect(regionCall.place).toBe("catalunya-central");
    expect(regionCall.from).toBe(dateRange.from.toISOString().slice(0, 10));
    expect(regionCall.to).toBe(dateRange.until.toISOString().slice(0, 10));
  });

  it("falls back to global events when region fallback fails", async () => {
    mockFetchEvents
      .mockResolvedValueOnce(createResponse([]))
      .mockResolvedValueOnce(createResponse([]))
      .mockResolvedValueOnce(createResponse([createEvent("global")]));

    mockFetchRegionsWithCities.mockResolvedValue([
      {
        id: 10,
        name: "Region",
        cities: [
          {
            id: 1,
            value: "barcelona",
            label: "Barcelona",
            latitude: 1,
            longitude: 1,
          },
        ],
      },
    ]);
    mockFetchRegions.mockResolvedValue([
      { id: 10, name: "Region", slug: "catalunya-central" },
    ]);

    const dateRange = twoWeeksDefault();
    const result = await fetchEventsWithFallback({
      place: "barcelona",
      initialParams: { page: 0, size: 10, category: "music" },
      regionFallback: {
        includeDateRange: true,
        dateRangeFactory: () => dateRange,
      },
      finalFallback: {
        includeCategory: false,
        includeDateRange: true,
        dateRangeFactory: () => dateRange,
        place: undefined,
      },
    });

    expect(result.events).toHaveLength(1);
    expect(result.noEventsFound).toBe(true);
    expect(mockFetchEvents).toHaveBeenCalledTimes(3);
    const finalCall =
      mockFetchEvents.mock.calls[mockFetchEvents.mock.calls.length - 1][0];

    expect(finalCall.place).toBeUndefined();
    expect(finalCall.category).toBeUndefined();
    expect(finalCall.from).toBe(dateRange.from.toISOString().slice(0, 10));
    expect(finalCall.to).toBe(dateRange.until.toISOString().slice(0, 10));
  });
});
