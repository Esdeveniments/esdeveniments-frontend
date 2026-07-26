import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH } from "../app/api/users/me/profile/route";
import * as authCookies from "../utils/auth-cookies";
import * as usersExternal from "../lib/api/users-external";

vi.mock("../utils/api-error-handler", () => ({
  // Map thrown errors to a Response carrying the error's `.status` when it is
  // a valid HTTP status code (4xx–5xx); falls back to 500 otherwise.
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
  patchMeProfileExternal: vi.fn(),
}));

const getCookie = vi.mocked(authCookies.getAccessTokenFromCookies);
const patchExternal = vi.mocked(usersExternal.patchMeProfileExternal);

beforeEach(() => {
  vi.clearAllMocks();
});

function buildPatchRequest(body: unknown) {
  return new Request("http://localhost/api/users/me/profile", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/users/me/profile", () => {
  it("returns 401 when no access token cookie is present", async () => {
    getCookie.mockResolvedValue(null);
    const res = await PATCH(buildPatchRequest({}) as never);
    expect(res.status).toBe(401);
    expect(patchExternal).not.toHaveBeenCalled();
  });

  it("returns 400 with an invalid JSON body", async () => {
    getCookie.mockResolvedValue("tok");
    const req = new Request("http://localhost/api/users/me/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: "not-json",
    });
    const res = await PATCH(req as never);
    expect(res.status).toBe(400);
    expect(patchExternal).not.toHaveBeenCalled();
  });

  it("returns 400 when Zod safeParse fails (missing required fields)", async () => {
    getCookie.mockResolvedValue("tok");
    const res = await PATCH(
      buildPatchRequest({ username: "ab", displayName: "" }) as never,
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    // The first Zod issue's message — usernameTooShort for "ab" length.
    expect(body.error).toBeTruthy();
    expect(patchExternal).not.toHaveBeenCalled();
  });

  it("returns 400 when Zod safeParse fails (uppercase rejected)", async () => {
    getCookie.mockResolvedValue("tok");
    const res = await PATCH(
      buildPatchRequest({ username: "Alex", displayName: "Alex" }) as never,
    );
    expect(res.status).toBe(400);
  });

  it("returns 200 with the parsed body on backend success", async () => {
    getCookie.mockResolvedValue("tok");
    const parsedFromBackend = {
      id: "uuid-1",
      email: "alex@example.com",
      displayName: "Alex García",
      username: "alex91",
      bio: "Music.",
      avatarUrl: null,
      organizerVerified: false,
      profileCompleted: true,
      role: "USER",
      lastLoginAt: "2026-07-25T18:10:05Z",
    };
    patchExternal.mockResolvedValue(parsedFromBackend as never);
    const res = await PATCH(
      buildPatchRequest({
        username: "alex91",
        displayName: "Alex García",
        bio: "Music.",
      }) as never,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const json = (await res.json()) as typeof parsedFromBackend;
    expect(json).toEqual(parsedFromBackend);
    expect(patchExternal).toHaveBeenCalledWith(
      expect.objectContaining({ username: "alex91" }),
      "tok",
    );
  });

  it("propagates backend 409 (username taken) via handleApiError", async () => {
    getCookie.mockResolvedValue("tok");
    const err = Object.assign(new Error("taken"), { status: 409 });
    patchExternal.mockRejectedValue(err);
    const res = await PATCH(
      buildPatchRequest({ username: "alex91", displayName: "Alex" }) as never,
    );
    expect(res.status).toBe(409);
  });

  it("propagates backend 400 via handleApiError", async () => {
    getCookie.mockResolvedValue("tok");
    const err = Object.assign(new Error("validation"), { status: 400 });
    patchExternal.mockRejectedValue(err);
    const res = await PATCH(
      buildPatchRequest({ username: "alex91", displayName: "Alex" }) as never,
    );
    expect(res.status).toBe(400);
  });

  it("returns 502 when wrapper returns null (backend parsing failure)", async () => {
    getCookie.mockResolvedValue("tok");
    patchExternal.mockResolvedValue(null);
    const res = await PATCH(
      buildPatchRequest({ username: "alex91", displayName: "Alex" }) as never,
    );
    expect(res.status).toBe(502);
  });

  it("passes the trimmed/normalized body to the wrapper (Zod semantics)", async () => {
    getCookie.mockResolvedValue("tok");
    patchExternal.mockResolvedValue({} as never);
    await PATCH(
      buildPatchRequest({
        username: "  alex-91  ",
        displayName: "  Alex García  ",
        bio: "  bio  ",
      }) as never,
    );
    expect(patchExternal).toHaveBeenCalledWith(
      {
        username: "alex-91",
        displayName: "Alex García",
        bio: "bio",
      },
      "tok",
    );
  });
});
