"use client";

import { useState, useMemo } from "react";
import PlaceSelector from "./PlaceSelector";
import CheckoutButton from "./CheckoutButton";
import { useTranslations } from "next-intl";
import { DISPLAY_PRICES_EUR } from "@config/pricing";
import type { PlaceOption, SponsorDuration, GeoScope } from "types/sponsor";
import { SPONSOR_DURATIONS, POPULAR_DURATION } from "types/sponsor";

// Use pricing from config (single source of truth)
const PRICES_BY_SCOPE = DISPLAY_PRICES_EUR;

// Default prices (town) as fallback
const DEFAULT_PRICES = PRICES_BY_SCOPE.town;

// Derived from SPONSOR_DURATIONS (single source of truth)
const DURATION_PLANS = SPONSOR_DURATIONS.map((duration) => ({
  duration,
  popular: duration === POPULAR_DURATION,
}));

/**
 * Get the geo scope from a place option
 */
function getGeoScope(place: PlaceOption | null): GeoScope {
  if (!place) return "town";
  return place.type;
}

/**
 * Get prices for a geo scope with fallback
 */
function getPricesForScope(scope: GeoScope): Record<SponsorDuration, number> {
  return PRICES_BY_SCOPE[scope] ?? DEFAULT_PRICES;
}

/**
 * Client component that manages place selection and displays pricing cards.
 * Prices update dynamically based on selected place type.
 */
export default function PricingSectionClient() {
  const t = useTranslations("Sponsorship");
  const [selectedPlace, setSelectedPlace] = useState<PlaceOption | null>(null);

  // Get current geo scope and prices with safe fallbacks
  const geoScope = getGeoScope(selectedPlace);
  const currentPrices = useMemo(() => getPricesForScope(geoScope), [geoScope]);

  /**
   * Get price for a duration with fallback
   */
  const getPrice = (duration: SponsorDuration): number => {
    return currentPrices[duration] ?? DEFAULT_PRICES[duration] ?? 0;
  };

  return (
    <div className="space-y-8">
      {/* Place Selector */}
      <div className="max-w-xl mx-auto">
        <PlaceSelector
          selectedPlace={selectedPlace}
          onPlaceSelect={setSelectedPlace}
        />
      </div>

      {/* Message when no place selected */}
      {!selectedPlace && (
        <p className="text-center body-normal text-foreground/60">
          {t("placeSelector.selectFirst")}
        </p>
      )}

      {/* Pricing cards */}
      <div
        className={`transition-opacity duration-200 ${selectedPlace ? "opacity-100" : "opacity-50 pointer-events-none"
          }`}
      >
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {DURATION_PLANS.map((plan) => (
            <div
              key={plan.duration}
              className={`card-bordered card-body relative ${plan.popular ? "ring-2 ring-primary" : ""
                }`}
            >
              {plan.popular && (
                <span className="badge-primary absolute -top-3 left-1/2 -translate-x-1/2 text-xs">
                  {t("pricing.popular")}
                </span>
              )}
              <h3 className="heading-4 mb-2">
                {t(`pricing.plans.${plan.duration}.name`)}
              </h3>
              <div className="mb-4">
                <span className="heading-2">€{getPrice(plan.duration)}</span>
              </div>
              <p className="body-small text-foreground/70 mb-6">
                {t(`pricing.plans.${plan.duration}.description`)}
              </p>
              <CheckoutButton
                duration={plan.duration}
                popular={plan.popular}
                place={selectedPlace ? {
                  slug: selectedPlace.slug,
                  name: selectedPlace.name,
                  geoScope: selectedPlace.type,
                } : null}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
