import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockCreatePromotionCheckoutAction = vi.fn();
const mockUseLocale = vi.fn(() => "ca");
const mockSendGoogleEvent = vi.fn();
const mockGetEventPromotionOptions = vi.fn(() => [
  { id: "standard", priceEur: 5 },
]);

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
  useLocale: () => mockUseLocale(),
}));

vi.mock("../app/[locale]/e/[eventId]/promote/actions", () => ({
  createPromotionCheckoutAction: (eventId: string, slug: string, locale: string) =>
    mockCreatePromotionCheckoutAction(eventId, slug, locale),
}));

const mockEnsureGtag = vi.fn();
vi.mock("@utils/analytics", () => ({
  sendGoogleEvent: (...args: unknown[]) => mockSendGoogleEvent(...args),
  ensureGtag: (...args: unknown[]) => mockEnsureGtag(...args),
}));

vi.mock("@config/pricing", () => ({
  getEventPromotionOptions: () => mockGetEventPromotionOptions(),
}));

const originalLocation = window.location;

beforeEach(() => {
  vi.clearAllMocks();
  mockGetEventPromotionOptions.mockReturnValue([
    { id: "standard", priceEur: 5 },
  ]);
  // @ts-expect-error -- overriding a readonly for the test
  delete window.location;
  Object.defineProperty(window, "location", {
    value: { href: "" },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  Object.defineProperty(window, "location", {
    value: originalLocation,
    writable: true,
    configurable: true,
  });
});

import PromoteEventClient from "../app/[locale]/e/[eventId]/promote/PromoteEventClient";

describe("PromoteEventClient", () => {
  it("redirects to the returned Stripe url on success", async () => {
    mockCreatePromotionCheckoutAction.mockResolvedValue({
      success: true,
      url: "https://checkout.stripe.com/session123",
    });

    render(<PromoteEventClient eventId="event-uuid-1" slug="my-event" />);

    fireEvent.click(screen.getByTestId("promote-confirm-button"));

    await waitFor(() => {
      expect(window.location.href).toBe("https://checkout.stripe.com/session123");
    });
  });

  it("shows a generic error and does not redirect when the action fails", async () => {
    mockCreatePromotionCheckoutAction.mockResolvedValue({
      success: false,
      error: "Unauthorized: only the event creator can promote this event",
    });

    render(<PromoteEventClient eventId="event-uuid-1" slug="my-event" />);
    fireEvent.click(screen.getByTestId("promote-confirm-button"));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(window.location.href).toBe("");
  });

  it("rejects a non-https url instead of redirecting", async () => {
    mockCreatePromotionCheckoutAction.mockResolvedValue({
      success: true,
      url: "/undefined",
    });

    render(<PromoteEventClient eventId="event-uuid-1" slug="my-event" />);
    fireEvent.click(screen.getByTestId("promote-confirm-button"));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(window.location.href).toBe("");
  });

  it("renders the price from getEventPromotionOptions rather than a hardcoded value", () => {
    // Deliberately not 5 (config's real current value) — a component that
    // hardcoded "5€" instead of reading getEventPromotionOptions() would
    // still pass this test if the mock returned the same value as the
    // hardcode, so the fixture uses a distinguishing price instead.
    mockGetEventPromotionOptions.mockReturnValue([
      { id: "standard", priceEur: 7 },
    ]);

    render(<PromoteEventClient eventId="event-uuid-1" slug="my-event" />);

    expect(screen.getByText("7€")).toBeInTheDocument();
  });

  it("resets isSubmitting and shows an error when the action itself rejects (not just returns success:false)", async () => {
    mockCreatePromotionCheckoutAction.mockRejectedValue(
      new Error("unexpected server action failure"),
    );

    render(<PromoteEventClient eventId="event-uuid-1" slug="my-event" />);
    const button = screen.getByTestId("promote-confirm-button");
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    // The button must not stay permanently disabled/loading after a rejection.
    expect(button).not.toBeDisabled();
    expect(mockSendGoogleEvent).toHaveBeenCalledWith("promote_checkout_error", {
      event_slug: "my-event",
      reason: "unexpected-rejection",
    });
  });

  it("shows the stale-session message (not the generic one) when the action reports an expired session", async () => {
    mockCreatePromotionCheckoutAction.mockResolvedValue({
      success: false,
      error: "Your session has expired. Please sign in again.",
      reason: "stale-session",
    });

    render(<PromoteEventClient eventId="event-uuid-1" slug="my-event" />);
    fireEvent.click(screen.getByTestId("promote-confirm-button"));

    await waitFor(() => {
      expect(
        screen.getByText("App.EventPromote.errorStaleSession"),
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByText("App.EventPromote.errorGeneric"),
    ).toBeNull();
  });

  it("disables the confirm button and shows an error when no promotion option is available", () => {
    mockGetEventPromotionOptions.mockReturnValue([]);

    render(<PromoteEventClient eventId="event-uuid-1" slug="my-event" />);

    expect(screen.getByTestId("promote-confirm-button")).toBeDisabled();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText("5€")).toBeNull();
  });

  it("fires the checkout funnel analytics events", async () => {
    mockCreatePromotionCheckoutAction.mockResolvedValue({
      success: true,
      url: "https://checkout.stripe.com/session123",
    });

    render(<PromoteEventClient eventId="event-uuid-1" slug="my-event" />);

    expect(mockSendGoogleEvent).toHaveBeenCalledWith("promote_page_view", {
      event_slug: "my-event",
    });

    fireEvent.click(screen.getByTestId("promote-confirm-button"));

    await waitFor(() => {
      expect(window.location.href).toBe("https://checkout.stripe.com/session123");
    });
    expect(mockSendGoogleEvent).toHaveBeenCalledWith("promote_checkout_click", {
      event_slug: "my-event",
    });
    expect(mockSendGoogleEvent).toHaveBeenCalledWith(
      "promote_checkout_redirect",
      { event_slug: "my-event" },
    );
    // Exact count, not just toHaveBeenCalledWith, so a regression that fires
    // any of the three events twice (e.g. a missing one-shot guard) fails
    // this test instead of passing alongside the correct calls.
    expect(mockSendGoogleEvent).toHaveBeenCalledTimes(3);
  });
});
