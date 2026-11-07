import { describe, expect, it } from "vitest";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { config } from "../proxy";

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
    "/llms.txt",
    "/webmcp.js",
    "/robots.txt",
    "/favicon.ico",
    "/_next/static/chunks/app.js",
  ])("skips %s", (path) => {
    expect(runsProxy(path)).toBe(false);
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
    "/webmcp.js-guide",
    "/developers",
  ])("runs on %s", (path) => {
    expect(runsProxy(path)).toBe(true);
  });
});
