import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

/**
 * Regression test for the deploy-gate 403: the E2E server runs on
 * localhost:3000 under NODE_ENV=production, so `isDev` is false and the Origin
 * allowlist only contains the site host — same-origin localhost POSTs (favorites,
 * sponsor) were 403'd. The fix allows localhost origins when E2E_TEST_MODE is on
 * (never set in prod), without widening production's Origin check.
 *
 * `isDev` / `isE2ETestMode` are module-level consts read at import, so each case
 * resets modules and stubs env BEFORE importing proxy.
 */
const SITE = "https://www.esdeveniments.cat";

function reqWithOrigin(origin: string | null): NextRequest {
  return {
    headers: { get: (k: string) => (k.toLowerCase() === "origin" ? origin : null) },
  } as unknown as NextRequest;
}

async function importIsOriginAllowed(env: Record<string, string>) {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", env.NODE_ENV ?? "production");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", env.NEXT_PUBLIC_SITE_URL ?? SITE);
  vi.stubEnv("E2E_TEST_MODE", env.E2E_TEST_MODE ?? "");
  vi.stubEnv("NEXT_PUBLIC_E2E_TEST_MODE", env.NEXT_PUBLIC_E2E_TEST_MODE ?? "");
  const mod = await import("../proxy");
  return mod.isOriginAllowed;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("isOriginAllowed — localhost in the E2E deploy env", () => {
  it("production + E2E_TEST_MODE: allows the localhost same-origin POST (the fix)", async () => {
    const isOriginAllowed = await importIsOriginAllowed({ E2E_TEST_MODE: "1" });
    expect(isOriginAllowed(reqWithOrigin("http://localhost:3000"))).toBe(true);
  });

  it("production WITHOUT E2E mode: still rejects localhost (production Origin check unchanged)", async () => {
    const isOriginAllowed = await importIsOriginAllowed({});
    expect(isOriginAllowed(reqWithOrigin("http://localhost:3000"))).toBe(false);
  });

  it("production + E2E_TEST_MODE: still rejects a cross-origin attacker", async () => {
    const isOriginAllowed = await importIsOriginAllowed({ E2E_TEST_MODE: "1" });
    expect(isOriginAllowed(reqWithOrigin("https://evil.example.com"))).toBe(false);
  });

  it("production: always allows the real site origin", async () => {
    const isOriginAllowed = await importIsOriginAllowed({});
    expect(isOriginAllowed(reqWithOrigin(SITE))).toBe(true);
  });

  it("rejects a missing Origin header", async () => {
    const isOriginAllowed = await importIsOriginAllowed({ E2E_TEST_MODE: "1" });
    expect(isOriginAllowed(reqWithOrigin(null))).toBe(false);
  });
});
