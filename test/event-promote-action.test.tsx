import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import type { AuthUser } from "types/auth";

const OWNER_ID = "e10c6a5f-306c-487f-9e71-876f67c7bbb2";
const OTHER_USER_ID = "different-user-uuid";

let authUser: AuthUser | null = null;

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@i18n/routing", () => ({
  Link: ({ children, ...props }: { children: ReactNode }) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock("@heroicons/react/24/outline", () => ({
  MegaphoneIcon: () => <svg data-testid="megaphone-icon" />,
}));

vi.mock("@components/hooks/useAuth", () => ({
  useAuth: () => ({ user: authUser }),
}));

import EventPromoteAction from "@app/[locale]/e/[eventId]/components/EventPromoteAction";

describe("EventPromoteAction", () => {
  beforeEach(() => {
    authUser = null;
  });

  it("shows the promote link when the signed-in user owns the event", () => {
    authUser = { id: OWNER_ID, email: "a@b.com", name: "A", username: "a" };
    render(<EventPromoteAction ownerId={OWNER_ID} slug="my-event" />);

    const link = screen.getByTestId("event-promote-link");
    expect(link.getAttribute("href")).toBe("/e/my-event/promote");
  });

  it("renders nothing when the signed-in user is not the owner", () => {
    authUser = { id: OTHER_USER_ID, email: "b@c.com", name: "B", username: "b" };
    render(<EventPromoteAction ownerId={OWNER_ID} slug="my-event" />);

    expect(screen.queryByTestId("event-promote-link")).toBeNull();
  });

  it("renders nothing when logged out", () => {
    authUser = null;
    render(<EventPromoteAction ownerId={OWNER_ID} slug="my-event" />);

    expect(screen.queryByTestId("event-promote-link")).toBeNull();
  });

  it("renders nothing when the event has no owner (e.g. scraped/RSS events)", () => {
    authUser = { id: OWNER_ID, email: "a@b.com", name: "A", username: "a" };
    render(<EventPromoteAction ownerId={undefined} slug="my-event" />);

    expect(screen.queryByTestId("event-promote-link")).toBeNull();
  });
});
