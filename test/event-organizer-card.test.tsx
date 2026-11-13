import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import type { OwnerSummaryDTO } from "types/api/user";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: { count?: number }) =>
    values?.count === undefined ? key : `${key}:${values.count}`,
}));

vi.mock("@i18n/routing", () => ({
  Link: ({ children, ...props }: { children: ReactNode }) => <a {...props}>{children}</a>,
}));

import EventOrganizerCard from "@app/[locale]/e/[eventId]/components/EventOrganizerCard";

const OWNER: OwnerSummaryDTO = {
  id: "owner-1",
  username: "ajuntament-cardedeu",
  displayName: "Ajuntament de Cardedeu",
  avatarUrl: null,
  verified: true,
  role: "ORGANIZATION",
};

describe("EventOrganizerCard", () => {
  it("links to the profile and shows how many events the organizer published", () => {
    render(<EventOrganizerCard owner={{ ...OWNER, eventCount: 12 }} />);

    const link = screen.getByTestId("event-created-by-link");
    expect(link.getAttribute("href")).toBe("/perfil/ajuntament-cardedeu");
    expect(link.textContent).toContain("Ajuntament de Cardedeu");
    expect(link.textContent).toContain("organizerEventCount:12");
  });

  // Older backends don't send it, and the event detail doesn't validate owner.
  it.each([undefined, 0, 2.5])("falls back to 'view all' when eventCount is %s", (eventCount) => {
    render(<EventOrganizerCard owner={{ ...OWNER, eventCount }} />);

    expect(screen.getByTestId("event-created-by-link").textContent).toContain(
      "sidebarViewAllEvents",
    );
  });

  it("shows the name without a link when there is no safe profile slug", () => {
    render(<EventOrganizerCard owner={{ ...OWNER, username: "", displayName: "anna@example.com" }} />);

    expect(screen.queryByTestId("event-created-by-link")).toBeNull();
    const card = screen.getByTestId("event-created-by");
    expect(card.textContent).toContain("anna@example.com");
    expect(card.textContent).not.toContain("sidebarViewAllEvents");
  });

  it("still shows the event count when there is no profile link", () => {
    render(
      <EventOrganizerCard
        owner={{ ...OWNER, username: "", displayName: "anna@example.com", eventCount: 3 }}
      />,
    );

    expect(screen.queryByTestId("event-created-by-link")).toBeNull();
    expect(screen.getByTestId("event-created-by").textContent).toContain("organizerEventCount:3");
  });
});
