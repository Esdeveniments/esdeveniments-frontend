function getSiteUrl() {
  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3000";
  }

  if (
    process.env.NEXT_PUBLIC_VERCEL_ENV === "preview" ||
    process.env.NEXT_PUBLIC_VERCEL_ENV === "development"
  ) {
    return "https://esdeveniments.vercel.app";
  }

  return "https://www.esdeveniments.cat";
}

const siteUrl = getSiteUrl();

module.exports = {
  siteUrl,
  generateSitemap: false,
  exclude: [
    "api",
    "_app.js",
    "_document.js",
    "404.js",
    "_error.js",
    "sitemap.xml.js",
    "server-sitemap.xml",
    "server-sitemap.xml.js",
    "/server-sitemap.xml",
    "/server-sitemap.xml.js",
    "server-news-sitemap.xml",
    "/server-news-sitemap.xml",
    "server-place-sitemap.xml",
    "/server-place-sitemap.xml",
    "server-google-news-sitemap.xml",
    "/server-google-news-sitemap.xml",
    "rss.xml",
    "/rss.xml",
    ".next",
    "___next_launcher.js",
    "___vc",
    "node_modules",
    "package.json",
    "e/[eventId]",
  ],
  generateRobotsTxt: true,
  robotsTxtOptions: {
    policies: [
      {
        userAgent: "*",
        disallow: ["/404"],
      },
      { userAgent: "*", allow: "/" },
    ],
    additionalSitemaps: [
      `${siteUrl}/server-sitemap.xml`,
      `${siteUrl}/server-news-sitemap.xml`,
      `${siteUrl}/server-place-sitemap.xml`,
      `${siteUrl}/server-google-news-sitemap.xml`,
    ],
  },
};
