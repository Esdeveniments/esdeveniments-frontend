import { describe, it, expect } from "vitest";
import { readdirSync } from "node:fs";
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
});
