import type { MetadataRoute } from "next";

/**
 * Next.js Metadata API: robots.txt generation
 * https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots
 *
 * 2025 SEO Best Practices:
 * - Allow search engine crawlers (Googlebot, Bingbot, etc.)
 * - Block AI training crawlers (GPTBot, CCBot, etc.) to protect content
 * - Block /_next/ static files (JS chunks, CSS, build artifacts)
 * - Block /api/ routes (internal endpoints, not for indexing)
 * - Declare multiple sitemaps for comprehensive discovery
 *
 * The host is dynamically determined for multi-domain support.
 */
export default function robots(): MetadataRoute.Robots {
  // Use NEXT_PUBLIC_SITE_URL for production, fallback for local development
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.esdeveniments.cat";

  return {
    rules: [
      // Default rules for all crawlers (including search engines)
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          // Block Next.js internal static files (JS chunks, CSS, build artifacts)
          // These were being indexed by Google Search Console
          "/_next/",
          // Block API routes - internal endpoints not meant for indexing
          "/api/",
          // Block internal/utility pages
          "/e2e/",
          "/offline/",
          // Block login/auth pages
          "/login/",
        ],
      },
      // Block AI TRAINING crawlers (2025 best practice)
      // These crawlers scrape content for LLM training without adding SEO value
      // NOTE: We ALLOW browsing/search crawlers (ChatGPT-User, Claude-Web) so we appear in AI searches
      {
        userAgent: "GPTBot", // OpenAI's training crawler
        disallow: ["/"],
      },
      {
        userAgent: "CCBot", // Common Crawl bot (used for AI training)
        disallow: ["/"],
      },
      {
        userAgent: "Google-Extended", // Google's AI training crawler (separate from search)
        disallow: ["/"],
      },
      {
        userAgent: "Bytespider", // ByteDance/TikTok AI crawler
        disallow: ["/"],
      },
      // ChatGPT-User and Claude-Web are ALLOWED (not listed) so we appear in AI-powered searches
    ],
    // Declare all sitemaps for comprehensive discovery
    sitemap: [
      `${siteUrl}/sitemap.xml`,
      `${siteUrl}/server-static-sitemap.xml`,
      `${siteUrl}/server-sitemap.xml`,
      `${siteUrl}/server-news-sitemap.xml`,
      `${siteUrl}/server-place-sitemap.xml`,
      `${siteUrl}/server-google-news-sitemap.xml`,
    ],
    // Host directive (some search engines use this for canonical domain)
    host: siteUrl,
  };
}
