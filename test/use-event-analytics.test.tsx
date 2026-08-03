import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, renderHook } from "@testing-library/react";
import { StrictMode } from "react";
import type { EventClientProps } from "types/props";

const { sendGoogleEventMock } = vi.hoisted(() => ({
  sendGoogleEventMock: vi.fn<
    (event: string, obj: Record<string, unknown>) => void
  >(),
}));

vi.mock("@utils/analytics", () => ({
  sendGoogleEvent: sendGoogleEventMock,
  ensureGtag: vi.fn(),
}));

import { useEventAnalytics } from "@app/[locale]/e/[eventId]/hooks/useEventAnalytics";

function makeEvent(
  overrides: Partial<EventClientProps["event"]> = {},
): EventClientProps["event"] {
  return {
    id: "evt-1",
    slug: "concert-jazz",
    title: "Concert de Jazz",
    categorySlug: "musica",
    placeSlug: "barcelona",
    hasImage: true,
    origin: "MANUAL",
    endDate: "2999-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("useEventAnalytics", () => {
  beforeEach(() => {
    sendGoogleEventMock.mockReset();
  });

  it("fires view_event_page once on mount with the event's fields", () => {
    renderHook(() => useEventAnalytics(makeEvent()));

    expect(sendGoogleEventMock).toHaveBeenCalledTimes(1);
    expect(sendGoogleEventMock).toHaveBeenCalledWith("view_event_page", {
      event_id: "evt-1",
      event_slug: "concert-jazz",
      category_slug: "musica",
      place_slug: "barcelona",
      has_image: true,
      is_past: false,
      origin: "MANUAL",
    });
  });

  it("marks the event as past when endDate is before now", () => {
    renderHook(() =>
      useEventAnalytics(makeEvent({ endDate: "2000-01-01T00:00:00.000Z" })),
    );

    expect(sendGoogleEventMock).toHaveBeenCalledWith(
      "view_event_page",
      expect.objectContaining({ is_past: true }),
    );
  });

  it("fires once even under StrictMode's dev-only double-invoke", () => {
    function Harness() {
      useEventAnalytics(makeEvent());
      return null;
    }

    render(
      <StrictMode>
        <Harness />
      </StrictMode>,
    );

    expect(sendGoogleEventMock).toHaveBeenCalledTimes(1);
  });

  it("fires again when the event changes without unmounting (no key remount)", () => {
    const { rerender } = renderHook(
      (event: EventClientProps["event"]) => useEventAnalytics(event),
      { initialProps: makeEvent({ id: "evt-1" }) },
    );
    expect(sendGoogleEventMock).toHaveBeenCalledTimes(1);

    rerender(makeEvent({ id: "evt-1" }));
    expect(sendGoogleEventMock).toHaveBeenCalledTimes(1);

    rerender(makeEvent({ id: "evt-2", slug: "fira-artesans" }));
    expect(sendGoogleEventMock).toHaveBeenCalledTimes(2);
    expect(sendGoogleEventMock).toHaveBeenLastCalledWith(
      "view_event_page",
      expect.objectContaining({ event_id: "evt-2" }),
    );
  });
});
