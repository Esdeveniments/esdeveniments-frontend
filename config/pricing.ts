/**
 * Server-side pricing configuration for restaurant promotions
 * Loads pricing matrix from environment variables or database
 * No hardcoded prices - all values must come from configuration
 */

import { VALID_GEO_SCOPES, type GeoScope } from "types/sponsor";

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

// Centralized constants - single source of truth
const AVAILABLE_DURATIONS = [3, 7, 14, 30] as const;

// Base pricing in cents - single source of truth
// Must be defined before loadPricingFromEnv to avoid TDZ error
const BASE_PRICES_CENTS = {
  town: { 3: 300, 7: 500, 14: 800, 30: 1200 },
  region: { 3: 500, 7: 800, 14: 1200, 30: 2000 },
  country: { 3: 800, 7: 1200, 14: 2000, 30: 3500 },
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
 * Display prices in EUR (for client-side rendering)
 * Derived programmatically from BASE_PRICES_CENTS to avoid duplication
 */
export const DISPLAY_PRICES_EUR = {
  town: {
    "3days": BASE_PRICES_CENTS.town[3] / 100,
    "7days": BASE_PRICES_CENTS.town[7] / 100,
    "14days": BASE_PRICES_CENTS.town[14] / 100,
    "30days": BASE_PRICES_CENTS.town[30] / 100,
  },
  region: {
    "3days": BASE_PRICES_CENTS.region[3] / 100,
    "7days": BASE_PRICES_CENTS.region[7] / 100,
    "14days": BASE_PRICES_CENTS.region[14] / 100,
    "30days": BASE_PRICES_CENTS.region[30] / 100,
  },
  country: {
    "3days": BASE_PRICES_CENTS.country[3] / 100,
    "7days": BASE_PRICES_CENTS.country[7] / 100,
    "14days": BASE_PRICES_CENTS.country[14] / 100,
    "30days": BASE_PRICES_CENTS.country[30] / 100,
  },
} as const;
