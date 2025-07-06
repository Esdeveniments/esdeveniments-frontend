const siteUrl =
  process.env.NODE_ENV !== "production"
    ? "http://localhost:3000"
    : process.env.NEXT_PUBLIC_VERCEL_ENV === "preview" ||
      process.env.NEXT_PUBLIC_VERCEL_ENV === "development"
    ? "https://esdeveniments.vercel.app"
    : "https://www.esdeveniments.cat";

module.exports = {
  siteUrl,
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
    "rss.xml",
    "/rss.xml",
    ".next",
    "___next_launcher.js",
    "___vc",
    "node_modules",
    "package.json",
    "e/[eventId]",
    "[place]",
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
      `${siteUrl}/sitemap.xml`,
      `${siteUrl}/server-sitemap.xml`,
    ],
  },
};
