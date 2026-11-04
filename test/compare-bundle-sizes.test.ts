// @vitest-environment node
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const dir = mkdtempSync(join(tmpdir(), "bundle-gate-"));
const baseline = join(dir, "baseline.json");
writeFileSync(baseline, JSON.stringify({
  clientTotalBytes: 2_000_000,
  pages: { "/ca": { jsGzipBytes: 324_000 } },
  routes: {},
}));

const compare = (homeJsGzipBytes: number | null) => {
  const current = join(dir, `current-${homeJsGzipBytes}.json`);
  writeFileSync(current, JSON.stringify({
    client: { totalBytes: 2_000_000 },
    pages: homeJsGzipBytes === null ? [] : [{ page: "/ca", jsGzipBytes: homeJsGzipBytes }],
    routes: [],
  }));
  return spawnSync(process.execPath, ["scripts/compare-bundle-sizes.mjs", "--baseline", baseline, "--current", current], { encoding: "utf8" });
};

describe("compare-bundle-sizes page JS gate", () => {
  it("fails when a shared chunk adds 16 KB gzip to the home page, even if the client total is flat", () => {
    const result = compare(324_000 + 16 * 1024);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("ERROR page /ca (JS gzip)");
  });

  it("passes a small change", () => {
    expect(compare(324_000 + 1024).status).toBe(0);
  });

  it("warns when the page is missing from the build", () => {
    const result = compare(null);
    expect(result.status).toBe(0);
    expect(result.stderr).toContain("/ca: no prerendered HTML");
  });
});
