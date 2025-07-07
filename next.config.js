const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    scrollRestoration: true,
    reactCompiler: true,
    optimizePackageImports: [
      "@heroicons/react",
      "react-select",
      "react-tooltip",
    ],
    optimizeCss: true,
    gzipSize: true,
  },
  turbopack: {
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },
  productionBrowserSourceMaps: true,
  reactStrictMode: false,
  poweredByHeader: false,
  compress: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
    // Enhanced image optimization settings for better performance
    deviceSizes: [480, 640, 768, 1024, 1280, 1600, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ["image/webp", "image/avif"],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: false,
    unoptimized: false,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        { key: "X-DNS-Prefetch-Control", value: "on" },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
        { key: "X-XSS-Protection", value: "1; mode=block" },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "origin-when-cross-origin" },
        // Default restrictive permissions for all pages
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=()",
        },
      ],
    },
    // Allow geolocation only on event listing pages where filtering is needed
    {
      source: "/:place((?!e|publica|qui-som|sitemap|offline).*)",
      headers: [
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=(self)",
        },
      ],
    },
    {
      source: "/:place/:byDate",
      headers: [
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=(self)",
        },
      ],
    },
    {
      source: "/:place/:byDate/:category",
      headers: [
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=(self)",
        },
      ],
    },
    {
      source: "/styles/:path*",
      headers: [
        { key: "Content-Type", value: "text/css; charset=utf-8" },
        { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
      ],
    },
    {
      source: "/static/:path*",
      headers: [
        { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
      ],
    },
    {
      source: "/fonts/:path*",
      headers: [
        { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
      ],
    },
    {
      source: "/api/:path*",
      headers: [
        { key: "Access-Control-Allow-Credentials", value: "true" },
        { key: "Access-Control-Allow-Origin", value: "*" },
        {
          key: "Access-Control-Allow-Methods",
          value: "GET,OPTIONS,PATCH,DELETE,POST,PUT",
        },
        {
          key: "Access-Control-Allow-Headers",
          value:
            "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
        },
      ],
    },
    {
      source: "/sw.js",
      headers: [
        { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        { key: "Service-Worker-Allowed", value: "/" },
      ],
    },
  ],
  redirects: async () => [],
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
