import { expect, vi } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import type {
  PublishDraftLoadResult,
  PublishDraftOwner,
  PublishDraftWriteResult,
  PublishResumeIntent,
} from "types/publish-draft";
import { loadPublishDraft, savePublishDraft } from "@utils/publish-draft-storage";
import { PUBLISH_DRAFT_DB_NAME } from "@utils/publish-draft-db";

export const guest: PublishDraftOwner = { kind: "guest" };
export const accountA: PublishDraftOwner = { kind: "account", accountId: "account-a" };
export const accountB: PublishDraftOwner = { kind: "account", accountId: "account-b" };

export const resumeIntent = (revision = crypto.randomUUID()): PublishResumeIntent => ({
  version: 1, owner: accountA, revision, stage: "login", createdAt: Date.now(),
});

export async function resetDraftStorage() {
  vi.restoreAllMocks();
  vi.stubGlobal("indexedDB", new IDBFactory());
  await loadPublishDraft(guest);
}

export function savedRevision(result: PublishDraftWriteResult): string {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.reason);
  return result.revision;
}

export function loadedRevision(result: PublishDraftLoadResult): string | null {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.reason);
  return result.revision;
}

export async function seedDraft(owner = guest) {
  return savedRevision(await savePublishDraft(
    owner,
    { form: { title: "unfinished" }, imageFile: null },
    loadedRevision(await loadPublishDraft(owner)),
  ));
}

export async function rawDraft(
  key: string,
  replace?: (raw: unknown) => unknown,
  storeName: "drafts" | "metadata" = "drafts",
) {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const open = indexedDB.open(PUBLISH_DRAFT_DB_NAME, 1);
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
  });
  return new Promise<unknown>((resolve, reject) => {
    const tx = db.transaction(storeName, replace ? "readwrite" : "readonly");
    const store = tx.objectStore(storeName);
    const read = store.get(key);
    let result: unknown;
    read.onsuccess = () => {
      result = read.result;
      if (replace) {
        const replacement = replace(result);
        if (replacement === undefined) store.delete(key);
        else store.put(replacement, key);
      }
    };
    tx.oncomplete = () => { db.close(); resolve(result); };
    tx.onabort = () => { db.close(); reject(tx.error); };
  });
}
