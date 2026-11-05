import { describe, it, expect, beforeEach } from "vitest";
import {
  savePendingCheckout,
  trackBeginCheckout,
  trackPurchase,
} from "@utils/checkout-analytics";
import type { WindowWithGtag } from "types/common";
import type { CheckoutAnalyticsItem } from "types/analytics";

const item: CheckoutAnalyticsItem = {
  item_id: "opt-1",
  item_name: "promote_place_7d",
  item_category: "event_promotion",
  price: 9.99,
  quantity: 1,
};

function events(name: string): Record<string, unknown>[] {
  const layer = (window as unknown as WindowWithGtag).dataLayer ?? [];
  return layer
    .map((entry) => Array.from(entry as ArrayLike<unknown>))
    .filter((args) => args[0] === "event" && args[1] === name)
    .map((args) => args[2] as Record<string, unknown>);
}

beforeEach(() => {
  delete (window as unknown as { gtag?: unknown }).gtag;
  delete (window as unknown as { dataLayer?: unknown }).dataLayer;
  localStorage.clear();
  sessionStorage.clear();
});

describe("trackBeginCheckout", () => {
  it("sends value as price × quantity with the item", () => {
    trackBeginCheckout("promote", "EUR", { ...item, quantity: 2 });
    expect(events("begin_checkout")).toEqual([
      {
        checkout_flow: "promote",
        currency: "EUR",
        value: 19.98,
        items: [{ ...item, quantity: 2 }],
      },
    ]);
  });
});

describe("trackPurchase", () => {
  it("sends value and items from the matching pending checkout, once", () => {
    savePendingCheckout({
      flow: "promote",
      transactionId: "order-1",
      currency: "EUR",
      value: 9.99,
      items: [item],
    });

    expect(trackPurchase("promote", "order-1")).toBe(true);
    expect(trackPurchase("promote", "order-1")).toBe(false);

    expect(events("purchase")).toEqual([
      {
        checkout_flow: "promote",
        transaction_id: "order-1",
        currency: "EUR",
        value: 9.99,
        items: [item],
      },
    ]);
    expect(sessionStorage.getItem("ga_pending_checkout:promote")).toBeNull();
  });

  it("sends no value when the pending checkout is for another transaction", () => {
    savePendingCheckout({
      flow: "promote",
      transactionId: "order-old",
      currency: "EUR",
      value: 9.99,
      items: [item],
    });

    expect(trackPurchase("promote", "order-2")).toBe(true);
    expect(events("purchase")).toEqual([
      { checkout_flow: "promote", transaction_id: "order-2" },
    ]);
  });

  it("with requirePending, sends nothing without a matching checkout", () => {
    expect(trackPurchase("sponsor", "cs_test_1", { requirePending: true })).toBe(
      false,
    );
    expect(events("purchase")).toEqual([]);
  });

  it("uses the verified amount over the saved list price, even without a pending checkout", () => {
    savePendingCheckout({
      flow: "sponsor",
      transactionId: "cs_test_2",
      currency: "EUR",
      value: 15,
      items: [{ ...item, price: 15 }],
    });
    const amount = { value: 7.5, currency: "EUR" };

    expect(
      trackPurchase("sponsor", "cs_test_2", { requirePending: true, amount }),
    ).toBe(true);
    expect(
      trackPurchase("sponsor", "cs_test_3", { requirePending: true, amount }),
    ).toBe(true);

    expect(events("purchase")).toEqual([
      {
        checkout_flow: "sponsor",
        transaction_id: "cs_test_2",
        currency: "EUR",
        value: 7.5,
        items: [{ ...item, price: 7.5 }],
      },
      {
        checkout_flow: "sponsor",
        transaction_id: "cs_test_3",
        currency: "EUR",
        value: 7.5,
      },
    ]);
  });
});
