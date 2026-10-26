import type { AuthUser } from "./auth";
import type { FormData } from "./event";
import type { z } from "zod";
import type { PublishDraftRecordSchema, PublishResumeIntentSchema } from "@lib/validation/publish-draft";

export type PublishDraftOwner =
  | { kind: "guest" }
  | { kind: "account"; accountId: AuthUser["id"] };

export type PublishDraftForm = Partial<Omit<FormData, "id">>;
export type PublishDraftRevision = string | null;
export type PublishResumeIntent = z.infer<typeof PublishResumeIntentSchema>;
export type PublishDraftRecord = z.infer<typeof PublishDraftRecordSchema>;
export type PublishResumeStage = PublishResumeIntent["stage"];
export type PublishResumeReadResult =
  | { ok: true; intent: PublishResumeIntent }
  | { ok: false; reason: "missing" | "invalid" | "unavailable" };

export interface PublishDraftInput {
  form: PublishDraftForm;
  imageFile: File | null;
}

export interface PublishDraft extends PublishDraftInput {
  updatedAt: number;
}

export interface PublishDraftFailure {
  ok: false;
  reason:
    | "unavailable"
    | "blocked"
    | "denied"
    | "quota"
    | "transaction"
    | "stale"
    | "too-large"
    | "capacity"
    | "invalid-input"
    | "version"
    | "corrupt";
  revision?: PublishDraftRevision;
}

export type PublishDraftLoadResult =
  | {
      ok: true;
      status: "found";
      revision: PublishDraftRevision;
      draft: PublishDraft;
    }
  | {
      ok: true;
      status: "empty" | "expired";
      revision: PublishDraftRevision;
    }
  | PublishDraftFailure;

export type PublishDraftWriteResult =
  | { ok: true; revision: string }
  | PublishDraftFailure;

export type PublishDraftTransactionAction<T> = (
  store: IDBObjectStore,
  revision: PublishDraftRevision,
  finish: (result: T | PublishDraftFailure) => void,
  advance: () => string,
) => void;

export type PublishDraftFlushResult =
  | { ok: true; revision: PublishDraftRevision }
  | PublishDraftFailure;

export type PublishDraftWarning = "date" | "city" | "category";

export interface PublishDraftSessionState {
  status: "loading" | "decision" | "idle" | "saving" | "saved" | "error" | "discarding";
  pendingDraft: PublishDraft | null;
  failure: PublishDraftFailure | null;
  dirty: boolean;
  canDiscard: boolean;
}

export interface UsePublishDraftOptions {
  accountId: string | undefined;
  isAuthLoading?: boolean;
  form: FormData;
  imageFile: File | null;
  onRestore: (draft: PublishDraft, resumed?: boolean) => void;
  onReset: () => void;
}

export type PublishDraftRequestHandler<T> = (value: T) => void;
