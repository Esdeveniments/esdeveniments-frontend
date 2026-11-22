import type {
  Event,
  EventHint,
  ErrorEvent,
  NodeOptions,
} from "@sentry/nextjs";
import { isProductionSiteUrl } from "@utils/production-host";

/**
 * Sentry environment from the site URL each Docker build inlines. Staging used
 * to report "production": NEXT_PUBLIC_VERCEL_ENV is a Vercel variable our
 * builds never set, so Sentry fell back to its default. Builds for any other
 * host ("preview") don't report at all: Vercel preview builds of PR branches,
 * with the DSN but no backend secrets, sent 63% of the Oct-Nov 2026 quota.
 */
export function sentryEnvironment(
  siteUrl: string | undefined = process.env.NEXT_PUBLIC_SITE_URL,
): string {
  if (isProductionSiteUrl(siteUrl)) return "production";
  try {
    if (siteUrl && new URL(siteUrl).hostname === "staging.esdeveniments.cat") {
      return "staging";
    }
  } catch {
    // Invalid URL: falls through to "preview".
  }
  return "preview";
}

// The free plan has 5k errors a month and no per-key rate limits, and one
// backend outage sent 206 errors in 10 minutes. Per process and per window,
// keep the first few of each error and a few overall; the next one sent for
// that error carries how many were dropped.
const THROTTLE_WINDOW_MS = 10 * 60_000;
const THROTTLE_PER_ERROR = 5;
const THROTTLE_TOTAL = 20;
const THROTTLE_MAX_KEYS = 500;
let throttleTotal = { start: 0, sent: 0 };
const throttleByError = new Map<
  string,
  { start: number; sent: number; dropped: number }
>();

function throttleWindow(key: string, now: number) {
  let window = throttleByError.get(key);
  if (window) {
    if (now - window.start >= THROTTLE_WINDOW_MS) {
      window.start = now;
      window.sent = 0;
    }
    return window;
  }
  if (throttleByError.size >= THROTTLE_MAX_KEYS) {
    for (const [oldKey, old] of throttleByError) {
      if (now - old.start >= THROTTLE_WINDOW_MS) throttleByError.delete(oldKey);
    }
  }
  // Full of current errors: the total cap still holds, the count is lost.
  if (throttleByError.size >= THROTTLE_MAX_KEYS) return undefined;
  window = { start: now, sent: 0, dropped: 0 };
  throttleByError.set(key, window);
  return window;
}

/** Returns the event, or null when its error or all errors hit the window cap. */
export function throttleEvent<T extends Event>(
  event: T,
  now: number = Date.now(),
): T | null {
  if (now - throttleTotal.start >= THROTTLE_WINDOW_MS) {
    throttleTotal = { start: now, sent: 0 };
  }
  const exception = event.exception?.values?.[0];
  const key = `${exception?.type ?? ""}:${exception?.value ?? event.message ?? ""}`.slice(
    0,
    200,
  );
  // Over the total cap, only count drops for errors already tracked, so a
  // flood of rejected errors can't fill the map.
  if (throttleTotal.sent >= THROTTLE_TOTAL) {
    const tracked = throttleByError.get(key);
    if (tracked) tracked.dropped++;
    return null;
  }
  const perError = throttleWindow(key, now);
  if (perError && perError.sent >= THROTTLE_PER_ERROR) {
    perError.dropped++;
    return null;
  }
  throttleTotal.sent++;
  if (!perError) return event;
  perError.sent++;
  if (perError.dropped > 0) {
    event.extra = { ...event.extra, droppedSimilarEvents: perError.dropped };
    perError.dropped = 0;
  }
  return event;
}

const V10_SENSITIVE_HEADERS = ["forwarded", "-ip", "remote-", "via", "-user"];

/**
 * Sentry v11 replaced sendDefaultPii with dataCollection, whose unset default
 * collects cookies, user info, HTTP bodies and DB query data. This is the
 * documented v10 sendDefaultPii:false baseline; pass it in every init.
 */
export const SENTRY_DATA_COLLECTION: NonNullable<NodeOptions["dataCollection"]> =
  {
    userInfo: false,
    cookies: false,
    httpHeaders: {
      request: { deny: V10_SENSITIVE_HEADERS },
      response: { deny: V10_SENSITIVE_HEADERS },
    },
    httpBodies: [],
    urlQueryParams: { deny: V10_SENSITIVE_HEADERS },
    genAI: { inputs: false, outputs: false },
    databaseQueryData: false,
    queues: false,
    graphQL: { document: false, variables: false },
  };

/**
 * Well-known error patterns to ignore at SDK level (before serialization).
 * Used in Sentry.init({ ignoreErrors }) across all runtimes.
 * More performant than filtering in beforeSend — SDK skips serialization entirely.
 */
export const SENTRY_IGNORE_ERRORS: Array<string | RegExp> = [
  // Browser extension errors
  /chrome-extension:\/\//i,
  /moz-extension:\/\//i,
  /safari-extension:\/\//i,
  /extension:\/\//i,
  // Webpack chunk loading failures (often caused by ad blockers or stale deployments)
  "ChunkLoadError",
  /Loading chunk [\d]+ failed/i,
  "__webpack_require__",
  // Ad blocker interference
  /adblock/i,
  /advertisement/i,
  // Duplicate ad pushes, raised from inside Google's adsbygoogle.js (a second
  // page-level ads push, a slot that already has an ad). The stack has no frame
  // of ours. Other `adsbygoogle.push() error` messages (a zero-width slot, a
  // missing client) point at our layout or config, so they stay reported.
  /adsbygoogle\.push\(\) error: (?:Only one 'enable_page_level_ads'|All 'ins' elements)/,
  // Next.js rolling deployment mismatch — old client hits new server. Not actionable.
  "Failed to find Server Action",
  // React PPR resumption mismatch — happens during deployment transitions when
  // the server serves stale postponed metadata. Not a code bug.
  "Couldn't find all resumable slots",
  // Upstream Next.js PPR + cacheComponents bug (vercel/next.js#93401): the static
  // PPR shell is built with the streaming-metadata wrapper, but bot UAs in
  // `htmlLimitedBots` get blocking metadata at runtime → resume tree-shape mismatch.
  // Fires only for Googlebot/Bingbot/GoogleOther/etc.; React falls back to client
  // render so users are unaffected. Remove once the upstream bug is fixed.
  /Expected the resume to render <(div|Fragment)> in this slot but instead it rendered <(__next_metadata_boundary__|script)>/,
];

/**
 * Deny errors originating from browser extension URLs.
 * Used in Sentry.init({ denyUrls }) — client config only.
 */
export const SENTRY_DENY_URLS: Array<string | RegExp> = [
  /extensions\//i,
  /^chrome:\/\//i,
  /^chrome-extension:\/\//i,
  /^moz-extension:\/\//i,
  /^safari-extension:\/\//i,
];

/**
 * Check if an error originates from the image proxy route.
 */
function isImageProxyError(event: Event | ErrorEvent): boolean {
  // Check request URL (most reliable, available even with tracesSampleRate: 0)
  const requestUrl = event.request?.url || "";
  if (requestUrl.includes("/api/image-proxy")) return true;
  // Fallback: check transaction name (set by Next.js instrumentation)
  if (event.transaction?.includes("/api/image-proxy")) return true;
  return false;
}

/**
 * Filters and sanitizes Sentry events before sending.
 * Implements best practices for production error monitoring:
 * - Uses hint.originalException for reliable error inspection
 * - Filters non-critical errors that can't be handled in ignoreErrors
 * - Scrubs sensitive data (passwords, tokens, API keys, etc.)
 *
 * Note: Well-known noise patterns (extensions, chunk errors, ad blockers,
 * deployment mismatch) are handled by SENTRY_IGNORE_ERRORS in init config.
 * This function handles context-dependent filtering that needs event metadata.
 */
export function beforeSend(
  event: Event | ErrorEvent,
  hint: EventHint,
): Event | ErrorEvent | null {
  const originalError = hint.originalException;

  // Use the original exception for reliable type and message checking
  if (originalError instanceof Error) {
    const message = originalError.message.toLowerCase();
    const errorName = originalError.name.toLowerCase();

    // Image proxy fetch failures: external images unavailable (broken links, domains down).
    // Scoped to image-proxy route only — don't suppress fetch failures elsewhere.
    if (message.includes("fetch failed for ") && isImageProxyError(event)) {
      return null;
    }

    // Timeout errors from image proxy: external servers too slow to respond.
    // Scoped to image-proxy route — timeouts in real API calls should still be reported.
    if (
      (errorName === "timeouterror" ||
        errorName === "aborterror" ||
        message.includes("the operation was aborted due to timeout") ||
        message.includes("the operation was aborted")) &&
      isImageProxyError(event)
    ) {
      return null;
    }
  }

  // Fallback: check serialized exception values for edge cases where
  // hint.originalException is not an Error instance (e.g., thrown strings)
  if (event.exception?.values?.[0]) {
    const errorMessage = event.exception.values[0].value?.toLowerCase() || "";

    // Non-JSON responses (often network/proxy issues)
    if (errorMessage.includes("non-json")) {
      return null;
    }

    // Network errors that are non-critical (already retried client-side)
    if (
      errorMessage.includes("networkerror") &&
      errorMessage.includes("failed to fetch")
    ) {
      return null;
    }
  }

  // Last filter, so only events that would be sent count against the caps.
  if (!throttleEvent(event)) return null;

  // Scrub sensitive data from event
  const request = event.request;
  if (request?.query_string) {
    // Remove sensitive query parameters
    const sensitiveParams = [
      "password",
      "token",
      "api_key",
      "apikey",
      "secret",
      "auth",
      "authorization",
    ];
    if (typeof request.query_string === "string") {
      // Parse and filter query string
      const params = new URLSearchParams(request.query_string);
      sensitiveParams.forEach((param) => {
        if (params.has(param)) {
          params.set(param, "[Filtered]");
        }
      });
      request.query_string = params.toString();
    }
  }

  // Scrub sensitive headers
  if (request?.headers) {
    const sensitiveHeaders = [
      "authorization",
      "cookie",
      "x-api-key",
      "x-auth-token",
    ];
    sensitiveHeaders.forEach((header) => {
      const headerKey = Object.keys(request.headers || {}).find(
        (k) => k.toLowerCase() === header.toLowerCase(),
      );
      if (headerKey && request.headers) {
        request.headers[headerKey] = "[Filtered]";
      }
    });
  }

  // Scrub sensitive data from user context
  if (event.user) {
    // Keep user ID but remove sensitive fields
    const { id, username } = event.user;
    event.user = { id, username };
  }

  // Scrub sensitive data from extra context
  if (event.extra) {
    const sensitiveKeys = [
      "password",
      "token",
      "apiKey",
      "api_key",
      "secret",
      "auth",
      "authorization",
    ];
    sensitiveKeys.forEach((key) => {
      if (event.extra?.[key]) {
        event.extra[key] = "[Filtered]";
      }
    });
  }

  return event;
}

/**
 * The tunnel URL @sentry/nextjs's init() derives from withSentryConfig's
 * tunnelRoute, for a hand-built BrowserClient. Events then go to our own origin,
 * so ad blockers that block *.sentry.io do not drop them. Non-SaaS DSNs are not
 * tunnelled, as in the SDK.
 */
export function sentryTunnelFor(
  dsn: string | undefined,
  tunnelPath: string | undefined,
): string | undefined {
  const saas = dsn?.match(
    /^https:\/\/[^@]+@o(\d+)\.ingest(?:\.([a-z]{2}))?\.sentry\.io\/(\d+)$/,
  );
  if (!tunnelPath || !saas) return undefined;
  const [, orgId, region, projectId] = saas;
  return `${tunnelPath}?o=${orgId}&p=${projectId}${region ? `&r=${region}` : ""}`;
}

const FUNDING_CHOICES_SCRIPT_URL =
  /^https?:\/\/fundingchoicesmessages\.google\.com\//i;

function matchesUrlPatterns(
  url: string | undefined,
  patterns: Array<string | RegExp>,
): boolean {
  if (!url) return false;
  return patterns.some((pattern) =>
    typeof pattern === "string" ? url.includes(pattern) : pattern.test(url),
  );
}

function hasStackFrameMatching(
  event: Event | ErrorEvent,
  patterns: Array<string | RegExp>,
): boolean {
  return (
    event.exception?.values?.some((ex) =>
      ex.stacktrace?.frames?.some(
        (frame) =>
          matchesUrlPatterns(frame.abs_path, patterns) ||
          matchesUrlPatterns(frame.filename, patterns),
      ),
    ) ?? false
  );
}

function isFundingChoicesFocusLoop(event: ErrorEvent): boolean {
  const isStackOverflow =
    event.exception?.values?.some(
      (ex) =>
        ex.type === "RangeError" &&
        /maximum call stack size exceeded/i.test(ex.value ?? ""),
    ) ?? false;
  return (
    isStackOverflow &&
    hasStackFrameMatching(event, [FUNDING_CHOICES_SCRIPT_URL])
  );
}

/**
 * Client-specific beforeSend handler.
 * Browser runtime expects ErrorEvent type.
 */
export function beforeSendClient(
  event: ErrorEvent,
  hint: EventHint,
): ErrorEvent | null {
  // Sentry's eventFiltersIntegration(denyUrls) only checks the last (innermost)
  // non-native frame, so extension-wrapped fetch calls whose innermost frame is
  // our own bundle slip through. Check every stack frame instead.
  if (hasStackFrameMatching(event, SENTRY_DENY_URLS)) {
    return null;
  }
  // Third-party focus-trap recursion inside Google Funding Choices scripts on iOS.
  if (isFundingChoicesFocusLoop(event)) {
    return null;
  }
  return beforeSend(event, hint) as ErrorEvent | null;
}

/**
 * Server-specific beforeSend handler.
 * Node runtime expects ErrorEvent type in v10.27.0+.
 */
export function beforeSendServer(
  event: ErrorEvent,
  hint: EventHint,
): ErrorEvent | null {
  return beforeSend(event, hint) as ErrorEvent | null;
}

/**
 * Edge-specific beforeSend handler.
 * Edge runtime requires ErrorEvent type specifically.
 */
export function beforeSendEdge(
  event: ErrorEvent,
  hint: EventHint,
): ErrorEvent | null {
  return beforeSend(event, hint) as ErrorEvent | null;
}

