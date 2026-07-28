import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { AuthUser } from "types/auth";

/**
 * Verifies the client side of the profile-incomplete / stale-session fix:
 * createEventAction returning a CreateEventActionResult (not throwing) must
 * actually flip PublishForm to CompleteProfileGate / a specific error
 * message. PublishForm isn't exported directly (only the auth-gated
 * `Publica` default export is), so this renders through that — useAuth is
 * mocked authenticated+complete so Publica mounts the real PublishForm.
 */

const authUser: AuthUser = {
  id: "user-1",
  email: "a@b.com",
  name: "A",
  username: "a",
  profileCompleted: true,
};

vi.mock("@components/hooks/useAuth", () => ({
  useAuth: () => ({
    user: authUser,
    isAuthenticated: true,
    isLoading: false,
    logout: vi.fn(),
  }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@i18n/routing", () => ({
  Link: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@sentry/nextjs", () => ({
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
}));

vi.mock("@utils/analytics", () => ({
  sendGoogleEvent: vi.fn(),
}));

vi.mock("@components/hooks/useGetRegionsWithCities", () => ({
  useGetRegionsWithCities: () => ({
    regionsWithCities: [],
    isLoading: false,
    isError: false,
  }),
}));

vi.mock("@components/hooks/useCategories", () => ({
  useCategories: () => ({ categories: [] }),
}));

const mockCreateEventAction = vi.fn();
vi.mock("@app/[locale]/publica/actions", () => ({
  createEventAction: (...args: unknown[]) => mockCreateEventAction(...args),
}));

// Minimal stand-in: exposes a way to set the required imageUrl field and a
// submit button wired straight to the real onSubmit handler, bypassing the
// real EventForm's own field UI/validation (out of scope for this test —
// only the createEventAction-result handling is under test here).
vi.mock("@components/ui/EventForm", () => ({
  default: ({
    onSubmit,
    handleFormChange,
  }: {
    onSubmit: (e?: unknown) => void;
    handleFormChange: (field: string, value: unknown) => void;
  }) => (
    <div>
      <button
        type="button"
        onClick={() => handleFormChange("imageUrl", "https://example.com/image.jpg")}
      >
        set-image-url
      </button>
      <button type="button" onClick={() => onSubmit()}>
        submit
      </button>
    </div>
  ),
}));

import Publica from "@app/[locale]/publica/page";

describe("Publica submit-time createEventAction result handling", () => {
  beforeEach(() => {
    mockCreateEventAction.mockReset();
  });

  async function renderAndSubmit() {
    render(<Publica />);
    fireEvent.click(screen.getByText("set-image-url"));
    fireEvent.click(screen.getByText("submit"));
  }

  it("shows CompleteProfileGate instead of a generic error on a profile-incomplete result", async () => {
    mockCreateEventAction.mockResolvedValue({
      success: false,
      reason: "profile-incomplete",
    });

    await renderAndSubmit();

    await waitFor(() =>
      expect(screen.getByTestId("complete-profile-gate")).toBeInTheDocument(),
    );
  });

  it("shows the stale-session message on a stale-session result", async () => {
    mockCreateEventAction.mockResolvedValue({
      success: false,
      reason: "stale-session",
    });

    await renderAndSubmit();

    await waitFor(() =>
      expect(screen.getByText("errorStaleSession")).toBeInTheDocument(),
    );
    expect(screen.queryByTestId("complete-profile-gate")).not.toBeInTheDocument();
  });

  it("proceeds normally on success — no gate, no stale-session error", async () => {
    mockCreateEventAction.mockResolvedValue({
      success: true,
      event: { slug: "test-event", title: "Test Event" },
    });

    await renderAndSubmit();

    await waitFor(() => expect(mockCreateEventAction).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId("complete-profile-gate")).not.toBeInTheDocument();
    expect(screen.queryByText("errorStaleSession")).not.toBeInTheDocument();
  });
});
