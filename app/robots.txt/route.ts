import { NextRequest, NextResponse } from "next/server";
import type { MetadataRoute } from "next";
import { getCacheControlHeader } from "@utils/cache";
import { siteUrl } from "@config/index";

/**
 * robots.txt route handler with explicit cache control
 *
 * Converted from app/robots.ts (Metadata API) to route handler to:
 * 1. Set explicit cache headers for CDN (short TTL to prevent stale content)
 * 2. Ensure dynamic generation on every deployment
 * 3. Match the pattern used by sitemap.xml/route.ts for consistency
 *
 * 2026 policy — AI-agent-first discoverability:
 * - Allow search engine crawlers (Googlebot, Bingbot, etc.)
 * - Allow AI agent crawlers (browsing + training) so LLM citations,
 *   deep-research tools, and agent-readiness scanners (orank.ai
 *   sim-chatgpt / sim-claude) can reach our content. Our data is
 *   public cultural-events information; training protection has
 *   lower value than broad agent reach.
 * - Block /_next/ static files (JS chunks, CSS, build artifacts)
 * - Block /api/ routes (internal endpoints, not for indexing)
 * - Declare multiple sitemaps for comprehensive discovery
 *
 * The host is dynamically determined for multi-domain support.
 *
 * Route handlers using NextRequest are dynamic by default.
 * Cache behavior is controlled via Cache-Control headers (getCacheControlHeader).
 */

export async function GET(request: NextRequest): Promise<NextResponse> {
  const robotsConfig: MetadataRoute.Robots = {
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
      // AI agent crawlers — all ALLOWED under 2026 policy (see header).
      // This includes both browsing/search bots (ChatGPT-User, Claude-Web,
      // PerplexityBot, DeepSeekBot, ora-agent, Qwen-Agent) and training
      // crawlers (GPTBot, ClaudeBot, anthropic-ai, Google-Extended,
      // Applebot-Extended, Meta-ExternalAgent, cohere-ai). Trading training
      // protection for discoverability in LLM answers and orank score.
      {
        userAgent: "ChatGPT-User", // OpenAI browsing feature
        allow: ["/"],
      },
      {
        userAgent: "Claude-Web", // Claude browsing feature
        allow: ["/"],
      },
      {
        userAgent: "PerplexityBot", // Perplexity search
        allow: ["/"],
      },
      {
        userAgent: "DeepSeekBot", // DeepSeek search
        allow: ["/"],
      },
      {
        userAgent: "ora-agent", // Ora.ai agent
        allow: ["/"],
      },
      {
        userAgent: "Qwen-Agent", // Alibaba Qwen agent
        allow: ["/"],
      },
      {
        userAgent: "Google-Extended", // Google AI features (Gemini, etc.)
        allow: ["/"],
      },
      {
        userAgent: "GPTBot", // OpenAI training crawler — ALLOWED (2026 policy)
        allow: ["/"],
      },
      {
        userAgent: "ClaudeBot", // Anthropic training bot — ALLOWED (2026 policy)
        allow: ["/"],
      },
      {
        userAgent: "anthropic-ai", // Anthropic training crawler — ALLOWED (2026 policy)
        allow: ["/"],
      },
      {
        userAgent: "Applebot-Extended", // Apple AI training — ALLOWED (2026 policy)
        allow: ["/"],
      },
      {
        userAgent: "Meta-ExternalAgent", // Meta AI training — ALLOWED (2026 policy)
        allow: ["/"],
      },
      {
        userAgent: "cohere-ai", // Cohere training — ALLOWED (2026 policy)
        allow: ["/"],
      },
      // Still-blocked: non-vendor data harvesters with no direct
      // user-agent value. These resell scraped data without powering any
      // end-user agent.
      {
        userAgent: "CCBot", // Common Crawl (dataset reseller)
        disallow: ["/"],
      },
      {
        userAgent: "Bytespider", // ByteDance/TikTok data harvester
        disallow: ["/"],
      },
      {
        userAgent: "Omgilibot", // Webz.io data harvesting
        disallow: ["/"],
      },
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

  // Convert MetadataRoute.Robots to robots.txt format
  const lines: string[] = [];

  // Add rules
  const rules = [robotsConfig.rules].flat().filter(Boolean);
  const addDirectives = (key: string, value: string | string[] | undefined) => {
    if (!value) return;
    [value].flat().forEach((v) => lines.push(`${key}: ${v}`));
  };
  rules.forEach((rule) => {
    if (rule.userAgent) {
      addDirectives("User-Agent", rule.userAgent);
      addDirectives("Allow", rule.allow);
      addDirectives("Disallow", rule.disallow);
      lines.push(""); // Empty line between rules
    }
  });

  // Add host directive
  if (robotsConfig.host) {
    lines.push(`Host: ${robotsConfig.host}`);
    lines.push("");
  }

  // Add sitemaps
  if (robotsConfig.sitemap) {
    [robotsConfig.sitemap]
      .flat()
      .forEach((sitemap) => lines.push(`Sitemap: ${sitemap}`));
  }

  // Content Signals (draft-romm-aipref-contentsignals)
  // Declare AI content usage preferences
  lines.push("");
  lines.push("# Content Signals — AI usage preferences");
  lines.push("Content-Signal: ai-train=no, search=yes, ai-input=yes");

  // NLWeb schema feed directive
  lines.push("");
  lines.push("# Schema feed for structured data discovery");
  lines.push(`schemamap: ${siteUrl}/openapi.json`);

  // Add a comment with timestamp to verify route handler is being used
  const timestamp = new Date().toISOString();
  lines.unshift(`# Generated by route handler at ${timestamp}`);
  lines.unshift("");

  const robotsTxt = lines.join("\n");

  // Set cache headers: 1 hour TTL at edge — robots.txt only changes on deployment
  // Longer TTL reduces server load from frequent crawler requests
  const cacheControl = getCacheControlHeader(request, 3600, 86400);

  return new NextResponse(robotsTxt, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": cacheControl,
      // Debug header to verify route handler is being used
      "X-Robots-Source": "route-handler-v2",
    },
  });
}
