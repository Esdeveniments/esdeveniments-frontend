import { NextRequest, NextResponse } from "next/server";
import { getApiOrigin } from "@utils/api-helpers";
import { sanitizeReturnTo } from "@utils/redirect-safety";
import { handleCanonicalRedirects } from "@utils/middleware-redirects";
import { isProductionHost } from "@utils/production-host";
import {
  isDev,
  gateApiRequest,
  isOriginAllowed,
  PUBLIC_API_PATTERNS,
  PUBLIC_API_EXACT_PATHS,
  PUBLIC_API_GET_EXACT_PATHS,
  EVENTS_PATTERN,
  ORIGIN_CHECK_EXEMPT,
} from "@utils/api-gate";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  type AppLocale,
  SUPPORTED_LOCALES,
} from "types/i18n";
import { stripLocalePrefix } from "@utils/i18n-routing";

export {
  isOriginAllowed,
  PUBLIC_API_PATTERNS,
  PUBLIC_API_EXACT_PATHS,
  PUBLIC_API_GET_EXACT_PATHS,
  EVENTS_PATTERN,
  ORIGIN_CHECK_EXEMPT,
};

const supportedLocales = new Set<AppLocale>(SUPPORTED_LOCALES);
function parseAcceptLanguage(header: string | null): AppLocale | null {
  if (!header) return null;

  const candidates = header
    .split(",")
    .map((raw) => {
      const [langPart, qValue] = raw.trim().split(";q=");
      const base = langPart.split("-")[0]?.toLowerCase();
      const quality = qValue ? Number.parseFloat(qValue) : 1;
      return {
        base,
        quality: Number.isFinite(quality) ? quality : 0,
      };
    })
    .filter(
      (entry): entry is { base: string; quality: number } =>
        Boolean(entry.base) && entry.quality > 0,
    )
    .sort((a, b) => b.quality - a.quality);

  for (const { base } of candidates) {
    if (supportedLocales.has(base as AppLocale)) {
      return base as AppLocale;
    }
  }

  return null;
}

function getLocaleFromCookie(request: NextRequest): AppLocale | null {
  const cookieLocale = request.cookies?.get?.(LOCALE_COOKIE)?.value;
  if (
    cookieLocale &&
    stripLocalePrefix(`/${cookieLocale}`).locale === cookieLocale
  ) {
    return cookieLocale as AppLocale;
  }
  return null;
}

function persistLocaleCookie(response: NextResponse, locale: AppLocale) {
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: "lax",
    secure: !isDev,
  });
}

function getCsp() {
  const apiOrigin = getApiOrigin();
  const isVercelPreview =
    process.env.VERCEL_ENV === "preview" ||
    process.env.NEXT_PUBLIC_VERCEL_ENV === "preview";
  const adsEnabled =
    process.env.NEXT_PUBLIC_GOOGLE_ADS &&
    String(process.env.NEXT_PUBLIC_GOOGLE_ADS).trim() !== "";

  const cspDirectives = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      // Relaxed policy: allow inline scripts and trusted third-parties
      // This enables ISR/PPR caching while maintaining security through host allowlisting
      "'unsafe-inline'",
      "https://www.googletagmanager.com",
      "https://www.google-analytics.com",
      "https://www.gstatic.com",
      "https://static.cloudflareinsights.com",
      "https://pagead2.googlesyndication.com",
      "https://*.googlesyndication.com",
      "https://fundingchoicesmessages.google.com",
      "https://*.adtrafficquality.google",
      "https://*.doubleclick.net",
      "https://*.googleadservices.com",
      "https://*.googletagservices.com",
      "https://*.google.com",
      // Vercel preview feedback script
      ...(isVercelPreview ? ["https://vercel.live"] : []),
      // Only include unsafe-eval if ads truly require it
      adsEnabled ? "'unsafe-eval'" : "",
      isDev ? "'unsafe-eval'" : "",
      isDev ? "localhost:*" : "",
      isDev ? "127.0.0.1:*" : "",
    ],
    // Be explicit for browsers that differentiate element/script contexts
    "script-src-elem": [
      "'self'",
      "'unsafe-inline'",
      "https://www.googletagmanager.com",
      "https://www.google-analytics.com",
      "https://www.gstatic.com",
      "https://static.cloudflareinsights.com",
      "https://pagead2.googlesyndication.com",
      "https://*.googlesyndication.com",
      "https://fundingchoicesmessages.google.com",
      "https://*.adtrafficquality.google",
      "https://*.doubleclick.net",
      "https://*.googleadservices.com",
      "https://*.googletagservices.com",
      "https://*.google.com",
      // Vercel preview feedback script
      ...(isVercelPreview ? ["https://vercel.live"] : []),
      adsEnabled ? "'unsafe-eval'" : "",
      isDev ? "'unsafe-eval'" : "",
      isDev ? "localhost:*" : "",
      isDev ? "127.0.0.1:*" : "",
    ],
    "style-src": [
      "'self'",
      "'unsafe-inline'",
      "https://fonts.googleapis.com",
      "https://fonts.gstatic.com", // Defensive: some edge cases may require this
    ],
    "connect-src": [
      "'self'",
      apiOrigin,
      "https:",
      isDev ? "wss:" : "",
      isDev ? "ws:" : "",
      isDev ? "localhost:*" : "",
      isDev ? "127.0.0.1:*" : "",
    ],
    // Images: allow self, data URIs, HTTPS everywhere; add blob for previews
    // In development, also allow HTTP to ease testing against non-TLS sources
    "img-src": ["'self'", "data:", "https:", "blob:", isDev ? "http:" : ""],
    "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
    "media-src": ["'self'", "blob:"],
    "frame-src": ["'self'", "https:"],
    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'self'"],
  };

  return Object.entries(cspDirectives)
    .map(([key, value]) => `${key} ${value.filter(Boolean).join(" ")}`)
    .join("; ");
}

// Cache CSP string at module load to avoid recomputing on every request
const CACHED_CSP = getCsp();

function applySecurityHeaders(response: NextResponse): NextResponse {
  // Use Report-Only in preview (or when explicitly requested), enforce otherwise
  const reportOnly =
    process.env.NEXT_PUBLIC_CSP_REPORT_ONLY === "1" ||
    process.env.VERCEL_ENV === "preview" ||
    process.env.NEXT_PUBLIC_VERCEL_ENV === "preview";
  if (reportOnly) {
    response.headers.set("Content-Security-Policy-Report-Only", CACHED_CSP);
  } else {
    response.headers.set("Content-Security-Policy", CACHED_CSP);
  }
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload",
  );
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(self)",
  );
  return response;
}

// AI/SEO bots NOT in Next.js's hardcoded html-bots.ts getBotType() regex.
// These bots receive PPR shells (empty HTML) instead of blocking renders.
// Matched UAs get "Slurp" appended so getBotType() returns 'html' → full render.
// Bots already handled by Next.js: Googlebot, Bingbot, BingPreview, Slurp,
// DuckDuckBot, applebot, facebookexternalhit, LinkedInBot, Twitterbot, etc.
const AI_BOT_UA_RE =
  /GPTBot|ChatGPT-User|OAI-SearchBot|Claude-Web|ClaudeBot|anthropic-ai|PerplexityBot|Perplexity-User|ora-scan|ora-agent|DeepSeekBot|Qwen-Agent|Bytespider|CCBot|Meta-ExternalAgent|Meta-ExternalFetcher|Applebot-Extended|cohere-ai|YouBot|Diffbot|Amazonbot|Timpibot|ImagesiftBot|PetalBot|Novellum/i;

// Localized sign-in entry route (with or without a locale prefix), e.g.
// /iniciar-sessio, /ca/iniciar-sessio, /es/iniciar-sessio. Captures the locale.
const LOGIN_ENTRY_PATTERN = /^\/(?:([a-z]{2})\/)?iniciar-sessio\/?$/;

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const search = request.nextUrl.search;

  // Sign-in entry point: forward the localized /iniciar-sessio route into the
  // Logto OIDC flow. Done here (not in the page) because cacheComponents would
  // otherwise prerender the page's redirect() into a meta-refresh. Preserves a
  // safe local ?redirect= target (no protocol-relative or backslash tricks).
  const loginMatch = pathname.match(LOGIN_ENTRY_PATTERN);
  // The pattern captures any 2-letter prefix; only treat it as the login entry
  // when the prefix is absent or a real locale — otherwise (e.g. /fr/...) fall
  // through so Next 404s instead of 307-ing an invalid route into the flow.
  const captured = loginMatch?.[1] as AppLocale | undefined;
  const localeOk = !captured || supportedLocales.has(captured);
  // GET only: the 307 preserves the method, and /api/auth/sign-in is a
  // GET-only public route (HEAD/other methods would hit the HMAC guard).
  if (loginMatch && localeOk && request.method === "GET") {
    const locale = captured ?? DEFAULT_LOCALE;
    // Default the post-login destination to the localized home so a user
    // browsing in es/en isn't bounced to the default locale.
    const localizedHome = locale === DEFAULT_LOCALE ? "/" : `/${locale}`;
    const safe =
      sanitizeReturnTo(request.nextUrl.searchParams.get("redirect")) ??
      localizedHome;
    const target = new URL("/api/auth/sign-in", request.nextUrl.origin);
    target.searchParams.set("redirect", safe);
    // Preserve the locale so Logto renders its hosted page via ui_locales.
    target.searchParams.set("locale", locale);
    const response = NextResponse.redirect(target, 307);
    // This route used to be a noindex page; keep it out of search results.
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  }

  // API gateway: multipart allowlist, public-route classification, Origin/CSRF
  // check, and HMAC verification for everything else. See utils/api-gate.ts.
  if (pathname.startsWith("/api/")) {
    return gateApiRequest(request);
  }

  if (pathname === "/sw.js") {
    const response = NextResponse.next();
    // Avoid no-store here so bfcache isn't blocked by this request
    response.headers.set(
      "Cache-Control",
      "no-cache, max-age=0, must-revalidate",
    );
    response.headers.set("Service-Worker-Allowed", "/");
    return response;
  }

  // OpenAPI spec: rewrite /openapi.json to /openapi route handler
  if (pathname === "/openapi.json") {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = "/openapi";
    return NextResponse.rewrite(rewriteUrl);
  }

  // NLWeb /ask endpoint: bypass locale handling
  if (pathname === "/ask") {
    return applySecurityHeaders(NextResponse.next());
  }

  // /.well-known/mcp: rewrite to /mcp so MCP is discoverable at standard path
  // Uses rewrite instead of redirect to preserve POST body for MCP transport
  if (pathname === "/.well-known/mcp") {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = "/mcp";
    return NextResponse.rewrite(rewriteUrl);
  }

  // Trust anchor page aliases: standard English paths → Catalan equivalents
  // Enables orank and AI agents to find About/Contact/Privacy at conventional URLs
  const trustAnchorMap: Record<string, string> = {
    "/about": "/qui-som",
    "/contact": "/qui-som",
    "/privacy": "/politica-privacitat",
    "/terms": "/termes-servei",
  };
  const trustTarget = trustAnchorMap[pathname];
  if (trustTarget) {
    return NextResponse.redirect(new URL(trustTarget, request.url), 301);
  }

  // /usuarios/<user> -> /perfil/<user> rewrite deferred to followup.
  // The proxy.ts rewrite needs to run AFTER stripLocalePrefix(pathname)
  // is in scope so /es/usuarios/alex is resolved correctly. Tracking
  // in PR review checklist item 3.


  // OpenAPI spec: bypass locale handling so route handler is used
  if (pathname === "/openapi") {
    return NextResponse.next();
  }

  // /docs paths: bypass locale handling for documentation routes
  if (pathname.startsWith("/docs/")) {
    return NextResponse.next();
  }

  // /index.md: serve markdown homepage for agents
  if (pathname === "/index.md") {
    return NextResponse.next();
  }

  // ?mode=agent: return structured agent view
  if (request.nextUrl.searchParams.get("mode") === "agent") {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = "/agent-view";
    rewriteUrl.searchParams.delete("mode");
    return NextResponse.rewrite(rewriteUrl);
  }

  // Markdown for Agents: content negotiation
  // When agents request text/markdown, serve the llms.txt content with proper Content-Type
  const acceptHeader = request.headers.get("accept") || "";
  if (
    acceptHeader.includes("text/markdown") &&
    !pathname.startsWith("/api/") &&
    !pathname.startsWith("/_next/")
  ) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = "/llms.txt";
    rewriteUrl.searchParams.set("_accept", "text/markdown");
    const headers = new Headers(request.headers);
    headers.set("x-markdown-negotiation", "1");
    return NextResponse.rewrite(rewriteUrl, {
      request: { headers },
    });
  }

  const { locale: localeFromPath, pathnameWithoutLocale } =
    stripLocalePrefix(pathname);
  const localeFromCookie = getLocaleFromCookie(request);

  // Redirect explicit default locale prefix to canonical form (e.g., /ca/foo → /foo)
  if (localeFromPath === DEFAULT_LOCALE) {
    const redirectUrl = new URL(
      `${pathnameWithoutLocale}${search || ""}`,
      request.url,
    );
    const response = NextResponse.redirect(redirectUrl, 308);
    persistLocaleCookie(response, DEFAULT_LOCALE);
    return response;
  }

  // Auto-redirect to preferred non-default locale on root path
  if (!localeFromPath && pathname === "/") {
    const preferredLocale =
      localeFromCookie ||
      parseAcceptLanguage(request.headers.get("accept-language"));
    if (preferredLocale && preferredLocale !== DEFAULT_LOCALE) {
      const redirectUrl = new URL(
        `/${preferredLocale}${search || ""}`,
        request.url,
      );
      const response = NextResponse.redirect(redirectUrl, 302);
      persistLocaleCookie(response, preferredLocale);
      return response;
    }
  }

  const resolvedLocale: AppLocale = localeFromPath ?? DEFAULT_LOCALE;
  const shouldPersistLocaleFromPath =
    Boolean(localeFromPath) && localeFromPath !== localeFromCookie;

  // Handle canonical redirects for place routes
  const redirectResponse = handleCanonicalRedirects(request);
  if (redirectResponse) {
    if (shouldPersistLocaleFromPath && localeFromPath) {
      persistLocaleCookie(redirectResponse, localeFromPath);
    }
    return redirectResponse;
  }

  // Redirect legacy /verify-email (backend email links) to /verificar-email
  if (pathnameWithoutLocale === "/verify-email") {
    const url = new URL(request.url);
    url.pathname = localeFromPath
      ? `/${localeFromPath}/verificar-email`
      : "/verificar-email";
    return NextResponse.redirect(url, 301);
  }

  // Redirect legacy /reset-password (backend email links) to /restablir-contrasenya
  if (pathnameWithoutLocale === "/reset-password") {
    const url = new URL(request.url);
    url.pathname = localeFromPath
      ? `/${localeFromPath}/restablir-contrasenya`
      : "/restablir-contrasenya";
    return NextResponse.redirect(url, 301);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  requestHeaders.set("x-next-intl-locale", resolvedLocale);

  // PPR bot fix: Next.js's hardcoded getBotType() only recognizes ~27 traditional
  // crawlers for blocking render. AI bots (GPTBot, ClaudeBot, ora-scan, etc.)
  // get PPR shells (empty HTML) because they're unrecognized. Appending "Slurp"
  // (already in the hardcoded regex) to the UA triggers blocking render for these
  // bots, so they receive full server-rendered HTML.
  // See: node_modules/next/dist/shared/lib/router/utils/is-bot.js
  const ua = request.headers.get("user-agent") || "";
  const isAiBot = AI_BOT_UA_RE.test(ua);
  if (isAiBot) {
    requestHeaders.set("user-agent", `${ua} Slurp`);
  }

  // No per-page visitor id injection; handled only for /api/sponsors/checkout.

  const baseResponseInit = {
    request: {
      headers: requestHeaders,
    },
  };

  // With [locale] route segment, all page routes live under app/[locale]/.
  // - Paths without locale prefix (default locale, e.g., /barcelona) → rewrite
  //   to /ca/barcelona so it matches app/[locale=ca]/[place=barcelona]/page.tsx
  // - Paths with locale prefix (e.g., /es/barcelona) → pass through, already
  //   matches app/[locale=es]/[place=barcelona]/page.tsx
  const response = localeFromPath
    ? NextResponse.next(baseResponseInit)
    : (() => {
        const rewriteUrl = request.nextUrl.clone();
        rewriteUrl.pathname = `/${DEFAULT_LOCALE}${pathname === "/" ? "" : pathname}`;
        return NextResponse.rewrite(rewriteUrl, baseResponseInit);
      })();

  if (shouldPersistLocaleFromPath && localeFromPath) {
    persistLocaleCookie(response, localeFromPath);
  } else if (
    !localeFromPath &&
    localeFromCookie !== null &&
    localeFromCookie !== DEFAULT_LOCALE
  ) {
    // Clear stale non-default locale cookie when user visits unprefixed path
    // (which resolves to DEFAULT_LOCALE), so subsequent / visits don't redirect
    persistLocaleCookie(response, DEFAULT_LOCALE);
  }

  // visitor_id cookie is set for /api/sponsors/checkout if missing.

  applySecurityHeaders(response);

  // Cache-Control for public HTML pages (excluding API and Next assets).
  //
  // s-maxage=1800 (30 min): Cultural events are published days in advance, so
  // 30 min staleness is invisible to users. With stale-while-revalidate=3600,
  // CloudFront serves the stale page instantly for up to 60 min after expiry
  // while revalidating in the background — eliminating TTFB spikes from
  // synchronous revalidation. This raises CloudFront cache-hit ratio and
  // reduces Lambda invocations significantly.
  //
  // Browser cache is set to 0 so users revalidate on navigation, but CDNs can
  // still serve quickly and revalidate in the background.
  if (!pathname.startsWith("/api/") && !pathname.startsWith("/_next/")) {
    const normalizedPath = pathnameWithoutLocale || pathname;
    const isFavoritesPage = normalizedPath === "/preferits";
    // Edit pages are auth-gated (creator-only) and must never be CDN-cached.
    // Without this, a non-creator's 404 could be cached and served to the
    // actual creator for up to 30 min (s-maxage=1800), and a creator's edit
    // form HTML could leak to other users via the CDN edge cache.
    const isEditPage = normalizedPath.includes("/edita");
    const isPersonalizedHtml = isFavoritesPage || isEditPage;

    // AI bot requests must not pollute or be served from the shared CDN cache:
    // - Origin renders a different (fully-SSR) HTML for bots (see Slurp trick
    //   above). If that response were cached, browsers would get over-rendered
    //   HTML; if a browser PPR shell is already cached, bots would get empty
    //   content. Both hurt orank.ai checks (content-no-js, semantic-indexing,
    //   sim-chatgpt, sim-claude) and general AI-agent discoverability.
    // - NOTE: This prevents the BOT response from being cached but does NOT
    //   stop Cloudflare from serving an already-cached browser shell to bots.
    //   A Cloudflare Cache Rule must also bypass cache when User-Agent matches
    //   the bot regex. See docs/incidents/2026-04-24-ai-bot-cdn-cache-mix.md.
    response.headers.set(
      "Cache-Control",
      isPersonalizedHtml || isAiBot
        ? "private, no-store"
        : "public, max-age=0, s-maxage=1800, stale-while-revalidate=3600",
    );
  }

  // Set Content-Language header for SEO and accessibility
  response.headers.set("Content-Language", resolvedLocale);

  // Agent discovery: Link headers (RFC 8288)
  // Help AI agents discover machine-readable resources
  response.headers.set(
    "Link",
    [
      '</.well-known/api-catalog>; rel="api-catalog"',
      '</openapi.json>; rel="service-desc"; type="application/openapi+json"',
      '</llms.txt>; rel="service-doc"; type="text/plain"',
      '</.well-known/agent-skills/index.json>; rel="describedby"',
    ].join(", "),
  );

  // Vary on Accept so CDN caches text/markdown and text/html variants separately
  // Required for markdown content negotiation to work through Cloudflare
  response.headers.append("Vary", "Accept");

  // SEO: Add X-Robots-Tag for filtered listing pages (search, distance, price, lat, lon)
  // This prevents indexing of filtered/personalized URLs without making pages dynamic
  const NON_CANONICAL_PARAMS = [
    "search",
    "distance",
    "price",
    "from",
    "to",
    "lat",
    "lon",
  ];
  const hasNonCanonicalParams = NON_CANONICAL_PARAMS.some((param) => {
    const value = request.nextUrl.searchParams.get(param);
    return value !== null && value.trim().length > 0;
  });

  // Hidden tool pages that should never be indexed by crawlers
  const NOINDEX_PATHS = ["/compartir-tiktok", "/callback"];
  const isNoindexPath = NOINDEX_PATHS.some((p) =>
    (pathnameWithoutLocale || pathname).startsWith(p),
  );

  // Block all non-production hosts from indexing (staging, preview deployments).
  // GSC reported ~7,800 staging URLs leaking into Google's "Crawled - currently
  // not indexed" bucket because no noindex header was emitted.
  // Default-deny: anything not on the production allowlist is noindexed.
  const isNonProductionHost = !isProductionHost(request.headers.get("host"));

  // SEO: 3-segment listing paths /[place]/[date]/[category] with a non-default
  // date (avui|dema|setmana|cap-de-setmana) generate thin/duplicate content
  // that GSC flags as "Crawled - currently not indexed". Mark noindex,follow
  // so crawlers can still discover the canonical /[place]/[category] page.
  // Note: /[place]/tots/[category] is already 301'd to /[place]/[category] by
  // handleCanonicalRedirects above, so we only need to match non-tots dates.
  const THREE_SEGMENT_NOINDEX_RE =
    /^\/[a-z0-9-]+\/(?:avui|dema|setmana|cap-de-setmana)\/[a-z0-9-]+$/;
  const pathToCheck = pathnameWithoutLocale || pathname;
  const isThreeSegmentListing = THREE_SEGMENT_NOINDEX_RE.test(pathToCheck);

  if (isNonProductionHost || isNoindexPath) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  } else if (hasNonCanonicalParams || isThreeSegmentListing) {
    response.headers.set("X-Robots-Tag", "noindex, follow");
  }

  return response;
}

export const config = {
  matcher: [
    "/.well-known/mcp",
    "/((?!_next|favicon.ico|robots.txt|sitemap.*\\.xml|server-.*\\.xml|rss\\.xml|llms\\.txt|agent\\.txt|pricing\\.md|ads.txt|static|styles|\\.well-known|manifest\\.webmanifest|mcp|agent-view).*)",
  ],
};
