import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/headers cookies()
const mockCookieStore = vi.hoisted(() => ({
  get: vi.fn(),
}));
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

// Mock NextResponse with a real cookie jar for testing
function createMockResponse() {
  const cookieJar = new Map<string, { value: string; options: Record<string, unknown> }>();
  return {
    cookies: {
      set: vi.fn((name: string, value: string, options: Record<string, unknown>) => {
        cookieJar.set(name, { value, options });
      }),
    },
    _cookieJar: cookieJar,
  };
}

import {
  AUTH_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  setAuthCookies,
  clearAuthCookies,
  getAccessTokenFromCookies,
  getRefreshTokenFromCookies,
} from "../utils/auth-cookies";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("auth-cookies", () => {
  describe("constants", () => {
    it("exports correct cookie names", () => {
      expect(AUTH_TOKEN_COOKIE).toBe("auth_token");
      expect(REFRESH_TOKEN_COOKIE).toBe("auth_refresh_token");
    });
  });

  describe("setAuthCookies", () => {
    it("sets access token cookie with correct options", () => {
      const response = createMockResponse();
      const expiresAt = new Date(Date.now() + 3600_000).toISOString();

      setAuthCookies(response as never, "access-tok", expiresAt);

      expect(response.cookies.set).toHaveBeenCalledWith(
        "auth_token",
        "access-tok",
        expect.objectContaining({
          httpOnly: true,
          sameSite: "lax",
          path: "/",
        })
      );

      const call = response.cookies.set.mock.calls[0];
      expect(call[2].maxAge).toBeGreaterThan(0);
      expect(call[2].maxAge).toBeLessThanOrEqual(3600);
    });

    it("sets refresh token cookie when provided", () => {
      const response = createMockResponse();
      const expiresAt = new Date(Date.now() + 3600_000).toISOString();

      setAuthCookies(response as never, "access-tok", expiresAt, "refresh-tok");

      expect(response.cookies.set).toHaveBeenCalledTimes(2);
      expect(response.cookies.set).toHaveBeenCalledWith(
        "auth_refresh_token",
        "refresh-tok",
        expect.objectContaining({
          httpOnly: true,
          sameSite: "lax",
          path: "/api/auth",
          maxAge: 60 * 60 * 24 * 30, // 30 days
        })
      );
    });

    it("does not set refresh token cookie when not provided", () => {
      const response = createMockResponse();
      const expiresAt = new Date(Date.now() + 3600_000).toISOString();

      setAuthCookies(response as never, "access-tok", expiresAt);

      expect(response.cookies.set).toHaveBeenCalledTimes(1);
      expect(response.cookies.set).toHaveBeenCalledWith(
        "auth_token",
        expect.any(String),
        expect.any(Object)
      );
    });

    it("falls back to 1h maxAge on invalid expiresAt", () => {
      const response = createMockResponse();

      setAuthCookies(response as never, "tok", "not-a-date");

      const call = response.cookies.set.mock.calls[0];
      expect(call[2].maxAge).toBe(3600);
    });

    it("clamps maxAge to 0 when expiresAt is in the past", () => {
      const response = createMockResponse();
      const pastDate = new Date(Date.now() - 60_000).toISOString();

      setAuthCookies(response as never, "tok", pastDate);

      const call = response.cookies.set.mock.calls[0];
      expect(call[2].maxAge).toBe(0);
    });
  });

  describe("clearAuthCookies", () => {
    it("sets both cookies with empty value and maxAge 0", () => {
      const response = createMockResponse();

      clearAuthCookies(response as never);

      expect(response.cookies.set).toHaveBeenCalledTimes(2);

      expect(response.cookies.set).toHaveBeenCalledWith(
        "auth_token",
        "",
        expect.objectContaining({ maxAge: 0, path: "/" })
      );

      expect(response.cookies.set).toHaveBeenCalledWith(
        "auth_refresh_token",
        "",
        expect.objectContaining({ maxAge: 0, path: "/api/auth" })
      );
    });
  });

  describe("getAccessTokenFromCookies", () => {
    it("returns cookie value when present", async () => {
      mockCookieStore.get.mockReturnValue({ value: "my-token" });

      const token = await getAccessTokenFromCookies();

      expect(token).toBe("my-token");
      expect(mockCookieStore.get).toHaveBeenCalledWith("auth_token");
    });

    it("returns null when cookie is missing", async () => {
      mockCookieStore.get.mockReturnValue(undefined);

      const token = await getAccessTokenFromCookies();

      expect(token).toBeNull();
    });
  });

  describe("getRefreshTokenFromCookies", () => {
    it("returns cookie value when present", async () => {
      mockCookieStore.get.mockReturnValue({ value: "my-refresh" });

      const token = await getRefreshTokenFromCookies();

      expect(token).toBe("my-refresh");
      expect(mockCookieStore.get).toHaveBeenCalledWith("auth_refresh_token");
    });

    it("returns null when cookie is missing", async () => {
      mockCookieStore.get.mockReturnValue(undefined);

      const token = await getRefreshTokenFromCookies();

      expect(token).toBeNull();
    });
  });
});
