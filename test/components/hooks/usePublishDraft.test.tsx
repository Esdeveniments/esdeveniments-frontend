import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FormData } from "types/event";
import { usePublishDraft } from "@components/hooks/usePublishDraft";

const storage = vi.hoisted(() => ({ load: vi.fn(), save: vi.fn(), discard: vi.fn() }));
vi.mock("@utils/publish-draft-storage", () => ({
  loadPublishDraft: storage.load, savePublishDraft: storage.save, discardPublishDraft: storage.discard,
}));

const form: FormData = {
  title: "Kept", description: "", startDate: "2026-11-03", startTime: "", endDate: "2026-11-03", endTime: "",
  region: null, town: null, location: "", url: "", categories: [], email: "",
};

function useDraft({ loading }: { loading: boolean }) {
  return usePublishDraft({
    accountId: "a", isAuthLoading: loading, form, imageFile: null, step: 0, onRestore: vi.fn(), onReset: vi.fn(),
  });
}

describe("usePublishDraft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storage.load.mockResolvedValue({ ok: true, status: "empty", revision: null });
    storage.save.mockResolvedValue({ ok: true, revision: "r" });
  });

  it("opens the account draft after taking a buffered edit that matches the current input", async () => {
    const first = renderHook(useDraft, { initialProps: { loading: true } });
    act(() => first.result.current.markEdited());
    first.unmount();

    const second = renderHook(useDraft, { initialProps: { loading: false } });
    await waitFor(() => expect(storage.load).toHaveBeenCalledWith({ kind: "account", accountId: "a" }));
    second.unmount();
  });

  it("warns before leaving while an edit is not saved yet", () => {
    const view = renderHook(useDraft, { initialProps: { loading: true } });
    act(() => view.result.current.markEdited());
    view.rerender({ loading: true });
    const unloading = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(unloading);
    expect(unloading.defaultPrevented).toBe(true);
    view.rerender({ loading: false });
    view.unmount();
  });
});
