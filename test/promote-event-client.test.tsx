import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PromoteEventClient from "../app/[locale]/e/[eventId]/promote/PromoteEventClient";
import type { PromotionOptionsDTO } from "types/api/promotion";

const mockCheckout = vi.fn();
vi.mock("../app/[locale]/e/[eventId]/promote/actions", () => ({
  createPromotionCheckoutAction: (...args: unknown[]) => mockCheckout(...args),
}));
vi.mock("@utils/analytics", () => ({
  sendGoogleEvent: vi.fn(),
  ensureGtag: vi.fn(),
}));

const catalog: PromotionOptionsDTO = {
  options: [
    {
      id: "city-7d",
      scope: "CITY",
      durationDays: 7,
      amountMinor: 699,
      currency: "EUR",
      taxIncluded: true,
      available: true,
      unavailableReason: null,
    },
  ],
  canPurchase: true,
  unavailableReason: null,
  cityId: 1,
  regionId: 2,
  provinceId: 3,
  eventEndsAt: "2026-10-30T22:00:00Z",
};

describe("PromoteEventClient", () => {
  beforeEach(() => mockCheckout.mockReset());

  it("reuses the same Idempotency-Key when retrying the same option", async () => {
    mockCheckout.mockResolvedValue({ ok: false, code: "PAYMENT_PROCESSING" });
    render(
      <PromoteEventClient
        eventId="uuid-1"
        slug="concert"
        options={{ ok: true, data: catalog }}
        pendingCheckoutUrl={null}
      />,
    );

    const button = screen.getByTestId("promote-confirm-button");
    fireEvent.click(button);
    await waitFor(() => expect(mockCheckout).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(button).not.toBeDisabled());
    fireEvent.click(button);
    await waitFor(() => expect(mockCheckout).toHaveBeenCalledTimes(2));

    const [first, second] = mockCheckout.mock.calls;
    expect(first.slice(0, 2)).toEqual(["uuid-1", "city-7d"]);
    expect(first[2]).toEqual(expect.any(String));
    expect(second[2]).toBe(first[2]);
  });

  it("shows the copy for a backend error code", async () => {
    mockCheckout.mockResolvedValue({ ok: false, code: "PROMOTION_ALREADY_ACTIVE" });
    render(
      <PromoteEventClient
        eventId="uuid-1"
        slug="concert"
        options={{ ok: true, data: catalog }}
        pendingCheckoutUrl={null}
      />,
    );

    fireEvent.click(screen.getByTestId("promote-confirm-button"));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Aquest esdeveniment ja està promocionat.",
    );
  });
});
