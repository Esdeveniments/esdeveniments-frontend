import {
  getPublishDraftOwnerKey,
  PublishDraftFormSchema,
  PublishDraftOwnerSchema,
  PublishDraftRecordSchema,
  PublishDraftRevisionSchema,
} from "@lib/validation/publish-draft";
import type {
  PublishDraftInput,
  PublishDraftLoadResult,
  PublishDraftOwner,
  PublishDraftRevision,
  PublishDraftWriteResult,
} from "types/publish-draft";
import {
  MAX_TOTAL_UPLOAD_BYTES,
  PUBLISH_DRAFT_MAX_COUNT,
  PUBLISH_DRAFT_TTL_MS,
  PUBLISH_DRAFT_VERSION,
} from "./constants";
import { isBackendImageType } from "./image-validation";
import {
  handlePublishDraftRequest,
  publishDraftFailure,
  transactPublishDraft,
} from "./publish-draft-db";

export async function loadPublishDraft(
  owner: PublishDraftOwner,
): Promise<PublishDraftLoadResult> {
  const parsedOwner = PublishDraftOwnerSchema.safeParse(owner);
  if (!parsedOwner.success) return { ok: false, reason: "invalid-input" };
  const key = getPublishDraftOwnerKey(parsedOwner.data);
  return transactPublishDraft<PublishDraftLoadResult>((store, revision, finish, advance) => {
    const read = store.get(key);
    handlePublishDraftRequest(read, (raw: unknown) => {
      if (raw === undefined) {
        finish({ ok: true, status: "empty", revision });
        return;
      }
      const parsed = PublishDraftRecordSchema.safeParse(raw);
      if (!parsed.success) {
        const unsupported = typeof raw === "object" && raw !== null &&
          "version" in raw && raw.version !== PUBLISH_DRAFT_VERSION;
        finish({ ok: false, reason: unsupported ? "version" : "corrupt", revision });
        return;
      }
      const record = parsed.data;
      if (getPublishDraftOwnerKey(record.owner) !== key || record.updatedAt > Date.now()) {
        finish({ ok: false, reason: "corrupt", revision });
        return;
      }
      if (Date.now() - record.updatedAt >= PUBLISH_DRAFT_TTL_MS) {
        store.delete(key);
        finish({ ok: true, status: "expired", revision: advance() });
        return;
      }
      const image = record.image;
      finish({
        ok: true,
        status: "found",
        revision,
        draft: {
          form: record.form,
          updatedAt: record.updatedAt,
          imageFile: image
            ? new File([image.bytes], image.name, {
                type: image.type,
                lastModified: image.lastModified,
              })
            : null,
        },
      });
    }, finish);
  });
}

/** Await this save before navigating; no debounce or unload-only saving lives here. */
export async function savePublishDraft(
  owner: PublishDraftOwner,
  input: PublishDraftInput,
  expectedRevision: PublishDraftRevision,
): Promise<PublishDraftWriteResult> {
  const parsedOwner = PublishDraftOwnerSchema.safeParse(owner);
  const form = PublishDraftFormSchema.safeParse(input.form);
  if (!form.success) {
    return {
      ok: false,
      reason: form.error.issues.some((issue) =>
        issue.code === "custom" && issue.params?.reason === "too-large")
        ? "too-large" : "invalid-input",
    };
  }
  if (!parsedOwner.success ||
      !PublishDraftRevisionSchema.safeParse(expectedRevision).success) {
    return { ok: false, reason: "invalid-input" };
  }
  const file = input.imageFile;
  if (file && file.size > MAX_TOTAL_UPLOAD_BYTES) return { ok: false, reason: "too-large" };
  if (file && !isBackendImageType(file.type)) return { ok: false, reason: "invalid-input" };
  try {
    const image = file ? {
      bytes: await file.arrayBuffer(),
      name: file.name,
      type: file.type,
      lastModified: file.lastModified,
      size: file.size,
    } : null;
    const record = PublishDraftRecordSchema.safeParse({
      version: PUBLISH_DRAFT_VERSION,
      owner: parsedOwner.data,
      revision: crypto.randomUUID(),
      updatedAt: Date.now(),
      form: form.data,
      image,
    });
    if (!record.success) return { ok: false, reason: "invalid-input" };
    const key = getPublishDraftOwnerKey(parsedOwner.data);
    return await transactPublishDraft<PublishDraftWriteResult>((store, revision, finish, advance) => {
      if (revision !== expectedRevision) {
        finish({ ok: false, reason: "stale" });
        return;
      }
      const scan = store.openCursor();
      let count = 0;
      handlePublishDraftRequest(scan, (cursor) => {
        if (cursor) {
          const existing = PublishDraftRecordSchema.safeParse(cursor.value);
          if (existing.success && Date.now() - existing.data.updatedAt >= PUBLISH_DRAFT_TTL_MS) {
            cursor.delete();
          } else if (cursor.key !== key) {
            count++;
          }
          cursor.continue();
          return;
        }
        if (count >= PUBLISH_DRAFT_MAX_COUNT) {
          finish({ ok: false, reason: "capacity" });
          return;
        }
        const nextRevision = advance();
        store.put({ ...record.data, revision: nextRevision }, key);
        finish({ ok: true, revision: nextRevision });
      }, finish);
    });
  } catch (error) {
    return publishDraftFailure(error);
  }
}

export async function discardPublishDraft(
  owner: PublishDraftOwner,
  expectedRevision: PublishDraftRevision,
): Promise<PublishDraftWriteResult> {
  const parsedOwner = PublishDraftOwnerSchema.safeParse(owner);
  if (!parsedOwner.success ||
      !PublishDraftRevisionSchema.safeParse(expectedRevision).success) {
    return { ok: false, reason: "invalid-input" };
  }
  return transactPublishDraft<PublishDraftWriteResult>((store, revision, finish, advance) => {
    if (revision !== expectedRevision) {
      finish({ ok: false, reason: "stale" });
      return;
    }
    store.delete(getPublishDraftOwnerKey(parsedOwner.data));
    // Keep a bounded, database-wide fence even when every payload is deleted.
    finish({ ok: true, revision: advance() });
  });
}
