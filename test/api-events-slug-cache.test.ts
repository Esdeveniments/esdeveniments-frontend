import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock cache primitives so we can assert revalidation calls
const mockRevalidateTag = vi.fn();
const mockRevalidatePath = vi.fn();
vi.mock("next/cache", () => ({
  revalidateTag: mockRevalidateTag,
  revalidatePath: mockRevalidatePath,
}));

// Mock external fetch to avoid network and to assert call counts
vi.mock("@lib/api/events-external", () => ({
  fetchEventBySlug: vi.fn(),
}));

// Mock lib/api/events for the delete handler (deleteEventById)
const mockDeleteEventById = vi.fn();
vi.mock("@lib/api/events", () => ({
  deleteEventById: (...args: unknown[]) => mockDeleteEventById(...args),
  fetchEventBySlug: vi.fn(),
}));

// Mock lib/auth/session for the DELETE handler
const mockGetCurrentUser = vi.fn();
vi.mock("@lib/auth/session", () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

import { fetchEventBySlug } from "@lib/api/events-external";

const originalEnv = { ...process.env };

describe("/api/events/[slug] cache", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    (fetchEventBySlug as unknown as ReturnType<typeof vi.fn>).mockReset();
    mockRevalidateTag.mockReset();
    mockRevalidatePath.mockReset();
    mockDeleteEventById.mockReset();
    mockGetCurrentUser.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("only fetches external event once per slug within TTL", async () => {
    const fakeEvent = {
      id: "1",
      slug: "some-slug",
      visits: 123,
      endDate: null,
    };

    (fetchEventBySlug as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      fakeEvent
    );

    const { GET } = await import("app/api/events/[slug]/route");

    const req = new Request("http://localhost/api/events/some-slug");
    const ctx = { params: Promise.resolve({ slug: "some-slug" }) };

    const res1 = await GET(req, ctx as any);
    const res2 = await GET(req, ctx as any);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(fetchEventBySlug).toHaveBeenCalledTimes(1);

    const body1 = await res1.json();
    const body2 = await res2.json();
    expect(body1).toEqual(fakeEvent);
    expect(body2).toEqual(fakeEvent);
  });
});

describe("/api/events/[slug] DELETE cache invalidation", () => {
  const creatorUser = { id: "creator-uuid", email: "c@e.com", name: "C", username: "c", role: "USER" };
  const fakeEvent = {
    id: "event-uuid",
    slug: "my-event",
    visits: 0,
    endDate: null,
    owner: { id: "creator-uuid", name: "C", username: "c", email: "c@e.com" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(creatorUser);
    (fetchEventBySlug as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(fakeEvent);
    mockDeleteEventById.mockResolvedValue(undefined);
  });

  it("revalidates event tag, events tag, and events:categorized tag on delete", async () => {
    const { DELETE } = await import("app/api/events/[slug]/route");

    const req = new Request("http://localhost/api/events/my-event", {
      method: "DELETE",
    });
    const ctx = { params: Promise.resolve({ slug: "my-event" }) };

    const res = await DELETE(req, ctx as any);

    expect(res.status).toBe(204);
    expect(mockDeleteEventById).toHaveBeenCalledWith("event-uuid");

    // Per-event tag
    expect(mockRevalidateTag).toHaveBeenCalledWith("event:my-event", { expire: 0 });
    // Global events list tag
    expect(mockRevalidateTag).toHaveBeenCalledWith("events", { expire: 0 });
    // Categorized events tag
    expect(mockRevalidateTag).toHaveBeenCalledWith("events:categorized", { expire: 0 });
  });

  it("returns 401 when no session exists", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const { DELETE } = await import("app/api/events/[slug]/route");

    const req = new Request("http://localhost/api/events/my-event", {
      method: "DELETE",
    });
    const ctx = { params: Promise.resolve({ slug: "my-event" }) };

    const res = await DELETE(req, ctx as any);
    expect(res.status).toBe(401);
    expect(mockDeleteEventById).not.toHaveBeenCalled();
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });

  it("returns 403 when the user is not the creator", async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: "other-user",
      email: "o@e.com",
      name: "O",
      username: "o",
      role: "USER",
    });
    const { DELETE } = await import("app/api/events/[slug]/route");

    const req = new Request("http://localhost/api/events/my-event", {
      method: "DELETE",
    });
    const ctx = { params: Promise.resolve({ slug: "my-event" }) };

    const res = await DELETE(req, ctx as any);
    expect(res.status).toBe(403);
    expect(mockDeleteEventById).not.toHaveBeenCalled();
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });
});





