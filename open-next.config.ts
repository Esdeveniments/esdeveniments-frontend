/**
 * OpenNext configuration for SST deployment.
 *
 * ⚠️ CRITICAL: This file is the PRIMARY mechanism for installing Sharp in the Lambda bundle.
 * Without it, Sharp is NOT included and /api/image-proxy serves unoptimized images.
 * SST's server.install alone is NOT sufficient — see incident Feb 18-22, 2026.
 *
 * OpenNext excludes Sharp from the server bundle by default (it's only
 * included in the image-optimization function for /_next/image). Since we have
 * a custom /api/image-proxy route, we need to explicitly install it.
 *
 * The `arch` field must match `args.architecture` in sst.config.ts:
 * - For x86_64 Lambda, use "x64"
 * - For arm64 Lambda, use "arm64"
 *
 * ⚠️ Using x86_64: SST v3 + OpenNext cannot cross-install arm64 Sharp on x64 CI.
 * Verified broken again on Mar 2026 (PR #236 attempted arm64, same failure as Feb incident).
 * Do NOT switch to arm64 until SST/OpenNext proves cross-arch npm install works.
 *
 * See: incident Feb 18-22, 2026 (Sharp arch mismatch).
 */
const config = {
  default: {
    install: {
      // Install Sharp with the correct architecture for Lambda
      packages: ["sharp@0.34.5"],
      // Must match Lambda architecture in sst.config.ts (x86_64)
      arch: "x64",
    },
  },
};

export default config;
