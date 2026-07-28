import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "node:crypto";
import * as fetchWrapper from "../lib/api/fetch-wrapper";
import {
  decodeSafeJwtClaims,
  deleteUserAvatarExternal,
  getUserEventsExternal,
  patchMeProfileExternal,
  uploadUserAvatarExternal,
} from "../lib/api/users-external";

vi.mock("../lib/api/fetch-wrapper", () => ({
  fetchWithHmac: vi.fn(),
}));

// Pin API URL so the test doesn't depend on env / api-defaults.json.
vi.mock("@utils/api-helpers", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@utils/api-helpers")>()),
  getApiUrl: () => "http://localhost:8080/api",
  isApiUrlConfigured: () => true,
}));

const mockFetchWithHmac = vi.mocked(fetchWrapper.fetchWithHmac);

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  } as Response;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("patchMeProfileExternal", () => {
  // Real backend shape (confirmed 2026-07-27 against preprod) — the same as
  // GET /api/users/{username}, not GET /api/auth/me. It does NOT carry
  // email/profileCompleted/role/lastLoginAt.
  const profileUpdateResponse = {
    id: "uuid-1",
    displayName: "Alex García",
    username: "alex91",
    bio: "Concerts.",
    avatarUrl: null,
    organizerVerified: false,
    eventCount: 0,
    totalEventVisits: 0,
    createdAt: "2026-07-25T18:10:05Z",
  };

  it("forwards body + Bearer + PATCH method", async () => {
    mockFetchWithHmac.mockResolvedValue(jsonResponse(profileUpdateResponse));

    await patchMeProfileExternal(
      {
        username: "alex91",
        displayName: "Alex García",
        bio: null,
      },
      "some-access-token",
    );

    expect(mockFetchWithHmac).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetchWithHmac.mock.calls[0];
    expect(url).toContain("/users/me/profile");
    expect(options?.method).toBe("PATCH");
    expect(
      (options?.headers as Record<string, string>).Authorization,
    ).toBe("Bearer some-access-token");
    expect(
      (options?.headers as Record<string, string>)["Content-Type"],
    ).toBe("application/json");
    expect(JSON.parse(options?.body as string)).toEqual({
      username: "alex91",
      displayName: "Alex García",
      bio: null,
    });
  });

  it("returns the parsed response on 200", async () => {
    mockFetchWithHmac.mockResolvedValue(jsonResponse(profileUpdateResponse));
    const result = await patchMeProfileExternal(
      { username: "alex91", displayName: "Alex García" },
      "tok",
    );
    // parseUserPublic normalizes nullish fields to `undefined` at parse time.
    expect(result).toEqual({ ...profileUpdateResponse, avatarUrl: undefined });
  });

  it("throws with .status = 409 (username taken) on conflict", async () => {
    mockFetchWithHmac.mockResolvedValue(jsonResponse(null, 409));
    await expect(
      patchMeProfileExternal(
        { username: "alex91", displayName: "Alex García" },
        "tok",
      ),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("throws with .status = 400 on validation error", async () => {
    mockFetchWithHmac.mockResolvedValue(jsonResponse(null, 400));
    await expect(
      patchMeProfileExternal(
        { username: "bad", displayName: "" },
        "tok",
      ),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("returns null on network failure", async () => {
    mockFetchWithHmac.mockRejectedValueOnce(new Error("network"));
    const result = await patchMeProfileExternal(
      { username: "alex91", displayName: "Alex" },
      "tok",
    );
    expect(result).toBeNull();
  });

  it("returns null without access token", async () => {
    const result = await patchMeProfileExternal(
      { username: "alex91", displayName: "Alex" },
      "",
    );
    expect(result).toBeNull();
    expect(mockFetchWithHmac).not.toHaveBeenCalled();
  });
});

describe("uploadUserAvatarExternal", () => {
  it("sends multipart/form-data with avatarFile field + Bearer", async () => {
    mockFetchWithHmac.mockResolvedValue(
      jsonResponse({ avatarUrl: "https://cdn.example.com/u.png" }),
    );

    const file = new File(["binary"], "avatar.png", { type: "image/png" });
    const result = await uploadUserAvatarExternal(file, "tok");

    expect(result).toEqual({ avatarUrl: "https://cdn.example.com/u.png" });
    expect(mockFetchWithHmac).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetchWithHmac.mock.calls[0];
    expect(url).toContain("/users/me/avatar");
    expect(options?.method).toBe("POST");
    expect(
      (options?.headers as Record<string, string>).Authorization,
    ).toBe("Bearer tok");
    const body = options?.body as FormData;
    expect(body.get("avatarFile")).toBe(file);
  });

  it("returns null on malformed JSON response", async () => {
    mockFetchWithHmac.mockResolvedValue(
      jsonResponse({ nope: "missing avatarUrl" }),
    );
    const file = new File(["binary"], "avatar.png", { type: "image/png" });
    const result = await uploadUserAvatarExternal(file, "tok");
    expect(result).toBeNull();
  });

  it("throws with .status on non-ok", async () => {
    mockFetchWithHmac.mockResolvedValue(jsonResponse(null, 413));
    const file = new File(["binary"], "avatar.png", { type: "image/png" });
    await expect(uploadUserAvatarExternal(file, "tok")).rejects.toMatchObject(
      { status: 413 },
    );
  });

  it("returns null without access token", async () => {
    const file = new File(["binary"], "avatar.png", { type: "image/png" });
    const result = await uploadUserAvatarExternal(file, "");
    expect(result).toBeNull();
  });
});

describe("deleteUserAvatarExternal", () => {
  it("hits DELETE /users/me/avatar with Bearer + returns true on 2xx", async () => {
    mockFetchWithHmac.mockResolvedValue(jsonResponse({}, 204));
    const result = await deleteUserAvatarExternal("tok");
    expect(result).toBe(true);
    expect(mockFetchWithHmac).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetchWithHmac.mock.calls[0];
    expect(url).toContain("/users/me/avatar");
    expect(options?.method).toBe("DELETE");
    expect(
      (options?.headers as Record<string, string>).Authorization,
    ).toBe("Bearer tok");
  });

  it("throws with .status on non-ok (consistency with the other wrappers)", async () => {
    mockFetchWithHmac.mockResolvedValue(jsonResponse(null, 401));
    await expect(deleteUserAvatarExternal("tok")).rejects.toMatchObject({
      status: 401,
    });
  });

  it("returns false without access token", async () => {
    const result = await deleteUserAvatarExternal("");
    expect(result).toBe(false);
    expect(mockFetchWithHmac).not.toHaveBeenCalled();
  });
});

describe("decodeSafeJwtClaims", () => {
  // Build a 3-part JWT (header.payload.signature) without verifying the
  // signature — the helper intentionally skips verification.
  const base64url = (o: unknown) =>
    Buffer.from(JSON.stringify(o))
      .toString("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

  const makeJwt = (claims: Record<string, unknown>): string =>
    `${base64url({ alg: "HS256", typ: "JWT" })}.${base64url(claims)}.sig`;

  it("includes the `scope` claim in the redacted summary (2026-07-26 POST-vs-GET diagnostic)", () => {
    const token = makeJwt({
      iss: "https://example.test/oidc",
      aud: "https://api.example.test",
      exp: 1785074470,
      sub: "user-a10mgbryoklh",
      scope: "openid profile email offline_access events:write",
    });
    const summary = JSON.parse(decodeSafeJwtClaims(token));
    expect(summary.iss).toBe("https://example.test/oidc");
    expect(summary.aud).toBe("https://api.example.test");
    expect(summary.exp).toBe(1785074470);
    expect(summary.sub).not.toBe("user-a10mgbryoklh"); // hashed, not raw — see below
    expect(summary.scope).toBe(
      "openid profile email offline_access events:write",
    );
  });

  it("hashes `sub` instead of logging the raw Logto subject identifier", () => {
    const rawSub = "user-a10mgbryoklh";
    const token = makeJwt({ iss: "i", aud: "a", exp: 1, sub: rawSub });
    const summary = JSON.parse(decodeSafeJwtClaims(token));

    expect(summary.sub).not.toContain(rawSub);
    expect(summary.sub).toBe(
      createHash("sha256").update(rawSub).digest("hex").slice(0, 12),
    );

    // Same sub always hashes the same, so log lines from the same user/
    // session can still be correlated without exposing the real identifier.
    const secondToken = makeJwt({ iss: "i2", aud: "a2", exp: 2, sub: rawSub });
    const secondSummary = JSON.parse(decodeSafeJwtClaims(secondToken));
    expect(secondSummary.sub).toBe(summary.sub);

    // A different sub hashes to something else.
    const otherToken = makeJwt({ iss: "i", aud: "a", exp: 1, sub: "user-other" });
    const otherSummary = JSON.parse(decodeSafeJwtClaims(otherToken));
    expect(otherSummary.sub).not.toBe(summary.sub);
  });

  it("returns undefined scope when the JWT omits it (older tokens)", () => {
    const token = makeJwt({
      iss: "https://example.test/oidc",
      aud: "https://api.example.test",
      exp: 1785074470,
      sub: "user-1",
    });
    const summary = JSON.parse(decodeSafeJwtClaims(token));
    expect(summary.scope).toBeUndefined();
  });

  it("caps scope at 200 chars so a misconfigured tenant can't bloat log lines", () => {
    const longScope = "x".repeat(500);
    const token = makeJwt({
      iss: "i",
      aud: "a",
      exp: 1,
      sub: "s",
      scope: longScope,
    });
    const summary = JSON.parse(decodeSafeJwtClaims(token));
    expect((summary.scope as string).length).toBe(200);
  });
});

describe("getUserEventsExternal pageSize default", () => {
  it("defaults to size=20 (backend handoff + /[place] listing density)", async () => {
    mockFetchWithHmac.mockResolvedValue(
      jsonResponse({
        content: [],
        currentPage: 0,
        pageSize: 20,
        totalElements: 0,
        totalPages: 0,
        last: true,
      }),
    );

    const result = await getUserEventsExternal("alex91");
    expect(result.pageSize).toBe(20);
    const [url] = mockFetchWithHmac.mock.calls[0];
    expect(url).toContain("size=20");
    expect(url).toContain("page=0");
  });

  it("respects caller-supplied page and size", async () => {
    mockFetchWithHmac.mockResolvedValue(
      jsonResponse({
        content: [],
        currentPage: 2,
        pageSize: 5,
        totalElements: 0,
        totalPages: 0,
        last: true,
      }),
    );
    await getUserEventsExternal("alex91", 2, 5);
    const [url] = mockFetchWithHmac.mock.calls[0];
    expect(url).toContain("size=5");
    expect(url).toContain("page=2");
  });
});
