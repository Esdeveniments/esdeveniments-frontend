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

vi.mock("@lib/auth/logto", () => ({
  getLogtoConfig: () => mockGetLogtoConfig(),
  verifyStoredIdToken: (config: unknown, idToken: string) =>
    mockVerifyStoredIdToken(config, idToken),
  mapClaimsToAuthUser: (claims: IdTokenPayload) =>
    mockMapClaimsToAuthUser(claims),
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
