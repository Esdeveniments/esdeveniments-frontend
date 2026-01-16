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
  DURATION_DAYS
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
 * Props for SponsorBanner client component
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
