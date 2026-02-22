/**
 * Guard test: Sharp architecture consistency across sst.config.ts and open-next.config.ts
 *
 * Prevents a regression where Lambda architecture and Sharp binary
 * architecture get out of sync. This caused a 4-day outage (Feb 18-22, 2026)
 * where all image-proxy requests served unoptimized images (4.3 MB instead of ~50 KB).
 *
 * Sharp is installed into the Lambda bundle by open-next.config.ts (install.packages + arch).
 * SST's server.install provides redundant install for safety.
 * Both MUST match args.architecture in sst.config.ts.
 *
 * Currently using x86_64 because SST 3.17.25's Go binary doesn't cross-install
 * arm64 packages on x64 CI. TODO: Switch to arm64 when SST supports it.
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Sharp architecture consistency", () => {
  const sstConfigPath = path.join(__dirname, "..", "sst.config.ts");
  const sstContent = fs.readFileSync(sstConfigPath, "utf8");

  const openNextConfigPath = path.join(
    __dirname,
    "..",
    "open-next.config.ts",
  );

  it("Lambda architecture matches Sharp binary arch (both x86_64/x64)", () => {
    expect(sstContent).toMatch(/args\.architecture\s*=\s*["']x86_64["']/);
  });

  it("server.install includes x64 Sharp binaries (matching Lambda arch)", () => {
    expect(sstContent).toContain("@img/sharp-linux-x64");
    expect(sstContent).toContain("@img/sharp-libvips-linux-x64");
  });

  it("server.install does NOT include arm64 binaries (SST cannot cross-install)", () => {
    expect(sstContent).not.toContain('"@img/sharp-linux-arm64"');
    expect(sstContent).not.toContain('"@img/sharp-libvips-linux-arm64"');
  });

  it("server.install arch matches args.architecture", () => {
    const archMatch = sstContent.match(
      /args\.architecture\s*=\s*["'](\w+)["']/,
    );
    expect(archMatch).not.toBeNull();
    const lambdaArch = archMatch![1];

    const sharpMatch = sstContent.match(/@img\/sharp-linux-(\w+)/);
    expect(sharpMatch).not.toBeNull();
    const sharpArch = sharpMatch![1];

    const archMap: Record<string, string> = {
      x86_64: "x64",
      arm64: "arm64",
    };

    expect(archMap[lambdaArch]).toBe(sharpArch);
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
});
