import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import type { AuthUser } from "types/auth";

const OWNER_ID = "e10c6a5f-306c-487f-9e71-876f67c7bbb2";
const owner: AuthUser = { id: OWNER_ID, email: "a@b.com", name: "A", username: "a" };

let authUser: AuthUser | null = null;

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@i18n/routing", () => ({
  Link: ({ children, ...props }: { children: ReactNode }) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock("@components/hooks/useAuth", () => ({
  useAuth: () => ({ user: authUser }),
}));

vi.mock("@app/[locale]/e/[eventId]/components/EventDeleteAction", () => ({
  default: ({ slug }: { slug: string }) => (
    <button data-testid="event-delete-button" data-slug={slug} />
  ),
}));

import { SHARE_KIT_EVENT } from "./fixtures/share-kit-event";
import EventOwnerActions from "@app/[locale]/e/[eventId]/components/EventOwnerActions";

const ACTION_IDS = [
  "event-share-kit-button",
  "event-edit-link", "event-promote-link", "event-delete-button"];

describe("EventOwnerActions", () => {
  beforeEach(() => {
    authUser = null;
  });

  it("shows share, edit, promote and delete to the event's creator", () => {
    authUser = owner;
    render(<EventOwnerActions ownerId={OWNER_ID} slug="my-event" shareEvent={SHARE_KIT_EVENT} />);

    expect(screen.getByTestId("event-edit-link").getAttribute("href")).toBe("/e/my-event/edita");
    expect(screen.getByTestId("event-promote-link").getAttribute("href")).toBe("/e/my-event/promote");
    expect(screen.getByTestId("event-delete-button").dataset.slug).toBe("my-event");
    expect(screen.getByTestId("event-share-kit-button")).toBeTruthy();
  });

  it.each([
    ["a signed-in user who is not the owner", { ...owner, id: "someone-else" }, OWNER_ID],
    ["a logged-out visitor", null, OWNER_ID],
    // Scraped/RSS events have no owner; a logged-out user must not match them.
    ["an event with no owner", owner, undefined],
  ])("renders nothing for %s", (_label, user, ownerId) => {
    authUser = user;
    render(<EventOwnerActions ownerId={ownerId} slug="my-event" shareEvent={SHARE_KIT_EVENT} />);

    for (const id of ACTION_IDS) expect(screen.queryByTestId(id)).toBeNull();
  });
});
