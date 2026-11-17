import { describe, expect, it } from "vitest";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { config } from "../proxy";
import { INDEXNOW_KEY } from "../utils/constants";

const runsProxy = (path: string) =>
  unstable_doesMiddlewareMatch({ config, url: `https://example.com${path}` });

describe("proxy matcher", () => {
  it.each([
    "/monitoring",
    "/ask",
    "/openapi",
    "/openapi.json",
    "/index.md",
    "/docs/llms.txt",
    "/.well-known/mcp",
    "/mcp",
    "/agent-view",
    "/llms.txt",
    "/agent.txt",
    "/pricing.md",
    "/ads.txt",
    "/webmcp.js",
    "/robots.txt",
    "/rss.xml",
    "/manifest.webmanifest",
    "/sitemap.xml",
    "/sitemap-events/1.xml",
    "/sitemap-places/1.xml",
    // IndexNow key file: the matcher spells the key out, so a rotation fails here
    `/${INDEXNOW_KEY}.txt`,
    "/favicon.ico",
    "/static/maplibre-v6.17.0/maplibre-gl-csp-worker.js",
    "/_next/static/chunks/app.js",
    "/_next/image",
  ])("skips %s", (path) => {
    expect(runsProxy(path)).toBe(false);
  });

  it("skips every server-*.xml route in app/", () => {
    const routes = readdirSync(join(process.cwd(), "app")).filter((name) =>
      /^server-.+\.xml$/.test(name),
    );

    expect(routes.length).toBeGreaterThan(0);
    expect(routes.filter((name) => runsProxy(`/${name}`))).toEqual([]);
  });

  it.each([
    "/",
    "/barcelona",
    "/es/barcelona",
    "/sw.js",
    "/api/events",
    "/iniciar-sessio",
    // Anchored exclusions must not swallow pages that share a prefix.
    "/monitoring-ambiental",
    "/askatasuna",
    "/openapi-events",
    "/docs",
    "/docs/barcelona",
    "/docs/llms.txt.bak",
    "/webmcp.js-guide",
    "/developers",
    "/barcelona.txt",
    // Nothing routes these, so a bare-prefix exclusion sent them to
    // app/[locale] with the text as the locale. Next caches that 404 for a
    // year per URL; Proxy must see them to answer.
    "/sitemap_index.xml",
    "/sitemap-index.xml",
    "/sitemap.xml.gz",
    "/server-foo.xml",
    "/server-sitemap-index.xml",
    "/server-foo-sitemap.xml",
    "/rss.xmlx",
    "/ads.txt.bak",
    "/pricing.mdx",
    `/${INDEXNOW_KEY}.txt.bak`,
    "/00000000000000000000000000000000.txt",
    "/mcp-foo",
    "/agent-viewer",
    "/staticfoo",
    "/static",
    "/_nextfoo",
  ])("runs on %s", (path) => {
    expect(runsProxy(path)).toBe(true);
  });
});
