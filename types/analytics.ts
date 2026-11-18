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

/**
 * A listing card seen on screen, as a GA4 `view_item_list` item: the event
 * id, its first category, its town (else region) and its slot (1-based).
 */
export interface ListingImpressionItem {
  item_id: string;
  item_category?: string;
  item_category2?: string;
  index: number;
}

/** A listing card where the visitor paused well above their page median. */
export interface CardStopItem extends ListingImpressionItem {
  dwell_ms: number;
}

/** Accumulated visible dwell for one carousel card on the current page. */
export interface CarouselDwellEntry {
  listName: string;
  placeSlug?: string;
  categorySlug?: string;
  item: ListingImpressionItem;
  dwellMs: number;
}

/** Callbacks for `observeCardVisibility`. */
export interface CardVisibilityCallbacks {
  /** Fired right when cards are newly seen (e.g. scroll-depth milestones). */
  onSeenProgress?: (seenCards: ReadonlySet<Element>, visibleCards: Element[]) => void;
  /** Fired after the 2s debounce (or on hide/unmount) with newly seen cards. */
  onFlushImpressions: (
    seenCardCount: number,
    items: ListingImpressionItem[],
    totalVisibleCards: number,
  ) => void;
  /** Fired whenever an active-tab visibility span ends on an event card. */
  onCardDwell: (item: ListingImpressionItem, elapsedMs: number) => void;
  /** Fired after dwell timers pause on tab hide, pagehide, or unmount. */
  onFlushStops?: () => void;
}

export interface ObservedCardController {
  pauseAll: (now: number) => void;
  disconnect: () => void;
}

/** Per-URL state for carousel impressions and pooled card stops. */
export interface CarouselPageBucket {
  seenItemIdsByList: Map<string, Set<string>>;
  dwellPoolByKey: Map<string, CarouselDwellEntry>;
  reportedStopKeys: Set<string>;
  cappedStopDwellByKey: Map<string, number>;
  activePauseHandlers: Set<(now: number) => void>;
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
