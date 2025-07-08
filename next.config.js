const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // --- Core Settings ---
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: true,

  // --- Optimizations ---
  compiler: {
    reactCompiler: true,
    removeConsole: process.env.NODE_ENV === "production",
  },

  // --- Image Optimization ---
  images: {
    // IMPORTANT: Whitelist only the specific domains you load images from.
    // Using wildcards is a security risk.
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "*.googleusercontent.com" },
    ],
    deviceSizes: [480, 640, 768, 1024, 1280, 1600, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
  },

  // The `headers` block has been removed.
  // Security and caching headers are now managed dynamically in `middleware.ts`.
  // This is the recommended approach for implementing a strict CSP with nonces.

  // --- Redirects ---
  async redirects() {
    return [];
  },
};

const sentryWebpackPluginOptions = {
  silent: true,
  org: "esdeveniments",
  project: "javascript-nextjs",
  widenClientFileUpload: true,
  transpileClientSDK: true,
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: true,
};

module.exports = withSentryConfig(nextConfig, sentryWebpackPluginOptions);
