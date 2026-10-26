import {
  getPublishDraftOwnerKey, PublishDraftOwnerSchema, PublishDraftRecordSchema, PublishResumeIntentSchema,
} from "@lib/validation/publish-draft";
import {
  PUBLISH_DRAFT_MAX_CLOCK_SKEW_MS, PUBLISH_DRAFT_TTL_MS,
  PUBLISH_RESUME_STORAGE_KEY, PUBLISH_RESUME_TTL_MS,
} from "./constants";
import { handlePublishDraftRequest, transactPublishDraft } from "./publish-draft-db";
import type {
  PublishDraftFlushResult, PublishDraftOwner, PublishDraftWriteResult, PublishResumeIntent, PublishResumeReadResult,
} from "types/publish-draft";

export function savePublishResumeIntent(intent: PublishResumeIntent): PublishDraftFlushResult {
  const parsed = PublishResumeIntentSchema.safeParse(intent);
  if (!parsed.success) return { ok: false, reason: "invalid-input" };
  try {
    sessionStorage.setItem(PUBLISH_RESUME_STORAGE_KEY, JSON.stringify(parsed.data));
    return { ok: true, revision: parsed.data.revision };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}

export function takePublishResumeIntent(): PublishResumeReadResult {
  try {
    const raw = sessionStorage.getItem(PUBLISH_RESUME_STORAGE_KEY);
    sessionStorage.removeItem(PUBLISH_RESUME_STORAGE_KEY);
    if (!raw) return { ok: false, reason: "missing" };
    const parsed = PublishResumeIntentSchema.safeParse(JSON.parse(raw));
    if (!parsed.success ||
        Date.now() - parsed.data.createdAt >= PUBLISH_RESUME_TTL_MS ||
        parsed.data.createdAt > Date.now() + PUBLISH_DRAFT_MAX_CLOCK_SKEW_MS) {
      return { ok: false, reason: "invalid" };
    }
    return { ok: true, intent: parsed.data };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}

/** Guest adoption requires this tab's deliberate handoff and never replaces an account draft. */
export async function preparePublishDraftResume(
  owner: PublishDraftOwner,
  intent: PublishResumeIntent,
): Promise<PublishDraftWriteResult> {
  if (!PublishDraftOwnerSchema.safeParse(owner).success ||
      !PublishResumeIntentSchema.safeParse(intent).success || owner.kind !== "account") {
    return { ok: false, reason: "invalid-input" };
  }
  if (intent.owner.kind === "account") {
    return intent.owner.accountId === owner.accountId
      ? { ok: true, revision: intent.revision }
      : { ok: false, reason: "stale" };
  }
  return transactPublishDraft<PublishDraftWriteResult>((store, revision, finish, advance) => {
    if (revision !== intent.revision) { finish({ ok: false, reason: "stale" }); return; }
    const guest = store.get("guest");
    handlePublishDraftRequest(guest, (raw: unknown) => {
      const parsed = PublishDraftRecordSchema.safeParse(raw);
      if (!parsed.success || parsed.data.owner.kind !== "guest" ||
          parsed.data.revision !== intent.revision ||
          Date.now() - parsed.data.updatedAt >= PUBLISH_DRAFT_TTL_MS ||
          parsed.data.updatedAt > Date.now() + PUBLISH_DRAFT_MAX_CLOCK_SKEW_MS) {
        finish({ ok: false, reason: "stale" });
        return;
      }
      const key = getPublishDraftOwnerKey(owner);
      handlePublishDraftRequest(store.get(key), (existing: unknown) => {
        if (existing !== undefined) { finish({ ok: false, reason: "stale" }); return; }
        const next = advance();
        store.put({ ...parsed.data, owner, revision: next }, key);
        store.delete("guest");
        finish({ ok: true, revision: next });
      }, finish);
    }, finish);
  });
}
