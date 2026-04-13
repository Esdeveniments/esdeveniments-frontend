/**
 * Analytics types — shared across the new instrumentation layer.
 *
 * Event names referenced by CTA session tracking, web-vitals, user
 * properties, and the rage-click detector. These augment the existing
 * `sendGoogleEvent` call sites without changing its signature.
 */

/**
 * Stable identifiers for CTAs whose per-session impression + click counts
 * are batched into a single `cta_summary` event on page hide.
 */
export const TRACKED_CTA_IDS = [
  "hero_cta",
  "sticky_cta",
  "favorite_button",
  "add_to_calendar",
  "card_share",
] as const;

export type TrackedCtaId = (typeof TRACKED_CTA_IDS)[number];

/**
 * GA4 user properties set once per session. Values intentionally use string
 * literals to keep GA4 reports consistent.
 */
export interface AnalyticsUserProperties {
  is_returning: "true" | "false";
  referrer_category: "organic" | "direct" | "social" | "ai" | "other";
  preferred_locale: string;
  device_class: "mobile" | "tablet" | "desktop";
}

export type WebVitalsMetricName = "CLS" | "LCP" | "INP" | "FCP" | "TTFB";

export type WebVitalsRating = "good" | "needs-improvement" | "poor";

/**
 * Internal state tracked per CTA for the session — see `utils/ctaTracking.ts`.
 */
export interface CtaStats {
  impressions: number;
  clicks: number;
  firstInteractionMs?: number;
}
