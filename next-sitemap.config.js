const siteUrl =
  process.env.NODE_ENV !== "production"
    ? "http://localhost:3000"
    : process.env.NEXT_PUBLIC_VERCEL_ENV === "preview" ||
      process.env.NEXT_PUBLIC_VERCEL_ENV === "development"
    ? "https://esdeveniments.vercel.app"
    : "https://www.esdeveniments.cat";

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
