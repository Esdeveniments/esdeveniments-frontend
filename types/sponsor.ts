/**
 * Sponsor banner types for the self-service advertising system.
 * @see /strategy-pricing.md for full system documentation
 */

/**
 * Geographic scope for sponsor visibility
 * - town: Single town/city (e.g., "mataro")
 * - region: Comarca (e.g., "maresme")
 * - country: All of Catalunya (homepage)
 */
export type GeoScope = "town" | "region" | "country";

/**
 * Valid geo scope values for runtime validation
 * Co-located with GeoScope type for consistency
 */
export const VALID_GEO_SCOPES: readonly GeoScope[] = [
  "town",
  "region",
  "country",
] as const;

/**
 * Duration options for sponsor packages - SINGLE SOURCE OF TRUTH
 * To add/remove durations: edit this object only (+ BASE_PRICES_CENTS + translations)
 * MVP: Removed 3-day option (low margin, high friction)
 */
export const DURATION_DAYS = {
  "7days": 7,
  "14days": 14,
  "30days": 30,
} as const;

/**
 * Duration type derived from DURATION_DAYS keys
 */
export type SponsorDuration = keyof typeof DURATION_DAYS;

/**
 * Get all available duration keys (for iteration)
 */
export const SPONSOR_DURATIONS = Object.keys(
  DURATION_DAYS,
) as SponsorDuration[];

/**
 * Which duration is marked as "popular" in the UI
 */
export const POPULAR_DURATION: SponsorDuration = "7days";

/**
 * Pricing plan for display in UI
 */
export interface PricingPlan {
  duration: SponsorDuration;
  popular: boolean;
}

/**
 * Configuration for a single sponsor.
 * Stored in config/sponsors.ts and filtered by date + place at runtime.
 */
export interface SponsorConfig {
  /** Business or sponsor name (for internal reference) */
  businessName: string;
  /** External image URL provided by sponsor */
  imageUrl: string;
  /** Target URL when banner is clicked */
  targetUrl: string;
  /** Place slugs where this sponsor should appear (e.g., ["mataro"] or ["maresme"] or ["catalunya"]) */
  places: string[];
  /** Geographic scope for pricing reference */
  geoScope: GeoScope;
  /** Start date (inclusive) in YYYY-MM-DD format */
  startDate: string;
  /** End date (inclusive) in YYYY-MM-DD format */
  endDate: string;
}

/**
 * Active sponsor returned by getActiveSponsorForPlace.
 * Same as SponsorConfig but guaranteed to be within date range.
 */
export type ActiveSponsor = SponsorConfig;

/**
 * Configuration for a self-promotional house ad.
 * Shown when no paid sponsor exists to demonstrate the ad slot.
 *
 * Currently only "text" type: CSS-rendered banner with i18n headline/subtitle,
 * links to /patrocina.
 */
export type HouseAdType = "text";

/**
 * Base fields shared by all house ad types.
 */
interface HouseAdBase {
  /** Unique identifier for analytics tracking */
  id: string;
  /** House ad type */
  type: HouseAdType;
}

/**
 * Text-based house ad — rendered with CSS, no image required.
 * Always links to /patrocina.
 */
export interface TextHouseAdConfig extends HouseAdBase {
  type: "text";
  /** i18n key suffix for headline (resolved via Sponsor.houseAd.{headlineKey}) */
  headlineKey: string;
  /** i18n key suffix for subtitle (resolved via Sponsor.houseAd.{subtitleKey}) */
  subtitleKey: string;
}

/** Union type for all house ad configurations */
export type HouseAdConfig = TextHouseAdConfig;

/**
 * Result from getHouseAdForSlot — either a house ad or null (show empty state CTA).
 */
export interface HouseAdResult {
  houseAd: HouseAdConfig;
}

/**
 * Props for TextHouseAd client component
 */
export interface TextHouseAdProps {
  /** The text house ad configuration */
  houseAd: TextHouseAdConfig;
  /** Current place for analytics */
  place: string;
}

/**
 * Props for SponsorBanner client component.
 * Used for both paid sponsors and venue house ads (visually identical).
 */
export interface SponsorBannerProps {
  sponsor: ActiveSponsor;
  /** Current place where banner is displayed (for accurate analytics) */
  place: string;
}

/**
 * Props for SponsorBannerSlot server component
 */
export interface SponsorBannerSlotProps {
  place: string;
  /**
   * Fallback places to check if primary place has no sponsor.
   * Used for cascade logic: town → region → country.
   * On event pages: [regionSlug, "catalunya"] allows region/country sponsors
   * to appear when no town sponsor exists.
   */
  fallbackPlaces?: string[];
}

/**
 * Place option for sponsor place selector
 */
export interface PlaceOption {
  slug: string;
  name: string;
  type: GeoScope;
}

/**
 * Props for PlaceSelector component
 */
export interface PlaceSelectorProps {
  onPlaceSelect: (place: PlaceOption | null) => void;
  selectedPlace: PlaceOption | null;
}

/**
 * Place selection for sponsor checkout (simplified for API/button)
 */
export interface SponsorPlace {
  slug: string;
  name: string;
  geoScope: GeoScope;
}

/**
 * Props for CheckoutButton client component
 */
export interface CheckoutButtonProps {
  duration: SponsorDuration;
  popular?: boolean;
  place?: SponsorPlace | null;
}

/**
 * Request body for sponsor checkout API
 */
export interface SponsorCheckoutRequest {
  duration: SponsorDuration;
  locale?: string;
  /** Place slug where sponsor will appear (required) */
  place: string;
  /** Human-readable place name (required) */
  placeName: string;
  geoScope?: GeoScope;
}

/**
 * Response from Stripe Checkout Session creation
 */
export interface StripeCheckoutSessionResponse {
  id: string;
  url: string;
}

/**
 * Result from sponsor image upload
 */
export interface SponsorImageUploadResult {
  success: boolean;
  url?: string;
  publicId?: string;
  metadataSaved?: boolean;
  paymentIntentMetadataSaved?: boolean;
  error?: string;
}

/**
 * Validation result for sponsor banner image dimensions.
 * Used for client-side soft validation (warning, not blocking).
 */
export interface SponsorImageValidation {
  /** Whether the image meets all recommendations */
  isOptimal: boolean;
  /** Specific warnings for the user */
  warnings: SponsorImageWarning[];
  /** Actual image dimensions */
  width: number;
  height: number;
  /** Calculated aspect ratio */
  aspectRatio: number;
}

/**
 * Individual warning about sponsor image dimensions
 */
export interface SponsorImageWarning {
  /** Warning type for translation key mapping */
  type: "tooSmall" | "tooTall" | "tooWide" | "wrongRatio";
  /** Additional context for the warning message */
  context?: Record<string, string | number>;
}

/**
 * Stripe webhook event structure
 */
export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: StripeWebhookCheckoutSession | StripeWebhookPaymentIntent;
  };
}

/**
 * Stripe Checkout Session from webhook payload
 */
export interface StripeWebhookCheckoutSession {
  id: string;
  object: "checkout.session";
  payment_intent: string | null;
  payment_status: string;
  status: string;
  metadata: Record<string, string>;
  custom_fields?: Array<{
    key: string;
    text?: { value: string | null };
    dropdown?: { value: string | null };
    numeric?: { value: string | null };
  }>;
  customer_details?: {
    email: string | null;
    name: string | null;
  };
  amount_total: number;
  currency: string;
}

/**
 * Stripe Payment Intent from webhook payload
 */
export interface StripeWebhookPaymentIntent {
  id: string;
  object: "payment_intent";
  metadata: Record<string, string>;
  amount: number;
  currency: string;
  status: string;
}

/**
 * Options for Stripe webhook signature verification
 */
export interface VerifySignatureOptions {
  /** Tolerance in seconds for timestamp validation. Default: 300 (5 min) */
  toleranceSeconds?: number;
  /** Current timestamp for testing. Default: Date.now() / 1000 */
  currentTimestamp?: number;
}

/**
 * Result of Stripe webhook signature verification
 */
export interface SignatureVerificationResult {
  valid: boolean;
  error?: string;
  timestamp?: number;
}

/**
 * Parsed components from the Stripe signature header.
 * Supports multiple v1 signatures (Stripe sends multiple during secret rotation).
 */
export interface ParsedSignatureHeader {
  timestamp: string | undefined;
  v1Signatures: string[];
}

// ═══════════════════════════════════════════════════════════════════
// DATABASE TYPES — Turso/libSQL sponsor persistence
// ═══════════════════════════════════════════════════════════════════

/**
 * Sponsor status in the database.
 * - pending_image: Payment confirmed, waiting for image upload
 * - active: Fully configured and visible to users
 * - expired: Past end date (auto-expired by query filters)
 * - cancelled: Manually cancelled or refunded
 */
export type SponsorStatus =
  | "pending_image"
  | "active"
  | "expired"
  | "cancelled";

/**
 * Raw sponsor row from the database.
 * Column names use snake_case matching the SQL schema.
 */
export interface DbSponsorRow {
  id: string;
  business_name: string;
  image_url: string | null;
  target_url: string | null;
  places: string; // JSON array string, e.g. '["barcelona","gracia"]'
  geo_scope: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  status: string;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  customer_email: string | null;
  amount_paid: number | null;
  currency: string | null;
  duration: string | null;
  duration_days: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * Input for creating a new sponsor in the database.
 * Used by the Stripe webhook handler after successful payment.
 */
export interface CreateSponsorInput {
  businessName: string;
  imageUrl?: string | null;
  targetUrl?: string | null;
  places: string[];
  geoScope: GeoScope;
  startDate: string;
  endDate: string;
  status?: SponsorStatus;
  stripeSessionId?: string | null;
  stripePaymentIntentId?: string | null;
  customerEmail?: string | null;
  amountPaid?: number | null;
  currency?: string | null;
  duration?: string | null;
  durationDays?: number | null;
}
