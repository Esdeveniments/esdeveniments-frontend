import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../app/api/auth/me/route";
import * as session from "../lib/auth/session";
import * as authCookies from "../utils/auth-cookies";
import type { AuthUser } from "types/auth";

// This suite covers the route handler's mapping layer only — turning a
// resolveSession() result into a Response and deciding whether to call
// setTokenCookies/clearTokenCookies. The session-resolution decision tree
// itself (every branch of resolveSession) is covered by
// test/lib/auth/session.test.ts.
vi.mock("../lib/auth/session", () => ({
  resolveSession: vi.fn(),
}));

vi.mock("../utils/auth-cookies", () => ({
  ID_TOKEN_COOKIE: "logto_id_token",
  ACCESS_TOKEN_COOKIE: "auth_token",
  REFRESH_TOKEN_COOKIE: "auth_refresh_token",
  readTokenFromRequest: vi.fn(() => null),
  setTokenCookies: vi.fn(),
  clearTokenCookies: vi.fn(),
}));

const mockResolveSession = vi.mocked(session.resolveSession);
const mockSetTokenCookies = vi.mocked(authCookies.setTokenCookies);
const mockClearTokenCookies = vi.mocked(authCookies.clearTokenCookies);

const user: AuthUser = {
  id: "user-123",
  email: "test@example.com",
  name: "Test User",
  username: "test-user",
};

const refreshedTokens = {
  access_token: "new-access-token",
  id_token: "new-id-token",
  refresh_token: "new-refresh-token",
  expires_in: 3600,
  token_type: "Bearer",
};

function buildRequest() {
  return new NextRequest("http://localhost/api/auth/me");
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/auth/me (route mapping layer)", () => {
  it("kind: ok without refreshedTokens -> 200, no cookie writes", async () => {
    mockResolveSession.mockResolvedValue({ kind: "ok", user });

    const response = await GET(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ user });
    expect(mockSetTokenCookies).not.toHaveBeenCalled();
    expect(mockClearTokenCookies).not.toHaveBeenCalled();
  });

  it("kind: ok with refreshedTokens -> 200, calls setTokenCookies with the refreshed tokens", async () => {
    mockResolveSession.mockResolvedValue({
      kind: "ok",
      user,
      refreshedTokens,
    });

    const response = await GET(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ user });
    expect(mockSetTokenCookies).toHaveBeenCalledTimes(1);
    expect(mockSetTokenCookies.mock.calls[0][1]).toEqual(refreshedTokens);
    expect(mockClearTokenCookies).not.toHaveBeenCalled();
  });

  it("kind: unauthorized, clearCookies:true -> 401, calls clearTokenCookies", async () => {
    mockResolveSession.mockResolvedValue({
      kind: "unauthorized",
      clearCookies: true,
    });

    const response = await GET(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ user: null });
    expect(mockClearTokenCookies).toHaveBeenCalledTimes(1);
    expect(mockSetTokenCookies).not.toHaveBeenCalled();
  });

  it("kind: unauthorized, clearCookies:false -> 401, does NOT call clearTokenCookies", async () => {
    mockResolveSession.mockResolvedValue({
      kind: "unauthorized",
      clearCookies: false,
    });

    const response = await GET(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ user: null });
    expect(mockClearTokenCookies).not.toHaveBeenCalled();
    expect(mockSetTokenCookies).not.toHaveBeenCalled();
  });

  it("kind: transient -> 503, no cookie writes at all", async () => {
    mockResolveSession.mockResolvedValue({ kind: "transient" });

    const response = await GET(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({ user: null });
    expect(mockSetTokenCookies).not.toHaveBeenCalled();
    expect(mockClearTokenCookies).not.toHaveBeenCalled();
  });

  it("every response carries Cache-Control: no-store", async () => {
    mockResolveSession.mockResolvedValue({ kind: "transient" });
    const response = await GET(buildRequest());
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("passes the exact per-cookie token values and hasRawCookie through to resolveSession", async () => {
    const mockReadTokenFromRequest = vi.mocked(authCookies.readTokenFromRequest);
    mockReadTokenFromRequest.mockImplementation((_request, name: string) => {
      if (name === "logto_id_token") return "the-id-token";
      if (name === "auth_refresh_token") return "the-refresh-token";
      if (name === "auth_token") return "the-access-token";
      return null;
    });
    mockResolveSession.mockResolvedValue({ kind: "transient" });

    const request = new NextRequest("http://localhost/api/auth/me", {
      headers: { cookie: "logto_id_token=raw-encrypted-value" },
    });
    await GET(request);

    expect(mockResolveSession).toHaveBeenCalledWith({
      idToken: "the-id-token",
      refreshToken: "the-refresh-token",
      accessToken: "the-access-token",
      hasRawCookie: true,
    });
  });

  it("passes hasRawCookie:false when no auth cookie is present at all", async () => {
    mockResolveSession.mockResolvedValue({ kind: "unauthorized", clearCookies: false });

    await GET(buildRequest());

    expect(mockResolveSession).toHaveBeenCalledWith(
      expect.objectContaining({ hasRawCookie: false }),
    );
  });
});
