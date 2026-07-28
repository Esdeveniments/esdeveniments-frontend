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
const mockPush = vi.fn();

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@i18n/routing", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@components/hooks/useAuth", () => ({
  useAuth: () => ({ user: authUser, refetchUser: mockRefetchUser }),
}));

vi.mock("@app/[locale]/perfil/edita/EditProfileAvatar", () => ({
  default: () => <div data-testid="edit-profile-avatar" />,
}));

import EditProfileForm from "@app/[locale]/perfil/edita/EditProfileForm";

describe("EditProfileForm", () => {
  beforeEach(() => {
    authUser = baseUser;
    mockRefetchUser.mockReset().mockResolvedValue(undefined);
    mockPush.mockReset();
    vi.stubGlobal("fetch", vi.fn());
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

  it("shows the normal heading when profileCompleted is undefined (transient enrichment blip)", () => {
    authUser = { ...baseUser, profileCompleted: undefined };
    render(<EditProfileForm />);
    expect(screen.getByRole("heading")).toHaveTextContent("heading");
    expect(screen.queryByText("usernameHint")).toBeNull();
  });

  it("rejects an invalid username without calling the API", async () => {
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
  });
});
