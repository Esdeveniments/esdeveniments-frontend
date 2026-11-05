import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("lib/stripe/api", () => ({ fetchCheckoutSession: vi.fn() }));

import { fetchCheckoutSession } from "lib/stripe/api";
import { getSponsorAmountPaid } from "lib/stripe/session";

const mockFetch = vi.mocked(fetchCheckoutSession);
const paidSponsor = {
  payment_status: "paid",
  metadata: { product: "sponsor_banner" },
  amount_total: 750,
  currency: "eur",
};

beforeEach(() => {
  mockFetch.mockReset();
});

describe("getSponsorAmountPaid", () => {
  it("returns what Stripe charged, in currency units", async () => {
    mockFetch.mockResolvedValue(paidSponsor);
    await expect(getSponsorAmountPaid("cs_test_abc")).resolves.toEqual({
      value: 7.5,
      currency: "EUR",
    });
  });

  it("returns null for unpaid or non-sponsor sessions", async () => {
    mockFetch.mockResolvedValueOnce({ ...paidSponsor, payment_status: "unpaid" });
    await expect(getSponsorAmountPaid("cs_test_abc")).resolves.toBeNull();
    mockFetch.mockResolvedValueOnce({ ...paidSponsor, metadata: {} });
    await expect(getSponsorAmountPaid("cs_test_abc")).resolves.toBeNull();
  });

  it("skips Stripe for malformed ids and swallows Stripe errors", async () => {
    await expect(getSponsorAmountPaid("../v1/customers")).resolves.toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
    mockFetch.mockRejectedValue(new Error("Stripe session fetch failed: 404"));
    await expect(getSponsorAmountPaid("cs_test_missing")).resolves.toBeNull();
  });
});
