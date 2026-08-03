import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import type { AuthUser } from "types/auth";

const { sendGoogleEventMock } = vi.hoisted(() => ({
  sendGoogleEventMock: vi.fn<
    (event: string, obj: Record<string, unknown>) => void
  >(),
}));

let authUser: AuthUser | null = null;
let authLoading = false;

vi.mock("@utils/analytics", () => ({
  sendGoogleEvent: sendGoogleEventMock,
  ensureGtag: vi.fn(),
}));

vi.mock("@components/hooks/useAuth", () => ({
  useAuth: () => ({ user: authUser, isLoading: authLoading }),
}));

import ProfilePageTracker from "@app/[locale]/perfil/[username]/ProfilePageTracker";

describe("ProfilePageTracker", () => {
  beforeEach(() => {
    sendGoogleEventMock.mockReset();
    authUser = null;
    authLoading = false;
  });

  it("does not fire while auth is still resolving", () => {
    authLoading = true;
    render(
      <ProfilePageTracker
        username="alex91"
        upcomingCount={3}
        pastCount={1}
        status="upcoming"
      />,
    );

    expect(sendGoogleEventMock).not.toHaveBeenCalled();
  });

  it("fires with is_own_profile false for a visitor", () => {
    authUser = {
      id: "u2",
      email: "b@b.com",
      name: "Someone Else",
      username: "someoneElse",
    };
    render(
      <ProfilePageTracker
        username="alex91"
        upcomingCount={3}
        pastCount={1}
        status="upcoming"
      />,
    );

    expect(sendGoogleEventMock).toHaveBeenCalledWith("profile_page_view", {
      is_own_profile: false,
      upcoming_count: 3,
      past_count: 1,
      status: "upcoming",
    });
  });

  it("fires with is_own_profile true for the profile's owner, on the past tab", () => {
    authUser = {
      id: "u1",
      email: "a@a.com",
      name: "Alex",
      username: "alex91",
    };
    render(
      <ProfilePageTracker
        username="alex91"
        upcomingCount={undefined}
        pastCount={4}
        status="past"
      />,
    );

    expect(sendGoogleEventMock).toHaveBeenCalledWith("profile_page_view", {
      is_own_profile: true,
      upcoming_count: null,
      past_count: 4,
      status: "past",
    });
  });
});
