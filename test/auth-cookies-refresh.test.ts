import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * getValidAccessToken() is what lets mutations (event create, profile PATCH,
 * avatar upload/remove, favorites) survive a session where the id_token
 * cookie (30 days) is still valid but the shorter-lived access_token cookie
 * (~1h) has expired — previously every one of those 401'd immediately with
 * "Authentication required" even though the user was still logged in.
 */

const cookieStore = new Map<string, string>();
const setMock = vi.fn((name: string, value: string) => {
  cookieStore.set(name, value);
});
const getMock = vi.fn((name: string) => {
  const value = cookieStore.get(name);
  return value === undefined ? undefined : { value };
});

vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({ get: getMock, set: setMock }),
}));

const refreshAccessTokenMock = vi.fn();
const getLogtoConfigMock = vi.fn(() => ({}) as never);
vi.mock("@lib/auth/logto", () => ({
  getLogtoConfig: () => getLogtoConfigMock(),
  refreshAccessToken: (...args: unknown[]) => refreshAccessTokenMock(...args),
}));

async function loadAuthCookies() {
  vi.resetModules();
  vi.stubEnv("LOGTO_COOKIE_SECRET", "");
  return import("@utils/auth-cookies");
}

describe("getValidAccessToken", () => {
  afterEach(() => {
    cookieStore.clear();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("returns the existing access token without attempting a refresh", async () => {
    const m = await loadAuthCookies();
    cookieStore.set(m.ACCESS_TOKEN_COOKIE, "fresh-token");

    const result = await m.getValidAccessToken();

    expect(result).toBe("fresh-token");
    expect(refreshAccessTokenMock).not.toHaveBeenCalled();
  });

  it("refreshes via the refresh_token cookie when the access token is missing", async () => {
    const m = await loadAuthCookies();
    cookieStore.set(m.REFRESH_TOKEN_COOKIE, "my-refresh-token");
    refreshAccessTokenMock.mockResolvedValue({
      access_token: "new-access-token",
      token_type: "Bearer",
      expires_in: 3600,
      id_token: "new-id-token",
      refresh_token: "new-refresh-token",
    });

    const result = await m.getValidAccessToken();

    expect(result).toBe("new-access-token");
    expect(refreshAccessTokenMock).toHaveBeenCalledWith(
      expect.anything(),
      "my-refresh-token",
    );
    // The refreshed access token was persisted back onto the cookie store.
    expect(setMock).toHaveBeenCalledWith(
      m.ACCESS_TOKEN_COOKIE,
      "new-access-token",
      expect.anything(),
    );
  });

  it("returns null when neither cookie is present", async () => {
    const m = await loadAuthCookies();
    const result = await m.getValidAccessToken();
    expect(result).toBeNull();
    expect(refreshAccessTokenMock).not.toHaveBeenCalled();
  });

  it("returns null when the refresh call itself fails (revoked/expired refresh token)", async () => {
    const m = await loadAuthCookies();
    cookieStore.set(m.REFRESH_TOKEN_COOKIE, "stale-refresh-token");
    refreshAccessTokenMock.mockRejectedValue(
      Object.assign(new Error("invalid_grant"), { status: 400 }),
    );

    const result = await m.getValidAccessToken();

    expect(result).toBeNull();
  });
});
