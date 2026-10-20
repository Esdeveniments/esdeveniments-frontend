import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

import { captureException } from "@sentry/nextjs";
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
const mockReplaceEventImage = vi.fn();
const mockDeleteEventImage = vi.fn();

vi.mock("@lib/api/events", () => ({
  createEvent: (data: EventCreateRequestDTO, imageFile?: File) =>
    mockCreateEvent(data, imageFile),
  updateEventById: (uuid: string, data: EventUpdateRequestDTO) =>
    mockUpdateEventById(uuid, data),
  fetchEventBySlug: (slug: string) => mockFetchEventBySlug(slug),
  replaceEventImage: (uuid: string, file: File) =>
    mockReplaceEventImage(uuid, file),
  deleteEventImage: (uuid: string) => mockDeleteEventImage(uuid),
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

const pngFile = () =>
  new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], "c.png", { type: "image/png" });
const fakePngFile = () => new File(["<html>"], "c.png", { type: "image/png" });

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
    isPromoted: false,
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
      verified: false,
      role: "USER",
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

function toFormData(event: EventCreateRequestDTO): FormData {
  const formData = new FormData();
  formData.set("event", JSON.stringify(event));
  return formData;
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
        url: "https://test.com",
        description: "Test description",
        regionId: 1,
        cityId: 1,
        startDate: "2025-06-15",
        startTime: "",
        endDate: "2025-06-15",
        endTime: "",
        location: "Test Location",
        categories: [],
      };

      const result = await createEventAction(toFormData(eventData));

      expect(mockCreateEvent).toHaveBeenCalledWith(eventData, null);
      expect(mockUpdateTag).toHaveBeenCalledWith("events");
      expect(mockUpdateTag).toHaveBeenCalledWith("events:categorized");
      expect(mockRefresh).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ success: true, event: mockEvent });
    });

    it("forwards the imageFile part to createEvent", async () => {
      mockCreateEvent.mockResolvedValue(buildEvent({ slug: "with-image" }));
      const formData = toFormData(buildEventData("With image"));
      formData.append("imageFile", pngFile());

      await createEventAction(formData);

      expect(mockCreateEvent).toHaveBeenCalledWith(
        buildEventData("With image"),
        expect.any(File),
      );
    });

    it("rejects an imageFile whose content is not an image", async () => {
      const formData = toFormData(buildEventData("Fake image"));
      formData.append("imageFile", fakePngFile());

      await expect(createEventAction(formData)).rejects.toThrow("not a valid image");
      expect(mockCreateEvent).not.toHaveBeenCalled();
    });

    it("calls refresh after updateTag calls", async () => {
      const mockEvent = buildEvent();

      mockCreateEvent.mockResolvedValue(mockEvent);

      const eventData: EventCreateRequestDTO = {
        title: "Test Event",
        url: "https://test.com",
        description: "Test description",
        regionId: 1,
        cityId: 1,
        startDate: "2025-06-15",
        startTime: "",
        endDate: "2025-06-15",
        endTime: "",
        location: "Test Location",
        categories: [],
      };

      await createEventAction(toFormData(eventData));

      // Verify refresh is called after updateTag calls
      const updateTagCalls = mockUpdateTag.mock.calls.length;
      expect(updateTagCalls).toBeGreaterThan(0);
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    const buildEventData = (title: string): EventCreateRequestDTO => ({
      title,
      url: "https://test.com",
      description: "Test description",
      regionId: 1,
      cityId: 1,
      startDate: "2025-06-15",
      startTime: "",
      endDate: "2025-06-15",
      endTime: "",
      location: "Test Location",
      categories: [],
    });

    it("returns a profile-incomplete result on 403, instead of throwing", async () => {
      // Server Actions redact thrown error messages/properties from the
      // client in production — only a generic message + digest survive.
      // A caught 401/403 must be *returned* so PublishForm can reliably act
      // on it; a throw here would silently degrade to a generic error in
      // production regardless of what property the error carries.
      const rawBody = "field errors: title must not exceed 200 characters, got: <the actual submitted title text>";
      const backendError = Object.assign(
        new Error(`HTTP error! status: 403, body: ${rawBody}`),
        { status: 403 },
      );
      mockCreateEvent.mockRejectedValue(backendError);

      const eventData = buildEventData(
        "A very sensitive event title nobody should see in Sentry",
      );

      const result = await createEventAction(toFormData(eventData));
      expect(result).toEqual({ success: false, reason: "profile-incomplete" });

      expect(captureException).toHaveBeenCalledTimes(1);
      const [reportedError, context] = vi.mocked(captureException).mock.calls[0];
      expect((reportedError as Error).message).not.toContain(rawBody);
      expect((reportedError as Error).message).not.toContain(eventData.title);
      expect(JSON.stringify(context)).not.toContain(eventData.title);
      expect(JSON.stringify(context)).not.toContain(rawBody);
      expect((context as { tags?: Record<string, string> })?.tags).toMatchObject({
        authStatus: "403",
        nextAction: "complete-profile",
      });
    });

    it("returns a stale-session result on 401, instead of throwing", async () => {
      const backendError = Object.assign(
        new Error("HTTP error! status: 401, body: unauthorized"),
        { status: 401 },
      );
      mockCreateEvent.mockRejectedValue(backendError);

      const result = await createEventAction(toFormData(buildEventData("Test Event")));
      expect(result).toEqual({ success: false, reason: "stale-session" });

      expect(captureException).toHaveBeenCalledTimes(1);
      const [, context] = vi.mocked(captureException).mock.calls[0];
      expect((context as { tags?: Record<string, string> })?.tags).toMatchObject({
        authStatus: "401",
        nextAction: "logout-and-relogin",
      });
    });

    it("still throws for a real 5xx — no actionable client-side reason to return", async () => {
      const backendError = Object.assign(
        new Error("HTTP error! status: 500, body: internal server error"),
        { status: 500 },
      );
      mockCreateEvent.mockRejectedValue(backendError);

      await expect(createEventAction(toFormData(buildEventData("Test Event")))).rejects.toBe(
        backendError,
      );
      expect(captureException).not.toHaveBeenCalled();
    });
  });

  describe("editEvent", () => {
    const coverEditData: EventBaseRequestDTO = {
      title: "T",
      url: null,
      description: "D",
      regionId: 1,
      cityId: 1,
      startDate: "2025-06-15",
      startTime: "",
      endDate: "2025-06-15",
      endTime: "",
      location: "L",
      categories: [],
    };

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
        url: "https://test.com",
        description: "Updated description",
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

    it("still invalidates caches and reports the failure when the cover update fails", async () => {
      mockUpdateEventById.mockResolvedValue(buildEvent({ slug: "same-event" }));
      mockReplaceEventImage.mockRejectedValue(new Error("HTTP error! status: 413"));
      const cover = new FormData();
      cover.append("imageFile", pngFile());

      const result = await editEvent(
        "test-id",
        "same-event",
        coverEditData,
        cover,
      );

      expect(mockReplaceEventImage).toHaveBeenCalledWith("test-id", expect.any(File));
      expect(mockUpdateTag).toHaveBeenCalledWith("events");
      expect(mockUpdateTag).toHaveBeenCalledWith("event:same-event");
      expect(mockDeleteEventDetailCache).toHaveBeenCalledWith("same-event");
      expect(result).toEqual({
        success: false,
        newSlug: "same-event",
        errorCode: "COVER_UPDATE_FAILED",
      });
    });

    it("does not upload a cover whose content is not an image", async () => {
      mockUpdateEventById.mockResolvedValue(buildEvent({ slug: "same-event" }));
      const cover = new FormData();
      cover.append("imageFile", fakePngFile());

      const result = await editEvent(
        "test-id",
        "same-event",
        coverEditData,
        cover,
      );

      expect(mockReplaceEventImage).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        newSlug: "same-event",
        errorCode: "COVER_UPDATE_FAILED",
      });
    });

    it("deletes the cover when the client asks to remove it", async () => {
      mockUpdateEventById.mockResolvedValue(buildEvent({ slug: "same-event" }));
      const cover = new FormData();
      cover.append("removeImage", "1");

      const result = await editEvent(
        "test-id",
        "same-event",
        coverEditData,
        cover,
      );

      expect(mockDeleteEventImage).toHaveBeenCalledWith("test-id");
      expect(mockReplaceEventImage).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
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
        url: "https://test.com",
        description: "Updated description",
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
        url: "https://test.com",
        description: "Updated description",
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
        url: "https://test.com",
        description: "Updated description",
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
        url: "https://test.com",
        description: "Hacked description",
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
        url: "https://test.com",
        description: "Hacked description",
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
        url: "https://test.com",
        description: "Updated description",
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
