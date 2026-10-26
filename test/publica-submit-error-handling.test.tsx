import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
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

const storage = vi.hoisted(() => ({ load: vi.fn(), discard: vi.fn(), save: vi.fn(), push: vi.fn() }));
vi.mock("@utils/publish-draft-storage", () => ({
  loadPublishDraft: storage.load, discardPublishDraft: storage.discard, savePublishDraft: storage.save,
}));

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
  useRouter: () => ({ push: storage.push }),
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

// Minimal stand-in: exposes a way to set the required image file and a
// submit button wired straight to the real onSubmit handler, bypassing the
// real EventForm's own field UI/validation (out of scope for this test —
// only the createEventAction-result handling is under test here).
vi.mock("@components/ui/EventForm", () => ({
  default: ({
    onSubmit,
    handleImageChange,
  }: {
    onSubmit: (e?: unknown) => void;
    handleImageChange: (file: File | null) => void;
  }) => (
    <div>
      <button
        type="button"
        onClick={() =>
          handleImageChange(new File(["x"], "image.jpg", { type: "image/jpeg" }))
        }
      >
        set-image-file
      </button>
      <button type="button" onClick={() => onSubmit()}>
        submit
      </button>
    </div>
  ),
}));

import Publica from "@app/[locale]/publica/page";

describe("Publica submit-time createEventAction result handling", () => {
  afterEach(() => vi.restoreAllMocks());
  beforeEach(() => {
    mockCreateEventAction.mockReset();
    vi.clearAllMocks();
    storage.load.mockResolvedValue({ ok: true, status: "empty", revision: null });
    storage.discard.mockResolvedValue({ ok: true, revision: "deleted" });
    storage.save.mockResolvedValue({ ok: true, revision: "saved" });
    vi.spyOn(window, "alert").mockImplementation(() => {});
  });

  async function renderAndSubmit() {
    render(<Publica />);
    await waitFor(() => expect(screen.getByText("set-image-file")).toBeEnabled());
    await act(async () => { fireEvent.click(screen.getByText("set-image-file")); });
    await act(async () => { fireEvent.click(screen.getByText("submit")); });
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
    expect(storage.discard).not.toHaveBeenCalled();
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
    expect(storage.discard).not.toHaveBeenCalled();
  });

  it("proceeds normally on success — no gate, no stale-session error", async () => {
    mockCreateEventAction.mockResolvedValue({
      success: true,
      event: { slug: "test-event", title: "Test Event" },
    });

    await renderAndSubmit();

    await waitFor(() => expect(mockCreateEventAction).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(storage.push).toHaveBeenCalledWith("/e/test-event?promote=1"));
    expect(storage.discard).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("complete-profile-gate")).not.toBeInTheDocument();
    expect(screen.queryByText("errorStaleSession")).not.toBeInTheDocument();
  });

  it("keeps the draft on an unknown publication failure", async () => {
    mockCreateEventAction.mockRejectedValue(new Error("Network failed"));
    await renderAndSubmit();
    await screen.findByText("errorGeneric");
    expect(storage.discard).not.toHaveBeenCalled();
    expect(storage.push).not.toHaveBeenCalled();
  });

  it("does not clear storage or call create when the image is missing", async () => {
    render(<Publica />);
    await waitFor(() => expect(screen.getByText("submit")).toBeEnabled());
    fireEvent.click(screen.getByText("submit"));
    await screen.findByText("La imatge és obligatòria.");
    expect(storage.discard).not.toHaveBeenCalled();
    expect(mockCreateEventAction).not.toHaveBeenCalled();
  });

  it("reports cleanup failure separately and still navigates after confirmed creation", async () => {
    mockCreateEventAction.mockResolvedValue({ success: true, event: { slug: "created" } });
    storage.discard.mockResolvedValue({ ok: false, reason: "stale" });
    await renderAndSubmit();
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith("draftCleanupFailed"));
    expect(storage.push).toHaveBeenCalledWith("/e/created?promote=1");
    expect(mockCreateEventAction).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("errorGeneric")).not.toBeInTheDocument();
  });
});
