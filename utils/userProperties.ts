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

function detectReferrerCategory(): AnalyticsUserProperties["referrer_category"] {
  if (typeof document === "undefined") return "other";
  const ref = document.referrer;
  if (!ref) return "direct";

  try {
    const host = new URL(ref).hostname.toLowerCase();
    if (/(google|bing|duckduckgo|yahoo|ecosia|qwant)\./.test(host)) {
      return "organic";
    }
    if (
      /(facebook|instagram|twitter|x\.com|linkedin|tiktok|threads|telegram|whatsapp|t\.co|reddit|mastodon)/.test(
        host
      )
    ) {
      return "social";
    }
    if (
      /(chat\.openai|chatgpt|claude\.ai|perplexity|gemini\.google|copilot\.microsoft|poe\.com)/.test(
        host
      )
    ) {
      return "ai";
    }
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

let applied = false;

export function setUserProperties(locale: string, attempt = 0): void {
  if (applied) return;
  if (typeof window === "undefined") return;
  if (attempt > MAX_ATTEMPTS) return;

  const gtagWindow = window as unknown as Partial<WindowWithGtag>;
  if (typeof gtagWindow.gtag !== "function") {
    setTimeout(() => setUserProperties(locale, attempt + 1), RETRY_DELAY_MS);
    return;
  }

  applied = true;
  const props: AnalyticsUserProperties = {
    is_returning: detectReturning(),
    referrer_category: detectReferrerCategory(),
    preferred_locale: locale,
    device_class: detectDeviceClass(),
  };

  gtagWindow.gtag("set", "user_properties", props);
}
