// @vitest-environment node
import { IDBObjectStore, IDBOpenDBRequest, IDBVersionChangeEvent } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { discardPublishDraft, loadPublishDraft, savePublishDraft } from "@utils/publish-draft-storage";
import { PUBLISH_DRAFT_MAX_COUNT, PUBLISH_DRAFT_TTL_MS } from "@utils/constants";
import {
  accountA, guest, loadedRevision, resetDraftStorage, savedRevision, seedDraft,
} from "./helpers/publish-draft";

beforeEach(resetDraftStorage);
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("atomic publication draft mutations", () => {
  it.each(["newer save", "discard"] as const)(
    "does not resurrect/replace after a delayed image read and %s", async (action) => {
      const revision = await seedDraft();
      const deferred = Promise.withResolvers<ArrayBuffer>();
      const file = new File(["old"], "old.png", { type: "image/png" });
      vi.spyOn(file, "arrayBuffer").mockReturnValue(deferred.promise);
      const pending = savePublishDraft(guest, {
        form: { title: "stale" }, imageFile: file,
      }, revision);
      const next = action === "discard"
        ? await discardPublishDraft(guest, revision)
        : await savePublishDraft(guest, { form: { title: "newer" }, imageFile: null }, revision);
      savedRevision(next);
      deferred.resolve(new TextEncoder().encode("old").buffer);
      expect(await pending).toEqual({ ok: false, reason: "stale" });
      expect(await loadPublishDraft(guest)).toMatchObject(action === "discard"
        ? { status: "empty" }
        : { status: "found", draft: { form: { title: "newer" }, imageFile: null } });
    },
  );

  it("serializes competing transactions: one wins and the other must resolve a conflict", async () => {
    const revision = await seedDraft();
    const outcomes = await Promise.all(["first", "second"].map((title) =>
      savePublishDraft(guest, { form: { title }, imageFile: null }, revision)));
    expect(outcomes.filter((result) => result.ok)).toHaveLength(1);
    expect(outcomes.filter((result) => !result.ok)).toEqual([{ ok: false, reason: "stale" }]);
    expect(await loadPublishDraft(guest)).toMatchObject({ draft: { form: { title: "first" } } });
    expect(await discardPublishDraft(guest, revision)).toEqual({ ok: false, reason: "stale" });
  });

  it("keeps the deletion fence across reload/module reset and allows an intentional new draft", async () => {
    const revision = await seedDraft();
    savedRevision(await discardPublishDraft(guest, revision));
    vi.resetModules();
    const fresh = await import("@utils/publish-draft-storage");
    expect(await fresh.savePublishDraft(guest, { form: {}, imageFile: null }, revision))
      .toEqual({ ok: false, reason: "stale" });
    savedRevision(await fresh.savePublishDraft(guest, { form: {}, imageFile: null },
      loadedRevision(await fresh.loadPublishDraft(guest))));
  });

  it("bounds owner slots without silently evicting active drafts, reclaims expiry", async () => {
    const now = Date.now();
    const clock = vi.spyOn(Date, "now").mockReturnValue(now);
    for (let i = 0; i < PUBLISH_DRAFT_MAX_COUNT; i++) {
      await seedDraft({ kind: "account", accountId: `owner-${i}` });
    }
    const revision = loadedRevision(await loadPublishDraft(guest));
    expect(await savePublishDraft(guest, { form: {}, imageFile: null }, revision))
      .toEqual({ ok: false, reason: "capacity" });
    expect(await loadPublishDraft({ kind: "account", accountId: "owner-0" }))
      .toMatchObject({ status: "found" });
    clock.mockReturnValue(now + PUBLISH_DRAFT_TTL_MS);
    savedRevision(await savePublishDraft(guest, { form: {}, imageFile: null }, revision));
    expect(await loadPublishDraft({ kind: "account", accountId: "owner-0" }))
      .toMatchObject({ status: "empty" });
  });

  it.each(["QuotaExceededError", "SecurityError", "AbortError"] as const)(
    "reports %s and rolls back both the fields and revision", async (name) => {
      const revision = await seedDraft();
      const original = IDBObjectStore.prototype.put;
      vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(function (
        this: IDBObjectStore, ...args: Parameters<typeof original>
      ) {
        if (this.name === "drafts") throw new DOMException("test failure", name);
        return original.apply(this, args);
      });
      expect(await savePublishDraft(guest, { form: { title: "failed" }, imageFile: null }, revision))
        .toEqual({ ok: false, reason: name === "QuotaExceededError" ? "quota" :
          name === "SecurityError" ? "denied" : "transaction" });
      expect(await loadPublishDraft(guest)).toMatchObject({
        revision, draft: { form: { title: "unfinished" } },
      });
    },
  );

  it("never reports success if the transaction aborts after a successful put request", async () => {
    const revision = await seedDraft();
    const original = IDBObjectStore.prototype.put;
    vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(function (
      this: IDBObjectStore, ...args: Parameters<typeof original>
    ) {
      const request = original.apply(this, args);
      if (this.name === "drafts") {
        request.onsuccess = () => this.transaction.abort();
      }
      return request;
    });
    expect(await savePublishDraft(guest, { form: { title: "failed" }, imageFile: null }, revision))
      .toEqual({ ok: false, reason: "transaction" });
    expect(await loadPublishDraft(guest)).toMatchObject({
      revision, draft: { form: { title: "unfinished" } },
    });
  });

  it("reports discard failure and retains the draft", async () => {
    const revision = await seedDraft(accountA);
    vi.spyOn(IDBObjectStore.prototype, "delete").mockImplementation(() => {
      throw new DOMException("test failure", "SecurityError");
    });
    expect(await discardPublishDraft(accountA, revision)).toEqual({ ok: false, reason: "denied" });
    expect(await loadPublishDraft(accountA)).toMatchObject({ status: "found", revision });
  });

  it("reports a failed image read without losing the previous draft", async () => {
    const revision = await seedDraft();
    const file = new File(["x"], "p.png", { type: "image/png" });
    vi.spyOn(file, "arrayBuffer").mockRejectedValue(new DOMException("denied", "NotAllowedError"));
    expect(await savePublishDraft(guest, { form: {}, imageFile: file }, revision))
      .toEqual({ ok: false, reason: "denied" });
    expect(await loadPublishDraft(guest)).toMatchObject({ status: "found", revision });
  });

  it("reports missing/denied storage, including server-side calls", async () => {
    vi.stubGlobal("indexedDB", undefined);
    expect(await loadPublishDraft(guest)).toEqual({ ok: false, reason: "unavailable" });
    expect(await savePublishDraft(guest, { form: {}, imageFile: null }, null))
      .toEqual({ ok: false, reason: "unavailable" });
    expect(await discardPublishDraft(guest, null)).toEqual({ ok: false, reason: "unavailable" });
    vi.stubGlobal("indexedDB", { open() { throw new DOMException("denied", "SecurityError"); } });
    expect(await loadPublishDraft(guest)).toEqual({ ok: false, reason: "denied" });
  });

  it.each(["blocked", "SecurityError", "QuotaExceededError", "UnknownError", "VersionError"])(
    "reports asynchronous database open outcome %s", async (outcome) => {
      vi.spyOn(indexedDB, "open").mockImplementation(() => {
        const request = new IDBOpenDBRequest();
        queueMicrotask(() => {
          if (outcome === "blocked") {
            request.onblocked?.(new IDBVersionChangeEvent("blocked", { oldVersion: 0, newVersion: 1 }));
          } else {
            Object.defineProperty(request, "error", { value: new DOMException("test failure", outcome) });
            request.onerror?.(new Event("error"));
          }
        });
        return request;
      });
      expect(await loadPublishDraft(guest)).toEqual({
        ok: false,
        reason: outcome === "blocked" ? "blocked" : outcome === "SecurityError" ? "denied" :
          outcome === "QuotaExceededError" ? "quota" : outcome === "VersionError" ? "version" : "transaction",
      });
    },
  );
});
