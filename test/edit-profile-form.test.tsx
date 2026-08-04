import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { AuthUser } from "types/auth";

const baseUser: AuthUser = {
  id: "user-1",
  email: "alex@example.com",
  name: "Alex Garcia",
  username: "alex91",
  bio: "Organitzo concerts.",
  avatarUrl: undefined,
};

let authUser: AuthUser = baseUser;

const mockRefetchUser = vi.fn();
const mockLogout = vi.fn();
const mockPush = vi.fn();
const { sendGoogleEventMock } = vi.hoisted(() => ({
  sendGoogleEventMock: vi.fn<
    (event: string, obj: Record<string, unknown>) => void
  >(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@i18n/routing", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@components/hooks/useAuth", () => ({
  useAuth: () => ({
    user: authUser,
    refetchUser: mockRefetchUser,
    logout: mockLogout,
  }),
}));

vi.mock("@utils/analytics", () => ({
  sendGoogleEvent: sendGoogleEventMock,
  ensureGtag: vi.fn(),
}));

vi.mock("@app/[locale]/perfil/edita/EditProfileAvatar", () => ({
  default: () => <div data-testid="edit-profile-avatar" />,
}));

import EditProfileForm from "@app/[locale]/perfil/edita/EditProfileForm";

describe("EditProfileForm", () => {
  beforeEach(() => {
    authUser = baseUser;
    mockRefetchUser.mockReset().mockResolvedValue(undefined);
    mockLogout.mockReset();
    mockPush.mockReset();
    sendGoogleEventMock.mockReset();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("lets an onboarding user (no other logout entry point) log out from here", () => {
    // NavbarClient sends profileCompleted === false users to this page, and
    // logout otherwise only lives on the owner's completed profile page
    // (ProfileOwnerActions) — without this, onboarding users on mobile
    // would have no way to end their session.
    authUser = { ...baseUser, profileCompleted: false };
    render(<EditProfileForm />);
    fireEvent.click(screen.getByText("logout"));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it("fires edit_profile_page_view once on mount, with is_onboarding", () => {
    authUser = { ...baseUser, profileCompleted: false };
    render(<EditProfileForm />);
    expect(sendGoogleEventMock).toHaveBeenCalledWith("edit_profile_page_view", {
      is_onboarding: true,
    });
  });

  it("prefills fields from the current user", () => {
    render(<EditProfileForm />);
    expect(screen.getByLabelText("fields.username")).toHaveValue("alex91");
    expect(screen.getByLabelText("fields.displayName")).toHaveValue(
      "Alex Garcia",
    );
    expect(screen.getByLabelText("fields.bio")).toHaveValue(
      "Organitzo concerts.",
    );
  });

  it("shows the normal edit heading and no username hint by default", () => {
    render(<EditProfileForm />);
    expect(screen.getByRole("heading")).toHaveTextContent("heading");
    expect(screen.queryByText("usernameHint")).toBeNull();
  });

  it("shows onboarding heading and a username hint when profileCompleted is false", () => {
    authUser = { ...baseUser, username: "user-4b34dd41", profileCompleted: false };
    render(<EditProfileForm />);
    expect(screen.getByRole("heading")).toHaveTextContent("onboardingHeading");
    expect(screen.getByText("onboardingSubheading")).toBeInTheDocument();
    expect(screen.getByText("usernameHint")).toBeInTheDocument();
  });

  it("shows onboarding heading but no username hint once the username is no longer the fallback", () => {
    authUser = { ...baseUser, username: "alex91", profileCompleted: false };
    render(<EditProfileForm />);
    expect(screen.getByRole("heading")).toHaveTextContent("onboardingHeading");
    expect(screen.queryByText("usernameHint")).toBeNull();
  });

  it("shows the normal heading when profileCompleted is undefined (transient enrichment blip)", () => {
    authUser = { ...baseUser, profileCompleted: undefined };
    render(<EditProfileForm />);
    expect(screen.getByRole("heading")).toHaveTextContent("heading");
    expect(screen.queryByText("usernameHint")).toBeNull();
  });

  it("rejects an invalid username without calling the API", async () => {
    // Username editing is only possible while it's still the placeholder
    // (see the username-lock tests below) — use that state here so typing
    // a new value is a realistic scenario, not one the UI would block.
    authUser = { ...baseUser, username: "user-4b34dd41" };
    render(<EditProfileForm />);
    fireEvent.change(screen.getByLabelText("fields.username"), {
      target: { value: "ab" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "submitLabel" }));

    expect(
      await screen.findByText("usernameErrors.usernameTooShort"),
    ).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("keeps the username field editable while it's still the placeholder", () => {
    authUser = { ...baseUser, username: "user-4b34dd41" };
    render(<EditProfileForm />);
    expect(screen.getByLabelText("fields.username")).not.toHaveAttribute(
      "readonly",
    );
    expect(screen.queryByText("usernameLockedHint")).toBeNull();
  });

  it("locks the username field once it already holds a real username", () => {
    render(<EditProfileForm />); // baseUser.username is "alex91", not a placeholder
    expect(screen.getByLabelText("fields.username")).toHaveAttribute(
      "readonly",
    );
    expect(screen.getByText("usernameLockedHint")).toBeInTheDocument();
  });

  it("cannot be unlocked by typing: the saved username decides, not the live field value", () => {
    // Defense in depth — the readonly attribute already prevents real typing,
    // but confirm the lock itself is derived from the saved user, not from
    // whatever the (memory-only) username state happens to hold.
    render(<EditProfileForm />);
    fireEvent.change(screen.getByLabelText("fields.username"), {
      target: { value: "user-should-not-matter" },
    });
    expect(screen.getByLabelText("fields.username")).toHaveAttribute(
      "readonly",
    );
  });

  it("rejects an empty display name without calling the API", async () => {
    render(<EditProfileForm />);
    fireEvent.change(screen.getByLabelText("fields.displayName"), {
      target: { value: "   " },
    });
    fireEvent.submit(screen.getByRole("button", { name: "submitLabel" }));

    expect(
      await screen.findByText("errors.displayNameRequired"),
    ).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("PATCHes the profile and refetches the session on success, with no redirect", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    } as Response);

    render(<EditProfileForm />);
    fireEvent.submit(screen.getByRole("button", { name: "submitLabel" }));

    await waitFor(() => expect(mockRefetchUser).toHaveBeenCalledTimes(1));
    expect(fetch).toHaveBeenCalledWith(
      "/api/users/me/profile",
      expect.objectContaining({
        method: "PATCH",
        credentials: "include",
        body: JSON.stringify({
          username: "alex91",
          displayName: "Alex Garcia",
          bio: "Organitzo concerts.",
        }),
      }),
    );
    expect(await screen.findByText("success")).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
    expect(sendGoogleEventMock).toHaveBeenCalledWith(
      "edit_profile_submit_attempt",
      { is_onboarding: false },
    );
    expect(sendGoogleEventMock).toHaveBeenCalledWith(
      "edit_profile_submit_success",
      { is_onboarding: false, redirected: false },
    );
  });

  it("redirects instead of showing the success banner when redirectTo is set", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    } as Response);

    render(<EditProfileForm redirectTo="/publica" />);
    fireEvent.submit(screen.getByRole("button", { name: "submitLabel" }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/publica"));
    expect(screen.queryByText("success")).toBeNull();
    expect(sendGoogleEventMock).toHaveBeenCalledWith(
      "edit_profile_submit_success",
      { is_onboarding: false, redirected: true },
    );
  });

  it("surfaces a 409 as a username-taken field error", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 409,
      json: () => Promise.resolve(null),
    } as Response);

    render(<EditProfileForm />);
    fireEvent.submit(screen.getByRole("button", { name: "submitLabel" }));

    expect(
      await screen.findByText("errors.usernameTaken"),
    ).toBeInTheDocument();
    expect(sendGoogleEventMock).toHaveBeenCalledWith(
      "edit_profile_submit_blocked",
      { reason: "username_taken" },
    );
  });

  it("surfaces a 401 as a session-expired banner", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve(null),
    } as Response);

    render(<EditProfileForm />);
    fireEvent.submit(screen.getByRole("button", { name: "submitLabel" }));

    expect(
      await screen.findByText("errors.sessionExpired"),
    ).toBeInTheDocument();
    expect(sendGoogleEventMock).toHaveBeenCalledWith(
      "edit_profile_submit_blocked",
      { reason: "session_expired" },
    );
  });

  it("surfaces any other failure as a generic error", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve(null),
    } as Response);

    render(<EditProfileForm />);
    fireEvent.submit(screen.getByRole("button", { name: "submitLabel" }));

    expect(await screen.findByText("errors.generic")).toBeInTheDocument();
    expect(sendGoogleEventMock).toHaveBeenCalledWith(
      "edit_profile_submit_error",
      { reason: "generic" },
    );
  });
});
