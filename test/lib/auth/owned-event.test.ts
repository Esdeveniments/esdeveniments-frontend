import { describe, it, expect, vi, beforeEach } from "vitest";
import { getOwnedEventBySlug } from "@lib/auth/owned-event";

const mockFetchEvent = vi.fn();
const mockCurrentUser = vi.fn();
vi.mock("@lib/api/events", () => ({
  fetchEventBySlug: (slug: string) => mockFetchEvent(slug),
}));
vi.mock("@lib/auth/session", () => ({
  getCurrentUser: () => mockCurrentUser(),
}));

describe("getOwnedEventBySlug", () => {
  beforeEach(() => {
    mockFetchEvent.mockReset();
    mockCurrentUser.mockReset();
  });

  it("returns the event for its owner", async () => {
    const event = { slug: "e", owner: { id: "u1" } };
    mockFetchEvent.mockResolvedValue(event);
    mockCurrentUser.mockResolvedValue({ id: "u1" });

    expect(await getOwnedEventBySlug("e")).toBe(event);
  });

  it("returns null for another user", async () => {
    mockFetchEvent.mockResolvedValue({ slug: "e", owner: { id: "u1" } });
    mockCurrentUser.mockResolvedValue({ id: "u2" });

    expect(await getOwnedEventBySlug("e")).toBeNull();
  });

  it("returns null when logged out and the event has no owner", async () => {
    mockFetchEvent.mockResolvedValue({ slug: "e", owner: null });
    mockCurrentUser.mockResolvedValue(null);

    expect(await getOwnedEventBySlug("e")).toBeNull();
  });
});
