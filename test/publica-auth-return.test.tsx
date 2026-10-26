import { Activity, StrictMode } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EventFormProps } from "types/event";
import { PUBLISH_RESUME_STORAGE_KEY } from "@utils/constants";
import Publica from "@app/[locale]/publica/page";
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(window.location.search) }));
const mocks = vi.hoisted(() => ({
  load: vi.fn(), save: vi.fn(), discard: vi.fn(), create: vi.fn(), push: vi.fn(), signIn: vi.fn(),
  user: { id: "a", profileCompleted: true as boolean | undefined }, locale: "es",
  authenticated: true, loading: false, track: vi.fn(), optionsFailed: false, retryOptions: vi.fn(),
}));
vi.mock("@utils/publish-draft-storage", () => ({
  loadPublishDraft: mocks.load, savePublishDraft: mocks.save, discardPublishDraft: mocks.discard,
}));
vi.mock("@components/hooks/useAuth", () => ({
  useAuth: () => ({ user: mocks.user, signIn: mocks.signIn, isAuthenticated: mocks.authenticated, isLoading: mocks.loading }),
}));
vi.mock("next-intl", () => ({
  useLocale: () => mocks.locale, useTranslations: () => (key: string) => key,
}));
vi.mock("@i18n/routing", () => ({
  Link: "a", useRouter: () => ({ push: mocks.push }),
  getPathname: ({ href, locale }: { href: string; locale: string }) => locale === "ca" ? href : `/${locale}${href}`,
}));
vi.mock("@components/hooks/useGetRegionsWithCities", () => ({
  useGetRegionsWithCities: () => ({ regionsWithCities: [], isLoading: false, isError: mocks.optionsFailed, mutate: mocks.retryOptions }),
}));
vi.mock("@components/hooks/useCategories", () => ({
  useCategories: () => ({ categories: [], isLoading: false, isError: mocks.optionsFailed, refetch: mocks.retryOptions }),
}));
vi.mock("@utils/analytics", () => ({ sendGoogleEvent: mocks.track }));
vi.mock("@sentry/nextjs", () => ({ addBreadcrumb: vi.fn(), captureException: vi.fn() }));
vi.mock("@app/[locale]/publica/actions", () => ({ createEventAction: mocks.create }));
vi.mock("next/dynamic", () => ({ default: () => () => <div>preview-content</div> }));
vi.mock("@components/ui/EventForm", () => ({
  default: ({ form, imageFile, imageToUpload, handleFormChange, handleImageChange, onSubmit, onImagePreparingChange, submitLabel, isSubmitDisabled, onPreview }: EventFormProps) => (
    <div>
      <input aria-label="title" value={form.title} onChange={(e) => handleFormChange("title", e.target.value)} />
      <output data-testid="image">{imageFile?.name}</output>
      <output data-testid="preview-image">{imageToUpload}</output>
      <button onClick={() => handleImageChange(new File(["image"], "poster.png", { type: "image/png" }))}>image</button>
      <button onClick={() => onImagePreparingChange?.(true)}>prepare-image</button>
      <button onClick={() => onImagePreparingChange?.(false)}>finish-image</button>
      <button onClick={onSubmit}>submit</button>
      <button onClick={onSubmit} disabled={isSubmitDisabled}>{submitLabel}</button>
      <button onClick={onPreview}>preview</button>
      <button onClick={() => {
        handleFormChange("description", "A detailed description for validation.");
        handleFormChange("location", "Park");
        handleFormChange("town", { value: "1", label: "Town" });
        handleFormChange("region", { value: "2", label: "Region" });
        handleFormChange("url", "https://example.com");
        handleImageChange(new File(["image"], "poster.png", { type: "image/png" }));
      }}>valid-fields</button>
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
  mocks.locale = "es";
  mocks.loading = false;
  mocks.optionsFailed = false;
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
  it("consumes a fresh profile intent when a cached editor reactivates after login", async () => {
    mocks.user.profileCompleted = false;
    mocks.load.mockResolvedValue({ ok: true, status: "found", revision, draft: saved });
    setReturn();
    const view = render(<Activity mode="visible"><Publica /></Activity>);
    await waitFor(() => expect(screen.getByTestId("preview-modal")).toBeVisible());
    fireEvent.click(screen.getByText("valid-fields"));
    await act(async () => { fireEvent.click(screen.getAllByText("publishCta.completeProfile")[0]); });
    expect(mocks.push).toHaveBeenCalledOnce();
    expect(JSON.parse(sessionStorage.getItem(PUBLISH_RESUME_STORAGE_KEY)!)).toMatchObject({ stage: "profile" });
    view.rerender(<Activity mode="hidden"><Publica /></Activity>);
    mocks.user.profileCompleted = true;
    window.history.replaceState(null, "", "/es/publica?resume=1");
    view.rerender(<Activity mode="visible"><Publica /></Activity>);
    await waitFor(() => expect(sessionStorage.getItem(PUBLISH_RESUME_STORAGE_KEY)).toBeNull());
    expect(screen.queryByText("draftResumeFailed")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("preview-modal-action-button")).toBeEnabled());
    expect(screen.getByTestId("preview-modal-action-button")).toHaveTextContent("submitLabel");
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("uses shared conflict guidance on repeated auth actions", async () => {
    await rejectPublication(); mocks.save.mockResolvedValue({ ok: false, reason: "stale" });
    await act(async () => { fireEvent.click(screen.getAllByText("publishCta.signIn")[0]); });
    await act(async () => { fireEvent.click(screen.getAllByText("publishCta.signIn")[0]); });
    expect(screen.getByText("draftResolveBeforePublish")).toBeVisible();
  });
  it("awaits the exact pending save before localized sign-in and never retries create", async () => {
    await rejectPublication();
    let finish!: (result: { ok: true; revision: string }) => void;
    mocks.save.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    fireEvent.click(screen.getAllByText("publishCta.signIn")[0]);
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
    await act(async () => { fireEvent.click(screen.getAllByText("publishCta.signIn")[0]); });
    expect(screen.getByText("draftHandoffFailed")).toBeVisible();
    expect(mocks.signIn).not.toHaveBeenCalled();
    const denied = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("denied"); });
    await act(async () => { fireEvent.click(screen.getAllByText("publishCta.signIn")[0]); });
    expect(mocks.signIn).not.toHaveBeenCalled();
    denied.mockRestore();
    if (action === "discard") {
      fireEvent.click(screen.getByText("restoreDraftDiscard"));
      await act(async () => { fireEvent.click(screen.getByTestId("draft-discard-modal-action-button")); });
    }
    await act(async () => { fireEvent.click(screen.getAllByText("publishCta.signIn")[0]); });
    expect(mocks.signIn).toHaveBeenCalledExactlyOnceWith(action === "discard" ? "/es/publica" : "/es/publica?resume=1");
  });

  it("keeps fields for copying, saves before profile navigation and waits for image preparation", async () => {
    await rejectPublication("profile-incomplete");
    expect(screen.getByLabelText("title")).toHaveValue("Latest");
    fireEvent.click(screen.getByText("prepare-image"));
    expect(screen.getAllByText("publishCta.completeProfile")[0]).toBeDisabled();
    expect(mocks.push).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("finish-image"));
    expect(screen.getAllByText("publishCta.completeProfile")[0]).toBeEnabled();
    await act(async () => { fireEvent.click(screen.getAllByText("publishCta.completeProfile")[0]); });
    expect(mocks.push).toHaveBeenCalledWith("/perfil/edita?redirect=%2Fpublica%3Fresume%3D1");
  });

  it("awaits saving fields and File before the safe, unprefixed profile destination", async () => {
    await rejectPublication("profile-incomplete");
    let finish!: (result: { ok: true; revision: string }) => void;
    mocks.save.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    fireEvent.click(screen.getAllByText("publishCta.completeProfile")[0]);
    expect(mocks.push).not.toHaveBeenCalled();
    mocks.load.mockResolvedValue({ ok: true, status: "found", revision, draft: saved });
    await act(async () => { finish({ ok: true, revision }); });
    expect(mocks.save).toHaveBeenCalledWith({ kind: "account", accountId: "a" },
      { form: expect.objectContaining({ title: "Latest" }), imageFile: expect.any(File) }, null);
    expect(mocks.push).toHaveBeenCalledWith("/perfil/edita?redirect=%2Fpublica%3Fresume%3D1");
    expect(mocks.signIn).not.toHaveBeenCalled();
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });

  it("unlocks a completed handoff only on persisted pageshow and allows another deliberate action", async () => {
    await rejectPublication();
    await act(async () => { fireEvent.click(screen.getAllByText("publishCta.signIn")[0]); });
    expect(screen.getByLabelText("title")).toBeDisabled();
    act(() => { window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: false })); });
    expect(screen.getByLabelText("title")).toBeDisabled();
    act(() => { window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })); });
    expect(screen.getByLabelText("title")).toBeEnabled();
    await act(async () => { fireEvent.click(screen.getAllByText("publishCta.signIn")[0]); });
    expect(mocks.signIn).toHaveBeenCalledTimes(2);
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

  it("restores an incomplete-profile return into editable preview without publishing", async () => {
    mocks.user.profileCompleted = false;
    setReturn();
    mocks.load.mockResolvedValue({ ok: true, status: "found", revision, draft: saved });
    render(<Publica />);
    await screen.findByTestId("preview-modal");
    expect(screen.getByTestId("preview-modal-action-button")).toHaveTextContent("publishCta.completeProfile");
    expect(sessionStorage.getItem(PUBLISH_RESUME_STORAGE_KEY)).toBeNull();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  describe("guest editor publication policy", () => {
    it("allows edits during hydration and keeps them in the resolved account without creating", async () => {
      mocks.loading = true;
      const view = render(<Publica />);
      fireEvent.change(screen.getByLabelText("title"), { target: { value: "While loading" } });
      expect(screen.getByText("publishCta.resolving")).toBeDisabled();
      fireEvent.click(screen.getByText("submit"));
      expect(mocks.load).not.toHaveBeenCalled();
      mocks.loading = false;
      view.rerender(<Publica />);
      await waitFor(() => expect(screen.getByLabelText("title")).toBeEnabled());
      expect(screen.getByLabelText("title")).toHaveValue("While loading");
      expect(mocks.load).toHaveBeenCalledWith({ kind: "account", accountId: "a" });
      expect(mocks.create).not.toHaveBeenCalled();
    });

    it("reports public option failures and retries both without a backend bypass", async () => {
      mocks.authenticated = false;
      mocks.optionsFailed = true;
      render(<Publica />);
      expect(screen.getByText("optionsFailed")).toBeVisible();
      fireEvent.click(screen.getByText("draftRetry"));
      expect(mocks.retryOptions).toHaveBeenCalledTimes(2);
      expect(mocks.create).not.toHaveBeenCalled();
    });

    it("never creates twice while an explicit publication is pending", async () => {
      let finish!: (result: { success: false; reason: "stale-session" }) => void;
      mocks.create.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
      render(<Publica />);
      await waitFor(() => expect(screen.getByLabelText("title")).toBeEnabled());
      fireEvent.click(screen.getByText("image"));
      act(() => {
        fireEvent.click(screen.getByText("submit"));
        fireEvent.click(screen.getByText("submit"));
      });
      expect(mocks.create).toHaveBeenCalledTimes(1);
      await act(async () => { finish({ success: false, reason: "stale-session" }); });
      expect(mocks.create).toHaveBeenCalledTimes(1);
    });

    it.each(["ca", "es", "en"])("saves incomplete guest fields before early %s sign-in without submit telemetry", async (locale) => {
      mocks.locale = locale;
      mocks.authenticated = false;
      render(<Publica />);
      await waitFor(() => expect(screen.getByLabelText("title")).toBeEnabled());
      fireEvent.change(screen.getByLabelText("title"), { target: { value: "Incomplete guest" } });
      await act(async () => { fireEvent.click(screen.getByTestId("publish-early-sign-in")); });
      expect(mocks.save).toHaveBeenCalledWith({ kind: "guest" },
        { form: expect.objectContaining({ title: "Incomplete guest" }), imageFile: null }, null);
      expect(mocks.signIn).toHaveBeenCalledWith(`${locale === "ca" ? "" : `/${locale}`}/publica?resume=1`);
      act(() => { window.dispatchEvent(new Event("beforeunload")); });
      expect(mocks.track.mock.calls.some(([name]) => name === "publish_submit_attempt" || name === "publish_success" || name === "publish_form_abandon")).toBe(false);
      expect(mocks.create).not.toHaveBeenCalled();
    });

    it("shares guest auth policy with preview, keeps it open and restores focus after failed storage", async () => {
      mocks.authenticated = false;
      render(<Publica />);
      await waitFor(() => expect(screen.getByLabelText("title")).toBeEnabled());
      fireEvent.change(screen.getByLabelText("title"), { target: { value: "Guest preview" } });
      fireEvent.click(screen.getByText("valid-fields"));
      fireEvent.click(screen.getByText("preview"));
      const action = await screen.findByTestId("preview-modal-action-button");
      expect(action).toHaveTextContent("publishCta.signIn");
      mocks.save.mockResolvedValueOnce({ ok: false, reason: "quota" });
      action.focus();
      await act(async () => { fireEvent.click(action); });
      expect(screen.getByTestId("preview-modal")).toBeVisible();
      expect(screen.getByTestId("preview-modal")).toHaveTextContent("draftHandoffFailed");
      await waitFor(() => expect(action).toHaveFocus());
      expect(mocks.signIn).not.toHaveBeenCalled();
      expect(mocks.create).not.toHaveBeenCalled();
    });

    it("preserves guest edits on an in-document login without implicitly adopting them", async () => {
      mocks.authenticated = false;
      const view = render(<Publica />);
      await waitFor(() => expect(screen.getByLabelText("title")).toBeEnabled());
      fireEvent.change(screen.getByLabelText("title"), { target: { value: "Guest edits" } });
      mocks.authenticated = true;
      view.rerender(<Publica />);
      expect(screen.getByLabelText("title")).toHaveValue("Guest edits");
      expect(screen.getByText("draftOwnerChanged")).toBeVisible();
      await act(async () => { fireEvent.click(screen.getByText("submit")); });
      expect(mocks.save.mock.calls.every(([owner]) => owner.kind === "guest")).toBe(true);
      expect(mocks.load).not.toHaveBeenCalledWith({ kind: "account", accountId: "a" });
      expect(mocks.create).not.toHaveBeenCalled();
    });
  });

  it.each(["unknown-profile", "signed-out"])("keeps auth authoritative for %s", async (status) => {
    mocks.user.profileCompleted = undefined;
    mocks.authenticated = status !== "signed-out";
    setReturn();
    mocks.load.mockResolvedValue({ ok: true, status: "found", revision, draft: saved });
    render(<Publica />);
    if (mocks.authenticated) await screen.findByTestId("preview-modal");
    else {
      await screen.findByText("restoreDraftApply");
      expect(screen.queryByTestId("preview-modal")).not.toBeInTheDocument();
      expect(sessionStorage.getItem(PUBLISH_RESUME_STORAGE_KEY)).not.toBeNull();
      expect(mocks.load).toHaveBeenCalledWith({ kind: "guest" });
    }
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
