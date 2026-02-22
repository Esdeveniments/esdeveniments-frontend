/**
 * OpenNext configuration for SST deployment.
 *
 * ⚠️ CRITICAL: This file controls Sharp installation in the Lambda bundle.
 * Without it, Sharp is NOT included and /api/image-proxy serves unoptimized images.
 *
 * OpenNext excludes Sharp from the server bundle by default (it's only
 * included in the image-optimization function for /_next/image). Since we have
 * a custom /api/image-proxy route, we need to explicitly install it.
 *
 * The `arch` must match `args.architecture` in sst.config.ts:
 * - x86_64 Lambda → arch: "x64"
 * - arm64 Lambda → arch: "arm64"
 *
 * See: incident Feb 18-22, 2026 (Sharp arch mismatch).
 */
const config = {
  default: {
    install: {
      // Install Sharp with the correct architecture for Lambda
      packages: ["sharp@0.34.5"],
      // Must match Lambda architecture in sst.config.ts (currently x86_64)
      arch: "x64",
    },
  },
};

export default config;
