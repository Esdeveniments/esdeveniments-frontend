import { sendGoogleEvent } from "./analytics";
import type {
  CheckoutAmount,
  CheckoutAnalyticsItem,
  CheckoutFlow,
  PendingCheckout,
} from "types/analytics";

const PENDING_KEY_PREFIX = "ga_pending_checkout:";
const PURCHASE_SENT_KEY_PREFIX = "ga_purchase_sent:";

export const minorToMajor = (amountMinor: number): number =>
  Math.round(amountMinor) / 100;

/** GA4 `begin_checkout`, sent when the visitor asks for a Stripe checkout. */
export function trackBeginCheckout(
  flow: CheckoutFlow,
  currency: string,
  item: CheckoutAnalyticsItem,
): void {
  sendGoogleEvent("begin_checkout", {
    checkout_flow: flow,
    currency,
    value: item.price * item.quantity,
    items: [item],
  });
}

/** Saves the checkout right before the Stripe redirect (same tab). */
export function savePendingCheckout(checkout: PendingCheckout): void {
  try {
    sessionStorage.setItem(
      PENDING_KEY_PREFIX + checkout.flow,
      JSON.stringify(checkout),
    );
  } catch {
    // Storage can be disabled; purchase then goes out without value.
  }
}

function readPendingCheckout(
  flow: CheckoutFlow,
  transactionId: string,
): PendingCheckout | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY_PREFIX + flow);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const checkout = parsed as Partial<PendingCheckout>;
    if (
      checkout.flow !== flow ||
      checkout.transactionId !== transactionId ||
      typeof checkout.value !== "number" ||
      typeof checkout.currency !== "string" ||
      !Array.isArray(checkout.items)
    ) {
      return null;
    }
    return checkout as PendingCheckout;
  } catch {
    return null;
  }
}

/**
 * GA4 `purchase`, at most once per transaction in this browser. Returns true
 * when the event was sent. With `requirePending`, it is sent only when this
 * tab saved a matching checkout, so a pasted or reloaded return URL can't
 * report revenue. A server-verified `amount` replaces the saved list price
 * (promotion codes) and makes `requirePending` unnecessary.
 */
export function trackPurchase(
  flow: CheckoutFlow,
  transactionId: string,
  {
    requirePending = false,
    amount = null,
  }: { requirePending?: boolean; amount?: CheckoutAmount | null } = {},
): boolean {
  if (!transactionId) return false;
  const sentKey = PURCHASE_SENT_KEY_PREFIX + transactionId;
  try {
    if (localStorage.getItem(sentKey)) return false;
  } catch {
    // Without storage GA still dedupes purchases by transaction_id.
  }

  const pending = readPendingCheckout(flow, transactionId);
  if (requirePending && !pending && !amount) return false;

  const items = pending?.items;
  sendGoogleEvent("purchase", {
    checkout_flow: flow,
    transaction_id: transactionId,
    ...(amount
      ? {
          currency: amount.currency,
          value: amount.value,
          // A single item carries the whole (possibly discounted) charge.
          ...(items && {
            items:
              items.length === 1
                ? [{ ...items[0], price: amount.value / items[0].quantity }]
                : items,
          }),
        }
      : pending && {
          currency: pending.currency,
          value: pending.value,
          items: pending.items,
        }),
  });

  try {
    localStorage.setItem(sentKey, "1");
    sessionStorage.removeItem(PENDING_KEY_PREFIX + flow);
  } catch {
    // Ignore: see above.
  }
  return true;
}
