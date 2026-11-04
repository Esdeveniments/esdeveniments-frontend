import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PublishDraftLoadResult, PublishDraftWriteResult } from "types/publish-draft";
import { PublishDraftSession } from "@utils/publish-draft-session";
import { PUBLISH_DRAFT_AUTOSAVE_DELAY_MS } from "@utils/constants";

const storage = vi.hoisted(() => ({ load: vi.fn(), save: vi.fn(), discard: vi.fn() }));
vi.mock("@utils/publish-draft-storage", () => ({
  loadPublishDraft: storage.load, savePublishDraft: storage.save, discardPublishDraft: storage.discard,
}));
const owner = { kind: "account", accountId: "a" } as const;
const input = { form: { title: "unfinished" }, imageFile: null };
const saved = { form: { title: "stored" }, imageFile: null, updatedAt: 1 };
const changed = vi.fn();
let session: PublishDraftSession;

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  storage.load.mockResolvedValue({ ok: true, status: "empty", revision: null });
  storage.save.mockResolvedValue({ ok: true, revision: "r1" });
  storage.discard.mockResolvedValue({ ok: true, revision: "deleted" });
  session = new PublishDraftSession(owner, changed);
});
afterEach(() => { session.dispose(); vi.useRealTimers(); });

describe("create-only draft autosave session", () => {
  it.each(["edit", "discard", "dispose"])("rejects a publication claim after %s while its revision check is pending", async (change) => {
    storage.load.mockResolvedValue({ ok: true, status: "found", revision: "r0", draft: saved });
    await session.load();
    session.restore();
    let resolve!: (result: PublishDraftLoadResult) => void;
    storage.load.mockReturnValueOnce(new Promise<PublishDraftLoadResult>((done) => { resolve = done; }));
    const claiming = session.claimPublication();
    if (change === "edit") session.edit(input);
    else if (change === "discard") await session.discard();
    else session.dispose();
    resolve({ ok: true, status: "found", revision: "r0", draft: saved });
    expect(await claiming).toEqual({ ok: false, reason: "stale" });
    expect(storage.save).not.toHaveBeenCalled();
  });

  it.each(["edit", "dispose"])("does not allow creation after %s while a publication claim is committing", async (change) => {
    storage.load.mockResolvedValue({ ok: true, status: "found", revision: "r0", draft: saved });
    await session.load();
    session.restore();
    let resolve!: (result: PublishDraftWriteResult) => void;
    storage.save.mockReturnValueOnce(new Promise<PublishDraftWriteResult>((done) => { resolve = done; }));
    const claiming = session.claimPublication();
    await Promise.resolve();
    await Promise.resolve();
    expect(storage.save).toHaveBeenCalledOnce();
    if (change === "edit") session.edit(input);
    else session.dispose();
    resolve({ ok: true, revision: "claimed" });
    expect(await claiming).toEqual({ ok: false, reason: "stale" });
    if (change === "edit") {
      await session.flush();
      expect(storage.save).toHaveBeenLastCalledWith(owner, input, "claimed");
      expect(session.state.dirty).toBe(false);
    }
  });

  it("keeps edits made during resume lookup for an explicit restore decision", async () => {
    const revision = "00000000-0000-4000-8000-000000000001";
    let resolve!: (result: PublishDraftLoadResult) => void;
    storage.load.mockReturnValue(new Promise<PublishDraftLoadResult>((done) => { resolve = done; }));
    const loading = session.load({ version: 1, owner, revision, stage: "login", createdAt: Date.now() });
    session.edit(input);
    resolve({ ok: true, status: "found", revision, draft: saved });
    expect(await loading).toMatchObject({ resumed: false, matchesResume: true });
    expect(session.state).toMatchObject({ dirty: true, pendingDraft: saved, status: "decision" });
    await session.flush();
    expect(storage.save).not.toHaveBeenCalled();
  });

  it.each(["changed", "deleted", "unavailable"])("blocks a clean handoff after storage is %s", async (status) => {
    storage.load.mockResolvedValue({ ok: true, status: "found", revision: "r0", draft: saved });
    await session.load();
    session.restore();
    storage.load.mockResolvedValue(status === "unavailable" ? { ok: false, reason: "unavailable" }
      : { ok: true, status: status === "deleted" ? "empty" : "found", revision: "r1", draft: saved });
    expect(await session.confirmSaved()).toEqual({ ok: false, reason: status === "unavailable" ? "unavailable" : "stale" });
    expect(session.state.status).toBe("error");
    expect(storage.save).not.toHaveBeenCalled();
  });

  it("waits for a delayed lookup and explicit restore before any save", async () => {
    let resolve!: (result: PublishDraftLoadResult) => void;
    storage.load.mockReturnValue(new Promise<PublishDraftLoadResult>((done) => { resolve = done; }));
    const loading = session.load();
    expect(session.state.status).toBe("loading");
    await vi.advanceTimersByTimeAsync(1000);
    expect(storage.save).not.toHaveBeenCalled();
    resolve({ ok: true, status: "found", revision: "stored", draft: saved });
    await loading;
    expect(session.state.pendingDraft).toEqual(saved);
    await session.flush();
    expect(storage.save).not.toHaveBeenCalled();
    expect(session.restore()).toEqual(saved);
    expect(session.state.status).toBe("saved");
  });

  it("debounces to the latest snapshot, saves changed/removed images and exposes awaited flush", async () => {
    await session.load();
    session.edit(input);
    const file = new File(["image"], "poster.png", { type: "image/png" });
    session.edit({ ...input, imageFile: file });
    await vi.advanceTimersByTimeAsync(PUBLISH_DRAFT_AUTOSAVE_DELAY_MS - 1);
    expect(storage.save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(storage.save).toHaveBeenLastCalledWith(owner, { ...input, imageFile: file }, null);
    session.edit(input);
    await session.flush();
    expect(storage.save).toHaveBeenLastCalledWith(owner, input, "r1");
    expect(session.state).toMatchObject({ status: "saved", dirty: false });
  });

  it("never announces saved for newer edits while a preceding transaction is pending", async () => {
    let resolve!: (result: PublishDraftWriteResult) => void;
    storage.save.mockReturnValueOnce(new Promise<PublishDraftWriteResult>((done) => { resolve = done; }));
    await session.load();
    session.edit(input);
    const flushing = session.flush();
    await Promise.resolve();
    expect(session.state.status).toBe("saving");
    session.edit({ ...input, form: { title: "newer" } });
    resolve({ ok: true, revision: "r1" });
    await flushing;
    expect(session.state).toMatchObject({ status: "saving", dirty: true });
    await session.flush();
    expect(storage.save).toHaveBeenLastCalledWith(owner, { ...input, form: { title: "newer" } }, "r1");
  });

  it("keeps edits after failure, offers an explicit retry and only then reports saved", async () => {
    await session.load();
    storage.save.mockResolvedValueOnce({ ok: false, reason: "quota" });
    session.edit(input);
    expect(await session.flush()).toEqual({ ok: false, reason: "quota" });
    expect(session.state).toMatchObject({ status: "error", dirty: true });
    await vi.advanceTimersByTimeAsync(1000);
    expect(storage.save).toHaveBeenCalledTimes(1);
    await session.retry();
    expect(storage.save).toHaveBeenLastCalledWith(owner, input, null);
    expect(session.state.status).toBe("saved");
  });

  it("does not retry queued snapshots over a conflicting tab; review requires a new decision", async () => {
    await session.load();
    storage.save.mockResolvedValue({ ok: false, reason: "stale" });
    session.edit(input);
    const first = session.flush();
    const second = session.flush();
    await Promise.all([first, second]);
    expect(storage.save).toHaveBeenCalledTimes(1);
    storage.load.mockResolvedValue({ ok: true, status: "found", revision: "other-tab", draft: saved });
    await session.retry();
    expect(session.state).toMatchObject({ status: "decision", pendingDraft: saved, dirty: true });
  });

  it("waits for an in-flight save before discard and cancels every older queued save", async () => {
    let resolve!: (result: PublishDraftWriteResult) => void;
    storage.save.mockReturnValueOnce(new Promise<PublishDraftWriteResult>((done) => { resolve = done; }));
    await session.load();
    session.edit(input);
    const flushing = session.flush();
    await Promise.resolve();
    session.edit({ ...input, form: { title: "queued" } });
    const queued = session.flush();
    const deleting = session.discard();
    expect(storage.discard).not.toHaveBeenCalled();
    resolve({ ok: true, revision: "committed" });
    await Promise.all([flushing, queued, deleting]);
    expect(storage.discard).toHaveBeenCalledWith(owner, "committed");
    await vi.advanceTimersByTimeAsync(1000);
    expect(storage.save).toHaveBeenCalledTimes(1);
    expect(session.state).toMatchObject({ status: "idle", dirty: false, pendingDraft: null });
  });

  it("keeps the draft and failure visible when deletion fails", async () => {
    storage.load.mockResolvedValue({ ok: true, status: "found", revision: "r0", draft: saved });
    await session.load();
    storage.discard.mockResolvedValue({ ok: false, reason: "denied" });
    await session.discard();
    expect(session.state).toMatchObject({ status: "error", pendingDraft: saved });
    await session.retry();
    expect(storage.load).toHaveBeenCalledTimes(2);
    expect(session.state).toMatchObject({ status: "decision", failure: null, pendingDraft: saved });
    expect(session.restore()).toEqual(saved);
  });

  it("permits explicit metadata recovery but never overwrites a failed lookup", async () => {
    storage.load.mockResolvedValue({ ok: false, reason: "corrupt", revision: null });
    await session.load();
    session.edit(input);
    await session.flush();
    expect(storage.save).not.toHaveBeenCalled();
    expect(session.state.canDiscard).toBe(true);
    await session.discard();
    expect(storage.discard).toHaveBeenCalledWith(owner, null);
  });

  it("ignores late reads and cancels scheduled writes after owner unmount", async () => {
    let resolve!: (result: PublishDraftLoadResult) => void;
    storage.load.mockReturnValueOnce(new Promise<PublishDraftLoadResult>((done) => { resolve = done; }));
    const loading = session.load();
    session.dispose();
    changed.mockClear();
    resolve({ ok: true, status: "found", revision: "r0", draft: saved });
    await loading;
    expect(changed).not.toHaveBeenCalled();
    const next = new PublishDraftSession({ kind: "account", accountId: "b" }, changed);
    await next.load();
    next.edit(input);
    next.dispose();
    await vi.advanceTimersByTimeAsync(1000);
    expect(storage.save).not.toHaveBeenCalled();
    expect(storage.load).toHaveBeenLastCalledWith({ kind: "account", accountId: "b" });
  });
});
