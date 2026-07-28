import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createEventAction } from "../app/[locale]/publica/actions";
import { editEvent } from "../app/[locale]/e/[eventId]/edita/actions";
import type { EventCreateRequestDTO, EventBaseRequestDTO, EventUpdateRequestDTO } from "types/api/event";
import type { EventDetailResponseDTO } from "types/api/event";
import type { AuthUser } from "types/auth";

// Mock next/cache
const mockUpdateTag = vi.fn();
const mockRefresh = vi.fn();
const mockRevalidatePath = vi.fn();

vi.mock("next/cache", () => ({
  updateTag: (tag: string) => mockUpdateTag(tag),
  refresh: () => mockRefresh(),
  revalidatePath: (path: string) => mockRevalidatePath(path),
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

// Mock lib/cache/event-detail-cache
const mockDeleteEventDetailCache = vi.fn();

vi.mock("@lib/cache/event-detail-cache", () => ({
  deleteEventDetailCache: (slug: string) => mockDeleteEventDetailCache(slug),
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
    owner: {
      id: CREATOR_ID,
      displayName: "Creator",
      username: "creator",
      avatarUrl: null,
      organizerVerified: false,
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
    it("calls updateTag for events and the specific event tag, with indexed: true injected server-side", async () => {
      const mockUpdatedEvent = buildEvent({
        slug: "updated-event",
        title: "Updated Event",
        description: "Updated description",
        location: "Updated Location",
      });

      mockUpdateEventById.mockResolvedValue(mockUpdatedEvent);

      const updateData: EventBaseRequestDTO = {
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

      // editEvent injects `indexed: true` server-side before calling updateEventById
      expect(mockUpdateEventById).toHaveBeenCalledWith("test-id", {
        ...updateData,
        indexed: true,
      });
      expect(mockUpdateTag).toHaveBeenCalledWith("events");
      expect(mockUpdateTag).toHaveBeenCalledWith("event:old-event");
      expect(mockUpdateTag).toHaveBeenCalledWith("event:updated-event");
      // In-memory cache should be cleared for both old and new slug
      expect(mockDeleteEventDetailCache).toHaveBeenCalledWith("old-event");
      expect(mockDeleteEventDetailCache).toHaveBeenCalledWith("updated-event");
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

      const updateData: EventBaseRequestDTO = {
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
      // In-memory cache should be cleared for the (unchanged) slug
      expect(mockDeleteEventDetailCache).toHaveBeenCalledWith("same-event");
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

      const updateData: EventBaseRequestDTO = {
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

    it("returns a not-found result when the event does not exist", async () => {
      mockFetchEventBySlug.mockResolvedValue(null);

      const updateData: EventBaseRequestDTO = {
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

      const result = await editEvent("test-id", "missing-event", updateData);

      expect(result).toEqual({ success: false, error: "Event not found" });
      expect(mockUpdateEventById).not.toHaveBeenCalled();
      expect(mockUpdateTag).not.toHaveBeenCalled();
      expect(mockRefresh).not.toHaveBeenCalled();
    });

    it("returns an unauthorized result when the current user is not the creator", async () => {
      mockGetCurrentUser.mockResolvedValue(otherUser);

      const updateData: EventBaseRequestDTO = {
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

      const updateData: EventBaseRequestDTO = {
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

    it("returns an unauthorized result when the event has no creator info", async () => {
      mockFetchEventBySlug.mockResolvedValue(buildEvent({ owner: undefined }));

      const updateData: EventBaseRequestDTO = {
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
      expect(mockUpdateTag).not.toHaveBeenCalled();
      expect(mockRefresh).not.toHaveBeenCalled();
    });
  });
});
