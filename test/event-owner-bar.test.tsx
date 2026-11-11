import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { AuthUser } from "types/auth";
import type { EventDeleteDialogProps } from "types/props";

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

vi.mock("@app/[locale]/e/[eventId]/components/EventDeleteDialog", () => ({
  default: ({ slug, open }: EventDeleteDialogProps) =>
    open ? <div data-testid="delete-dialog" data-slug={slug} /> : null,
}));

import { SHARE_KIT_EVENT } from "./fixtures/share-kit-event";
import EventOwnerBar from "@app/[locale]/e/[eventId]/components/EventOwnerBar";

const renderBar = (ownerId: string | undefined) =>
  render(<EventOwnerBar ownerId={ownerId} slug="my-event" shareEvent={SHARE_KIT_EVENT} />);

describe("EventOwnerBar", () => {
  beforeEach(() => {
    authUser = null;
    // Headless UI's anchored menu watches its button; jsdom has no ResizeObserver.
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows edit, share and promote to the creator and keeps delete in the menu", async () => {
    authUser = owner;
    renderBar(OWNER_ID);

    // The tools are loaded lazily, only once the viewer is the owner.
    expect((await screen.findByTestId("event-edit-link")).getAttribute("href")).toBe(
      "/e/my-event/edita",
    );
    expect(screen.getByTestId("event-promote-link").getAttribute("href")).toBe("/e/my-event/promote");
    expect(screen.getByTestId("event-share-kit-button")).toBeTruthy();
    expect(screen.queryByTestId("event-delete-button")).toBeNull();

    const more = screen.getByTestId("event-owner-more-button");
    expect(more.getAttribute("aria-label")).toBe("moreActions");
    fireEvent.click(more);
    fireEvent.click(await screen.findByTestId("event-delete-button"));

    // The dialog outlives the menu, which unmounts its items when it closes.
    await waitFor(() =>
      expect(screen.getByTestId("delete-dialog").dataset.slug).toBe("my-event"),
    );
  });

  it.each([
    ["a signed-in user who is not the owner", { ...owner, id: "someone-else" }, OWNER_ID],
    ["a logged-out visitor", null, OWNER_ID],
    // Scraped/RSS events have no owner; a logged-out user must not match them.
    ["an event with no owner", owner, undefined],
  ])("renders nothing for %s", (_label, user, ownerId) => {
    authUser = user;
    const { container } = renderBar(ownerId);

    expect(container.innerHTML).toBe("");
  });
});
