import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EventFormProps } from "types/event";
import type { PublishDraftLoadResult } from "types/publish-draft";
import Publica from "@app/[locale]/publica/page";

const mocks = vi.hoisted(() => ({
  load: vi.fn(), save: vi.fn(), discard: vi.fn(),
  user: { id: "a", profileCompleted: true },
}));
vi.mock("@utils/publish-draft-storage", () => ({
  loadPublishDraft: mocks.load, savePublishDraft: mocks.save, discardPublishDraft: mocks.discard,
}));
vi.mock("@components/hooks/useAuth", () => ({
  useAuth: () => ({ user: mocks.user, isAuthenticated: true, isLoading: false }),
}));
vi.mock("@components/hooks/useGetRegionsWithCities", () => ({
  useGetRegionsWithCities: () => ({ regionsWithCities: [], isLoading: false, isError: false }),
}));
vi.mock("@components/hooks/useCategories", () => ({
  useCategories: () => ({ categories: [], isLoading: false, isError: false }),
}));
vi.mock("next-intl", () => ({ useLocale: () => "ca", useTranslations: () => (key: string) => key }));
vi.mock("@i18n/routing", () => ({ Link: "a", useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@utils/analytics", () => ({ sendGoogleEvent: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({ addBreadcrumb: vi.fn(), captureException: vi.fn() }));
vi.mock("@app/[locale]/publica/actions", () => ({ createEventAction: vi.fn() }));
vi.mock("@components/ui/EventForm", () => ({
  default: ({ form, imageFile, imageToUpload, handleFormChange, handleImageChange, onSubmit }: EventFormProps) => (
    <div>
      <input aria-label="title" value={form.title} onChange={(event) => handleFormChange("title", event.target.value)} />
      <output data-testid="image">{imageFile?.name}</output>
      <output data-testid="image-preview">{imageToUpload}</output>
      <button type="button" onClick={() => handleImageChange(null)}>remove-image</button>
      <button type="button" onClick={onSubmit}>submit</button>
    </div>
  ),
}));

const image = new File(["image"], "poster.png", { type: "image/png", lastModified: 123 });
const draft = { form: { title: "Incomplete", startDate: "2000-01-01" }, imageFile: image, updatedAt: 1 };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = { id: "a", profileCompleted: true };
  mocks.load.mockResolvedValue({ ok: true, status: "found", revision: "r0", draft });
  mocks.save.mockResolvedValue({ ok: true, revision: "r1" });
  mocks.discard.mockResolvedValue({ ok: true, revision: "removed" });
});
afterEach(() => vi.useRealTimers());

describe("publish draft recovery UI", () => {
  it("does not overwrite state or save defaults during a delayed read; restores File and preview", async () => {
    let resolve!: (value: PublishDraftLoadResult) => void;
    mocks.load.mockReturnValue(new Promise<PublishDraftLoadResult>((done) => { resolve = done; }));
    render(<Publica />);
    expect(screen.getByLabelText("title")).toBeDisabled();
    expect(mocks.save).not.toHaveBeenCalled();
    await act(async () => { resolve({ ok: true, status: "found", revision: "r0", draft }); });
    expect(screen.getByLabelText("title")).toHaveValue("");
    fireEvent.click(screen.getByText("restoreDraftApply"));
    expect(screen.getByLabelText("title")).toHaveValue("Incomplete");
    expect(screen.getByTestId("image")).toHaveTextContent("poster.png");
    await waitFor(() => expect(screen.getByTestId("image-preview")).toHaveTextContent("data:image/png"));
    expect(screen.getByText("draftDateExpired")).toBeInTheDocument();
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("cancel keeps a draft; confirmed discard removes it and resets fields without resaving", async () => {
    render(<Publica />);
    await screen.findByText("restoreDraftApply");
    fireEvent.click(screen.getByText("restoreDraftDiscard"));
    fireEvent.click(screen.getByText("draftKeep"));
    await waitFor(() => expect(screen.queryByTestId("draft-discard-modal")).not.toBeInTheDocument());
    expect(mocks.discard).not.toHaveBeenCalled();
    expect(screen.getByText("restoreDraftApply")).toBeInTheDocument();
    const previousEditor = screen.getByLabelText("title");
    fireEvent.click(screen.getByText("restoreDraftDiscard"));
    fireEvent.click(await screen.findByTestId("draft-discard-modal-action-button"));
    await waitFor(() => expect(mocks.discard).toHaveBeenCalledWith({ kind: "account", accountId: "a" }, "r0"));
    await waitFor(() => expect(screen.queryByText("restoreDraftApply")).not.toBeInTheDocument());
    expect(screen.getByLabelText("title")).toHaveValue("");
    expect(previousEditor).not.toBeInTheDocument();
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("flushes edited fields on SPA unmount before the debounce fires", async () => {
    mocks.load.mockResolvedValue({ ok: true, status: "empty", revision: "r0" });
    const view = render(<Publica />);
    await waitFor(() => expect(screen.getByLabelText("title")).toBeEnabled());
    vi.useFakeTimers();
    fireEvent.change(screen.getByLabelText("title"), { target: { value: "Leaving now" } });
    await act(async () => { view.unmount(); });
    expect(mocks.save).toHaveBeenCalledWith(
      { kind: "account", accountId: "a" },
      { form: expect.objectContaining({ title: "Leaving now" }), imageFile: null }, "r0",
    );
  });

  it("keeps dirty conflict fields focusable for copying without overwriting the other draft", async () => {
    mocks.load.mockResolvedValueOnce({ ok: true, status: "empty", revision: "r0" });
    mocks.save.mockResolvedValue({ ok: false, reason: "stale" });
    render(<Publica />);
    await waitFor(() => expect(screen.getByLabelText("title")).toBeEnabled());
    vi.useFakeTimers();
    fireEvent.change(screen.getByLabelText("title"), { target: { value: "Keep this text" } });
    await act(() => vi.advanceTimersByTimeAsync(600));
    await act(async () => { fireEvent.click(screen.getByText("submit")); });
    expect(screen.getByText("draftResolveBeforePublish")).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByText("draftReviewConflict")); });
    expect(screen.getByText("draftRestoreReplacesEdits")).toBeInTheDocument();
    const title = screen.getByLabelText("title");
    expect(title).toBeEnabled();
    expect(title.closest("fieldset")).not.toHaveAttribute("inert");
    expect(title).toHaveValue("Keep this text");
    fireEvent.change(title, { target: { value: "Still mine" } });
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(mocks.save).toHaveBeenCalledTimes(1);
    expect(title).toHaveValue("Still mine");
    await act(async () => { fireEvent.click(screen.getByText("submit")); });
    expect(screen.getByRole("alert")).toHaveTextContent("draftResolveBeforePublish");
    fireEvent.click(screen.getByText("restoreDraftApply"));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows save failures without claiming saved, keeps edits and saves removed images on retry", async () => {
    render(<Publica />);
    fireEvent.click(await screen.findByText("restoreDraftApply"));
    await waitFor(() => expect(screen.getByTestId("image-preview")).toHaveTextContent("data:image/png"));
    vi.useFakeTimers();
    mocks.save.mockResolvedValueOnce({ ok: false, reason: "quota" });
    fireEvent.change(screen.getByLabelText("title"), { target: { value: "Still editing" } });
    fireEvent.click(screen.getByText("remove-image"));
    expect(screen.queryByText("draftSaved")).not.toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(600));
    expect(screen.getByText("draftStorageFull")).toBeInTheDocument();
    expect(screen.getByLabelText("title")).toHaveValue("Still editing");
    expect(screen.queryByText("draftSaved")).not.toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByText("draftRetry")); });
    expect(mocks.save).toHaveBeenLastCalledWith(
      { kind: "account", accountId: "a" },
      { form: expect.objectContaining({ title: "Still editing" }), imageFile: null }, "r0",
    );
    expect(screen.getByText("draftSaved")).toBeInTheDocument();
  });

  it("never displays an account's fields or delayed reads after switching owners", async () => {
    const view = render(<Publica />);
    fireEvent.click(await screen.findByText("restoreDraftApply"));
    expect(screen.getByLabelText("title")).toHaveValue("Incomplete");
    let resolve!: (value: PublishDraftLoadResult) => void;
    mocks.load.mockReturnValueOnce(new Promise<PublishDraftLoadResult>((done) => { resolve = done; }));
    mocks.user = { id: "b", profileCompleted: true };
    view.rerender(<Publica />);
    expect(screen.getByLabelText("title")).toHaveValue("");
    mocks.user = { id: "c", profileCompleted: true };
    mocks.load.mockResolvedValue({ ok: true, status: "empty", revision: "r2" });
    view.rerender(<Publica />);
    await act(async () => { resolve({ ok: true, status: "found", revision: "r1", draft }); });
    await waitFor(() => expect(screen.getByLabelText("title")).toBeEnabled());
    expect(screen.getByLabelText("title")).toHaveValue("");
    expect(screen.queryByText("restoreDraftApply")).not.toBeInTheDocument();
    expect(mocks.save).not.toHaveBeenCalled();
  });
});
