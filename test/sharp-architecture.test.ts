/**
 * Guard test: Sharp architecture consistency in sst.config.ts
 *
 * Prevents a regression where Lambda architecture and Sharp binary
 * architecture get out of sync. This caused a 4-day outage (Feb 18-22, 2026)
 * where all image-proxy requests served unoptimized images (4.3 MB instead of ~50 KB).
 *
 * Root cause: SST 3.17.25 runs `npm install` on CI (x64 Linux) WITHOUT
 * passing --arch/--cpu flags, so platform-specific optional dependencies
 * always resolve to the CI host architecture (x64). Setting Lambda to arm64
 * while server.install packages resolve to x64 = arch mismatch at runtime.
 *
 * Fix: Lambda must use x86_64 to match the binaries SST actually installs.
 * When SST adds cross-platform npm install support, switch to arm64.
 *
 * Note: open-next.config.ts was deleted because it had NO effect on the server
 * function — only sst.config.ts server.install controls Sharp installation.
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Sharp architecture consistency (sst.config.ts)", () => {
  const sstConfigPath = path.join(__dirname, "..", "sst.config.ts");
  const sstContent = fs.readFileSync(sstConfigPath, "utf8");

  it("Lambda architecture matches Sharp binary arch (both x86_64/x64)", () => {
    // args.architecture must be x86_64 to match SST's npm install output
    expect(sstContent).toMatch(/args\.architecture\s*=\s*["']x86_64["']/);
  });

  it("server.install includes x64 Sharp binaries (matching Lambda arch)", () => {
    expect(sstContent).toContain("@img/sharp-linux-x64");
    expect(sstContent).toContain("@img/sharp-libvips-linux-x64");
  });

  it("server.install does NOT include arm64 binaries (SST cannot cross-install)", () => {
    // SST 3.17.25 doesn't pass --arch=arm64 to npm install, so arm64 packages
    // would be skipped and only x64 would ship — causing runtime failure
    expect(sstContent).not.toContain('"@img/sharp-linux-arm64"');
    expect(sstContent).not.toContain('"@img/sharp-libvips-linux-arm64"');
  });

  it("server.install arch matches args.architecture", () => {
    // Extract the architecture from args.architecture = "xxx"
    const archMatch = sstContent.match(
      /args\.architecture\s*=\s*["'](\w+)["']/,
    );
    expect(archMatch).not.toBeNull();
    const lambdaArch = archMatch![1];

    // Extract Sharp binary arch from @img/sharp-linux-XXX
    const sharpMatch = sstContent.match(/@img\/sharp-linux-(\w+)/);
    expect(sharpMatch).not.toBeNull();
    const sharpArch = sharpMatch![1];

    // Map Lambda arch names to Sharp arch names
    const archMap: Record<string, string> = {
      x86_64: "x64",
      arm64: "arm64",
    };

    expect(archMap[lambdaArch]).toBe(sharpArch);
  });

  it("open-next.config.ts does not exist (dead config)", () => {
    const openNextConfigPath = path.join(
      __dirname,
      "..",
      "open-next.config.ts",
    );
    expect(fs.existsSync(openNextConfigPath)).toBe(false);
  });
});
