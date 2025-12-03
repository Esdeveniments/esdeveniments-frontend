// Get site URL - prioritize NEXT_PUBLIC_SITE_URL (set in SST/Vercel)
// This matches the logic in config/index.ts for consistency
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  // For production NODE_ENV, always use production domain (never localhost)
  (process.env.NODE_ENV === "production"
    ? "https://www.esdeveniments.cat"
    : process.env.NEXT_PUBLIC_VERCEL_ENV === "preview" ||
      process.env.NEXT_PUBLIC_VERCEL_ENV === "development"
    ? "https://esdeveniments.vercel.app"
    : "http://localhost:3000");

module.exports = {
  siteUrl,
  generateSitemap: true,
  generateIndexSitemap: false, // Use dynamic route instead
  exclude: [
    "/api/*", // APIs are not pages
    "/server-sitemap.xml",
    "/server-news-sitemap.xml",
    "/server-place-sitemap.xml",
    "/server-google-news-sitemap.xml",
    "/rss.xml",
    "/e/*", // event detail URLs listed via dynamic server sitemap
    "/e2e/*", // E2E test pages - should not be indexed
    "/manifest.webmanifest", // Static manifest file, not a page
    "/offline", // Offline page with noindex
    "/e/*/edita", // Edit pages with noindex
  ],
  generateRobotsTxt: true,
  robotsTxtOptions: {
    policies: [
      { userAgent: "*", disallow: ["/404"] },
      { userAgent: "*", allow: "/" },
    ],
    additionalSitemaps: [
      `${siteUrl}/sitemap.xml`, // Dynamic route
      `${siteUrl}/server-sitemap.xml`,
      `${siteUrl}/server-news-sitemap.xml`,
      `${siteUrl}/server-place-sitemap.xml`,
      `${siteUrl}/server-google-news-sitemap.xml`,
    ],
  },
};
