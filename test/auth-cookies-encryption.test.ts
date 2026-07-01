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
});
