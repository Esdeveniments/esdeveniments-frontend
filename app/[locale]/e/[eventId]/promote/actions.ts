"use server";
import {
  createPromotionCheckout,
  isStripeCheckoutUrl,
} from "@lib/api/promotions";
import { getValidAccessToken } from "@utils/auth-cookies";
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

/**
 * Refreshes an expired or rejected access token. Server Components can't
 * persist the new cookies, so RefreshSession calls this from the browser and
 * re-renders. Always refreshes: the render that asked for it already failed
 * with whatever token the cookie holds.
 */
export async function refreshSessionAction(): Promise<boolean> {
  return Boolean(await getValidAccessToken({ forceRefresh: true }));
}
