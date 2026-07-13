import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createEventAction } from "../app/[locale]/publica/actions";
import { editEvent } from "../app/[locale]/e/[eventId]/edita/actions";
import type { EventCreateRequestDTO, EventUpdateRequestDTO } from "types/api/event";
import type { EventDetailResponseDTO } from "types/api/event";
import type { AuthUser } from "types/auth";

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
const mockFetchEventBySlug = vi.fn();

vi.mock("@lib/api/events", () => ({
  createEvent: (data: EventCreateRequestDTO, imageFile?: File) =>
    mockCreateEvent(data, imageFile),
  updateEventById: (uuid: string, data: EventUpdateRequestDTO) =>
    mockUpdateEventById(uuid, data),
  fetchEventBySlug: (slug: string) => mockFetchEventBySlug(slug),
}));

// Mock lib/auth/session
const mockGetCurrentUser = vi.fn();

vi.mock("@lib/auth/session", () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

const CREATOR_ID = "creator-uuid";
const OTHER_USER_ID = "other-uuid";

const creatorUser: AuthUser = {
  id: CREATOR_ID,
  email: "creator@example.com",
  name: "Creator",
  username: "creator",
  role: "USER",
  emailVerified: true,
};

const otherUser: AuthUser = {
  id: OTHER_USER_ID,
  email: "other@example.com",
  name: "Other",
  username: "other",
  role: "USER",
  emailVerified: true,
};

const originalEnv = { ...process.env };

function buildEvent(overrides: Partial<EventDetailResponseDTO> = {}): EventDetailResponseDTO {
  return {
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
    createdByUser: {
      id: CREATOR_ID,
      email: "creator@example.com",
      name: "Creator",
      username: "creator",
    },
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
    ...overrides,
  };
}

describe("Server Actions - Next.js 16 caching", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com";
    // Default to a creator session and a matching event.
    mockGetCurrentUser.mockResolvedValue(creatorUser);
    mockFetchEventBySlug.mockResolvedValue(buildEvent());
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("createEventAction", () => {
    it("calls updateTag for events and events:categorized tags", async () => {
      const mockEvent = buildEvent();

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

    it("calls refresh after updateTag calls", async () => {
      const mockEvent = buildEvent();

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
      const mockUpdatedEvent = buildEvent({
        slug: "updated-event",
        title: "Updated Event",
        description: "Updated description",
        location: "Updated Location",
      });

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
      const mockUpdatedEvent = buildEvent({
        slug: "same-event",
        title: "Updated Event",
        description: "Updated description",
        location: "Updated Location",
      });

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
      const mockUpdatedEvent = buildEvent({
        slug: "updated-event",
        title: "Updated Event",
        description: "Updated description",
        location: "Updated Location",
      });

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

    it("returns an unauthorized result when the current user is not the creator", async () => {
      mockGetCurrentUser.mockResolvedValue(otherUser);

      const updateData: EventUpdateRequestDTO = {
        title: "Hacked Event",
        type: "FREE",
        url: "https://test.com",
        description: "Hacked description",
        imageUrl: "",
        regionId: 1,
        cityId: 1,
        startDate: "2025-06-15",
        startTime: "",
        endDate: "2025-06-15",
        endTime: "",
        location: "Hacked Location",
        categories: [],
      };

      const result = await editEvent("test-id", "test-event", updateData);

      expect(result).toEqual({
        success: false,
        error: "Unauthorized: only the event creator can edit this event",
      });
      expect(mockUpdateEventById).not.toHaveBeenCalled();
      expect(mockUpdateTag).not.toHaveBeenCalled();
      expect(mockRefresh).not.toHaveBeenCalled();
    });

    it("returns an unauthorized result when the user is not logged in", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      const updateData: EventUpdateRequestDTO = {
        title: "Hacked Event",
        type: "FREE",
        url: "https://test.com",
        description: "Hacked description",
        imageUrl: "",
        regionId: 1,
        cityId: 1,
        startDate: "2025-06-15",
        startTime: "",
        endDate: "2025-06-15",
        endTime: "",
        location: "Hacked Location",
        categories: [],
      };

      const result = await editEvent("test-id", "test-event", updateData);

      expect(result).toEqual({
        success: false,
        error: "Unauthorized: only the event creator can edit this event",
      });
      expect(mockUpdateEventById).not.toHaveBeenCalled();
    });

    it("returns an unauthorized result when the event has no creator info", async () => {
      mockFetchEventBySlug.mockResolvedValue(buildEvent({ createdByUser: undefined }));

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

      const result = await editEvent("test-id", "test-event", updateData);

      expect(result).toEqual({
        success: false,
        error: "Unauthorized: only the event creator can edit this event",
      });
      expect(mockUpdateEventById).not.toHaveBeenCalled();
    });
  });
});
