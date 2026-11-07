"use client";

import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { DISPLAY_PRICES_EUR } from "@config/pricing";
import { sendGoogleEvent } from "@utils/analytics";
import {
  savePendingCheckout,
  trackBeginCheckout,
} from "@utils/checkout-analytics";
import type { CheckoutAnalyticsItem } from "types/analytics";
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
  // Ref-based guard prevents race condition where rapid clicks trigger multiple fetches
  // before React re-renders with isLoading=true (per AGENTS.md React Hooks Best Practices)
  const isSubmittingRef = useRef(false);

  const handleCheckout = async () => {
    if (isSubmittingRef.current || !place) return;
    isSubmittingRef.current = true;

    setIsLoading(true);
    setError(null);

    const analyticsItem: CheckoutAnalyticsItem = {
      item_id: `sponsor_${place.geoScope}_${duration}`,
      item_name: `sponsor_${place.geoScope}_${duration}`,
      item_category: "sponsor",
      item_variant: place.geoScope,
      price: DISPLAY_PRICES_EUR[place.geoScope][duration],
      quantity: 1,
    };
    trackBeginCheckout("sponsor", "EUR", analyticsItem);
    let failureReason = "network";

    try {
      // Generate UUID per click — Stripe recommends V4 UUIDs for idempotency keys.
      // Protects against network retries (double-click) while allowing intentional
      // retries (back + try again) to create fresh sessions, per Stripe docs:
      // "We recommend creating a new Session each time your customer attempts to pay."
      const idempotencyKey = crypto.randomUUID();

      const response = await fetch("/api/sponsors/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
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
        failureReason = `http_${response.status}`;
        throw new Error(`Failed to create checkout session: ${response.status}`);
      }

      const { url, sessionId } = await response.json();

      if (!url || typeof url !== "string") {
        failureReason = "invalid_url";
        throw new Error("Invalid checkout URL received from API");
      }

      if (typeof sessionId === "string" && sessionId) {
        savePendingCheckout({
          flow: "sponsor",
          transactionId: sessionId,
          currency: "EUR",
          value: analyticsItem.price,
          items: [analyticsItem],
        });
      }

      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (err) {
      console.error("Checkout error:", err);
      sendGoogleEvent("sponsor_checkout_error", {
        geo_scope: place.geoScope,
        duration,
        reason: failureReason,
      });
      setError(t("checkout.error"));
      setIsLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const isDisabled = isLoading || !place;

  return (
    <div className="w-full">
      <button
        onClick={handleCheckout}
        disabled={isDisabled}
        className={`w-full ${popular ? "btn-primary" : "btn-outline"}`}
      >
        {isLoading ? t("checkout.processing") : t("pricing.cta")}
      </button>
      {error && (
        <p className="text-sm text-error-dark mt-2 text-center">{error}</p>
      )}
    </div>
  );
}
