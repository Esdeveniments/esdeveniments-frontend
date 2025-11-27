import { describe, it, expect } from "vitest";
import {
  getPricingConfig,
  getAvailableDurations,
  getAvailableGeoScopes,
  isPricingAvailable,
  GeoScopeType,
} from "../config/pricing";

describe("Restaurant Promotion Pricing", () => {
  it("should return pricing config for valid combinations", () => {
    const pricing = getPricingConfig(3, "town");
    expect(pricing).toBeDefined();
    expect(pricing?.currency).toBe("eur");
    expect(pricing?.unitAmount).toBeGreaterThan(0);
    expect(pricing?.taxMode).toMatch(/^(automatic|manual)$/);
  });

  it("should return null for invalid combinations", () => {
    const pricing = getPricingConfig(999, "town" as GeoScopeType);
    expect(pricing).toBeNull();
  });

  it("should return available durations", () => {
    const durations = getAvailableDurations();
    expect(durations).toBeInstanceOf(Array);
    expect(durations.length).toBeGreaterThan(0);
    expect(durations).toContain(1);
    expect(durations).toContain(3);
    expect(durations).toContain(5);
  });

  it("should return available geo scopes", () => {
    const geoScopes = getAvailableGeoScopes();
    expect(geoScopes).toBeInstanceOf(Array);
    expect(geoScopes).toContain("town");
    expect(geoScopes).toContain("region");
  });

  it("should validate pricing availability", () => {
    expect(isPricingAvailable(3, "town")).toBe(true);
    expect(isPricingAvailable(5, "region")).toBe(true);
    expect(isPricingAvailable(999, "town")).toBe(false);
  });

  it("should have consistent pricing structure", () => {
    const durations = getAvailableDurations();
    const geoScopes = getAvailableGeoScopes();

    durations.forEach((duration) => {
      geoScopes.forEach((geoScope) => {
        const pricing = getPricingConfig(duration, geoScope);
        if (pricing) {
          expect(pricing.currency).toBeDefined();
          expect(pricing.unitAmount).toBeGreaterThan(0);
          expect(pricing.taxMode).toMatch(/^(automatic|manual)$/);

          if (pricing.taxMode === "manual") {
            expect(pricing.manualTaxRateIds).toBeDefined();
          }
        }
      });
    });
  });
});
