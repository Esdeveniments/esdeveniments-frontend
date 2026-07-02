import { describe, it, expect, vi, beforeEach } from "vitest";
import * as usersExternal from "@lib/api/users-external";
import { enrichWithBackendProfile } from "@app/api/auth/me/route";
import type { AuthUser } from "types/auth";

vi.mock("@lib/api/users-external", () => ({
  getAuthenticatedUserExternal: vi.fn(),
}));

const mockGetAuthenticatedUserExternal = vi.mocked(
  usersExternal.getAuthenticatedUserExternal,
);

const idTokenUser: AuthUser = {
  id: "logto-sub",
  email: "gerard@example.com",
  name: "Gerard",
  username: "gerard_rovellat",
  avatarUrl: "https://logto.example.com/avatar.png",
  role: "USER",
  emailVerified: true,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("enrichWithBackendProfile", () => {
  it("returns the id_token-derived user unchanged without an access token", async () => {
    const result = await enrichWithBackendProfile(idTokenUser, null);
    expect(result).toEqual(idTokenUser);
    expect(mockGetAuthenticatedUserExternal).not.toHaveBeenCalled();
  });

  it("returns the id_token-derived user unchanged when the backend call fails", async () => {
    mockGetAuthenticatedUserExternal.mockResolvedValue(null);
    const result = await enrichWithBackendProfile(idTokenUser, "token");
    expect(result).toEqual(idTokenUser);
  });

  it("keeps id/email/name/username from the verified id_token, layers backend-owned fields", async () => {
    mockGetAuthenticatedUserExternal.mockResolvedValue({
      id: "backend-uuid",
      email: "backend@example.com",
      name: "Backend Name",
      username: "backend_username",
      pictureUrl: "https://cdn.example.com/avatar.png",
      pictureSource: "CUSTOM",
      role: "ADMIN",
      lastLoginAt: "2026-07-02T10:00:00Z",
    });

    const result = await enrichWithBackendProfile(idTokenUser, "token");

    expect(result).toEqual({
      ...idTokenUser,
      avatarUrl: "https://cdn.example.com/avatar.png",
      pictureSource: "CUSTOM",
      role: "ADMIN",
      lastLoginAt: "2026-07-02T10:00:00Z",
    });
  });

  it("falls back to the id_token's avatarUrl/role when the backend omits them", async () => {
    mockGetAuthenticatedUserExternal.mockResolvedValue({
      id: "backend-uuid",
      email: "backend@example.com",
      name: "Backend Name",
      username: "backend_username",
    });

    const result = await enrichWithBackendProfile(idTokenUser, "token");

    expect(result.avatarUrl).toBe(idTokenUser.avatarUrl);
    expect(result.role).toBe(idTokenUser.role);
    expect(result.pictureSource).toBeUndefined();
    expect(result.lastLoginAt).toBeUndefined();
  });
});
