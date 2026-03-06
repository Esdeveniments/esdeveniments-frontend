/**
 * Guard test: Sharp architecture consistency across sst.config.ts and open-next.config.ts
 *
 * Prevents a regression where Lambda architecture and Sharp binary
 * architecture get out of sync. This caused a 4-day outage (Feb 18-22, 2026)
 * where all image-proxy requests served unoptimized images (4.3 MB instead of ~50 KB).
 *
 * Sharp is installed into the Lambda bundle ONLY by open-next.config.ts (install.packages + arch).
 * SST's server.install is NOT used for Sharp — it cannot cross-install on x64 CI.
 * The open-next.config.ts arch MUST match args.architecture in sst.config.ts.
 *
 * Using arm64 (Graviton2) for ~20% cost savings per GB-second.
 * open-next.config.ts handles cross-arch installation correctly via its `arch` field.
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

  it("Lambda architecture is arm64 (Graviton2)", () => {
    expect(sstContent).toMatch(/args\.architecture\s*=\s*["']arm64["']/);
  });

  it("server.install does NOT include platform-specific Sharp binaries", () => {
    // Sharp installation is handled by open-next.config.ts, not server.install.
    // SST v3's server.install cannot cross-install arm64 packages on x64 CI.
    expect(sstContent).not.toContain('"@img/sharp-linux-x64"');
    expect(sstContent).not.toContain('"@img/sharp-libvips-linux-x64"');
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

  it("open-next.config.ts is the sole Sharp installer (not server.install)", () => {
    // Verify open-next.config.ts has the install config with packages and arch
    const openNextContent = fs.readFileSync(openNextConfigPath, "utf8");
    expect(openNextContent).toMatch(/packages:\s*\[/);
    expect(openNextContent).toMatch(/arch:\s*["']arm64["']/);
  });
});
