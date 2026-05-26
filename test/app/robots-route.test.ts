import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Mock @config/index so siteUrl is deterministic.
vi.mock("../../config/index", async () => {
  const actual = await vi.importActual<Record<string, unknown>>(
    "../../config/index",
  );
  return {
    ...actual,
    siteUrl: "https://www.esdeveniments.cat",
  };
});

const buildRequest = (host: string): NextRequest =>
  ({
    headers: new Headers({ host }),
    nextUrl: {
      protocol: "https:",
      host,
      pathname: "/robots.txt",
      searchParams: new URLSearchParams(),
    },
  }) as unknown as NextRequest;

describe("app/robots.txt/route (production-host allowlist)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("emits Disallow-all on staging host with no sitemaps", async () => {
    const { GET } = await import("../../app/robots.txt/route");
    const response = await GET(buildRequest("staging.esdeveniments.cat"));

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toMatch(/User-Agent: \*\nDisallow: \//);
    expect(body).not.toMatch(/Sitemap:/);
    expect(body).not.toMatch(/ChatGPT-User/);
    expect(response.headers.get("X-Robots-Source")).toBe(
      "route-handler-v2-noindex",
    );
  });

  it("emits Disallow-all on PR-preview host with default Coolify template", async () => {
    // Default Coolify template `{{pr_id}}.{{domain}}` → no `pr-` prefix.
    // Substring detection would have leaked these; allowlist catches them.
    const { GET } = await import("../../app/robots.txt/route");
    const response = await GET(buildRequest("42.esdeveniments.cat"));

    const body = await response.text();
    expect(body).toMatch(/Disallow: \//);
    expect(body).not.toMatch(/Sitemap:/);
  });

  it("emits Disallow-all on PR-preview host with pr- template", async () => {
    const { GET } = await import("../../app/robots.txt/route");
    const response = await GET(buildRequest("pr-42.esdeveniments.cat"));

    const body = await response.text();
    expect(body).toMatch(/Disallow: \//);
  });

  it("emits Disallow-all when Host header is missing (default-deny)", async () => {
    const { GET } = await import("../../app/robots.txt/route");
    const response = await GET({
      headers: new Headers(),
      nextUrl: {
        protocol: "https:",
        host: "",
        pathname: "/robots.txt",
        searchParams: new URLSearchParams(),
      },
    } as unknown as NextRequest);

    const body = await response.text();
    expect(body).toMatch(/Disallow: \//);
  });

  it("emits the full allow policy on production host (www)", async () => {
    const { GET } = await import("../../app/robots.txt/route");
    const response = await GET(buildRequest("www.esdeveniments.cat"));

    const body = await response.text();
    // Default allowlist policy is present
    expect(body).toMatch(/User-Agent: \*\nAllow: \//);
    // Sitemaps are declared
    expect(body).toContain(
      "Sitemap: https://www.esdeveniments.cat/sitemap.xml",
    );
    // Known AI crawlers are still listed
    expect(body).toContain("ChatGPT-User");
    expect(response.headers.get("X-Robots-Source")).toBe("route-handler-v2");
  });

  it("emits the full allow policy on apex production host", async () => {
    const { GET } = await import("../../app/robots.txt/route");
    const response = await GET(buildRequest("esdeveniments.cat"));

    const body = await response.text();
    expect(body).toMatch(/Allow: \//);
    expect(body).toContain("Sitemap:");
  });
});
