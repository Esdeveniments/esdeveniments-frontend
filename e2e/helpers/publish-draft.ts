import type { Page } from "@playwright/test";
import type { PublishDraftRecord } from "types/publish-draft";
import { PUBLISH_DRAFT_DB_NAME } from "@utils/publish-draft-db";
import { PUBLISH_DRAFT_FENCE_VERSION } from "@utils/constants";

export async function readSavedDraft(page: Page, accountId?: string, draftKey?: string) {
  return page.evaluate(async ({ expectedAccount, dbName, draftKey }) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const open = indexedDB.open(dbName);
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
    try {
      const records = await new Promise<PublishDraftRecord[]>((resolve, reject) => {
        const read: IDBRequest<PublishDraftRecord[]> = db.transaction("drafts").objectStore("drafts").getAll(draftKey);
        read.onsuccess = () => resolve(read.result);
        read.onerror = () => reject(read.error);
      });
      if (records.length !== 1 || !records[0]?.image) throw new Error("Expected one image draft");
      if (expectedAccount && (records[0].owner.kind !== "account" || records[0].owner.accountId !== expectedAccount)) {
        throw new Error("Expected the poster draft to transfer to the authenticated account");
      }
      const { form, image } = records[0];
      return { form, image: { ...image, bytes: Array.from(new Uint8Array(image.bytes)) } };
    } finally { db.close(); }
  }, { expectedAccount: accountId, dbName: PUBLISH_DRAFT_DB_NAME, draftKey });
}

export async function replaceDraftFence(page: Page, version = PUBLISH_DRAFT_FENCE_VERSION) {
  await page.evaluate(({ dbName, version }) => new Promise<void>((resolve, reject) => {
    const open = indexedDB.open(dbName);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction("metadata", "readwrite");
      tx.objectStore("metadata").put({ version, revision: crypto.randomUUID() }, "revision");
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onabort = () => { db.close(); reject(tx.error); };
    };
  }), { dbName: PUBLISH_DRAFT_DB_NAME, version });
}
