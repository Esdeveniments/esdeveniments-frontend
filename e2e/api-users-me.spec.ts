import { test, expect } from "@playwright/test";

/**
 * E2E contract tests for /api/users/me/{profile,avatar}.
 *
 * These hit the running dev server (started by Playwright via `E2E_TEST_MODE=1
 * yarn dev` in playwright.config.ts). Without an authenticated session, the
 * route handlers MUST return 401 (Bearer via HttpOnly cookie is missing),
 * including malformed avatar requests. Multipart requests to other routes
 * must return 415 before reaching their handlers.
 *
 * These tests do NOT require Logto login flows; they lock the unauthenticated
 * contract + proxy multipart guard so accidental regressions surface in CI.
 *
 * They send no HMAC and need no backend, so they also run against PR previews.
 */

test.describe("/api/users/me/* (unauthenticated contract)", () => {
  test("PATCH /api/users/me/profile without auth cookie returns 401", async ({
    request,
    baseURL,
  }) => {
    const response = await request.patch("/api/users/me/profile", {
      headers: {
        "content-type": "application/json",
        origin: new URL(baseURL!).origin,
      },
      data: { username: "alex91", displayName: "Alex García" },
    });
    expect(response.status()).toBe(401);
  });

  test("POST /api/users/me/avatar without auth cookie returns 401", async ({
    request,
    baseURL,
  }) => {
    // We send a properly-bound multipart body — the route handler still 401s
    // before any size/type checks because the auth-cookie read fails first.
    const boundary = "---test-boundary-abc";
    const body = `--${boundary}\r\nContent-Disposition: form-data; name="avatarFile"; filename="a.png"\r\nContent-Type: image/png\r\n\r\nbinary\r\n--${boundary}--\r\n`;
    const response = await request.post("/api/users/me/avatar", {
      headers: {
        origin: new URL(baseURL!).origin,
        "content-type": `multipart/form-data; boundary=${boundary}`,
        "content-length": String(body.length),
      },
      data: body,
    });
    expect(response.status()).toBe(401);
  });

  test("DELETE /api/users/me/avatar without auth cookie returns 401", async ({
    request,
    baseURL,
  }) => {
    const response = await request.delete("/api/users/me/avatar", {
      headers: { origin: new URL(baseURL!).origin },
    });
    expect(response.status()).toBe(401);
  });
});

test.describe("/api/users/me/* (multipart handling)", () => {
  test("requires authentication before parsing a malformed avatar body", async ({
    request,
    baseURL,
  }) => {
    const response = await request.post("/api/users/me/avatar", {
      headers: {
        origin: new URL(baseURL!).origin,
        "content-type": "multipart/form-data",
      },
      data: "no-boundary",
      failOnStatusCode: false,
    });
    expect(response.status()).toBe(401);
  });

  test("rejects multipart on the JSON-only profile route", async ({
    request,
    baseURL,
  }) => {
    const response = await request.patch("/api/users/me/profile", {
      headers: {
        origin: new URL(baseURL!).origin,
        "content-type": "multipart/form-data; boundary=test",
      },
      data: "--test--\r\n",
    });
    expect(response.status()).toBe(415);
  });
});
