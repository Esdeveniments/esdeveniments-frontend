const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // --- Core Settings ---
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,

  // --- React Compiler (Next 16: moved to top-level) ---
  reactCompiler: true,

  // --- Turbopack (Next 16: default bundler) ---
  turbopack: {},

  // --- Experimental Features ---
  experimental: {
    scrollRestoration: true,
    inlineCss: true,
  },

  // --- Optimizations ---
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },

  // --- Image Optimization ---
  images: {
    // IMPORTANT: Whitelist only the specific domains you load images from.
    // Using wildcards is a security risk.
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
    deviceSizes: [480, 640, 768, 1024, 1280, 1600, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
    // Next.js 16: Explicitly configure allowed quality values
    // Values used by getOptimalImageQuality: 35, 40, 45, 50, 60, 70, 75, 80, 85
    qualities: [35, 40, 45, 50, 60, 70, 75, 80, 85],
    // Next.js 16: Configure local patterns for API routes with query strings
    // Allow any query string on our internal image proxy route
    localPatterns: [
      {
        pathname: "/api/places/photo",
      },
      // Allow loading local images from the public/static directory (e.g., /static/images/*)
      {
        pathname: "/static/**",
      },
    ],
  },

  // The `headers` block has been removed.
  // Security and caching headers are now managed dynamically in `proxy.ts` (Next.js 16: renamed from middleware.ts).
  // CSP uses a relaxed policy with host allowlisting to enable ISR/PPR caching.

  // --- Redirects ---
  async redirects() {
    return [];
  },
};

// Enable uploads only when an auth token is present. Otherwise skip network calls to avoid build failures.
const sentryUploadsEnabled = Boolean(process.env.SENTRY_AUTH_TOKEN);
const sentryWebpackPluginOptions = {
  silent: true,
  org: "esdeveniments",
  project: "javascript-nextjs",
  widenClientFileUpload: true,
  transpileClientSDK: true,
  // Prevent original sources from appearing in devtools in production
  hideSourceMaps: true,
  // Skip all Sentry network operations when no auth token is configured (e.g., Amplify/GHA builds)
  dryRun: !sentryUploadsEnabled,
  disableLogger: true,
  automaticVercelMonitors: true,
};

module.exports = withSentryConfig(nextConfig, sentryWebpackPluginOptions);
