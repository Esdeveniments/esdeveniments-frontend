import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

const addToCalendarProps = vi.fn<(props: { variant?: string; iconOnly?: boolean }) => void>();
const authUser = vi.fn<() => { id: string } | null>(() => null);
const adsAllowed = vi.fn(() => false);

vi.mock("@components/ui/addToCalendar", () => ({
  default: (props: { variant?: string; iconOnly?: boolean }) => {
    addToCalendarProps(props);
    return <button type="button">calendar</button>;
  },
}));
vi.mock("@components/hooks/useTrackedCta", () => ({
  default: () => ({ ref: { current: null }, trackClick: () => {} }),
}));
vi.mock("@components/hooks/useAuth", () => ({
  useAuth: () => ({ user: authUser() }),
}));
vi.mock("@lib/context/AdContext", () => ({
  useAdContext: () => ({ adsAllowed: adsAllowed() }),
}));
vi.mock("@i18n/routing", () => ({
  Link: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

import EventActionBarActions from "@app/[locale]/e/[eventId]/components/EventActionBarActions";
import EventReportLink from "@app/[locale]/e/[eventId]/components/EventReportLink";
import EventAdSlot from "@app/[locale]/e/[eventId]/components/EventAdSlot";
import EventMedia from "@app/[locale]/e/[eventId]/components/EventMedia";
import Breadcrumbs from "@components/ui/common/Breadcrumbs";
import type { EventDetailResponseDTO } from "types/api/event";

const calendar = {
  title: "Concert",
  description: "",
  location: "Vic",
  startDate: "2026-11-20",
  endDate: "2026-11-20",
  canonical: "https://www.esdeveniments.cat/e/concert",
} as unknown as Parameters<typeof EventActionBarActions>[0]["calendar"];

beforeEach(() => {
  vi.clearAllMocks();
  authUser.mockReturnValue(null);
  adsAllowed.mockReturnValue(false);
});

describe("EventActionBarActions", () => {
  it("makes the website the filled action and the calendar an icon", () => {
    render(
      <EventActionBarActions
        eventSlug="concert"
        eventUrl="https://example.com"
        moreInfoLabel="Més info"
        calendar={calendar}
      />,
    );

    expect(screen.getByRole("link", { name: /Més info/ }).className).toContain("btn-primary");
    expect(addToCalendarProps).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "neutral", iconOnly: true }),
    );
  });

  it("promotes the calendar to the filled action when there is no website", () => {
    render(
      <EventActionBarActions eventSlug="concert" eventUrl={null} moreInfoLabel="Més info" calendar={calendar} />,
    );

    expect(screen.queryByRole("link")).toBeNull();
    expect(addToCalendarProps).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "primary", iconOnly: false }),
    );
  });
});

describe("EventReportLink", () => {
  it("mails the event url and title", () => {
    render(<EventReportLink ownerId="owner-1" title="Concert" url="https://www.esdeveniments.cat/e/concert" />);

    const href = screen.getByRole("link").getAttribute("href") ?? "";
    expect(href).toMatch(/^mailto:/);
    expect(decodeURIComponent(href)).toContain("Concert");
    expect(decodeURIComponent(href)).toContain("https://www.esdeveniments.cat/e/concert");
  });

  it("is hidden for the event owner", () => {
    authUser.mockReturnValue({ id: "owner-1" });
    render(<EventReportLink ownerId="owner-1" title="Concert" url="https://x" />);

    expect(screen.queryByTestId("event-report")).toBeNull();
  });
});

describe("EventAdSlot", () => {
  it("shows the publish card instead of an empty sponsored box without consent", () => {
    render(<EventAdSlot />);

    expect(screen.getByTestId("event-house-ad").querySelector("a")?.getAttribute("href")).toBe("/publica");
  });

  it("drops the house card once ads are allowed", () => {
    adsAllowed.mockReturnValue(true);
    render(<EventAdSlot />);

    expect(screen.queryByTestId("event-house-ad")).toBeNull();
  });
});

describe("EventMedia", () => {
  it("renders no placeholder box when the event has no image or video", () => {
    const { container } = render(
      <EventMedia event={{ id: "1", imageUrl: "", videoUrl: null } as unknown as EventDetailResponseDTO} title="Concert" />,
    );

    expect(container.innerHTML).toBe("");
  });
});

describe("Breadcrumbs", () => {
  it("keeps a linked last item as a link, not the current page", () => {
    render(<Breadcrumbs items={[{ label: "Inici", href: "/" }, { label: "Vic", href: "/vic" }]} />);

    expect(screen.getByRole("link", { name: "Vic" }).getAttribute("aria-current")).toBeNull();
    expect(document.querySelector("[aria-current]")).toBeNull();
  });

  it("marks a last item without a link as the current page", () => {
    render(<Breadcrumbs items={[{ label: "Inici", href: "/" }, { label: "Notícia" }]} />);

    expect(screen.getByText("Notícia").getAttribute("aria-current")).toBe("page");
  });
});
