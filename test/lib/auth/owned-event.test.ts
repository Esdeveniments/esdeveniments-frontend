import { describe, it, expect, vi, beforeEach } from "vitest";
import { getOwnedEventBySlug, ownerCheckNeedsRefresh } from "@lib/auth/owned-event";

const mockFetchEvent = vi.fn();
const mockCurrentUser = vi.fn();
vi.mock("@lib/api/events", () => ({
  fetchEventBySlug: (slug: string) => mockFetchEvent(slug),
}));
vi.mock("@lib/auth/session", () => ({
  getCurrentUser: () => mockCurrentUser(),
}));
const mockAccessToken = vi.fn();
const mockRefreshToken = vi.fn();
vi.mock("@utils/auth-cookies", () => ({
  getAccessTokenFromCookies: () => mockAccessToken(),
  getRefreshTokenFromCookies: () => mockRefreshToken(),
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

describe("ownerCheckNeedsRefresh", () => {
  beforeEach(() => {
    mockCurrentUser.mockReset();
    mockAccessToken.mockReset();
    mockRefreshToken.mockReset();
  });

  it("is false when logged out", async () => {
    mockCurrentUser.mockResolvedValue(null);

    expect(await ownerCheckNeedsRefresh()).toBe(false);
  });

  it("is true when the access token cookie expired", async () => {
    mockCurrentUser.mockResolvedValue({ id: "logto-sub" });
    mockAccessToken.mockResolvedValue(null);

    expect(await ownerCheckNeedsRefresh()).toBe(true);
  });

  it("recovers an expired ID token when a refresh credential remains", async () => {
    mockCurrentUser.mockResolvedValue(null);
    mockRefreshToken.mockResolvedValue("refreshable-session");
    expect(await ownerCheckNeedsRefresh()).toBe(true);
  });

  it("is true when the backend rejected the access token", async () => {
    mockCurrentUser.mockResolvedValue({ id: "logto-sub", profileEnrichmentFailed: "auth" });
    mockAccessToken.mockResolvedValue("rejected");

    expect(await ownerCheckNeedsRefresh()).toBe(true);
  });

  it("is false for an enriched session", async () => {
    mockCurrentUser.mockResolvedValue({ id: "backend-uuid" });
    mockAccessToken.mockResolvedValue("valid");

    expect(await ownerCheckNeedsRefresh()).toBe(false);
  });
});
