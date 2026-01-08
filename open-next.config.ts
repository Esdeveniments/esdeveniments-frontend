/**
 * OpenNext configuration for SST deployment.
 *
 * This config ensures Sharp native binaries are installed in the server function
 * for our custom /api/image-proxy route which needs image processing capabilities.
 *
 * Note: OpenNext excludes Sharp from the server bundle by default (it's only
 * included in the image-optimization function for /_next/image). Since we have
 * a custom image proxy, we need to explicitly install it.
 */
const config = {
  default: {
    install: {
      // Install Sharp with the correct architecture for Lambda
      packages: ["sharp@0.34.5"],
      // Match the architecture in sst.config.ts (x86_64)
      arch: "x64",
    },
  },
};

export default config;
