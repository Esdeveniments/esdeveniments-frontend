import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCurrentUser } from "@lib/auth/session";
import type { AuthUser, IdTokenPayload } from "types/auth";

const mockCookieStore = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve({
    get: (name: string) => {
      const value = mockCookieStore.get(name);
      return value ? { value } : undefined;
    },
  })),
}));

vi.mock("@utils/auth-cookies", () => ({
  ID_TOKEN_COOKIE: "logto_id_token",
  getIdTokenFromCookies: vi.fn(() => {
    const value = mockCookieStore.get("logto_id_token");
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

describe("getCurrentUser", () => {
  beforeEach(() => {
    mockCookieStore.clear();
    vi.clearAllMocks();
  });

  it("returns null when the id_token cookie is missing", async () => {
    const user = await getCurrentUser();
    expect(user).toBeNull();
    expect(mockVerifyStoredIdToken).not.toHaveBeenCalled();
  });

  it("returns null when token verification throws", async () => {
    mockCookieStore.set("logto_id_token", "invalid-token");
    mockGetLogtoConfig.mockReturnValue({ issuer: "https://logto.test/oidc" });
    mockVerifyStoredIdToken.mockRejectedValue(new Error("invalid signature"));

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

    const user = await getCurrentUser();

    expect(user).toEqual(authUser);
    expect(mockVerifyStoredIdToken).toHaveBeenCalledWith(
      expect.anything(),
      "valid-token",
    );
    expect(mockMapClaimsToAuthUser).toHaveBeenCalledWith(claims);
  });
});
