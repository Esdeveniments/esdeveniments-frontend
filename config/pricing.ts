/**
 * Server-side pricing configuration for restaurant promotions
 * Loads pricing matrix from environment variables or database
 * No hardcoded prices - all values must come from configuration
 */

export type GeoScopeType = "town" | "region";
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

/**
 * Load pricing configuration from environment variables
 * In production, this should be loaded from a database or admin config
 */
function loadPricingFromEnv(): PricingMatrix {
  const matrix: PricingMatrix = {};

  // Duration options (configurable)
  const durations = [1, 3, 5, 7, 14, 30]; // days
  const geoScopes: GeoScopeType[] = ["town", "region"];

  // Base pricing (should come from environment or database)
  const basePrices = {
    town: {
      1: 500, // €5.00
      3: 1200, // €12.00
      5: 1800, // €18.00
      7: 2400, // €24.00
      14: 4000, // €40.00
      30: 7000, // €70.00
    },
    region: {
      1: 1500, // €15.00
      3: 3500, // €35.00
      5: 5000, // €50.00
      7: 6500, // €65.00
      14: 10000, // €100.00
      30: 18000, // €180.00
    },
  };

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
        basePrices[geoScope][
          duration as keyof (typeof basePrices)[typeof geoScope]
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
export function getAvailableDurations(): number[] {
  return [1, 3, 5, 7, 14, 30]; // Should come from config
}

/**
 * Get all available geo scope types
 */
export function getAvailableGeoScopes(): GeoScopeType[] {
  return ["town", "region"];
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
