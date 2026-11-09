import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { NON_PLACE_FIRST_SEGMENTS } from "@utils/middleware-redirects";

describe("NON_PLACE_FIRST_SEGMENTS", () => {
  it("lists every static route folder in app/[locale]", () => {
    const routeDirs = readdirSync(join(process.cwd(), "app", "[locale]"), {
      withFileTypes: true,
    })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("["))
      .map((entry) => entry.name);

    // A missing folder would be treated as a place and 404'd by proxy.ts.
    expect(routeDirs.filter((dir) => !NON_PLACE_FIRST_SEGMENTS.has(dir))).toEqual([]);
  });

  it("are all skipped by the SEO audit's keywords per town", () => {
    const script = readFileSync(join(process.cwd(), "scripts", "seo-audit.py"), "utf8");
    const set = script.match(/^NON_PLACE_SEGMENTS = \{([\s\S]*?)\}/m)?.[1] ?? "";
    const skipped = new Set([...set.matchAll(/"([^"]+)"/g)].map((match) => match[1]));

    // Files (rss.xml, sitemaps) never reach the audit as listing pages.
    const routes = [...NON_PLACE_FIRST_SEGMENTS].filter((segment) => !segment.includes("."));
    expect(routes.filter((segment) => !skipped.has(segment))).toEqual([]);
  });
});
