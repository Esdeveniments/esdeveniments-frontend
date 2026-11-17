import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { SUPPORTED_LOCALES } from "../../types/i18n";

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
    // Google needs JS/CSS to render; only other Next internals are blocked
    expect(body).toContain("Allow: /_next/static/\nDisallow: /_next/\n");
    // The sign-in entry is linked from every page with its own ?redirect=
    for (const path of [
      "/iniciar-sessio",
      ...SUPPORTED_LOCALES.map((locale) => `/${locale}/iniciar-sessio`),
    ]) {
      expect(body).toContain(`Disallow: ${path}\n`);
    }
    expect(body).not.toContain("/login/");
    // Only the sitemap index is declared; it lists every child sitemap
    expect(body.match(/^Sitemap: .*$/gm)).toEqual([
      "Sitemap: https://www.esdeveniments.cat/sitemap.xml",
    ]);
    // Named AI crawlers ignore the `*` group, so their group must also
    // block /api/ (an allow-only group let them crawl it).
    const aiGroup = body
      .split("\n\n")
      .find((group) => group.includes("User-Agent: OAI-SearchBot"));
    expect(aiGroup).toContain("User-Agent: GPTBot");
    expect(aiGroup).toContain("Disallow: /api/");
    expect(response.headers.get("X-Robots-Source")).toBe("route-handler-v2");
  });

  it("emits the full allow policy on apex production host", async () => {
    const { GET } = await import("../../app/robots.txt/route");
    const response = await GET(buildRequest("esdeveniments.cat"));

    const body = await response.text();
    expect(body).toMatch(/Allow: \//);
    expect(body).toContain("Sitemap:");
  });

  it("keeps scripts/generate-robots.mjs directives identical to the route handler", async () => {
    const { GET } = await import("../../app/robots.txt/route");
    const routeBody = await (await GET(buildRequest("www.esdeveniments.cat"))).text();

    const tempRobots = join(tmpdir(), `robots-${Date.now()}-${Math.random()}.txt`);
    try {
      execFileSync(process.execPath, [join(process.cwd(), "scripts/generate-robots.mjs")], {
        env: {
          ...process.env,
          NEXT_PUBLIC_SITE_URL: "https://www.esdeveniments.cat",
          ROBOTS_OUTPUT_PATH: tempRobots,
        },
        stdio: "ignore",
      });
      const staticBody = readFileSync(tempRobots, "utf8");

      const stripComments = (txt: string) =>
        txt
          .split("\n")
          .filter((line) => !line.startsWith("#"))
          .join("\n")
          .trim();

      expect(stripComments(staticBody)).toBe(stripComments(routeBody));
    } finally {
      rmSync(tempRobots, { force: true });
    }
  });
});
