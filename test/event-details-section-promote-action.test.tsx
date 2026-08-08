import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import type { EventDetailResponseDTO } from "types/api/event";
import type { AuthUser } from "types/auth";

const OWNER_ID = "owner-uuid-1";

let mockAuthUser: AuthUser | null = null;

vi.mock("next-intl", () => ({
  useTranslations: () => {
    const t = (key: string) => key;
    t.rich = (key: string) => key;
    return t;
  },
}));

vi.mock("@i18n/routing", () => ({
  Link: ({ children, ...props }: { children: ReactNode }) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock("@heroicons/react/24/outline", () => ({
  GlobeAltIcon: () => <svg data-testid="globe-icon" />,
  ClockIcon: () => <svg data-testid="clock-icon" />,
  UserIcon: () => <svg data-testid="user-icon" />,
  MegaphoneIcon: () => <svg data-testid="megaphone-icon" />,
}));

vi.mock("@components/ui/common/SectionHeading", () => ({
  __esModule: true,
  default: () => <div data-testid="section-heading" />,
}));

vi.mock("@components/ui/primitives/PressableAnchor", () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}));

vi.mock("@components/hooks/useAuth", () => ({
  useAuth: () => ({ user: mockAuthUser }),
}));

import EventDetailsSection from "@app/[locale]/e/[eventId]/components/EventDetailsSection";

function buildEvent(
  overrides: Partial<EventDetailResponseDTO> = {},
): EventDetailResponseDTO {
  return {
    id: "event-uuid-1",
    hash: "hash",
    slug: "my-event",
    title: "My Event",
    type: "FREE",
    url: "",
    description: "desc",
    imageUrl: "",
    startDate: "2026-09-01",
    startTime: null,
    endDate: "2026-09-01",
    endTime: null,
    location: "Location",
    visits: 0,
    origin: "MANUAL",
    owner: {
      id: OWNER_ID,
      displayName: "Creator",
      username: "creator",
      avatarUrl: null,
      organizerVerified: false,
    },
    city: {
      id: 1,
      name: "City",
      slug: "city",
      latitude: 0,
      longitude: 0,
      postalCode: "08001",
      rssFeed: null,
      enabled: true,
    },
    region: { id: 1, name: "Region", slug: "region" },
    province: { id: 1, name: "Region", slug: "region" },
    categories: [],
    ...overrides,
  };
}

describe("EventDetailsSection promote action (mobile)", () => {
  beforeEach(() => {
    mockAuthUser = null;
  });

  it("shows the promote link on the mobile details section when the signed-in user owns the event", () => {
    mockAuthUser = {
      id: OWNER_ID,
      email: "a@b.com",
      name: "A",
      username: "a",
    };
    render(<EventDetailsSection event={buildEvent()} />);

    const link = screen.getByTestId("event-promote-link");
    expect(link.getAttribute("href")).toBe("/e/my-event/promote");
  });

  it("does not show the promote link when the signed-in user is not the owner", () => {
    mockAuthUser = {
      id: "someone-else",
      email: "b@c.com",
      name: "B",
      username: "b",
    };
    render(<EventDetailsSection event={buildEvent()} />);

    expect(screen.queryByTestId("event-promote-link")).toBeNull();
  });

  it("does not show the promote link when logged out", () => {
    mockAuthUser = null;
    render(<EventDetailsSection event={buildEvent()} />);

    expect(screen.queryByTestId("event-promote-link")).toBeNull();
  });
});
