import { StrictMode } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EventFormProps } from "types/event";
import { PUBLISH_RESUME_STORAGE_KEY } from "@utils/constants";
import Publica from "@app/[locale]/publica/page";
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(window.location.search) }));
const mocks = vi.hoisted(() => ({
  load: vi.fn(), save: vi.fn(), discard: vi.fn(), create: vi.fn(), push: vi.fn(), signIn: vi.fn(),
  user: { id: "a", profileCompleted: true as boolean | undefined }, locale: "es",
  authenticated: true,
}));
vi.mock("@utils/publish-draft-storage", () => ({
  loadPublishDraft: mocks.load, savePublishDraft: mocks.save, discardPublishDraft: mocks.discard,
}));
vi.mock("@components/hooks/useAuth", () => ({
  useAuth: () => ({ user: mocks.user, signIn: mocks.signIn, isAuthenticated: mocks.authenticated, isLoading: false }),
}));
vi.mock("next-intl", () => ({
  useLocale: () => mocks.locale, useTranslations: () => (key: string) => key,
}));
vi.mock("@i18n/routing", () => ({
  Link: "a", useRouter: () => ({ push: mocks.push }),
  getPathname: ({ href, locale }: { href: string; locale: string }) => locale === "ca" ? href : `/${locale}${href}`,
}));
vi.mock("@components/hooks/useGetRegionsWithCities", () => ({
  useGetRegionsWithCities: () => ({ regionsWithCities: [], isLoading: false, isError: false }),
}));
vi.mock("@components/hooks/useCategories", () => ({
  useCategories: () => ({ categories: [], isLoading: false, isError: false }),
}));
vi.mock("@utils/analytics", () => ({ sendGoogleEvent: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({ addBreadcrumb: vi.fn(), captureException: vi.fn() }));
vi.mock("@app/[locale]/publica/actions", () => ({ createEventAction: mocks.create }));
vi.mock("next/dynamic", () => ({ default: () => () => <div>preview-content</div> }));
vi.mock("@components/ui/EventForm", () => ({
  default: ({ form, imageFile, imageToUpload, handleFormChange, handleImageChange, onSubmit, onImagePreparingChange }: EventFormProps) => (
    <div>
      <input aria-label="title" value={form.title} onChange={(e) => handleFormChange("title", e.target.value)} />
      <output data-testid="image">{imageFile?.name}</output>
      <output data-testid="preview-image">{imageToUpload}</output>
      <button onClick={() => handleImageChange(new File(["image"], "poster.png", { type: "image/png" }))}>image</button>
      <button onClick={() => onImagePreparingChange?.(true)}>prepare-image</button>
      <button onClick={onSubmit}>submit</button>
    </div>
  ),
}));
const revision = "00000000-0000-4000-8000-000000000001";
const saved = { form: { title: "Preserved" }, imageFile: new File(["image"], "poster.png", { type: "image/png" }), updatedAt: 1 };
function setReturn(owner = "a", expectedRevision = revision) {
  sessionStorage.setItem(PUBLISH_RESUME_STORAGE_KEY, JSON.stringify({
    version: 1, owner: { kind: "account", accountId: owner },
    revision: expectedRevision, stage: "login", createdAt: Date.now(),
  }));
  window.history.replaceState(null, "", "/es/publica?resume=1&auth_success=1");
}
beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  window.history.replaceState(null, "", "/es/publica");
  mocks.user = { id: "a", profileCompleted: true };
  mocks.authenticated = true;
  mocks.load.mockResolvedValue({ ok: true, status: "empty", revision: null });
  mocks.save.mockImplementation(async (_owner, input) => {
    mocks.load.mockResolvedValue({ ok: true, status: "found", revision, draft: { ...input, updatedAt: 1 } });
    return { ok: true, revision };
  });
  mocks.discard.mockResolvedValue({ ok: true, revision });
  mocks.create.mockResolvedValue({ success: false, reason: "stale-session" });
});
afterEach(() => { vi.restoreAllMocks(); window.history.replaceState(null, "", "/"); });

async function rejectPublication(reason = "stale-session") {
  mocks.create.mockResolvedValue({ success: false, reason });
  render(<Publica />);
  await waitFor(() => expect(screen.getByText("image")).toBeEnabled());
  fireEvent.change(screen.getByLabelText("title"), { target: { value: "Latest" } });
  fireEvent.click(screen.getByText("image"));
  await act(async () => { fireEvent.click(screen.getByText("submit")); });
}

describe("publish auth handoff", () => {
  it("uses shared conflict guidance on repeated auth actions", async () => {
    await rejectPublication(); mocks.save.mockResolvedValue({ ok: false, reason: "stale" });
    await act(async () => { fireEvent.click(screen.getByText("authGate.login")); });
    await act(async () => { fireEvent.click(screen.getByText("authGate.login")); });
    expect(screen.getByText("draftResolveBeforePublish")).toBeVisible();
  });
  it("awaits the exact pending save before localized sign-in and never retries create", async () => {
    await rejectPublication();
    let finish!: (result: { ok: true; revision: string }) => void;
    mocks.save.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    fireEvent.click(screen.getByText("authGate.login"));
    expect(mocks.signIn).not.toHaveBeenCalled();
    mocks.load.mockResolvedValue({ ok: true, status: "found", revision, draft: saved });
    await act(async () => { finish({ ok: true, revision }); });
    expect(mocks.signIn).toHaveBeenCalledWith("/es/publica?resume=1");
    expect(JSON.parse(sessionStorage.getItem(PUBLISH_RESUME_STORAGE_KEY)!)).toMatchObject({ revision, owner: { accountId: "a" } });
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(mocks.save).toHaveBeenCalledWith({ kind: "account", accountId: "a" },
      { form: expect.objectContaining({ title: "Latest" }), imageFile: expect.any(File) }, null);
  });

  it.each(["retry", "discard"])("blocks failed navigation until explicit %s", async (action) => {
    await rejectPublication();
    mocks.save.mockResolvedValueOnce({ ok: false, reason: "quota" });
    await act(async () => { fireEvent.click(screen.getByText("authGate.login")); });
    expect(screen.getByText("draftHandoffFailed")).toBeVisible();
    expect(mocks.signIn).not.toHaveBeenCalled();
    const denied = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("denied"); });
    await act(async () => { fireEvent.click(screen.getByText("authGate.login")); });
    expect(mocks.signIn).not.toHaveBeenCalled();
    denied.mockRestore();
    if (action === "discard") {
      fireEvent.click(screen.getByText("restoreDraftDiscard"));
      await act(async () => { fireEvent.click(screen.getByTestId("draft-discard-modal-action-button")); });
    }
    await act(async () => { fireEvent.click(screen.getByText("authGate.login")); });
    expect(mocks.signIn).toHaveBeenCalledExactlyOnceWith(action === "discard" ? "/es/publica" : "/es/publica?resume=1");
  });

  it("keeps fields for copying, saves before profile navigation and waits for image preparation", async () => {
    await rejectPublication("profile-incomplete");
    expect(screen.getByLabelText("title")).toHaveValue("Latest");
    fireEvent.click(screen.getByText("prepare-image"));
    expect(screen.getByText("completeProfileGate.cta")).toBeDisabled();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("uses the existing profile route with a safe, unprefixed return destination", async () => {
    await rejectPublication("profile-incomplete");
    await act(async () => { fireEvent.click(screen.getByText("completeProfileGate.cta")); });
    expect(mocks.push).toHaveBeenCalledWith("/perfil/edita?redirect=%2Fpublica%3Fresume%3D1");
    expect(mocks.signIn).not.toHaveBeenCalled();
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });
});

describe("one-shot publish return", () => {
  it("restores the real File and preview, including StrictMode, with zero create calls", async () => {
    setReturn();
    mocks.load.mockResolvedValue({ ok: true, status: "found", revision, draft: saved });
    render(<StrictMode><Publica /></StrictMode>);
    await screen.findByTestId("preview-modal");
    expect(screen.getByLabelText("title")).toHaveValue("Preserved");
    expect(screen.getByTestId("image")).toHaveTextContent("poster.png");
    await waitFor(() => expect(screen.getByTestId("preview-image")).toHaveTextContent("data:image/png"));
    expect(mocks.create).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(PUBLISH_RESUME_STORAGE_KEY)).toBeNull();
    expect(window.location.search).not.toContain("resume");
  });

  it.each(["missing", "changed", "account"])("does not resume a %s snapshot", async (kind) => {
    setReturn(kind === "account" ? "other-account" : "a");
    mocks.load.mockResolvedValue(kind === "missing" ? { ok: true, status: "expired", revision } :
      { ok: true, status: "found", revision: kind === "changed" ? crypto.randomUUID() : revision, draft: saved });
    render(<Publica />);
    await screen.findByText("draftResumeFailed");
    expect(screen.queryByTestId("preview-modal")).not.toBeInTheDocument();
    expect(screen.getByLabelText("title")).toHaveValue("");
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("a cancelled auth/manual revisit offers ordinary restore, not automatic preview", async () => {
    setReturn();
    window.history.replaceState(null, "", "/es/publica");
    mocks.load.mockResolvedValue({ ok: true, status: "found", revision, draft: saved });
    render(<Publica />);
    await screen.findByText("restoreDraftApply");
    expect(screen.queryByTestId("preview-modal")).not.toBeInTheDocument();
    expect(sessionStorage.getItem(PUBLISH_RESUME_STORAGE_KEY)).not.toBeNull();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("retains the strict upfront incomplete-profile gate and its resume destination", () => {
    mocks.user.profileCompleted = false;
    setReturn();
    render(<Publica />);
    expect(screen.getByTestId("complete-profile-gate")).toBeVisible();
    expect(screen.getByRole("link", { name: "cta" })).toHaveAttribute("href", "/perfil/edita?redirect=%2Fpublica%3Fresume%3D1");
    expect(sessionStorage.getItem(PUBLISH_RESUME_STORAGE_KEY)).not.toBeNull();
    expect(mocks.load).not.toHaveBeenCalled();
  });

  it.each(["unknown-profile", "signed-out"])("keeps auth authoritative for %s", async (status) => {
    mocks.user.profileCompleted = undefined;
    mocks.authenticated = status !== "signed-out";
    setReturn();
    mocks.load.mockResolvedValue({ ok: true, status: "found", revision, draft: saved });
    render(<Publica />);
    if (mocks.authenticated) await screen.findByTestId("preview-modal");
    else {
      expect(screen.getByTestId("publish-auth-gate")).toBeVisible();
      expect(mocks.load).not.toHaveBeenCalled();
    }
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
