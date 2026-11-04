import { expect, type Page, type Request } from "@playwright/test";
import type { PublishDraftRecord } from "types/publish-draft";
import { PUBLISH_DRAFT_DB_NAME } from "@utils/publish-draft-db";
import { PUBLISH_DRAFT_FENCE_VERSION, PUBLISH_RESUME_STORAGE_KEY } from "@utils/constants";

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
      const { form, image, step } = records[0];
      return { form, step, image: { ...image, bytes: Array.from(new Uint8Array(image.bytes)) } };
    } finally { db.close(); }
  }, { expectedAccount: accountId, dbName: PUBLISH_DRAFT_DB_NAME, draftKey });
}

export async function readPublishRequest(page: Page, request: Request, accountId: string) {
  const draft = await readSavedDraft(page, accountId);
  const intent = await page.evaluate((key) => sessionStorage.getItem(key), PUBLISH_RESUME_STORAGE_KEY);
  const parts = await new Response(new Uint8Array(request.postDataBuffer()!), {
    headers: { "content-type": request.headers()["content-type"]! },
  }).formData();
  const poster = [...parts.entries()].find(([key]) => key.endsWith("imageFile"))?.[1];
  return { draft, intent, body: request.postData(), poster: !poster || typeof poster === "string" ? null : {
    name: poster.name, type: poster.type, size: poster.size,
    bytes: Array.from(new Uint8Array(await poster.arrayBuffer())),
  } };
}

export function expectPublishRequest(
  submitted: Awaited<ReturnType<typeof readPublishRequest>> | undefined,
  original: Awaited<ReturnType<typeof readSavedDraft>>,
) {
  expect(submitted).toMatchObject({ draft: original, intent: null, poster: {
    name: original.image.name, type: original.image.type, size: original.image.size, bytes: original.image.bytes,
  } });
  expect(submitted?.body).toContain(original.form.title);
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
