"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { CheckoutButtonProps } from "types/sponsor";

/**
 * Client component that initiates Stripe Checkout for sponsor purchase.
 * Calls our API which creates a session via Stripe REST API.
 * Zero external dependencies (no @stripe/stripe-js).
 */
export default function CheckoutButton({
  duration,
  popular = false,
  place,
}: CheckoutButtonProps) {
  const t = useTranslations("Sponsorship");
  const locale = useLocale();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    if (!place) return; // Safety check

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/sponsors/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          duration,
          locale,
          place: place.slug,
          placeName: place.name,
          geoScope: place.geoScope,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        console.error("Checkout API error:", response.status, errorBody);
        throw new Error(`Failed to create checkout session: ${response.status}`);
      }

      const { url } = await response.json();

      if (!url || typeof url !== "string") {
        throw new Error("Invalid checkout URL received from API");
      }

      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (err) {
      console.error("Checkout error:", err);
      setError(t("checkout.error"));
      setIsLoading(false);
    }
  };

  const isDisabled = isLoading || !place;

  return (
    <div className="w-full">
      <button
        onClick={handleCheckout}
        disabled={isDisabled}
        className={`w-full text-center ${
          popular ? "btn-primary" : "btn-outline"
        } ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        {isLoading ? t("checkout.processing") : t("pricing.cta")}
      </button>
      {error && (
        <p className="text-sm text-red-500 mt-2 text-center">{error}</p>
      )}
    </div>
  );
}
