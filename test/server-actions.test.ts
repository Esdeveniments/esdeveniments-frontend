import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createEventAction } from "../app/publica/actions";
import { editEvent } from "../app/e/[eventId]/edita/actions";
import type { EventCreateRequestDTO, EventUpdateRequestDTO } from "types/api/event";
import type { EventDetailResponseDTO } from "types/api/event";

// Mock next/cache
const mockUpdateTag = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next/cache", () => ({
  updateTag: (tag: string) => mockUpdateTag(tag),
  refresh: () => mockRefresh(),
}));

// Mock next/server
const mockAfter = vi.fn((callback: () => void | Promise<void>) => {
  // In tests, execute callback synchronously
  return callback();
});

vi.mock("next/server", () => ({
  after: (callback: () => void | Promise<void>) => mockAfter(callback),
}));

// Mock lib/api/events
const mockCreateEvent = vi.fn();
const mockUpdateEventById = vi.fn();

vi.mock("@lib/api/events", () => ({
  createEvent: (data: EventCreateRequestDTO, imageFile?: File) =>
    mockCreateEvent(data, imageFile),
  updateEventById: (uuid: string, data: EventUpdateRequestDTO) =>
    mockUpdateEventById(uuid, data),
}));

const originalEnv = { ...process.env };

describe("Server Actions - Next.js 16 caching", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("createEventAction", () => {
    it("calls updateTag for events and events:categorized tags", async () => {
      const mockEvent: EventDetailResponseDTO = {
        id: "test-id",
        hash: "test-hash",
        slug: "test-event",
        title: "Test Event",
        type: "FREE",
        url: "https://test.com",
        description: "Test description",
        imageUrl: "",
        startDate: "2025-06-15",
        startTime: null,
        endDate: "2025-06-15",
        endTime: null,
        location: "Test Location",
        visits: 0,
        origin: "MANUAL",
        city: {
          id: 1,
          name: "Test City",
          slug: "test-city",
          latitude: 41.3851,
          longitude: 2.1734,
          postalCode: "08000",
          rssFeed: null,
          enabled: true,
        },
        region: {
          id: 1,
          name: "Test Region",
          slug: "test-region",
        },
        province: {
          id: 1,
          name: "Test Province",
          slug: "test-province",
        },
        categories: [],
      };

      mockCreateEvent.mockResolvedValue(mockEvent);

      const eventData: EventCreateRequestDTO = {
        title: "Test Event",
        type: "FREE",
        url: "https://test.com",
        description: "Test description",
        imageUrl: "",
        regionId: 1,
        cityId: 1,
        startDate: "2025-06-15",
        startTime: "",
        endDate: "2025-06-15",
        endTime: "",
        location: "Test Location",
        categories: [],
      };

      const result = await createEventAction(eventData);

      expect(mockCreateEvent).toHaveBeenCalledWith(eventData, undefined);
      expect(mockUpdateTag).toHaveBeenCalledWith("events");
      expect(mockUpdateTag).toHaveBeenCalledWith("events:categorized");
      expect(mockRefresh).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ success: true, event: mockEvent });
    });

    it("calls refresh after updating tags", async () => {
      const mockEvent: EventDetailResponseDTO = {
        id: "test-id",
        hash: "test-hash",
        slug: "test-event",
        title: "Test Event",
        type: "FREE",
        url: "https://test.com",
        description: "Test description",
        imageUrl: "",
        startDate: "2025-06-15",
        startTime: null,
        endDate: "2025-06-15",
        endTime: null,
        location: "Test Location",
        visits: 0,
        origin: "MANUAL",
        city: {
          id: 1,
          name: "Test City",
          slug: "test-city",
          latitude: 41.3851,
          longitude: 2.1734,
          postalCode: "08000",
          rssFeed: null,
          enabled: true,
        },
        region: {
          id: 1,
          name: "Test Region",
          slug: "test-region",
        },
        province: {
          id: 1,
          name: "Test Province",
          slug: "test-province",
        },
        categories: [],
      };

      mockCreateEvent.mockResolvedValue(mockEvent);

      const eventData: EventCreateRequestDTO = {
        title: "Test Event",
        type: "FREE",
        url: "https://test.com",
        description: "Test description",
        imageUrl: "",
        regionId: 1,
        cityId: 1,
        startDate: "2025-06-15",
        startTime: "",
        endDate: "2025-06-15",
        endTime: "",
        location: "Test Location",
        categories: [],
      };

      await createEventAction(eventData);

      // Verify refresh is called after updateTag calls
      const updateTagCalls = mockUpdateTag.mock.calls.length;
      expect(updateTagCalls).toBeGreaterThan(0);
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe("editEvent", () => {
    it("calls updateTag for events and the specific event tag", async () => {
      const mockUpdatedEvent: EventDetailResponseDTO = {
        id: "test-id",
        hash: "test-hash",
        slug: "updated-event",
        title: "Updated Event",
        type: "FREE",
        url: "https://test.com",
        description: "Updated description",
        imageUrl: "",
        startDate: "2025-06-15",
        startTime: null,
        endDate: "2025-06-15",
        endTime: null,
        location: "Updated Location",
        visits: 0,
        origin: "MANUAL",
        city: {
          id: 1,
          name: "Test City",
          slug: "test-city",
          latitude: 41.3851,
          longitude: 2.1734,
          postalCode: "08000",
          rssFeed: null,
          enabled: true,
        },
        region: {
          id: 1,
          name: "Test Region",
          slug: "test-region",
        },
        province: {
          id: 1,
          name: "Test Province",
          slug: "test-province",
        },
        categories: [],
      };

      mockUpdateEventById.mockResolvedValue(mockUpdatedEvent);

      const updateData: EventUpdateRequestDTO = {
        title: "Updated Event",
        type: "FREE",
        url: "https://test.com",
        description: "Updated description",
        imageUrl: "",
        regionId: 1,
        cityId: 1,
        startDate: "2025-06-15",
        startTime: "",
        endDate: "2025-06-15",
        endTime: "",
        location: "Updated Location",
        categories: [],
      };

      const result = await editEvent("test-id", "old-event", updateData);

      expect(mockUpdateEventById).toHaveBeenCalledWith("test-id", updateData);
      expect(mockUpdateTag).toHaveBeenCalledWith("events");
      expect(mockUpdateTag).toHaveBeenCalledWith("event:old-event");
      expect(mockUpdateTag).toHaveBeenCalledWith("event:updated-event");
      expect(mockRefresh).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ success: true, newSlug: "updated-event" });
    });

    it("does not update old event tag when slug unchanged", async () => {
      const mockUpdatedEvent: EventDetailResponseDTO = {
        id: "test-id",
        hash: "test-hash",
        slug: "same-event",
        title: "Updated Event",
        type: "FREE",
        url: "https://test.com",
        description: "Updated description",
        imageUrl: "",
        startDate: "2025-06-15",
        startTime: null,
        endDate: "2025-06-15",
        endTime: null,
        location: "Updated Location",
        visits: 0,
        origin: "MANUAL",
        city: {
          id: 1,
          name: "Test City",
          slug: "test-city",
          latitude: 41.3851,
          longitude: 2.1734,
          postalCode: "08000",
          rssFeed: null,
          enabled: true,
        },
        region: {
          id: 1,
          name: "Test Region",
          slug: "test-region",
        },
        province: {
          id: 1,
          name: "Test Province",
          slug: "test-province",
        },
        categories: [],
      };

      mockUpdateEventById.mockResolvedValue(mockUpdatedEvent);

      const updateData: EventUpdateRequestDTO = {
        title: "Updated Event",
        type: "FREE",
        url: "https://test.com",
        description: "Updated description",
        imageUrl: "",
        regionId: 1,
        cityId: 1,
        startDate: "2025-06-15",
        startTime: "",
        endDate: "2025-06-15",
        endTime: "",
        location: "Updated Location",
        categories: [],
      };

      await editEvent("test-id", "same-event", updateData);

      expect(mockUpdateTag).toHaveBeenCalledWith("events");
      expect(mockUpdateTag).toHaveBeenCalledWith("event:same-event");
      // Should not call updateTag for old slug when slug is unchanged
      expect(mockUpdateTag).not.toHaveBeenCalledWith("event:old-event");
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    it("calls refresh after updating tags", async () => {
      const mockUpdatedEvent: EventDetailResponseDTO = {
        id: "test-id",
        hash: "test-hash",
        slug: "updated-event",
        title: "Updated Event",
        type: "FREE",
        url: "https://test.com",
        description: "Updated description",
        imageUrl: "",
        startDate: "2025-06-15",
        startTime: null,
        endDate: "2025-06-15",
        endTime: null,
        location: "Updated Location",
        visits: 0,
        origin: "MANUAL",
        city: {
          id: 1,
          name: "Test City",
          slug: "test-city",
          latitude: 41.3851,
          longitude: 2.1734,
          postalCode: "08000",
          rssFeed: null,
          enabled: true,
        },
        region: {
          id: 1,
          name: "Test Region",
          slug: "test-region",
        },
        province: {
          id: 1,
          name: "Test Province",
          slug: "test-province",
        },
        categories: [],
      };

      mockUpdateEventById.mockResolvedValue(mockUpdatedEvent);

      const updateData: EventUpdateRequestDTO = {
        title: "Updated Event",
        type: "FREE",
        url: "https://test.com",
        description: "Updated description",
        imageUrl: "",
        regionId: 1,
        cityId: 1,
        startDate: "2025-06-15",
        startTime: "",
        endDate: "2025-06-15",
        endTime: "",
        location: "Updated Location",
        categories: [],
      };

      await editEvent("test-id", "old-event", updateData);

      // Verify refresh is called after updateTag calls
      const updateTagCalls = mockUpdateTag.mock.calls.length;
      expect(updateTagCalls).toBeGreaterThan(0);
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });
  });
});

