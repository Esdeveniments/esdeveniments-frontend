import { describe, it, expect, vi } from "vitest";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { PromotionReturnPage } from "../app/[locale]/e/[eventId]/promote/PromotionStatusPanel";
import type { PromotionStatusDTO } from "types/api/promotion";

const checkoutUrl = "https://checkout.stripe.com/c/pay/cs_test_1";
const pendingStatus: PromotionStatusDTO = {
  orderId: "order-1",
  paymentStatus: "PENDING",
  promotionStatus: "NONE",
  scope: "CITY",
  startsAt: null,
  endsAt: null,
  canPurchase: true,
  checkoutUrl,
};

vi.mock("next-intl/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next-intl/server")>()),
  setRequestLocale: vi.fn(),
}));
vi.mock("next/root-params", () => ({ locale: vi.fn().mockResolvedValue("ca") }));
vi.mock("@lib/auth/owned-event", () => ({
  getOwnedEventBySlug: vi.fn().mockResolvedValue({ id: "uuid-1", slug: "concert" }),
  ownerCheckNeedsRefresh: vi.fn(),
}));
vi.mock("@lib/api/promotions", () => ({
  getPromotionStatus: vi.fn(async () => ({ ok: true, data: pendingStatus })),
  isStripeCheckoutUrl: (url?: string | null) => url === checkoutUrl,
}));
vi.mock("@components/analytics/CheckoutReturnTracker", () => ({ default: () => null }));
vi.mock("../app/[locale]/e/[eventId]/promote/RefreshSession", () => ({
  default: () => null,
}));

// The panel is an async Server Component, which the DOM renderer can't render.
const renderReturnPage = async (variant: "success" | "cancel") => {
  const page = (await PromotionReturnPage({
    params: Promise.resolve({ locale: "ca", eventId: "concert" }),
    variant,
  })) as ReactElement<{ children: ReactNode }>;
  const panel = [page.props.children].flat().find(
    (child): child is ReactElement<Record<string, unknown>> =>
      isValidElement(child) &&
      typeof child.type === "function" &&
      child.type.name === "PromotionStatusPanel",
  );
  if (!panel) throw new Error("PromotionStatusPanel not rendered");
  const renderPanel = panel.type as (props: unknown) => Promise<ReactElement>;
  render(await renderPanel(panel.props));
};

describe("PromotionReturnPage", () => {
  it("on cancel, says nothing was charged and the payment can go on", async () => {
    await renderReturnPage("cancel");

    expect(screen.getByText(/No s'ha fet cap càrrec/)).toBeInTheDocument();
    expect(screen.queryByText(/Estem confirmant el pagament/)).toBeNull();
    expect(screen.getByRole("link", { name: "Continua el pagament" })).toHaveAttribute(
      "href",
      checkoutUrl,
    );
    expect(screen.getByRole("link", { name: "Tria una altra opció" })).toHaveAttribute(
      "href",
      "/e/concert/promote",
    );
  });

  it("on success, says the payment is being confirmed and offers nothing to buy", async () => {
    await renderReturnPage("success");

    expect(screen.getByText(/Estem confirmant el pagament/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Actualitza l'estat" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Continua el pagament" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Tria una altra opció" })).toBeNull();
  });
});
