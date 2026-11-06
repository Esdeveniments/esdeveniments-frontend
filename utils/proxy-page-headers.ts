import type { NextRequest, NextResponse } from "next/server";
import { buildPageCdnTags, getCdnHost } from "@lib/cdn/cache-tags";
import { ALLOWED_QUERY_PARAMS } from "@utils/middleware-redirects";
import { isPlacePath } from "@utils/proxy-place";
import { isProductionHost } from "@utils/production-host";
import botUserAgents from "@config/bot-user-agents.json";

// next.config.js adds the same crawlers to htmlLimitedBots, so they get a
// blocking full render instead of the PPR shell.
const AI_BOT_UA_RE = new RegExp(botUserAgents.aiCrawlers.join("|"), "i");

// 3-segment listings /[place]/[date]/[category] with a non-default date are
// thin duplicates of /[place]/[category] ("Crawled - currently not indexed").
// /[place]/tots/[category] is already 301'd by handleCanonicalRedirects.
const THREE_SEGMENT_LISTING_RE =
  /^\/[a-z0-9-]+\/(?:avui|dema|setmana|cap-de-setmana)\/[a-z0-9-]+$/;

const PROMOTE_PATH_RE = /\/promote(\/|$)/;
const FAVORITES_PATH_RE = /^\/preferits(\/|$)/;

// Agent discovery (RFC 8288 Link header).
const AGENT_DISCOVERY_LINKS = [
  '</.well-known/api-catalog>; rel="api-catalog"',
  '</openapi.json>; rel="service-desc"; type="application/openapi+json"',
  '</llms.txt>; rel="service-doc"; type="text/plain"',
  '</.well-known/agent-skills/index.json>; rel="describedby"',
].join(", ");

/**
 * Owner-only or per-user pages: favorites (/preferits and its subpages),
 * edit forms (a non-creator's 404 or a creator's form must never be shared
 * via the CDN) and promote pages (payment status, Stripe checkout URLs).
 * Matched on the decoded, lowercased, slash-collapsed path so
 * /e/x/promot%65 or /e/x//promote can't slip through.
 */
function isPersonalizedPath(path: string): boolean {
  let decoded = path;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    // Malformed escapes: fall back to the raw path.
  }
  decoded = decoded.toLowerCase().replace(/\/{2,}/g, "/");
  return (
    FAVORITES_PATH_RE.test(decoded) ||
    decoded.includes("/edita") ||
    PROMOTE_PATH_RE.test(decoded)
  );
}

function hasFilterParams(searchParams: URLSearchParams): boolean {
  for (const param of ALLOWED_QUERY_PARAMS) {
    if (searchParams.get(param)?.trim()) return true;
  }
  return false;
}

/**
 * Cache, language, discovery and robots headers for HTML page responses.
 * `path` is the pathname without the locale prefix.
 */
export function applyPageHeaders(
  request: NextRequest,
  response: NextResponse,
  path: string,
  locale: string,
): void {
  // s-maxage=1800 (30 min) keeps Cloudflare's hit ratio high and TTFB low.
  // Publish/edit/delete purge the affected pages by Cache-Tag (below), so a
  // change shows up straight away without a shorter TTL. Cloudflare ignores
  // stale-while-revalidate when s-maxage is set, so an expired page is
  // refetched while the visitor waits (cf-cache-status: EXPIRED). Browsers
  // revalidate on every navigation.
  //
  // AI bots get a full render (htmlLimitedBots) that must not enter the
  // shared CDN cache. This doesn't stop the CDN from serving a cached browser
  // shell to bots; the Cloudflare cache rule handles that
  // (docs/incidents/2026-04-24-ai-bot-cdn-cache-mix.md).
  const isAiBot = AI_BOT_UA_RE.test(request.headers.get("user-agent") ?? "");
  const isCdnCacheable = !isPersonalizedPath(path) && !isAiBot;
  response.headers.set(
    "Cache-Control",
    isCdnCacheable
      ? "public, max-age=0, s-maxage=1800, stale-while-revalidate=3600"
      : "private, no-store",
  );
  // Labels for lib/cdn/cloudflare-purge.ts. Cloudflare strips this header
  // before it reaches visitors. Never on private responses.
  if (isCdnCacheable) {
    const segments = path.split("/").filter(Boolean);
    const tags = buildPageCdnTags(
      getCdnHost(),
      segments,
      isPlacePath(segments),
    );
    if (tags.length > 0) response.headers.set("Cache-Tag", tags.join(","));
  }

  response.headers.set("Content-Language", locale);
  response.headers.set("Link", AGENT_DISCOVERY_LINKS);
  // No Vary: Accept here: Next replaces Vary on page responses, and Cloudflare
  // ignores it. The markdown variant is kept out of the CDN by its own
  // Cache-Control instead (app/llms.txt/route.ts).

  // Default-deny: every host outside the production allowlist (staging, PR
  // previews) is noindexed. Filtered listings stay crawlable but unindexed,
  // without the page reading searchParams.
  if (!isProductionHost(request.headers.get("host"))) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  } else if (
    hasFilterParams(request.nextUrl.searchParams) ||
    THREE_SEGMENT_LISTING_RE.test(path)
  ) {
    response.headers.set("X-Robots-Tag", "noindex, follow");
  }
}
