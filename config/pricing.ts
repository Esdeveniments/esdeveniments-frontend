/**
 * Server-side pricing configuration for restaurant promotions
 * Loads pricing matrix from environment variables or database
 * No hardcoded prices - all values must come from configuration
 */

import {
  VALID_GEO_SCOPES,
  DURATION_DAYS,
  type GeoScope,
  type SponsorDuration,
} from "types/sponsor";

/**
 * @deprecated Use GeoScope from types/sponsor.ts instead
 * Kept for backward compatibility with existing code
 */
export type GeoScopeType = GeoScope;
export type TaxMode = "automatic" | "manual";

export interface PricingConfig {
  currency: string;
  unitAmount: number; // Amount in cents
  taxMode: TaxMode;
  manualTaxRateIds?: string[]; // Stripe tax rate IDs for manual mode
}

export type PricingKey = `${number}:${GeoScopeType}`;

export interface PricingMatrix {
  [key: PricingKey]: PricingConfig;
}

// Derived from DURATION_DAYS (single source of truth in types/sponsor.ts)
const AVAILABLE_DURATIONS = Object.values(DURATION_DAYS) as readonly number[];

// Base pricing in cents - single source of truth
// Must be defined before loadPricingFromEnv to avoid TDZ error
// MVP pricing: €5-40 range, focused on exclusivity value
export const BASE_PRICES_CENTS = {
  town: { 7: 500, 14: 800, 30: 1500 },
  region: { 7: 1000, 14: 1500, 30: 2500 },
  country: { 7: 1500, 14: 2500, 30: 4000 },
} as const;

/**
 * Load pricing configuration from environment variables
 * In production, this should be loaded from a database or admin config
 *
 * Pricing based on Wallapop benchmark (€1.25-2.50 for 7 days)
 * Slightly higher because our audience is intent-driven (actively searching for events)
 */
function loadPricingFromEnv(): PricingMatrix {
  const matrix: PricingMatrix = {};

  // Use centralized constants
  const durations = AVAILABLE_DURATIONS;
  const geoScopes = VALID_GEO_SCOPES;

  // Tax configuration
  const taxMode = (process.env.STRIPE_TAX_MODE as TaxMode) || "automatic";
  const manualTaxRateIds =
    process.env.STRIPE_MANUAL_TAX_RATE_IDS?.split(",") || [];
  const currency = process.env.STRIPE_CURRENCY || "eur";

  // Build pricing matrix
  durations.forEach((duration) => {
    geoScopes.forEach((geoScope) => {
      const key: PricingKey = `${duration}:${geoScope}`;
      const basePrice =
        BASE_PRICES_CENTS[geoScope][
          duration as keyof (typeof BASE_PRICES_CENTS)[typeof geoScope]
        ];

      if (basePrice) {
        matrix[key] = {
          currency,
          unitAmount: basePrice,
          taxMode,
          manualTaxRateIds: taxMode === "manual" ? manualTaxRateIds : undefined,
        };
      }
    });
  });

  return matrix;
}

/**
 * Get pricing configuration for a specific duration and geo scope
 */
export function getPricingConfig(
  durationDays: number,
  geoScopeType: GeoScopeType
): PricingConfig | null {
  const matrix = loadPricingFromEnv();
  const key: PricingKey = `${durationDays}:${geoScopeType}`;
  return matrix[key] || null;
}

/**
 * Get all available duration options
 */
export function getAvailableDurations(): readonly number[] {
  return AVAILABLE_DURATIONS;
}

/**
 * Get all available geo scope types
 */
export function getAvailableGeoScopes(): GeoScopeType[] {
  return [...VALID_GEO_SCOPES];
}

/**
 * Validate if a pricing combination is available
 */
export function isPricingAvailable(
  durationDays: number,
  geoScopeType: GeoScopeType
): boolean {
  return getPricingConfig(durationDays, geoScopeType) !== null;
}

/**
 * Get pricing matrix for admin/display purposes
 */
export function getPricingMatrix(): PricingMatrix {
  return loadPricingFromEnv();
}

/**
 * Build display prices for a geo scope from BASE_PRICES_CENTS
 */
function buildDisplayPricesForScope(
  scope: GeoScope
): Record<SponsorDuration, number> {
  const result = {} as Record<SponsorDuration, number>;
  for (const [durationKey, days] of Object.entries(DURATION_DAYS)) {
    const cents =
      BASE_PRICES_CENTS[scope][
        days as keyof (typeof BASE_PRICES_CENTS)[typeof scope]
      ];
    if (cents !== undefined) {
      result[durationKey as SponsorDuration] = cents / 100;
    }
  }
  return result;
}

/**
 * Display prices in EUR (for client-side rendering)
 * Auto-generated from DURATION_DAYS and BASE_PRICES_CENTS
 */
export const DISPLAY_PRICES_EUR: Record<
  GeoScope,
  Record<SponsorDuration, number>
> = {
  town: buildDisplayPricesForScope("town"),
  region: buildDisplayPricesForScope("region"),
  country: buildDisplayPricesForScope("country"),
};
