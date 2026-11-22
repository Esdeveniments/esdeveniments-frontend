import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { connection } from "next/server";

const mockGetUserByUsernameExternalResult = vi.fn();

// Mock cache tag helpers (no-op for tests)
vi.mock("@lib/cache/tags", () => ({
  userTag: (username: string) => `user:${username}`,
}));

// Mock next/cache cacheLife/cacheTag as no-ops
vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));

// Mock users-external directly
vi.mock("@lib/api/users-external", () => ({
  getUserByUsernameExternal: vi.fn(),
  getUserByUsernameExternalResult: (...args: unknown[]) =>
    mockGetUserByUsernameExternalResult(...args),
  getUserEventsExternal: vi.fn(),
}));

const mockUser = {
  id: "user-123",
  name: "Test User",
  username: "test-user",
};

describe("fetchUserBySlug", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns parsed user on a 200 response and calls connection()", async () => {
    mockGetUserByUsernameExternalResult.mockResolvedValue({
      data: mockUser,
      error: null,
      status: 200,
    });

    const { fetchUserBySlug } = await import("../lib/api/profiles");
    const result = await fetchUserBySlug("test-user");

    expect(result).toEqual(mockUser);
    expect(connection).toHaveBeenCalledTimes(1);
    expect(mockGetUserByUsernameExternalResult).toHaveBeenCalledWith(
      "test-user",
      { skipConnection: true },
    );
  });

  it("returns null on 404", async () => {
    mockGetUserByUsernameExternalResult.mockResolvedValue({
      data: null,
      error: null,
      status: 404,
    });

    const { fetchUserBySlug } = await import("../lib/api/profiles");
    const result = await fetchUserBySlug("nonexistent");

    expect(result).toBeNull();
  });

  it("returns null on upstream error without throwOnError", async () => {
    mockGetUserByUsernameExternalResult.mockResolvedValue({
      data: null,
      error: new Error("getUserByUsernameExternal: HTTP 500"),
      status: 500,
    });

    const { fetchUserBySlug } = await import("../lib/api/profiles");
    const result = await fetchUserBySlug("test-user");

    expect(result).toBeNull();
  });

  it("throws with status on upstream error with throwOnError", async () => {
    mockGetUserByUsernameExternalResult.mockResolvedValue({
      data: null,
      error: new Error("getUserByUsernameExternal: HTTP 500"),
      status: 500,
    });

    const { fetchUserBySlug } = await import("../lib/api/profiles");

    await expect(
      fetchUserBySlug("test-user", { throwOnError: true }),
    ).rejects.toMatchObject({
      message: "getUserByUsernameExternal: HTTP 500",
      status: 500,
    });
  });

  it("skips connection() when skipConnection is set", async () => {
    mockGetUserByUsernameExternalResult.mockResolvedValue({
      data: mockUser,
      error: null,
      status: 200,
    });

    const { fetchUserBySlug } = await import("../lib/api/profiles");
    await fetchUserBySlug("test-user", { skipConnection: true });

    expect(connection).not.toHaveBeenCalled();
  });
});

describe("getUserByUsernameCached", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the user when the fetch succeeds and skips connection()", async () => {
    mockGetUserByUsernameExternalResult.mockResolvedValue({
      data: mockUser,
      error: null,
      status: 200,
    });

    const { getUserByUsernameCached } = await import("../lib/api/profiles");
    const result = await getUserByUsernameCached("test-user");

    expect(result).toEqual(mockUser);
    expect(connection).not.toHaveBeenCalled();
  });

  it("returns null when the user is not found (404)", async () => {
    mockGetUserByUsernameExternalResult.mockResolvedValue({
      data: null,
      error: null,
      status: 404,
    });

    const { getUserByUsernameCached } = await import("../lib/api/profiles");
    const result = await getUserByUsernameCached("nonexistent");

    expect(result).toBeNull();
  });

  it("throws on transient errors (not cached as null)", async () => {
    mockGetUserByUsernameExternalResult.mockResolvedValue({
      data: null,
      error: new Error("network"),
      status: 502,
    });

    const { getUserByUsernameCached } = await import("../lib/api/profiles");

    await expect(
      getUserByUsernameCached("test-user"),
    ).rejects.toThrow("network");
  });
});
