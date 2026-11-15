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
  "profile_edit_cta",
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

/** Paid flows that report GA4 ecommerce events (`begin_checkout`, `purchase`). */
export type CheckoutFlow = "promote" | "sponsor";

/** GA4 ecommerce item. `price` is in currency units (e.g. 5.5), not cents. */
export interface CheckoutAnalyticsItem {
  item_id: string;
  item_name: string;
  item_category: string;
  item_variant?: string;
  price: number;
  quantity: number;
}

/** Amount Stripe actually charged, in currency units (after promotion codes). */
export interface CheckoutAmount {
  value: number;
  currency: string;
}

/**
 * Checkout saved in sessionStorage before the Stripe redirect. The tab keeps
 * it across the round trip, so the return page can report `purchase` with
 * the same value and items as `begin_checkout`.
 */
export interface PendingCheckout {
  flow: CheckoutFlow;
  transactionId: string;
  currency: string;
  value: number;
  items: CheckoutAnalyticsItem[];
}
