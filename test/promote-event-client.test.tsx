import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import PromoteEventClient from "../app/[locale]/e/[eventId]/promote/PromoteEventClient";
import type { PromotionOptionDTO, PromotionOptionsDTO } from "types/api/promotion";

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

const placeNames = { CITY: "Mataró", REGION: "Maresme", PROVINCE: "Barcelona" };

const option = (
  id: string,
  scope: PromotionOptionDTO["scope"],
  durationDays: number,
  available = true,
): PromotionOptionDTO => ({
  id,
  scope,
  durationDays,
  amountMinor: 999,
  currency: "EUR",
  taxIncluded: true,
  available,
  unavailableReason: available ? null : "INSUFFICIENT_EVENT_DURATION",
});

const multiScopeCatalog: PromotionOptionsDTO = {
  ...catalog,
  options: [
    option("city-30d", "CITY", 30),
    option("city-1d", "CITY", 1),
    option("city-7d", "CITY", 7),
    option("region-7d", "REGION", 7, false),
    option("region-1d", "REGION", 1),
    option("catalonia-7d", "CATALONIA", 7),
  ],
};

const renderMultiScope = () =>
  render(
    <PromoteEventClient
      eventId="uuid-1"
      slug="concert"
      options={{ ok: true, data: multiScopeCatalog }}
      pendingCheckoutUrl={null}
      placeNames={placeNames}
    />,
  );

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
        placeNames={placeNames}
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
        placeNames={placeNames}
      />,
    );

    fireEvent.click(screen.getByTestId("promote-confirm-button"));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Aquest esdeveniment ja està promocionat.",
    );
  });

  it("renders one tab per scope in order, labelled with the event's places", () => {
    renderMultiScope();

    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((tab) => tab.dataset.testid)).toEqual([
      "promote-tab-CITY",
      "promote-tab-REGION",
      "promote-tab-CATALONIA",
    ]);
    expect(tabs[0]).toHaveTextContent("Mataró");
    expect(tabs[1]).toHaveTextContent("Maresme");
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
  });

  it("shows only the active scope's durations, shortest first", () => {
    renderMultiScope();

    const panel = screen.getByRole("tabpanel");
    const radios = within(panel).getAllByRole("radio");
    expect(radios.map((radio) => (radio as HTMLInputElement).value)).toEqual([
      "city-1d",
      "city-7d",
      "city-30d",
    ]);
  });

  it("preselects the shortest available option, matching the card order", () => {
    renderMultiScope();

    expect(screen.getByDisplayValue("city-1d")).toBeChecked();
  });

  it("keeps the picked option when the active tab is clicked again", () => {
    renderMultiScope();

    fireEvent.click(screen.getByDisplayValue("city-7d"));
    fireEvent.click(screen.getByTestId("promote-tab-CITY"));

    expect(screen.getByDisplayValue("city-7d")).toBeChecked();
  });

  it("opens on the first scope that has an available option", () => {
    render(
      <PromoteEventClient
        eventId="uuid-1"
        slug="concert"
        options={{
          ok: true,
          data: {
            ...catalog,
            options: [option("city-7d", "CITY", 7, false), option("region-7d", "REGION", 7)],
          },
        }}
        pendingCheckoutUrl={null}
        placeNames={placeNames}
      />,
    );

    expect(screen.getByTestId("promote-tab-REGION")).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByDisplayValue("region-7d")).toBeChecked();
  });

  it("switching tab selects that scope's first available option", async () => {
    mockCheckout.mockResolvedValue({ ok: false, code: "PAYMENT_PROCESSING" });
    renderMultiScope();

    fireEvent.click(screen.getByTestId("promote-tab-REGION"));

    expect(screen.getByTestId("promote-tab-REGION")).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByDisplayValue("region-7d")).toBeDisabled();
    expect(screen.getByDisplayValue("region-1d")).toBeChecked();

    fireEvent.click(screen.getByTestId("promote-confirm-button"));
    await waitFor(() =>
      expect(mockCheckout).toHaveBeenCalledWith(
        "uuid-1",
        "region-1d",
        expect.any(String),
      ),
    );
  });

  it("moves between tabs with the arrow keys", () => {
    renderMultiScope();

    fireEvent.keyDown(screen.getByTestId("promote-tab-CITY"), { key: "ArrowLeft" });

    const catalonia = screen.getByTestId("promote-tab-CATALONIA");
    expect(catalonia).toHaveAttribute("aria-selected", "true");
    expect(catalonia).toHaveFocus();
  });

  it.each(["CHECKOUT_EXPIRED", "ORDER_NOT_PENDING"])(
    "starts a new Idempotency-Key after %s",
    async (code) => {
      mockCheckout.mockResolvedValue({ ok: false, code });
      renderMultiScope();

      const button = screen.getByTestId("promote-confirm-button");
      fireEvent.click(button);
      await waitFor(() => expect(button).not.toBeDisabled());
      fireEvent.click(button);
      await waitFor(() => expect(mockCheckout).toHaveBeenCalledTimes(2));

      const [first, second] = mockCheckout.mock.calls;
      expect(second[1]).toBe(first[1]);
      expect(second[2]).not.toBe(first[2]);
    },
  );

  it("unlocks the confirm button when the page returns from the bfcache", async () => {
    mockCheckout.mockReturnValue(new Promise(() => {}));
    renderMultiScope();

    const button = screen.getByTestId("promote-confirm-button");
    fireEvent.click(button);
    await waitFor(() => expect(button).toBeDisabled());

    const pageshow = new Event("pageshow");
    Object.defineProperty(pageshow, "persisted", { value: true });
    fireEvent(window, pageshow);

    await waitFor(() => expect(button).not.toBeDisabled());
  });

  it("re-picks when new options make the picked one unavailable", () => {
    const { rerender } = renderMultiScope();
    fireEvent.click(screen.getByDisplayValue("city-7d"));

    const props = {
      eventId: "uuid-1",
      slug: "concert",
      pendingCheckoutUrl: null,
      placeNames,
    };
    rerender(
      <PromoteEventClient
        {...props}
        options={{ ok: true, data: { ...multiScopeCatalog } }}
      />,
    );
    expect(screen.getByDisplayValue("city-7d")).toBeChecked();

    rerender(
      <PromoteEventClient
        {...props}
        options={{
          ok: true,
          data: {
            ...multiScopeCatalog,
            options: multiScopeCatalog.options.map((o) =>
              o.id === "city-7d" ? { ...o, available: false } : o,
            ),
          },
        }}
      />,
    );
    expect(screen.getByDisplayValue("city-1d")).toBeChecked();
  });
});
