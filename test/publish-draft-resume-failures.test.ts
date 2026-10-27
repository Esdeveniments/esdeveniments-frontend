// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as publishResume from "@utils/publish-draft-resume";
import * as storage from "@utils/publish-draft-storage";
import { PublishDraftSession } from "@utils/publish-draft-session";
import { PUBLISH_DRAFT_TTL_MS } from "@utils/constants";
import { PublishDraftRecordSchema } from "@lib/validation/publish-draft";
import { accountA, guest, loadedRevision, rawDraft, resetDraftStorage, resumeIntent, savedRevision, seedDraft } from "./helpers/publish-draft";

beforeEach(resetDraftStorage);
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("guest return recovery failures", () => {
  it("allows only one copied account return to claim publication and retains the exact saved snapshot", async () => {
    const revision = await seedDraft(accountA, { title: "Account event" });
    const first = new PublishDraftSession(accountA, vi.fn());
    const second = new PublishDraftSession(accountA, vi.fn());
    try {
      const intent = { ...resumeIntent(revision), action: "publish" as const };
      await Promise.all([first.load(intent), second.load(intent)]);
      const results = await Promise.all([first.claimPublication(), second.claimPublication()]);
      expect(results.filter((result) => result.ok)).toHaveLength(1);
      expect(results.filter((result) => !result.ok && result.reason === "stale")).toHaveLength(1);
      expect(await storage.loadPublishDraft(accountA)).toMatchObject({ status: "found", draft: { form: { title: "Account event" } } });
    } finally { first.dispose(); second.dispose(); }
  });
  it.each(["version", "corrupt", "missing"])("offers explicit metadata repair after a %s fence, without losing the guest", async (kind) => {
    await seedDraft(accountA, { title: "Older account basics" });
    const revision = await seedDraft();
    const intent = { ...resumeIntent(revision), owner: guest };
    const guestBefore = await rawDraft("guest");
    await rawDraft("revision", () => kind === "missing" ? undefined :
      { version: kind === "version" ? 2 : 1, revision: "invalid" }, "metadata");
    const session = new PublishDraftSession(accountA, vi.fn());
    try {
      await session.load(intent);
      expect(session.state).toMatchObject({
        status: "error", guestConflict: false, canDiscard: true,
        failure: { revision: null, reason: kind === "version" ? "version" : "corrupt" },
      });
      expect(await session.discard()).toMatchObject({ ok: true });
      expect(await rawDraft("guest")).toEqual(guestBefore);
      expect(await publishResume.preparePublishDraftResume(accountA, intent)).toEqual({ ok: false, reason: "stale" });
    } finally { session.dispose(); }
  });

  it.each(["corrupt", "version"])("offers a fenced guest replacement for an unreadable %s account draft", async (reason) => {
    await seedDraft(accountA, { title: "Older account basics" });
    const revision = await seedDraft();
    await rawDraft("account:account-a", (raw) => {
      const previous = PublishDraftRecordSchema.parse(raw);
      return reason === "version" ? { ...previous, version: 2 } : { ...previous, form: { title: 42 } };
    });
    const previous = await rawDraft("account:account-a");
    const session = new PublishDraftSession(accountA, vi.fn());
    try {
      await session.load({ ...resumeIntent(revision), owner: guest });
      expect(session.state).toMatchObject({ status: "decision", guestConflict: true, failure: { reason } });
      expect(await rawDraft("account:account-a")).toEqual(previous);
      expect((await session.restoreGuest())?.form.title).toBe("unfinished");
      expect(await rawDraft("guest")).toBeUndefined();
    } finally { session.dispose(); }
  });

  it("reclaims an account draft that expires during login without invalidating the guest handoff", async () => {
    const now = Date.now();
    const clock = vi.spyOn(Date, "now").mockReturnValue(now - PUBLISH_DRAFT_TTL_MS + 10);
    await seedDraft(accountA, { title: "Older account basics" });
    clock.mockReturnValue(now);
    const revision = await seedDraft();
    clock.mockReturnValue(now + 11);
    const session = new PublishDraftSession(accountA, vi.fn());
    try {
      expect(await session.load({ ...resumeIntent(revision), owner: guest })).toMatchObject({
        resumed: true, matchesResume: true, guestConflict: false, draft: { form: { title: "unfinished" } },
      });
      expect(await rawDraft("guest")).toBeUndefined();
    } finally { session.dispose(); }
  });

  it.each(["load", "load-empty-account", "replace"])("keeps both drafts after a %s transaction failure", async (stage) => {
    if (stage !== "load-empty-account") await seedDraft(accountA, { title: "Older account basics" });
    const revision = await seedDraft();
    const session = new PublishDraftSession(accountA, vi.fn());
    try {
      const guestBefore = PublishDraftRecordSchema.parse(await rawDraft("guest"));
      const accountBefore = await rawDraft("account:account-a");
      if (stage === "replace") await session.load({ ...resumeIntent(revision), owner: guest });
      vi.spyOn(publishResume, "preparePublishDraftResume").mockResolvedValueOnce({ ok: false, reason: "transaction" });
      if (stage !== "replace") await session.load({ ...resumeIntent(revision), owner: guest });
      else expect(await session.restoreGuest()).toBeNull();
      expect(session.state).toMatchObject({ guestConflict: true, failure: { reason: "transaction" } });
      expect(await rawDraft("guest")).toEqual(guestBefore);
      expect(await rawDraft("account:account-a")).toEqual(accountBefore);
      const retried = await session.retry();
      if (stage === "load-empty-account") {
        expect(retried).toMatchObject({ resumed: true, draft: { form: { title: "unfinished" } } });
      } else {
        expect(session.state).toMatchObject({ status: "decision", guestConflict: true, failure: null });
        expect((await session.restoreGuest())?.form.title).toBe("unfinished");
      }
      expect(await rawDraft("guest")).toBeUndefined();
    } finally { session.dispose(); }
  });

  it("keeps the moved image recoverable and reports the real error if the post-handoff read fails", async () => {
    await seedDraft(accountA, { title: "Older account basics" });
    const revision = savedRevision(await storage.savePublishDraft(guest, {
      form: { title: "unfinished" },
      imageFile: new File([new Uint8Array([1, 2, 3])], "poster.png", { type: "image/png", lastModified: 123 }),
    }, loadedRevision(await storage.loadPublishDraft(guest))));
    const session = new PublishDraftSession(accountA, vi.fn());
    try {
      await session.load({ ...resumeIntent(revision), owner: guest });
      const guestBefore = PublishDraftRecordSchema.parse(await rawDraft("guest"));
      vi.spyOn(storage, "loadPublishDraft").mockResolvedValueOnce({ ok: false, reason: "transaction" });
      expect(await session.restoreGuest()).toBeNull();
      expect(session.state).toMatchObject({ guestConflict: false, failure: { reason: "transaction" } });
      expect(await rawDraft("guest")).toBeUndefined();
      expect(await rawDraft("account:account-a")).toMatchObject({
        ...guestBefore, owner: accountA, revision: expect.any(String),
      });
      await session.retry();
      const restored = session.restore();
      expect(restored?.form.title).toBe("unfinished");
      expect(new Uint8Array(await restored!.imageFile!.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
    } finally { session.dispose(); }
  });
});
