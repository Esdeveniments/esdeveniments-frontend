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
 * Duration options for sponsor packages
 */
export type SponsorDuration = "3days" | "7days" | "14days" | "30days";

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
  place?: string;
  placeName?: string;
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
