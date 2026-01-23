const { withSentryConfig } = require("@sentry/nextjs");
const createNextIntlPlugin = require("next-intl/plugin");
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled:
    process.env.ANALYZE === "true" ||
    process.env.BUNDLE_ANALYZE === "browser" ||
    process.env.BUNDLE_ANALYZE === "server",
});

const withNextIntl = createNextIntlPlugin();
const redisCacheEnabled = Boolean(process.env.REDIS_URL || process.env.REDIS_HOST);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // --- Core Settings ---
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,

  // --- SST/OpenNext Configuration ---
  // Required for SST deployment (uses OpenNext adapter)
  output: "standalone",
  // Mark sharp and its native dependencies as external - required for SST/Lambda deployment
  // Sharp has native binaries that must be bundled separately for the target platform
  // Include @img/* packages to ensure Turbopack doesn't mangle the module resolution
  serverExternalPackages: [
    "sharp",
    "@img/sharp-linux-x64",
    "@img/sharp-libvips-linux-x64",
  ],
  // Use Redis cache handler when configured (Coolify multi-instance support)
  cacheHandler: redisCacheEnabled
    ? require.resolve("./cache-handler.js")
    : undefined,
  cacheMaxMemorySize: 0,

  // --- React Compiler (Next 16: moved to top-level) ---
  reactCompiler: true,

  cacheComponents: false,

  // --- Experimental Features ---
  experimental: {
    scrollRestoration: true,
    inlineCss: true,
    // Tree-shake heavy libraries to reduce Lambda bundle size
    optimizePackageImports: [
      "@headlessui/react",
      "@heroicons/react",
      "date-fns",
      "react-datepicker",
      "react-select",
      "react-share",
      "react-tooltip",
    ],
    // --- Server Actions Configuration ---
    serverActions: {
      // 10mb to support image uploads in event creation (see app/publica/page.tsx)
      bodySizeLimit: "10mb",
    },
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
    // Aggressive caching for CloudFront: 1 year (31536000 seconds)
    // This prevents Lambda Image Optimizer from being invoked repeatedly for the same image.
    // Cache-busting is handled explicitly in utils/image-cache.ts using event.hash/updatedAt,
    // so updating an image changes its URL (e.g., ?v=<hash>) and forces CloudFront to fetch it again.
    minimumCacheTTL: 31536000,
    // Next.js 16: Explicitly configure allowed quality values
    // Reduced from 10 to 5 values to minimize cache fragmentation and Lambda invocations
    qualities: [35, 50, 60, 75, 85],
    // Next.js 16: Configure local patterns for API routes with query strings
    // Allow any query string on our internal image proxy route
    localPatterns: [
      {
        pathname: "/api/places/photo",
      },
      {
        pathname: "/api/image-proxy",
      },
      // Allow loading local images from the public/static directory (e.g., /static/images/*)
      {
        pathname: "/static/**",
      },
    ],
    customCacheHandler: redisCacheEnabled,
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

module.exports = withSentryConfig(
  withBundleAnalyzer(withNextIntl(nextConfig)),
  {
    // For all available options, see:
    // https://www.npmjs.com/package/@sentry/webpack-plugin#options

    org: "esdeveniments-fw",
    project: "javascript-nextjs",

    // Only print logs for uploading source maps in CI
    silent: !process.env.CI,

    // Skip all Sentry network operations when no auth token is configured (e.g., CI builds)
    dryRun: !sentryUploadsEnabled,

    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: true,

    // Transpile client SDK for better compatibility
    transpileClientSDK: true,

    // Prevent original sources from appearing in devtools in production
    hideSourceMaps: true,

    // Exclude patterns from source map uploads to reduce upload time and size
    // Excludes node_modules, .next build artifacts, and other non-source files
    sourcemaps: {
      ignore: [
        "node_modules/**",
        ".next/**",
        ".sentry/**",
        "**/*.test.{js,ts,tsx}",
        "**/*.spec.{js,ts,tsx}",
        "**/test/**",
        "**/tests/**",
        "**/__tests__/**",
        "**/e2e/**",
        "**/*.config.{js,ts}",
        "**/scripts/**",
      ],
      // Upload source maps for all JavaScript/TypeScript files
      // This provides better stack traces but increases upload time
      assets: "**/*.{js,jsx,ts,tsx}",
      // Delete source maps after upload to prevent exposing them in production
      deleteSourcemapsAfterUpload: true,
    },

    // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
    // This can increase your server load as well as your hosting bill.
    // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
    // side errors will fail.
    tunnelRoute: "/monitoring",

    // Sentry configuration options (Next.js 16 / Sentry v10+)
    webpack: {
      treeshake: {
        // Remove SDK debug logging code
        removeDebugLogging: true,
        // Remove tracing code since tracesSampleRate is 0
        removeTracing: true,
        // Remove iframe capture code from Session Replay
        excludeReplayIframe: true,
        // Remove shadow DOM capture code from Session Replay
        excludeReplayShadowDOM: true,
      },
      automaticVercelMonitors: true,
    },

    // Release tracking: associate source maps with a specific release
    // Falls back to git commit SHA if available, otherwise uses timestamp
    release: {
      name:
        process.env.SENTRY_RELEASE ||
        process.env.VERCEL_GIT_COMMIT_SHA ||
        `esdeveniments@${Date.now()}`,
      // Automatically create a release if it doesn't exist
      create: true,
      // Automatically finalize the release after build completes
      finalize: true,
      // Set commits for better release tracking (requires SENTRY_AUTH_TOKEN)
      setCommits: sentryUploadsEnabled
        ? {
            auto: true,
          }
        : undefined,
    },

    // Error handling: log errors during source map upload but don't fail the build
    errorHandler: (err) => {
      // Only log errors in CI, silently fail otherwise to avoid build noise
      if (process.env.CI) {
        console.warn("Sentry source map upload warning:", err.message);
      }
      // Don't throw - allow build to continue even if source map upload fails
    },
  },
);
