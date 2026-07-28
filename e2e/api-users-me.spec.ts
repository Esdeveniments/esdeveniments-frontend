import { test, expect } from "@playwright/test";

/**
 * E2E contract tests for /api/users/me/{profile,avatar}.
 *
 * These hit the running dev server (started by Playwright via `E2E_TEST_MODE=1
 * yarn dev` in playwright.config.ts). Without an authenticated session, the
 * route handlers MUST return 401 (Bearer via HttpOnly cookie is missing),
 * and POST /api/users/me/avatar MUST return 415 when Content-Type lacks a
 * boundary parameter (proxy.ts edge-level multipart allowlist).
 *
 * These tests do NOT require Logto login flows; they lock the unauthenticated
 * contract + proxy multipart guard so accidental regressions surface in CI.
 *
 * Tests are skipped when the dev server URL is not reachable or HMAC_SECRET
 * is not configured (avoids running against an unconfigured preview).
 */

const SHOULD_SKIP =
  !process.env.HMAC_SECRET || !process.env.NEXT_PUBLIC_API_URL;

test.describe("/api/users/me/* (unauthenticated contract)", () => {
  test.skip(SHOULD_SKIP, "Skipped: HMAC_SECRET or NEXT_PUBLIC_API_URL not set");

  test("PATCH /api/users/me/profile without auth cookie returns 401", async ({
    request,
  }) => {
    const response = await request.patch("/api/users/me/profile", {
      headers: { "content-type": "application/json" },
      data: { username: "alex91", displayName: "Alex García" },
    });
    expect(response.status()).toBe(401);
  });

  test("POST /api/users/me/avatar without auth cookie returns 401", async ({
    request,
  }) => {
    // We send a properly-bound multipart body — the route handler still 401s
    // before any size/type checks because the auth-cookie read fails first.
    const boundary = "---test-boundary-abc";
    const body = `--${boundary}\r\nContent-Disposition: form-data; name="avatarFile"; filename="a.png"\r\nContent-Type: image/png\r\n\r\nbinary\r\n--${boundary}--\r\n`;
    const response = await request.post("/api/users/me/avatar", {
      headers: {
        "content-type": `multipart/form-data; boundary=${boundary}`,
        "content-length": String(body.length),
      },
      data: body,
    });
    expect(response.status()).toBe(401);
  });

  test("DELETE /api/users/me/avatar without auth cookie returns 401", async ({
    request,
  }) => {
    const response = await request.delete("/api/users/me/avatar");
    expect(response.status()).toBe(401);
  });
});

test.describe("/api/users/me/avatar (multipart allowlist)", () => {
  test.skip(SHOULD_SKIP, "Skipped: HMAC_SECRET or NEXT_PUBLIC_API_URL not set");

  test("returns 415 when Content-Type lacks a boundary parameter", async ({
    request,
  }) => {
    // Send a malformed multipart content-type with a valid-looking body so the
    // request reaches proxy.ts. proxy.ts's edge-level check rejects before
    // public-API gate / route handler ever run.
    const response = await request.post("/api/users/me/avatar", {
      headers: {
        "content-type": "multipart/form-data",
      },
      data: "no-boundary",
      failOnStatusCode: false,
    });
    // 415 is the contract from the proxy.ts allowlist. If this is ever 401,
    // proxy.ts ordering regressed (check might have flipped back behind
    // isPublicApiRequest).
    expect(response.status()).toBe(415);
  });
});
