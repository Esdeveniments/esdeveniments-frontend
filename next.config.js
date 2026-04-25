const { withSentryConfig } = require("@sentry/nextjs");
const createNextIntlPlugin = require("next-intl/plugin");
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled:
    process.env.ANALYZE === "true" ||
    process.env.BUNDLE_ANALYZE === "browser" ||
    process.env.BUNDLE_ANALYZE === "server",
});

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  // --- Core Settings ---
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,

  // --- Deployment Configuration ---
  // Required for Docker/Coolify deployment (standalone server.js output)
  output: "standalone",
  // Mark sharp and its native dependencies as external
  // Sharp has native binaries that must be bundled separately for the target platform
  // Include @img/* packages to ensure Turbopack doesn't mangle the module resolution
  // Using x86_64 for compatibility with native modules (sharp)
  serverExternalPackages: [
    "sharp",
    "@img/sharp-linux-x64",
    "@img/sharp-libvips-linux-x64",
    // Cache handler and Redis are loaded at runtime by the cache-handler.mjs entry point.
    // Marking them external prevents Next.js from tracing them into every server route bundle.
    "redis",
    "@redis/client",
    "@fortedigital/nextjs-cache-handler",
  ],
  // Load the cache handler for self-hosted (Docker/Coolify) deployments.
  // Falls back to in-memory LRU when Redis env vars are not set at runtime.
  // Skip on Vercel — the file lives at a different path (/var/task/) at runtime
  // than at build time, causing ERR_MODULE_NOT_FOUND in preview deployments.
  cacheHandler: process.env.VERCEL
    ? undefined
    : require.resolve("./cache-handler.mjs"),
  cacheMaxMemorySize: 0,

  // --- React Compiler (Next 16: moved to top-level) ---
  reactCompiler: true,

  cacheComponents: true,

  // --- HTML-limited bots (blocking render, no streaming) ---
  // With cacheComponents (PPR) + self-hosted cache handler, streamed HTML arrives
  // with Suspense placeholders ($RX bailouts) that only resolve after JS hydrates.
  // AI crawlers / SEO scanners (Orank, GPTBot, ClaudeBot, PerplexityBot, etc.)
  // don't execute JS, so they see an empty <main>. Forcing a blocking render for
  // these user agents makes the full HTML available to them, restoring SEO/AI
  // discoverability without disabling PPR for real users.
  // NOTE: Setting this OVERRIDES the Next.js default list, so we must include
  // the upstream defaults (kept verbatim from
  // https://github.com/vercel/next.js/blob/canary/packages/next/src/shared/lib/router/utils/html-bots.ts)
  // and extend them with AI / scanner UAs.
  htmlLimitedBots:
    /[\w-]+-Google|Google-[\w-]+|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight|Googlebot|GPTBot|ChatGPT-User|OAI-SearchBot|Claude-Web|ClaudeBot|anthropic-ai|PerplexityBot|Perplexity-User|ora-scan|ora-agent|DeepSeekBot|Qwen-Agent|Bytespider|CCBot|Meta-ExternalAgent|Meta-ExternalFetcher|Applebot-Extended|cohere-ai|Omgilibot|YouBot|Diffbot|Amazonbot|Timpibot|ImagesiftBot/i,

  // --- Experimental Features ---
  experimental: {
    rootParams: true,
    scrollRestoration: true,
    inlineCss: true,
    // Tree-shake heavy libraries to reduce bundle size
    optimizePackageImports: [
      "@headlessui/react",
      "@heroicons/react",
      "date-fns",
      "react-day-picker",
      "react-select",
      "react-share",
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
    // Aggressive caching: 1 year (31536000 seconds)
    // Cache-busting is handled explicitly in utils/image-cache.ts using event.hash/updatedAt,
    // so updating an image changes its URL (e.g., ?v=<hash>) and forces CDN to fetch it again.
    minimumCacheTTL: 31536000,
    // Cap the on-disk optimized-image cache (<distDir>/cache/images).
    // Default per Next.js docs is 50% of available disk at startup, which on a
    // shared Coolify VPS can grow to tens of GB and starve the host. LRU
    // eviction kicks in above the cap.
    maximumDiskCacheSize: 2_000_000_000, // 2 GB
    // Next.js 16: Explicitly configure allowed quality values
    // Reduced from 10 to 5 values to minimize cache fragmentation
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
        // Remove all Session Replay code (replay is fully disabled)
        excludeReplayIframe: true,
        excludeReplayShadowDOM: true,
        excludeReplayCanvas: true,
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
