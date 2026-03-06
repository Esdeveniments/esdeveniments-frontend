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
 * Using arm64 (Graviton2) for ~20% cost savings per GB-second.
 * OpenNext handles cross-arch installation correctly via this `arch` field,
 * unlike SST v3's server.install which cannot cross-install on x64 CI.
 *
 * See: incident Feb 18-22, 2026 (Sharp arch mismatch).
 */
const config = {
  default: {
    install: {
      // Install Sharp with the correct architecture for Lambda
      packages: ["sharp@0.34.5"],
      // Must match Lambda architecture in sst.config.ts (arm64 Graviton2)
      arch: "arm64",
    },
  },
};

export default config;
