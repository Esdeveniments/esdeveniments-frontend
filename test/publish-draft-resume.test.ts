// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  preparePublishDraftResume, savePublishResumeIntent, takePublishResumeIntent,
} from "@utils/publish-draft-resume";
import { loadPublishDraft, savePublishDraft } from "@utils/publish-draft-storage";
import { PUBLISH_DRAFT_TTL_MS, PUBLISH_RESUME_STORAGE_KEY, PUBLISH_RESUME_TTL_MS } from "@utils/constants";
import { accountA, accountB, guest, loadedRevision, rawDraft, resetDraftStorage, resumeIntent as intent, savedRevision, seedDraft } from "./helpers/publish-draft";
import { PublishDraftSession } from "@utils/publish-draft-session";

const values = new Map<string, string>();
beforeEach(async () => {
  await resetDraftStorage();
  values.clear();
  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("tab-local publish return intent", () => {
  it.each(["restore", "publish"] as const)("round-trips an explicit %s action only once", (action) => {
    const saved = { ...intent(), action };
    expect(savePublishResumeIntent(saved)).toMatchObject({ ok: true });
    expect(takePublishResumeIntent()).toEqual({ ok: true, intent: saved });
    expect(takePublishResumeIntent()).toEqual({ ok: false, reason: "missing" });
  });
  it("round-trips once without form data, credentials or URL destinations", () => {
    const saved = intent();
    expect(savePublishResumeIntent(saved)).toMatchObject({ ok: true });
    expect(JSON.parse(values.get(PUBLISH_RESUME_STORAGE_KEY)!)).toEqual(saved);
    expect(takePublishResumeIntent()).toEqual({ ok: true, intent: saved });
    expect(takePublishResumeIntent()).toEqual({ ok: false, reason: "missing" });
  });

  it.each(["json", "version", "revision", "action", "extra", "expired", "future"])("rejects %s intent once", (field) => {
    const saved = intent();
    const raw = field === "version" ? { ...saved, version: 2 }
      : field === "revision" ? { ...saved, revision: null }
      : field === "action" ? { ...saved, action: "retry-until-published" }
      : field === "extra" ? { ...saved, accessToken: "not-accepted" }
      : field === "expired" ? { ...saved, createdAt: Date.now() - PUBLISH_RESUME_TTL_MS }
      : field === "future" ? { ...saved, createdAt: Date.now() + 600_000 } : saved;
    values.set(PUBLISH_RESUME_STORAGE_KEY, field === "json" ? "{" : JSON.stringify(raw));
    expect(takePublishResumeIntent()).toEqual({ ok: false, reason: "invalid" });
    expect(values.size).toBe(0);
  });

  it("reports denied sessionStorage explicitly", () => {
    vi.stubGlobal("sessionStorage", {
      setItem: () => { throw new DOMException("denied", "SecurityError"); },
      getItem: () => { throw new DOMException("denied", "SecurityError"); },
    });
    expect(savePublishResumeIntent(intent())).toEqual({ ok: false, reason: "unavailable" });
    expect(takePublishResumeIntent()).toEqual({ ok: false, reason: "unavailable" });
  });

  it("rejects account switches without reading another account's fields", async () => {
    const revision = await seedDraft(accountA);
    expect(await preparePublishDraftResume(accountB, intent(revision))).toEqual({ ok: false, reason: "stale" });
    expect(await loadPublishDraft(accountB)).toMatchObject({ status: "empty" });
    expect(await loadPublishDraft(accountA)).toMatchObject({ status: "found" });
  });
});

describe("deliberate guest handoff boundary for guest editing", () => {
  it("moves the exact guest image even when newer hydration edits require an explicit restore", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "poster.png", { type: "image/png", lastModified: 123 });
    const revision = savedRevision(await savePublishDraft(guest, { form: { title: "Guest" }, imageFile: file }, null));
    const session = new PublishDraftSession(accountA, vi.fn());
    try {
      session.edit({ form: { title: "New input" }, imageFile: null });
      expect(await session.load({ ...intent(revision), owner: guest })).toMatchObject({
        resumed: false, matchesResume: true,
      });
      expect(session.state).toMatchObject({ status: "decision", dirty: true, pendingDraft: {
        form: { title: "Guest" }, imageFile: { name: file.name, lastModified: file.lastModified },
      } });
      expect(await session.flush()).toEqual({ ok: false, reason: "unavailable" });
      expect(await rawDraft("guest")).toBeUndefined();
      const restored = session.restore();
      expect(new Uint8Array(await restored!.imageFile!.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
    } finally { session.dispose(); }
  });

  it("moves real bytes and metadata atomically, fences the guest and leaves no implicit adoption", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "poster.png", { type: "image/png", lastModified: 123 });
    const revision = savedRevision(await savePublishDraft(guest, { form: { title: "Guest" }, imageFile: file }, null));
    expect(await loadPublishDraft(accountA)).toMatchObject({ status: "empty" });
    const result = await preparePublishDraftResume(accountA, { ...intent(revision), owner: guest });
    expect(result.ok).toBe(true);
    expect(await rawDraft("guest")).toBeUndefined();
    const loaded = await loadPublishDraft(accountA);
    expect(loaded).toMatchObject({ status: "found", draft: { form: { title: "Guest" }, imageFile: {
      name: file.name, type: file.type, lastModified: file.lastModified, size: file.size,
    } } });
    if (!loaded.ok || loaded.status !== "found") throw new Error("Draft missing");
    expect(new Uint8Array(await loaded.draft.imageFile!.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
    expect(await savePublishDraft(guest, { form: {}, imageFile: null }, revision)).toEqual({ ok: false, reason: "stale" });
  });

  it("never replaces an existing account draft or adopts a changed guest snapshot", async () => {
    await seedDraft(accountA);
    const revision = await seedDraft();
    expect(await preparePublishDraftResume(accountA, { ...intent(revision), owner: guest }))
      .toEqual({ ok: false, reason: "account-conflict" });
    expect(await rawDraft("guest")).toBeDefined();
    await seedDraft();
    expect(await preparePublishDraftResume(accountB, { ...intent(revision), owner: guest }))
      .toEqual({ ok: false, reason: "stale" });
    expect(await loadPublishDraft(accountA)).toMatchObject({ draft: { form: { title: "unfinished" } } });
  });

  it.each(["guest", "account", "competing-write", "expired-intent"])("requires an explicit %s choice when both drafts exist", async (choice) => {
    await seedDraft(accountA);
    const image = new File([new Uint8Array([1, 2, 3])], "guest.png", { type: "image/png", lastModified: 123 });
    const form = { title: "New guest", location: "Guest venue", startDate: "2027-01-02T12:30" };
    const revision = savedRevision(await savePublishDraft(guest, { form, imageFile: image },
      loadedRevision(await loadPublishDraft(guest))));
    const guestBefore = await rawDraft("guest");
    const accountBefore = await rawDraft("account:account-a");
    const session = new PublishDraftSession(accountA, vi.fn());
    try {
      expect(await session.load({ ...intent(revision), owner: guest })).toMatchObject({
        guestConflict: true, resumed: false, matchesResume: false,
      });
      expect(await rawDraft("guest")).toEqual(guestBefore);
      expect(await rawDraft("account:account-a")).toEqual(accountBefore);
      if (choice === "account") {
        expect(session.restore()?.form.title).toBe("unfinished");
        expect(session.state.guestConflict).toBe(false);
        expect(await rawDraft("guest")).toEqual(guestBefore);
        expect(await rawDraft("account:account-a")).toEqual(accountBefore);
      } else if (choice === "competing-write" || choice === "expired-intent") {
        if (choice === "competing-write") await seedDraft(accountA);
        else {
          const later = Date.now() + PUBLISH_RESUME_TTL_MS;
          vi.spyOn(Date, "now").mockReturnValue(later);
        }
        const newer = await rawDraft("account:account-a");
        expect(await session.restoreGuest()).toBeNull();
        expect(session.state.failure?.reason).toBe("stale");
        expect(await rawDraft("guest")).toEqual(guestBefore);
        expect(await rawDraft("account:account-a")).toEqual(newer);
      } else {
        const [restored, repeated] = await Promise.all([session.restoreGuest(), session.restoreGuest()]);
        expect(repeated).toBeNull();
        expect(restored?.form).toEqual(form);
        expect(restored?.imageFile).toMatchObject({ name: image.name, lastModified: image.lastModified, type: image.type });
        expect(new Uint8Array(await restored!.imageFile!.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
        expect(await rawDraft("guest")).toBeUndefined();
        expect(session.state).toMatchObject({ guestConflict: false, dirty: false, status: "saved" });
        expect(await savePublishDraft(guest, { form: {}, imageFile: null }, revision))
          .toEqual({ ok: false, reason: "stale" });
      }
    } finally { session.dispose(); }
  });

  it("rejects an expired guest without discarding its bytes during a failed handoff", async () => {
    const revision = await seedDraft();
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now + PUBLISH_DRAFT_TTL_MS);
    expect(await preparePublishDraftResume(accountA, { ...intent(revision), owner: guest }))
      .toEqual({ ok: false, reason: "stale" });
    expect(await rawDraft("guest")).toBeDefined();
    expect(loadedRevision(await loadPublishDraft(accountA))).toBe(revision);
  });
});
