/**
 * Sets GA4 user properties once per session: is_returning, referrer_category,
 * preferred_locale, device_class.
 *
 * Retries until `window.gtag` is available (capped at ~10 seconds). Safe
 * under SSR and in browsers without localStorage (graceful fallbacks).
 *
 * Storage key `ed_first_seen` follows the same localStorage pattern used by
 * `SocialFollowPopup.tsx` — try/catch, JSON-free scalar for resilience.
 */
import type { WindowWithGtag } from "types/common";
import type { AnalyticsUserProperties } from "types/analytics";

const FIRST_SEEN_KEY = "ed_first_seen";
const MAX_ATTEMPTS = 40;
const RETRY_DELAY_MS = 250;

function detectReturning(): "true" | "false" {
  try {
    const existing = localStorage.getItem(FIRST_SEEN_KEY);
    if (existing) return "true";
    localStorage.setItem(FIRST_SEEN_KEY, String(Date.now()));
    return "false";
  } catch {
    return "false";
  }
}

// Search-engine brand labels. Matched as whole hostname segments so
// `mygooglesite.com` is NOT classified as organic — only hosts where the
// label appears between dots (google.com, www.bing.co.uk) qualify.
const ORGANIC_LABELS = [
  "google",
  "bing",
  "duckduckgo",
  "yahoo",
  "ecosia",
  "qwant",
];

// Social-media hostnames matched by exact suffix (so `evil-facebook.com` is
// NOT misclassified but `m.facebook.com` is).
const SOCIAL_SUFFIXES = [
  "facebook.com",
  "fb.com",
  "instagram.com",
  "twitter.com",
  "x.com",
  "t.co",
  "linkedin.com",
  "tiktok.com",
  "threads.net",
  "telegram.org",
  "t.me",
  "whatsapp.com",
  "reddit.com",
  "mastodon.social",
];

// AI-assistant hostnames — checked BEFORE organic because Gemini and Bard
// live on google.com subdomains, which would otherwise match the organic
// "google" label.
const AI_SUFFIXES = [
  "openai.com",
  "chatgpt.com",
  "claude.ai",
  "perplexity.ai",
  "gemini.google.com",
  "bard.google.com",
  "copilot.microsoft.com",
  "copilot.com",
  "poe.com",
  "meta.ai",
  "grok.com",
  "mistral.ai",
  "you.com",
  "phind.com",
  "character.ai",
];

function hostEndsWith(host: string, suffix: string): boolean {
  return host === suffix || host.endsWith("." + suffix);
}

function hostContainsLabel(host: string, label: string): boolean {
  return host.split(".").some((part) => part === label);
}

function detectReferrerCategory(): AnalyticsUserProperties["referrer_category"] {
  if (typeof document === "undefined") return "other";
  const ref = document.referrer;
  if (!ref) return "direct";

  try {
    const host = new URL(ref).hostname.toLowerCase();
    if (AI_SUFFIXES.some((s) => hostEndsWith(host, s))) return "ai";
    if (SOCIAL_SUFFIXES.some((s) => hostEndsWith(host, s))) return "social";
    if (ORGANIC_LABELS.some((l) => hostContainsLabel(host, l))) return "organic";
    return "other";
  } catch {
    return "other";
  }
}

function detectDeviceClass(): AnalyticsUserProperties["device_class"] {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth;
  if (w < 768) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

// Track the last-applied locale instead of a boolean so mid-session locale
// switches (ca → es → en) re-set `preferred_locale` on GA4 rather than
// silently retaining the original.
let appliedForLocale: string | null = null;
// Cancellation token: increments on each new call to invalidate stale retries.
let currentAttemptId = 0;

export function setUserProperties(locale: string, attempt = 0): void {
  if (appliedForLocale === locale) return;
  if (typeof window === "undefined") return;
  if (attempt > MAX_ATTEMPTS) return;

  // On a fresh call (attempt 0), bump the token so any pending retries from
  // a previous locale become stale and self-cancel.
  const myId = attempt === 0 ? ++currentAttemptId : currentAttemptId;

  const gtagWindow = window as unknown as Partial<WindowWithGtag>;
  if (typeof gtagWindow.gtag !== "function") {
    setTimeout(() => {
      // Stale retry — a newer setUserProperties call has been made.
      if (myId !== currentAttemptId) return;
      setUserProperties(locale, attempt + 1);
    }, RETRY_DELAY_MS);
    return;
  }

  const props: AnalyticsUserProperties = {
    is_returning: detectReturning(),
    referrer_category: detectReferrerCategory(),
    preferred_locale: locale,
    device_class: detectDeviceClass(),
  };

  gtagWindow.gtag("set", "user_properties", props);
  // Mark applied only after gtag succeeds — if it threw, retries can re-attempt.
  appliedForLocale = locale;

  // Fire a one-time-per-session custom event when the referrer is an AI
  // assistant. user_properties alone don't support funnel/key-event analysis
  // in GA4 — a custom event with the referrer domain lets us segment AI
  // traffic per-source. sessionStorage dedupes across page navigations.
  if (props.referrer_category === "ai") {
    try {
      if (!sessionStorage.getItem("ai_referrer_fired")) {
        const host = new URL(document.referrer).hostname.toLowerCase();
        gtagWindow.gtag("event", "ai_referrer", { referrer_domain: host });
        sessionStorage.setItem("ai_referrer_fired", "1");
      }
    } catch {
      // sessionStorage throws in Safari private mode / storage-disabled
      // contexts; referrer URL may also be malformed. Silent fallback is
      // intentional — analytics loss is acceptable, page must not break.
    }
  }
}
