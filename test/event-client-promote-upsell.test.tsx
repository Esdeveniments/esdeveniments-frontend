import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useState, useEffect, type ComponentType } from "react";
import type { EventClientProps } from "types/props";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const mockReplace = vi.fn();
vi.mock("@i18n/routing", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/en/e/my-event",
}));

let mockSearchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
}));

vi.mock("./hooks/useEventAnalytics", () => ({
  useEventAnalytics: () => {},
}));
vi.mock("../app/[locale]/e/[eventId]/hooks/useEventAnalytics", () => ({
  useEventAnalytics: () => {},
}));

vi.mock("components/ui/adArticle", () => ({
  __esModule: true,
  default: () => <div data-testid="ad-article" />,
}));

vi.mock("@components/ui/common/SectionHeading", () => ({
  __esModule: true,
  default: () => <div data-testid="section-heading" />,
}));

vi.mock("@heroicons/react/24/outline", () => ({
  MegaphoneIcon: () => <svg data-testid="megaphone-icon" />,
}));

const mockSendGoogleEvent = vi.fn();
vi.mock("@utils/analytics", () => ({
  sendGoogleEvent: (...args: unknown[]) => mockSendGoogleEvent(...args),
}));

vi.mock("../app/[locale]/e/[eventId]/components/PromoteUpsellModal", () => ({
  __esModule: true,
  default: ({
    slug,
    setOpen,
  }: {
    slug: string;
    setOpen: (open: boolean) => void;
  }) => (
    <div data-testid="promote-upsell-modal">
      {slug}
      <button data-testid="mock-close" onClick={() => setOpen(false)} />
    </div>
  ),
}));

// next/dynamic's real loader resolves asynchronously. Mirror the existing
// project convention (see navigation-filters-modal tests) of resolving the
// dynamic import in tests — using real state so the resolution triggers a
// re-render, since findByTestId below needs to observe it.
vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<{ default: ComponentType<Record<string, unknown>> }>) => {
    return function DynamicMock(props: Record<string, unknown>) {
      const [Component, setComponent] = useState<ComponentType<
        Record<string, unknown>
      > | null>(null);
      useEffect(() => {
        let active = true;
        loader().then((mod) => {
          if (active) setComponent(() => mod.default);
        });
        return () => {
          active = false;
        };
      }, []);
      return Component ? <Component {...props} /> : null;
    };
  },
}));

import EventClient from "../app/[locale]/e/[eventId]/EventClient";

function buildEvent(): EventClientProps["event"] {
  return {
    id: "event-uuid-1",
    slug: "my-event",
    title: "My Event",
    endDate: "2026-09-01",
    categorySlug: undefined,
    placeSlug: "barcelona",
    hasImage: false,
    origin: "MANUAL",
  };
}

describe("EventClient promote upsell wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  it("does not show the promote upsell modal when there is no promote marker", async () => {
    render(<EventClient event={buildEvent()} />);
    // The modal is only ever rendered when showPromoteUpsell is true, so its
    // dynamic import never even loads here — no async wait needed.
    expect(screen.queryByTestId("promote-upsell-modal")).toBeNull();
    expect(mockSendGoogleEvent).not.toHaveBeenCalledWith(
      "promote_modal_shown",
      expect.anything(),
    );
  });

  it("shows the promote upsell modal and fires analytics when ?promote=1 is present", async () => {
    mockSearchParams = new URLSearchParams("promote=1");
    render(<EventClient event={buildEvent()} />);

    expect(
      await screen.findByTestId("promote-upsell-modal"),
    ).toHaveTextContent("my-event");
    expect(mockSendGoogleEvent).toHaveBeenCalledWith("promote_modal_shown", {
      event_slug: "my-event",
      source: "event_detail",
    });
  });

  it("strips only the promote marker on close, preserving other query params", async () => {
    mockSearchParams = new URLSearchParams("promote=1&edit_suggested=true");
    render(<EventClient event={buildEvent()} />);

    const modal = await screen.findByTestId("promote-upsell-modal");
    fireEvent.click(screen.getByTestId("mock-close"));

    expect(modal).toBeDefined();
    expect(mockReplace).toHaveBeenCalledWith(
      "/en/e/my-event?edit_suggested=true",
      { scroll: false },
    );
  });

  it("strips the promote marker on close with no other params, leaving a bare pathname", async () => {
    mockSearchParams = new URLSearchParams("promote=1");
    render(<EventClient event={buildEvent()} />);

    await screen.findByTestId("promote-upsell-modal");
    fireEvent.click(screen.getByTestId("mock-close"));

    expect(mockReplace).toHaveBeenCalledWith("/en/e/my-event", {
      scroll: false,
    });
  });
});
