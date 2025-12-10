const { withSentryConfig } = require("@sentry/nextjs");
const createNextIntlPlugin = require("next-intl/plugin");

const withNextIntl = createNextIntlPlugin();

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
  // Disable incremental cache while SST/OpenNext lacks __fetch bucket
  cacheHandler: undefined,
  cacheMaxMemorySize: 0,

  // --- React Compiler (Next 16: moved to top-level) ---
  reactCompiler: true,

  // --- Turbopack (Next 16: default bundler) ---
  // turbopack: {},

  // --- Experimental Features ---
  experimental: {
    scrollRestoration: true,
    inlineCss: true,
    // Tree-shake heavy libraries to reduce Lambda bundle size
    optimizePackageImports: [
      "@heroicons/react",
      "date-fns",
      "react-datepicker",
      "react-select",
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
    // Values used by getOptimalImageQuality: 35, 40, 45, 50, 55, 60, 70, 75, 80, 85
    qualities: [35, 40, 45, 50, 55, 60, 70, 75, 80, 85],
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

module.exports = withSentryConfig(withNextIntl(nextConfig), {
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

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
  // See the following for more information:
  // https://docs.sentry.io/product/crons/
  // https://vercel.com/docs/cron-jobs
  automaticVercelMonitors: true,

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
});
