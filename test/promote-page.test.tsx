import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PromotePage from "../app/[locale]/e/[eventId]/promote/page";
import type { PromotionOptionsDTO } from "types/api/promotion";

const getPromotionOptions = vi.fn();
const sendGoogleEvent = vi.fn();

vi.mock("@utils/analytics", () => ({
  sendGoogleEvent: (...args: unknown[]) => sendGoogleEvent(...args),
  ensureGtag: vi.fn(),
}));

vi.mock("next/root-params", () => ({ locale: vi.fn() }));
vi.mock("@lib/auth/owned-event", () => ({
  getOwnedEventBySlug: vi.fn().mockResolvedValue({
    id: "uuid-1",
    slug: "concert",
    city: { name: "Mataró" },
  }),
  ownerCheckNeedsRefresh: vi.fn(),
}));
vi.mock("@lib/api/promotions", () => ({
  getPromotionOptions: (...args: unknown[]) => getPromotionOptions(...args),
  getPromotionStatus: vi.fn().mockResolvedValue({ ok: false, code: "UNKNOWN" }),
  isStripeCheckoutUrl: () => false,
}));
vi.mock("../app/[locale]/e/[eventId]/promote/RefreshSession", () => ({
  default: () => null,
}));
vi.mock("../app/[locale]/e/[eventId]/promote/actions", () => ({
  createPromotionCheckoutAction: vi.fn(),
}));

const catalog: PromotionOptionsDTO = {
  options: [
    {
      id: "city-7d",
      scope: "CITY",
      durationDays: 7,
      amountMinor: 999,
      currency: "EUR",
      taxIncluded: true,
      available: true,
      unavailableReason: null,
    },
  ],
  canPurchase: true,
  unavailableReason: null,
  cityId: 1,
  regionId: 1,
  provinceId: 1,
  eventEndsAt: "2026-11-30T22:00:00Z",
};

const renderPage = async () =>
  PromotePage({ params: Promise.resolve({ eventId: "concert" }) });

describe("PromotePage", () => {
  it("picks an option once a session refresh brings the options in", async () => {
    getPromotionOptions.mockResolvedValueOnce({
      ok: false,
      code: "AUTHENTICATION_REQUIRED",
    });
    const { rerender } = render(await renderPage());

    getPromotionOptions.mockResolvedValueOnce({ ok: true, data: catalog });
    rerender(await renderPage());

    expect(screen.getByDisplayValue("city-7d")).toBeChecked();
    expect(screen.getByTestId("promote-confirm-button")).toBeEnabled();
    expect(
      sendGoogleEvent.mock.calls.filter(([name]) => name === "promote_page_view"),
    ).toHaveLength(1);
  });
});
