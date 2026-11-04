import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// The AES key is resolved lazily (getEncKey, first cookie access) and cached
// per module instance, so stub LOGTO_COOKIE_SECRET and re-import the module
// (vi.resetModules) for each scenario to get a fresh cache.
async function loadCookies(secret?: string) {
  vi.resetModules();
  if (secret) vi.stubEnv("LOGTO_COOKIE_SECRET", secret);
  else vi.stubEnv("LOGTO_COOKIE_SECRET", "");
  return import("@utils/auth-cookies");
}

const tokens = {
  access_token: "super-secret-access-token",
  token_type: "Bearer",
  expires_in: 3600,
  id_token: "id-token",
  refresh_token: "refresh-token",
};

describe("auth-cookies at-rest encryption", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("encrypts the token cookie and round-trips it back", async () => {
    const m = await loadCookies("x".repeat(32));
    const res = NextResponse.json({});
    m.setTokenCookies(res, tokens);

    const value = res.cookies.get(m.ACCESS_TOKEN_COOKIE)?.value ?? "";
    expect(value.startsWith("v1.")).toBe(true); // encrypted envelope
    expect(value).not.toContain("super-secret-access-token");

    const req = new NextRequest("http://localhost/api/auth/me", {
      headers: { cookie: `${m.ACCESS_TOKEN_COOKIE}=${value}` },
    });
    expect(m.readTokenFromRequest(req, m.ACCESS_TOKEN_COOKIE)).toBe(
      tokens.access_token,
    );
  });

  it("stores plaintext when no secret is configured (backwards compatible)", async () => {
    const m = await loadCookies();
    const res = NextResponse.json({});
    m.setTokenCookies(res, tokens);
    const value = res.cookies.get(m.ACCESS_TOKEN_COOKIE)?.value ?? "";
    expect(value).toBe(tokens.access_token);

    const req = new NextRequest("http://localhost/api/auth/me", {
      headers: { cookie: `${m.ACCESS_TOKEN_COOKIE}=${value}` },
    });
    expect(m.readTokenFromRequest(req, m.ACCESS_TOKEN_COOKIE)).toBe(
      tokens.access_token,
    );
  });

  it("scopes the refresh_token cookie to path=/, not path=/api/auth", async () => {
    // Server Actions bound to arbitrary pages (e.g. createEventAction on
    // /publica) need this cookie to refresh an expired access token — a
    // narrower path means the browser never sends it there at all.
    const m = await loadCookies();
    const res = NextResponse.json({});
    m.setTokenCookies(res, tokens);

    const value = res.cookies.get(m.REFRESH_TOKEN_COOKIE);
    expect(value?.path).toBe("/");
  });

  it("clearTokenCookies clears the refresh_token cookie at path=/", async () => {
    const m = await loadCookies();
    const res = NextResponse.json({});
    m.clearTokenCookies(res);

    const value = res.cookies.get(m.REFRESH_TOKEN_COOKIE);
    expect(value?.path).toBe("/");
    expect(value?.maxAge).toBe(0);
  });

  it("also expires a pre-rollout path=/api/auth refresh_token cookie, so it can't refresh a session back in after logout", async () => {
    const m = await loadCookies();
    const res = NextResponse.json({});
    m.clearTokenCookies(res);

    const setCookieHeaders = res.headers.getSetCookie();
    const legacyClear = setCookieHeaders.find(
      (header) =>
        header.startsWith(`${m.REFRESH_TOKEN_COOKIE}=`) &&
        header.includes("Path=/api/auth"),
    );
    expect(legacyClear).toBeDefined();
    expect(legacyClear).toContain("Max-Age=0");
  });
});
