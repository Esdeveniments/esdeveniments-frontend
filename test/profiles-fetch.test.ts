import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock getInternalApiUrl and getVercelProtectionBypassHeaders before importing
const mockGetInternalApiUrl = vi.fn();
const mockGetVercelProtectionBypassHeaders = vi.fn();

vi.mock("@utils/api-helpers", () => ({
  getInternalApiUrl: (path: string, opts?: { preferConfiguredOrigin?: boolean }) =>
    mockGetInternalApiUrl(path, opts),
  getVercelProtectionBypassHeaders: () => mockGetVercelProtectionBypassHeaders(),
}));

// Mock parseUserPublic
const mockParseUserPublic = vi.fn();

vi.mock("@lib/validation/user", () => ({
  parseUserPublic: (input: unknown) => mockParseUserPublic(input),
}));

// Mock cache tag helpers (no-op for tests)
vi.mock("@lib/cache/tags", () => ({
  userTag: (username: string) => `user:${username}`,
}));

// Mock next/cache cacheLife/cacheTag as no-ops
vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));

// Mock users-external for the fetchUserEvents re-export
vi.mock("@lib/api/users-external", () => ({
  getUserByUsernameExternal: vi.fn(),
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
    mockGetInternalApiUrl.mockResolvedValue(
      "http://localhost:3000/api/users/test-user",
    );
    mockGetVercelProtectionBypassHeaders.mockReturnValue({});
    mockParseUserPublic.mockReturnValue(mockUser);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns parsed user on a 200 response", async () => {
    const globalFetch = globalThis.fetch;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: async () => mockUser,
      }),
    );

    const { fetchUserBySlug } = await import("../lib/api/profiles");
    const result = await fetchUserBySlug("test-user");

    expect(result).toEqual(mockUser);
    expect(mockGetInternalApiUrl).toHaveBeenCalledWith(
      "/api/users/test-user",
      { preferConfiguredOrigin: undefined },
    );
    expect(mockParseUserPublic).toHaveBeenCalledWith(mockUser);

    vi.stubGlobal("fetch", globalFetch);
  });

  it("returns null on 404", async () => {
    const globalFetch = globalThis.fetch;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 404,
        ok: false,
        json: async () => null,
      }),
    );

    const { fetchUserBySlug } = await import("../lib/api/profiles");
    const result = await fetchUserBySlug("nonexistent");

    expect(result).toBeNull();
    expect(mockParseUserPublic).not.toHaveBeenCalled();

    vi.stubGlobal("fetch", globalFetch);
  });

  it("returns null on non-ok non-404 response without throwOnError", async () => {
    const globalFetch = globalThis.fetch;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 500,
        ok: false,
        json: async () => ({ error: "server error" }),
      }),
    );

    const { fetchUserBySlug } = await import("../lib/api/profiles");
    const result = await fetchUserBySlug("test-user");

    expect(result).toBeNull();

    vi.stubGlobal("fetch", globalFetch);
  });

  it("throws on non-ok response with throwOnError", async () => {
    const globalFetch = globalThis.fetch;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 500,
        ok: false,
        json: async () => ({ error: "server error" }),
      }),
    );

    const { fetchUserBySlug } = await import("../lib/api/profiles");

    await expect(
      fetchUserBySlug("test-user", { throwOnError: true }),
    ).rejects.toThrow("HTTP error! status: 500");

    vi.stubGlobal("fetch", globalFetch);
  });

  it("returns null on network error without throwOnError", async () => {
    const globalFetch = globalThis.fetch;
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));

    const { fetchUserBySlug } = await import("../lib/api/profiles");
    const result = await fetchUserBySlug("test-user");

    expect(result).toBeNull();

    vi.stubGlobal("fetch", globalFetch);
  });

  it("passes preferConfiguredOrigin to getInternalApiUrl", async () => {
    const globalFetch = globalThis.fetch;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: async () => mockUser,
      }),
    );

    const { fetchUserBySlug } = await import("../lib/api/profiles");
    await fetchUserBySlug("test-user", { preferConfiguredOrigin: true });

    expect(mockGetInternalApiUrl).toHaveBeenCalledWith(
      "/api/users/test-user",
      { preferConfiguredOrigin: true },
    );

    vi.stubGlobal("fetch", globalFetch);
  });
});

describe("getUserByUsernameCached", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetInternalApiUrl.mockResolvedValue(
      "http://localhost:3000/api/users/test-user",
    );
    mockGetVercelProtectionBypassHeaders.mockReturnValue({});
    mockParseUserPublic.mockReturnValue(mockUser);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the user when the fetch succeeds", async () => {
    const globalFetch = globalThis.fetch;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: async () => mockUser,
      }),
    );

    const { getUserByUsernameCached } = await import("../lib/api/profiles");
    const result = await getUserByUsernameCached("test-user");

    expect(result).toEqual(mockUser);

    vi.stubGlobal("fetch", globalFetch);
  });

  it("returns null when the user is not found (404)", async () => {
    const globalFetch = globalThis.fetch;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 404,
        ok: false,
        json: async () => null,
      }),
    );

    const { getUserByUsernameCached } = await import("../lib/api/profiles");
    const result = await getUserByUsernameCached("nonexistent");

    expect(result).toBeNull();

    vi.stubGlobal("fetch", globalFetch);
  });

  it("throws on transient errors (not cached as null)", async () => {
    const globalFetch = globalThis.fetch;
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));

    const { getUserByUsernameCached } = await import("../lib/api/profiles");

    await expect(
      getUserByUsernameCached("test-user"),
    ).rejects.toThrow("network");

    vi.stubGlobal("fetch", globalFetch);
  });
});
