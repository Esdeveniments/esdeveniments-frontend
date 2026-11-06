/**
 * Readers for the untyped Stripe Checkout Session object returned by
 * fetchCheckoutSession.
 */
import type { CheckoutAmount } from "types/analytics";
import { fetchCheckoutSession } from "./api";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function getString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export function isPaidSession(session: unknown): boolean {
  if (!isRecord(session)) return false;
  const paymentStatus = getString(session.payment_status);
  const status = getString(session.status);
  // Stripe Checkout Session typically uses payment_status=paid when completed.
  // Some API versions also expose status=complete.
  return paymentStatus === "paid" || status === "complete";
}

export function isSponsorCheckoutSession(session: unknown): boolean {
  if (!isRecord(session)) return false;
  const metadata = session.metadata;
  if (!isRecord(metadata)) return false;
  return getString(metadata.product) === "sponsor_banner";
}

export function getPaymentIntentId(session: unknown): string | null {
  if (!isRecord(session)) return null;
  return getString(session.payment_intent);
}

const CHECKOUT_SESSION_ID = /^cs_[A-Za-z0-9_]{1,250}$/;
// Analytics only: give up quickly and fall back to the saved list price.
const AMOUNT_LOOKUP_TIMEOUT_MS = 3000;

/**
 * What a paid sponsor checkout actually charged (after promotion codes), or
 * null when the id is invalid, unpaid, not a sponsor checkout or Stripe fails.
 */
export async function getSponsorAmountPaid(
  sessionId: string,
): Promise<CheckoutAmount | null> {
  if (!CHECKOUT_SESSION_ID.test(sessionId)) return null;
  try {
    const session = await fetchCheckoutSession(
      sessionId,
      AMOUNT_LOOKUP_TIMEOUT_MS,
    );
    if (!isPaidSession(session) || !isSponsorCheckoutSession(session)) {
      return null;
    }
    if (!isRecord(session)) return null;
    const amountTotal = session.amount_total;
    const currency = getString(session.currency);
    if (typeof amountTotal !== "number" || !currency) return null;
    return { value: Math.round(amountTotal) / 100, currency: currency.toUpperCase() };
  } catch {
    return null;
  }
}
