/**
 * Guard test: Sharp architecture consistency across sst.config.ts and open-next.config.ts
 *
 * Prevents a regression where Lambda architecture and Sharp binary
 * architecture get out of sync. This caused a 4-day outage (Feb 18-22, 2026)
 * where all image-proxy requests served unoptimized images (4.3 MB instead of ~50 KB).
 *
 * Sharp is installed via two mechanisms (both must use x86_64/x64):
 * 1. open-next.config.ts (install.packages + arch) — PRIMARY installer
 * 2. sst.config.ts server.install — safety net
 *
 * ⚠️ Using x86_64: SST v3 + OpenNext cannot cross-install arm64 Sharp on x64 CI.
 * Verified broken: Feb 18-22, 2026 + Mar 2026 (PR #236 attempted arm64).
 * Do NOT switch to arm64 until SST/OpenNext proves cross-arch npm install works.
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Sharp architecture consistency", () => {
  const sstConfigPath = path.join(__dirname, "..", "sst.config.ts");
  const sstContent = fs.readFileSync(sstConfigPath, "utf8");

  const openNextConfigPath = path.join(__dirname, "..", "open-next.config.ts");

  it("Lambda architecture is x86_64", () => {
    expect(sstContent).toMatch(/args\.architecture\s*=\s*["']x86_64["']/);
  });

  it("server.install includes x64 Sharp binaries as safety net", () => {
    // Both open-next.config.ts AND server.install should provide Sharp.
    // server.install works on x64 CI because the CI host matches the target arch.
    expect(sstContent).toContain('"@img/sharp-linux-x64"');
    expect(sstContent).toContain('"@img/sharp-libvips-linux-x64"');
    // Must NOT include arm64 binaries (they won't load on x86_64 Lambda)
    expect(sstContent).not.toContain('"@img/sharp-linux-arm64"');
    expect(sstContent).not.toContain('"@img/sharp-libvips-linux-arm64"');
  });

  it("open-next.config.ts exists and installs Sharp", () => {
    expect(fs.existsSync(openNextConfigPath)).toBe(true);
    const openNextContent = fs.readFileSync(openNextConfigPath, "utf8");
    expect(openNextContent).toContain("sharp");
  });

  it("open-next.config.ts arch matches Lambda architecture", () => {
    const openNextContent = fs.readFileSync(openNextConfigPath, "utf8");

    // Extract arch from open-next.config.ts
    const openNextArch = openNextContent.match(/arch:\s*["'](\w+)["']/);
    expect(openNextArch).not.toBeNull();

    // Extract Lambda arch from sst.config.ts
    const lambdaArch = sstContent.match(
      /args\.architecture\s*=\s*["'](\w+)["']/,
    );
    expect(lambdaArch).not.toBeNull();

    // Map and compare
    const archMap: Record<string, string> = {
      x86_64: "x64",
      arm64: "arm64",
    };

    expect(openNextArch![1]).toBe(archMap[lambdaArch![1]]);
  });

  it("open-next.config.ts uses x64 arch", () => {
    // Verify open-next.config.ts has the install config with packages and x64 arch
    const openNextContent = fs.readFileSync(openNextConfigPath, "utf8");
    expect(openNextContent).toMatch(/packages:\s*\[/);
    expect(openNextContent).toMatch(/arch:\s*["']x64["']/);
  });

  it("next.config.js serverExternalPackages references x64 Sharp binaries", () => {
    const nextConfigPath = path.join(__dirname, "..", "next.config.js");
    const nextContent = fs.readFileSync(nextConfigPath, "utf8");
    expect(nextContent).toContain("@img/sharp-linux-x64");
    expect(nextContent).toContain("@img/sharp-libvips-linux-x64");
    expect(nextContent).not.toContain("@img/sharp-linux-arm64");
    expect(nextContent).not.toContain("@img/sharp-libvips-linux-arm64");
  });
});
