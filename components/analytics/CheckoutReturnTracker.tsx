"use client";

import { useEffect, useRef } from "react";
import { ensureGtag, sendGoogleEvent } from "@utils/analytics";
import { trackPurchase } from "@utils/checkout-analytics";
import type { CheckoutReturnTrackerProps } from "types/props";

/**
 * Reports the Stripe return once per page view (`<flow>_checkout_return`)
 * and GA4 `purchase` once the payment is confirmed.
 */
export default function CheckoutReturnTracker({
  flow,
  outcome,
  transactionId,
  paid,
  requirePending = false,
  amount = null,
  params,
}: CheckoutReturnTrackerProps) {
  const returnTrackedRef = useRef(false);

  useEffect(() => {
    if (returnTrackedRef.current) return;
    returnTrackedRef.current = true;
    // Stripe returns with a hard navigation, before the lazyOnload gtag shim.
    ensureGtag();
    sendGoogleEvent(`${flow}_checkout_return`, { ...params, outcome, paid });
  }, [flow, outcome, paid, params]);

  // Separate from the return event: "refresh status" re-renders this page in
  // place, so a PENDING order that turns PAID must still report the purchase.
  // trackPurchase dedupes by transaction id.
  useEffect(() => {
    if (!paid || !transactionId) return;
    ensureGtag();
    trackPurchase(flow, transactionId, { requirePending, amount });
  }, [flow, paid, transactionId, requirePending, amount]);

  return null;
}
