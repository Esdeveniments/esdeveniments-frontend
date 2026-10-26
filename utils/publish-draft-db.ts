import type {
  PublishDraftFailure,
  PublishDraftLoadResult,
  PublishDraftRequestHandler,
  PublishDraftTransactionAction,
  PublishDraftWriteResult,
} from "types/publish-draft";
import { PublishDraftMetadataSchema } from "@lib/validation/publish-draft";
import { PUBLISH_DRAFT_FENCE_VERSION } from "./constants";

export const PUBLISH_DRAFT_DB_NAME = "esdeveniments-publish-drafts";

export function publishDraftFailure(error: unknown): PublishDraftFailure {
  const name =
    typeof error === "object" && error !== null && "name" in error
      ? error.name
      : undefined;
  if (name === "QuotaExceededError") return { ok: false, reason: "quota" };
  if (name === "VersionError") return { ok: false, reason: "version" };
  if (name === "SecurityError" || name === "NotAllowedError" || name === "InvalidStateError") {
    return { ok: false, reason: "denied" };
  }
  return { ok: false, reason: "transaction" };
}

export function handlePublishDraftRequest<T>(
  request: IDBRequest<T>,
  handle: PublishDraftRequestHandler<T>,
  fail: (failure: PublishDraftFailure) => void,
): void {
  request.onsuccess = () => {
    try {
      handle(request.result);
    } catch (error) {
      fail(publishDraftFailure(error));
      request.transaction?.abort();
    }
  };
}

export async function transactPublishDraft<T extends PublishDraftLoadResult | PublishDraftWriteResult>(
  action: PublishDraftTransactionAction<T>,
  repairMetadata = false,
): Promise<T | PublishDraftFailure> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: T | PublishDraftFailure) => {
      if (!settled) resolve(result);
      settled = true;
    };
    try {
      if (!globalThis.indexedDB) {
        finish({ ok: false, reason: "unavailable" });
        return;
      }
      const open = indexedDB.open(PUBLISH_DRAFT_DB_NAME, 1);
      open.onupgradeneeded = () => {
        open.result.createObjectStore("drafts");
        open.result.createObjectStore("metadata");
      };
      open.onerror = () => finish(publishDraftFailure(open.error));
      open.onblocked = () => finish({ ok: false, reason: "blocked" });
      open.onsuccess = () => {
        const db = open.result;
        db.onversionchange = () => db.close();
        if (settled) {
          db.close();
          return;
        }
        let result: T | PublishDraftFailure = {
          ok: false,
          reason: "transaction",
        };
        let callbackFailure: PublishDraftFailure | undefined;
        try {
          const tx = db.transaction(["drafts", "metadata"], "readwrite");
          tx.oncomplete = () => {
            db.close();
            finish(result);
          };
          tx.onabort = () => {
            db.close();
            finish(callbackFailure ?? publishDraftFailure(tx.error));
          };
          const metadata = tx.objectStore("metadata");
          const read = metadata.get("revision");
          handlePublishDraftRequest(read, (raw: unknown) => {
            const parsed = PublishDraftMetadataSchema.safeParse(raw);
            if (raw !== undefined && !parsed.success && !repairMetadata) {
              result = {
                ok: false,
                reason: typeof raw === "object" && raw !== null &&
                  "version" in raw && raw.version !== PUBLISH_DRAFT_FENCE_VERSION
                  ? "version" : "corrupt",
                revision: null,
              };
              return;
            }
            const run = () => action(
              tx.objectStore("drafts"),
              parsed.success ? parsed.data.revision : null,
              (value) => {
                result = value;
                if (!value.ok) callbackFailure = value;
              },
              () => {
                const revision = crypto.randomUUID();
                metadata.put({ version: PUBLISH_DRAFT_FENCE_VERSION, revision }, "revision");
                return revision;
              },
            );
            if (raw === undefined) {
              handlePublishDraftRequest(tx.objectStore("drafts").count(), (count) => {
                if (count > 0 && !repairMetadata) result = { ok: false, reason: "corrupt", revision: null };
                else run();
              }, (failure) => { callbackFailure = failure; });
            } else {
              run();
            }
          }, (failure) => { callbackFailure = failure; });
        } catch (error) {
          db.close();
          finish(publishDraftFailure(error));
        }
      };
    } catch (error) {
      finish(publishDraftFailure(error));
    }
  });
}
