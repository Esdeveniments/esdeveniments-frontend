import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

const { sendGoogleEventMock } = vi.hoisted(() => ({
  sendGoogleEventMock: vi.fn<
    (event: string, obj: Record<string, unknown>) => void
  >(),
}));

vi.mock("@utils/analytics", () => ({
  sendGoogleEvent: sendGoogleEventMock,
}));

import FavoritesPageTracker from "@app/[locale]/preferits/FavoritesPageTracker";

describe("FavoritesPageTracker", () => {
  beforeEach(() => {
    sendGoogleEventMock.mockReset();
  });

  it("defaults to period 'active' when not passed", () => {
    render(<FavoritesPageTracker favoritesCount={3} activeCount={2} />);

    expect(sendGoogleEventMock).toHaveBeenCalledWith("favorites_page_view", {
      favorites_count: 3,
      active_count: 2,
      period: "active",
    });
  });

  it("reports period 'past' when rendered on the past-favourites tab", () => {
    render(
      <FavoritesPageTracker
        favoritesCount={5}
        activeCount={2}
        period="past"
      />,
    );

    expect(sendGoogleEventMock).toHaveBeenCalledWith("favorites_page_view", {
      favorites_count: 5,
      active_count: 2,
      period: "past",
    });
  });

  it("fires only once across re-renders with the same props", () => {
    const { rerender } = render(
      <FavoritesPageTracker favoritesCount={3} activeCount={2} />,
    );
    rerender(<FavoritesPageTracker favoritesCount={3} activeCount={2} />);

    expect(sendGoogleEventMock).toHaveBeenCalledTimes(1);
  });
});
