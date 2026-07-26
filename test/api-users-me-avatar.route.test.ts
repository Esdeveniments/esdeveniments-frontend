import { describe, it, expect, vi, beforeEach } from "vitest";
import { DELETE } from "../app/api/users/me/avatar/route";
import * as authCookies from "../utils/auth-cookies";
import * as usersExternal from "../lib/api/users-external";

vi.mock("../utils/api-error-handler", () => ({
  // Map thrown errors to a Response carrying the error's `.status` when it is
  // a valid HTTP status code (4xx-5xx); falls back to 500 otherwise.
  // Mirrors the real `handleApiError` so the route tests can assert on the
  // propagated status without exercising Sentry / logging side-effects.
  handleApiError: (error: unknown) => {
    const rawStatus = (error as { status?: unknown } | null | undefined)?.status;
    const status =
      typeof rawStatus === "number" && rawStatus >= 400 && rawStatus < 600
        ? rawStatus
        : 500;
    return new Response(JSON.stringify({ error: "handled" }), { status });
  },
}));

vi.mock("../utils/auth-cookies", () => ({
  getAccessTokenFromCookies: vi.fn(),
}));

vi.mock("../lib/api/users-external", () => ({
  uploadUserAvatarExternal: vi.fn(),
  deleteUserAvatarExternal: vi.fn(),
}));

const getCookie = vi.mocked(authCookies.getAccessTokenFromCookies);
const deleteMock = vi.mocked(usersExternal.deleteUserAvatarExternal);

beforeEach(() => {
  vi.clearAllMocks();
});

function buildDeleteRequest() {
  return new Request("http://localhost/api/users/me/avatar", {
    method: "DELETE",
  });
}

// POST multipart is covered by e2e/api-users-me.spec.ts (Pagewright
// request fixture against a real dev server). jsdom + Request+FormData
// is historically broken at the constructor level — see the route-level
// tests in lib/api/users-external-new.test.ts for the wrapper-side
// coverage of uploadUserAvatarExternal.
//
// DELETE has no body, so it composes cleanly with jsdom's Request.

describe("DELETE /api/users/me/avatar", () => {
  it("returns 401 when no access token cookie is present", async () => {
    getCookie.mockResolvedValue(null);
    const res = await DELETE(buildDeleteRequest() as never);
    expect(res.status).toBe(401);
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("returns 200 + { ok: true } on backend success", async () => {
    getCookie.mockResolvedValue("tok");
    deleteMock.mockResolvedValue(true);
    const res = await DELETE(buildDeleteRequest() as never);
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const json = (await res.json()) as { ok: boolean };
    expect(json.ok).toBe(true);
    expect(deleteMock).toHaveBeenCalledWith("tok");
  });

  it("returns 502 when the wrapper returns false (backend parse/upload failed)", async () => {
    getCookie.mockResolvedValue("tok");
    deleteMock.mockResolvedValue(false);
    const res = await DELETE(buildDeleteRequest() as never);
    expect(res.status).toBe(502);
  });

  it("propagates backend 401 (expired / invalid token) via handleApiError", async () => {
    getCookie.mockResolvedValue("tok");
    const err = Object.assign(new Error("expired"), { status: 401 });
    deleteMock.mockRejectedValue(err);
    const res = await DELETE(buildDeleteRequest() as never);
    expect(res.status).toBe(401);
  });

  it("propagates backend 403 via handleApiError", async () => {
    getCookie.mockResolvedValue("tok");
    const err = Object.assign(new Error("forbidden"), { status: 403 });
    deleteMock.mockRejectedValue(err);
    const res = await DELETE(buildDeleteRequest() as never);
    expect(res.status).toBe(403);
  });
});
