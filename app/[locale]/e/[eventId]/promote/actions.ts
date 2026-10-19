"use server";
import {
  createPromotionCheckout,
  isStripeCheckoutUrl,
} from "@lib/api/promotions";
import type { PromotionResult } from "types/api/promotion";

/**
 * Starts (or resumes, for a repeated idempotency key) a Stripe checkout for
 * one promotion option. The backend enforces ownership (NOT_EVENT_OWNER).
 */
export async function createPromotionCheckoutAction(
  eventId: string,
  optionId: string,
  idempotencyKey: string,
): Promise<PromotionResult<{ url: string }>> {
  const result = await createPromotionCheckout(eventId, optionId, idempotencyKey);
  if (!result.ok) return result;
  if (!isStripeCheckoutUrl(result.data.url)) {
    return { ok: false, code: "CHECKOUT_UNAVAILABLE" };
  }
  return { ok: true, data: { url: result.data.url } };
}
