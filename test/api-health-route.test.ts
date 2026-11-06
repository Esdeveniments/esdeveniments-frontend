import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "app/api/health/route";

function healthRequest(init: { query?: string; header?: string } = {}) {
  return new NextRequest(`http://localhost/api/health${init.query ?? ""}`, {
    headers: init.header ? { "x-health-secret": init.header } : {},
  });
}

async function isDetailed(request: NextRequest) {
  const body = await (await GET(request)).json();
  return "buildVersion" in body;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("/api/health authentication", () => {
  it("returns details for the x-health-secret header", async () => {
    vi.stubEnv("HEALTH_SECRET", "health-value");
    vi.stubEnv("REVALIDATE_SECRET", "revalidate-value");

    expect(await isDetailed(healthRequest({ header: "health-value" }))).toBe(true);
  });

  it("ignores the ?secret= query string", async () => {
    vi.stubEnv("HEALTH_SECRET", "");
    vi.stubEnv("REVALIDATE_SECRET", "revalidate-value");

    expect(
      await isDetailed(healthRequest({ query: "?secret=revalidate-value" })),
    ).toBe(false);
  });

  it("does not accept the revalidate secret once HEALTH_SECRET is set", async () => {
    vi.stubEnv("HEALTH_SECRET", "health-value");
    vi.stubEnv("REVALIDATE_SECRET", "revalidate-value");

    expect(await isDetailed(healthRequest({ header: "revalidate-value" }))).toBe(
      false,
    );
  });

  it("falls back to REVALIDATE_SECRET while HEALTH_SECRET is unset", async () => {
    vi.stubEnv("HEALTH_SECRET", "");
    vi.stubEnv("REVALIDATE_SECRET", "revalidate-value");

    expect(await isDetailed(healthRequest({ header: "revalidate-value" }))).toBe(
      true,
    );
  });

  it("rejects a wrong or missing secret, and any secret when none is configured", async () => {
    vi.stubEnv("HEALTH_SECRET", "health-value");
    expect(await isDetailed(healthRequest({ header: "nope" }))).toBe(false);
    expect(await isDetailed(healthRequest())).toBe(false);

    vi.stubEnv("HEALTH_SECRET", "");
    vi.stubEnv("REVALIDATE_SECRET", "");
    expect(await isDetailed(healthRequest({ header: "" }))).toBe(false);
  });
});
