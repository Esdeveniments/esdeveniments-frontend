import type { Page } from "@playwright/test";
import type { PublishDraftRecord } from "types/publish-draft";

export async function readSavedDraft(page: Page, accountId?: string) {
  return page.evaluate(async (expectedAccount) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const open = indexedDB.open("esdeveniments-publish-drafts");
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
    try {
      const records = await new Promise<PublishDraftRecord[]>((resolve, reject) => {
        const read: IDBRequest<PublishDraftRecord[]> = db.transaction("drafts").objectStore("drafts").getAll();
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
  }, accountId);
}
