import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("service worker template", () => {
  it("clears the pages HTML cache on activate to avoid cross-deploy hydration mismatches", () => {
    const swTemplatePath = path.join(process.cwd(), "public", "sw-template.js");
    const contents = fs.readFileSync(swTemplatePath, "utf8");

    expect(contents).toContain('self.addEventListener("activate"');
    expect(contents).toContain('caches.delete("esdeveniments-pages-cache")');
  });
});





