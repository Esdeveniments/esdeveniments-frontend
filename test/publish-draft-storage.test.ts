// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PublishDraftRecordSchema } from "@lib/validation/publish-draft";
import { discardPublishDraft, loadPublishDraft, savePublishDraft } from "@utils/publish-draft-storage";
import { MAX_TOTAL_UPLOAD_BYTES, PUBLISH_DRAFT_TTL_MS } from "@utils/constants";
import {
  accountA, accountB, guest, loadedRevision, rawDraft,
  resetDraftStorage, savedRevision, seedDraft,
} from "./helpers/publish-draft";

beforeEach(resetDraftStorage);
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("publish-specific draft snapshots", () => {
  it("preserves missing/empty fields and unfinished invalid input without credentials or IDs", async () => {
    const form = {
      title: "", description: "", url: "https:/unfinished", email: "not-yet-an-email",
      town: { value: "7", label: "Town", accessToken: "not-stored" },
      categories: [3, { id: 4, name: "Music" }, { value: "5", label: "Dance" }],
      id: "edit-event", accessToken: "not-stored", profile: { name: "not-stored" },
    };
    savedRevision(await savePublishDraft(guest, { form, imageFile: null }, null));
    const result = await loadPublishDraft(guest);
    expect(result).toMatchObject({
      ok: true, status: "found",
      draft: { form: {
        title: "", description: "", url: form.url, email: form.email,
        town: { value: "7", label: "Town" }, categories: form.categories,
      }, imageFile: null },
    });
    if (!result.ok || result.status !== "found") throw new Error("Draft missing");
    expect(result.draft.form).not.toHaveProperty("startDate");
    expect(result.draft.form).not.toHaveProperty("id");
    expect(result.draft.form).not.toHaveProperty("accessToken");
    expect(JSON.stringify(await rawDraft("guest"))).not.toContain("not-stored");
  });

  it.each(["image/png", "image/jpeg"])("round-trips %s bytes/metadata with fields and image removal", async (type) => {
    const bytes = new Uint8Array([137, 80, 78, 71, 0, 255, 1]);
    const file = new File([bytes], "poster", { type, lastModified: 123456 });
    const revision = savedRevision(await savePublishDraft(guest, {
      form: { description: "before" }, imageFile: file,
    }, null));
    const result = await loadPublishDraft(guest);
    if (!result.ok || result.status !== "found") throw new Error("Draft missing");
    expect(result.draft.imageFile).toBeInstanceOf(File);
    expect(result.draft.imageFile).toMatchObject({
      name: file.name, type: file.type, lastModified: file.lastModified, size: file.size,
    });
    expect(new Uint8Array(await result.draft.imageFile!.arrayBuffer())).toEqual(bytes);
    savedRevision(await savePublishDraft(guest, { form: { title: "after" }, imageFile: null }, revision));
    expect(await loadPublishDraft(guest)).toMatchObject({
      status: "found", draft: { form: { title: "after" }, imageFile: null },
    });
  });

  it("expires at seven days, reads do not renew expiry, and expiry fences old saves", async () => {
    const now = Date.now();
    const clock = vi.spyOn(Date, "now").mockReturnValue(now);
    const revision = await seedDraft();
    clock.mockReturnValue(now + PUBLISH_DRAFT_TTL_MS - 1);
    expect(await loadPublishDraft(guest)).toMatchObject({
      status: "found", draft: { updatedAt: now },
    });
    clock.mockReturnValue(now + PUBLISH_DRAFT_TTL_MS);
    const expired = await loadPublishDraft(guest);
    expect(expired).toMatchObject({ ok: true, status: "expired" });
    expect(await rawDraft("guest")).toBeUndefined();
    expect(loadedRevision(expired)).not.toBe(revision);
    expect(await savePublishDraft(guest, { form: {}, imageFile: null }, revision))
      .toEqual({ ok: false, reason: "stale" });
    expect(await loadPublishDraft(guest)).toMatchObject({ status: "empty" });
  });

  it("renews expiry only after a successful save", async () => {
    const now = Date.now();
    const clock = vi.spyOn(Date, "now").mockReturnValue(now);
    const revision = await seedDraft();
    clock.mockReturnValue(now + PUBLISH_DRAFT_TTL_MS - 1);
    savedRevision(await savePublishDraft(guest, { form: { title: "edited" }, imageFile: null }, revision));
    clock.mockReturnValue(now + PUBLISH_DRAFT_TTL_MS);
    expect(await loadPublishDraft(guest)).toMatchObject({ status: "found" });
  });

  it.each(["version", "form", "bytes", "owner", "future"] as const)(
    "rejects invalid stored %s without inventing defaults", async (field) => {
      const revision = await seedDraft();
      await rawDraft("guest", (raw) => {
        const record = PublishDraftRecordSchema.parse(raw);
        if (field === "version") return { ...record, version: 999 };
        if (field === "form") return { ...record, form: { title: 17 } };
        if (field === "owner") return { ...record, owner: accountA };
        if (field === "future") return { ...record, updatedAt: Date.now() + 60_000 };
        return { ...record, image: {
          bytes: new ArrayBuffer(2), size: 1, name: "p.png", type: "image/png", lastModified: 0,
        } };
      });
      expect(await loadPublishDraft(guest)).toEqual({
        ok: false, reason: field === "version" ? "version" : "corrupt", revision,
      });
      savedRevision(await discardPublishDraft(guest, revision));
      expect(await loadPublishDraft(guest)).toMatchObject({ status: "empty" });
    },
  );

  it("separates guest and accounts without implicitly adopting or returning foreign data", async () => {
    await seedDraft(guest);
    expect(await loadPublishDraft(accountA)).toMatchObject({ status: "empty" });
    await seedDraft(accountA);
    expect(await loadPublishDraft(accountB)).toMatchObject({ status: "empty" });
    await seedDraft(accountB);
    savedRevision(await discardPublishDraft(accountA, loadedRevision(await loadPublishDraft(accountA))));
    expect(await loadPublishDraft(accountA)).toMatchObject({ status: "empty" });
    expect(await loadPublishDraft(guest)).toMatchObject({ status: "found" });
    expect(await loadPublishDraft(accountB)).toMatchObject({ status: "found" });
  });

  it("bounds images and UTF-8 form data while keeping the previous draft", async () => {
    const revision = await seedDraft();
    expect(await savePublishDraft(guest, {
      form: {}, imageFile: new File([new Uint8Array(MAX_TOTAL_UPLOAD_BYTES + 1)], "p.png", { type: "image/png" }),
    }, revision)).toEqual({ ok: false, reason: "too-large" });
    expect(await savePublishDraft(guest, {
      form: { description: "€".repeat(24_000) }, imageFile: null,
    }, revision)).toEqual({ ok: false, reason: "too-large" });
    expect(await loadPublishDraft(guest)).toMatchObject({ draft: { form: { title: "unfinished" } } });
  });

  it("rejects unsupported image types and malformed owner/revision/input", async () => {
    expect(await savePublishDraft(guest, {
      form: {}, imageFile: new File(["x"], "p.webp", { type: "image/webp" }),
    }, null)).toMatchObject({ ok: false, reason: "invalid-input" });
    expect(await loadPublishDraft({ kind: "account", accountId: "" }))
      .toEqual({ ok: false, reason: "invalid-input" });
    expect(await discardPublishDraft(guest, "not-a-revision"))
      .toEqual({ ok: false, reason: "invalid-input" });
  });

  it.each(["missing", "version", "corrupt"])("rejects %s revision metadata rather than resetting the fence", async (kind) => {
    await seedDraft();
    await rawDraft("revision", () => kind === "missing" ? undefined :
      { version: kind === "version" ? 999 : 1, revision: "invalid" }, "metadata");
    expect(await loadPublishDraft(guest)).toEqual({
      ok: false, reason: kind === "version" ? "version" : "corrupt",
    });
    expect(await discardPublishDraft(guest, null)).toMatchObject({ ok: false });
  });
});
