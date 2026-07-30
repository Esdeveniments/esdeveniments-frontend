import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AuthUser, IdTokenPayload } from "types/auth";

const mockCookieStore = new Map<string, string>();

// Mock auth-cookies: both id_token and access_token readers
vi.mock("@utils/auth-cookies", () => ({
  ID_TOKEN_COOKIE: "logto_id_token",
  getIdTokenFromCookies: vi.fn(() => {
    const value = mockCookieStore.get("logto_id_token");
    return Promise.resolve(value ?? null);
  }),
  getAccessTokenFromCookies: vi.fn(() => {
    const value = mockCookieStore.get("auth_token");
    return Promise.resolve(value ?? null);
  }),
}));

const mockGetLogtoConfig = vi.fn();
const mockVerifyStoredIdToken = vi.fn();
const mockMapClaimsToAuthUser = vi.fn();
const mockRefreshAccessToken = vi.fn();

vi.mock("@lib/auth/logto", () => ({
  getLogtoConfig: () => mockGetLogtoConfig(),
  verifyStoredIdToken: (config: unknown, idToken: string) =>
    mockVerifyStoredIdToken(config, idToken),
  mapClaimsToAuthUser: (claims: IdTokenPayload) =>
    mockMapClaimsToAuthUser(claims),
  refreshAccessToken: (config: unknown, refreshToken: string) =>
    mockRefreshAccessToken(config, refreshToken),
}));

// Mock enrichment: pass-through by default, allow override per-test
const mockEnrichWithBackendProfile = vi.fn();

vi.mock("@lib/auth/enrichment", () => ({
  enrichWithBackendProfile: (user: AuthUser, token: string | null) =>
    mockEnrichWithBackendProfile(user, token),
}));

describe("getCurrentUser", () => {
  beforeEach(() => {
    vi.resetModules();
    mockCookieStore.clear();
    vi.clearAllMocks();
    // Default: enrichment passes the user through unchanged
    mockEnrichWithBackendProfile.mockImplementation(
      (user: AuthUser) => user,
    );
  });

  it("returns null when the id_token cookie is missing", async () => {
    const { getCurrentUser } = await import("@lib/auth/session");
    const user = await getCurrentUser();
    expect(user).toBeNull();
    expect(mockVerifyStoredIdToken).not.toHaveBeenCalled();
  });

  it("returns null when token verification throws", async () => {
    mockCookieStore.set("logto_id_token", "invalid-token");
    mockGetLogtoConfig.mockReturnValue({ issuer: "https://logto.test/oidc" });
    mockVerifyStoredIdToken.mockRejectedValue(new Error("invalid signature"));

    const { getCurrentUser } = await import("@lib/auth/session");
    const user = await getCurrentUser();

    expect(user).toBeNull();
    expect(mockVerifyStoredIdToken).toHaveBeenCalledWith(
      expect.anything(),
      "invalid-token",
    );
  });

  it("returns the mapped AuthUser when the id_token is valid", async () => {
    const claims = { sub: "user-123" } as IdTokenPayload;
    const authUser: AuthUser = {
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
      username: "test-user",
      role: "USER",
      emailVerified: true,
    };

    mockCookieStore.set("logto_id_token", "valid-token");
    mockGetLogtoConfig.mockReturnValue({ issuer: "https://logto.test/oidc" });
    mockVerifyStoredIdToken.mockResolvedValue(claims);
    mockMapClaimsToAuthUser.mockReturnValue(authUser);

    const { getCurrentUser } = await import("@lib/auth/session");
    const user = await getCurrentUser();

    expect(user).toEqual(authUser);
    expect(mockVerifyStoredIdToken).toHaveBeenCalledWith(
      expect.anything(),
      "valid-token",
    );
    expect(mockMapClaimsToAuthUser).toHaveBeenCalledWith(claims);
  });

  it("enriches with backend UUID when an access token is available", async () => {
    const claims = { sub: "logto-sub-123" } as IdTokenPayload;
    const idTokenUser: AuthUser = {
      id: "logto-sub-123",
      email: "test@example.com",
      name: "Test User",
      username: "test-user",
      role: "USER",
      emailVerified: true,
    };
    const enrichedUser: AuthUser = {
      ...idTokenUser,
      id: "backend-uuid-456",
      logtoId: "logto-sub-123",
    };

    mockCookieStore.set("logto_id_token", "valid-token");
    mockCookieStore.set("auth_token", "access-token");
    mockGetLogtoConfig.mockReturnValue({ issuer: "https://logto.test/oidc" });
    mockVerifyStoredIdToken.mockResolvedValue(claims);
    mockMapClaimsToAuthUser.mockReturnValue(idTokenUser);
    mockEnrichWithBackendProfile.mockResolvedValue(enrichedUser);

    const { getCurrentUser } = await import("@lib/auth/session");
    const user = await getCurrentUser();

    expect(user).toEqual(enrichedUser);
    expect(user?.id).toBe("backend-uuid-456");
    expect(user?.logtoId).toBe("logto-sub-123");
    expect(mockEnrichWithBackendProfile).toHaveBeenCalledWith(
      idTokenUser,
      "access-token",
    );
  });

  it("returns id_token-only user when access token is missing", async () => {
    const claims = { sub: "logto-sub-123" } as IdTokenPayload;
    const idTokenUser: AuthUser = {
      id: "logto-sub-123",
      email: "test@example.com",
      name: "Test User",
      username: "test-user",
      role: "USER",
      emailVerified: true,
    };

    mockCookieStore.set("logto_id_token", "valid-token");
    // No auth_token cookie set
    mockGetLogtoConfig.mockReturnValue({ issuer: "https://logto.test/oidc" });
    mockVerifyStoredIdToken.mockResolvedValue(claims);
    mockMapClaimsToAuthUser.mockReturnValue(idTokenUser);

    const { getCurrentUser } = await import("@lib/auth/session");
    const user = await getCurrentUser();

    expect(user).toEqual(idTokenUser);
    expect(mockEnrichWithBackendProfile).toHaveBeenCalledWith(
      idTokenUser,
      null,
    );
  });
});

describe("resolveSession", () => {
  const idTokenUser: AuthUser = {
    id: "logto-sub-123",
    email: "test@example.com",
    name: "Test User",
    username: "test-user",
    role: "USER",
    emailVerified: true,
  };
  const enrichedUser: AuthUser = {
    ...idTokenUser,
    id: "backend-uuid-456",
    logtoId: "logto-sub-123",
  };
  const refreshedTokens = {
    access_token: "new-access-token",
    id_token: "new-id-token",
    refresh_token: "new-refresh-token",
    expires_in: 3600,
  };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockGetLogtoConfig.mockReturnValue({ issuer: "https://logto.test/oidc" });
    mockEnrichWithBackendProfile.mockImplementation((user: AuthUser) => user);
  });

  it("unauthorized + clearCookies:false when no tokens and no raw cookie", async () => {
    const { resolveSession } = await import("@lib/auth/session");
    const result = await resolveSession({
      idToken: null,
      refreshToken: null,
      accessToken: null,
      hasRawCookie: false,
    });
    expect(result).toEqual({ kind: "unauthorized", clearCookies: false });
    expect(mockGetLogtoConfig).not.toHaveBeenCalled();
  });

  it("unauthorized + clearCookies:true when no tokens but an undecryptable raw cookie exists", async () => {
    const { resolveSession } = await import("@lib/auth/session");
    const result = await resolveSession({
      idToken: null,
      refreshToken: null,
      accessToken: null,
      hasRawCookie: true,
    });
    expect(result).toEqual({ kind: "unauthorized", clearCookies: true });
  });

  it("ok (enriched, no refreshedTokens) when id_token valid and access_token present — refresh never attempted", async () => {
    mockVerifyStoredIdToken.mockResolvedValue({ sub: "logto-sub-123" });
    mockMapClaimsToAuthUser.mockReturnValue(idTokenUser);
    mockEnrichWithBackendProfile.mockResolvedValue(enrichedUser);

    const { resolveSession } = await import("@lib/auth/session");
    const result = await resolveSession({
      idToken: "valid-id-token",
      refreshToken: "some-refresh-token",
      accessToken: "valid-access-token",
      hasRawCookie: true,
    });

    expect(result).toEqual({ kind: "ok", user: enrichedUser });
    expect(mockRefreshAccessToken).not.toHaveBeenCalled();
  });

  it("ok (bare user, no refreshedTokens) when id_token valid, no access_token, no refresh_token", async () => {
    mockVerifyStoredIdToken.mockResolvedValue({ sub: "logto-sub-123" });
    mockMapClaimsToAuthUser.mockReturnValue(idTokenUser);

    const { resolveSession } = await import("@lib/auth/session");
    const result = await resolveSession({
      idToken: "valid-id-token",
      refreshToken: null,
      accessToken: null,
      hasRawCookie: true,
    });

    expect(result).toEqual({ kind: "ok", user: idTokenUser });
  });

  it("ok with refreshedTokens when id_token valid, no access_token, refresh succeeds", async () => {
    mockVerifyStoredIdToken
      .mockResolvedValueOnce({ sub: "logto-sub-123" }) // stored id_token
      .mockResolvedValueOnce({ sub: "logto-sub-123" }); // refreshed id_token
    mockMapClaimsToAuthUser.mockReturnValue(idTokenUser);
    mockRefreshAccessToken.mockResolvedValue(refreshedTokens);
    mockEnrichWithBackendProfile.mockResolvedValue(enrichedUser);

    const { resolveSession } = await import("@lib/auth/session");
    const result = await resolveSession({
      idToken: "valid-id-token",
      refreshToken: "valid-refresh-token",
      accessToken: null,
      hasRawCookie: true,
    });

    expect(result).toEqual({
      kind: "ok",
      user: enrichedUser,
      refreshedTokens,
    });
    expect(mockEnrichWithBackendProfile).toHaveBeenCalledWith(
      idTokenUser,
      refreshedTokens.access_token,
    );
  });

  it("ok falling back to the id_token-derived user when refresh fails with a definitive status", async () => {
    mockVerifyStoredIdToken.mockResolvedValue({ sub: "logto-sub-123" });
    mockMapClaimsToAuthUser.mockReturnValue(idTokenUser);
    mockRefreshAccessToken.mockRejectedValue(
      Object.assign(new Error("invalid_grant"), { status: 400 }),
    );

    const { resolveSession } = await import("@lib/auth/session");
    const result = await resolveSession({
      idToken: "valid-id-token",
      refreshToken: "revoked-refresh-token",
      accessToken: null,
      hasRawCookie: true,
    });

    expect(result).toEqual({ kind: "ok", user: idTokenUser });
  });

  it("unauthorized when id_token verification fails (non-transient) and there's no refresh_token", async () => {
    mockVerifyStoredIdToken.mockRejectedValue(new Error("id_token expired"));

    const { resolveSession } = await import("@lib/auth/session");
    const result = await resolveSession({
      idToken: "expired-id-token",
      refreshToken: null,
      accessToken: null,
      hasRawCookie: true,
    });

    expect(result).toEqual({ kind: "unauthorized", clearCookies: true });
  });

  it("ok with refreshedTokens when id_token verification fails (non-transient) but refresh succeeds", async () => {
    mockVerifyStoredIdToken
      .mockRejectedValueOnce(new Error("id_token expired")) // stored id_token
      .mockResolvedValueOnce({ sub: "logto-sub-123" }); // refreshed id_token
    mockMapClaimsToAuthUser.mockReturnValue(idTokenUser);
    mockRefreshAccessToken.mockResolvedValue(refreshedTokens);
    mockEnrichWithBackendProfile.mockResolvedValue(enrichedUser);

    const { resolveSession } = await import("@lib/auth/session");
    const result = await resolveSession({
      idToken: "expired-id-token",
      refreshToken: "valid-refresh-token",
      accessToken: null,
      hasRawCookie: true,
    });

    expect(result).toEqual({
      kind: "ok",
      user: enrichedUser,
      refreshedTokens,
    });
  });

  it("unauthorized when id_token verification fails (non-transient) and refresh also fails with a definitive status", async () => {
    mockVerifyStoredIdToken.mockRejectedValue(new Error("id_token expired"));
    mockRefreshAccessToken.mockRejectedValue(
      Object.assign(new Error("invalid_grant"), { status: 400 }),
    );

    const { resolveSession } = await import("@lib/auth/session");
    const result = await resolveSession({
      idToken: "expired-id-token",
      refreshToken: "revoked-refresh-token",
      accessToken: null,
      hasRawCookie: true,
    });

    expect(result).toEqual({ kind: "unauthorized", clearCookies: true });
  });

  it("transient when id_token verification fails transiently (JWKS unreachable) — refresh is never attempted", async () => {
    mockVerifyStoredIdToken.mockRejectedValue(
      Object.assign(new Error("Logto JWKS fetch failed"), { transient: true }),
    );

    const { resolveSession } = await import("@lib/auth/session");
    const result = await resolveSession({
      idToken: "any-id-token",
      refreshToken: "valid-refresh-token",
      accessToken: null,
      hasRawCookie: true,
    });

    expect(result).toEqual({ kind: "transient" });
    expect(mockRefreshAccessToken).not.toHaveBeenCalled();
  });

  it("ok (fallback) when refresh succeeds but returns no id_token, and a prior id_token-derived user exists", async () => {
    mockVerifyStoredIdToken.mockResolvedValue({ sub: "logto-sub-123" });
    mockMapClaimsToAuthUser.mockReturnValue(idTokenUser);
    mockRefreshAccessToken.mockResolvedValue({
      access_token: "new-access-token",
      expires_in: 3600,
    });

    const { resolveSession } = await import("@lib/auth/session");
    const result = await resolveSession({
      idToken: "valid-id-token",
      refreshToken: "valid-refresh-token",
      accessToken: null,
      hasRawCookie: true,
    });

    expect(result).toEqual({ kind: "ok", user: idTokenUser });
  });

  it("unauthorized when refresh succeeds but returns no id_token, and there's no prior user", async () => {
    mockRefreshAccessToken.mockResolvedValue({
      access_token: "new-access-token",
      expires_in: 3600,
    });

    const { resolveSession } = await import("@lib/auth/session");
    const result = await resolveSession({
      idToken: null,
      refreshToken: "valid-refresh-token",
      accessToken: null,
      hasRawCookie: true,
    });

    expect(result).toEqual({ kind: "unauthorized", clearCookies: true });
  });

  it("transient when getLogtoConfig itself throws (no .status)", async () => {
    mockGetLogtoConfig.mockImplementation(() => {
      throw new Error("Missing required environment variable: LOGTO_ENDPOINT");
    });

    const { resolveSession } = await import("@lib/auth/session");
    const result = await resolveSession({
      idToken: "any-id-token",
      refreshToken: null,
      accessToken: null,
      hasRawCookie: true,
    });

    expect(result).toEqual({ kind: "transient" });
  });

  it("transient when refresh fails with a 5xx/network error and there's no prior user", async () => {
    mockRefreshAccessToken.mockRejectedValue(new Error("network timeout"));

    const { resolveSession } = await import("@lib/auth/session");
    const result = await resolveSession({
      idToken: null,
      refreshToken: "valid-refresh-token",
      accessToken: null,
      hasRawCookie: true,
    });

    expect(result).toEqual({ kind: "transient" });
  });
});
