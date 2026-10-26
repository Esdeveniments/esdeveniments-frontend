import type { AuthUser } from "./auth";
import type { FormData } from "./event";

export type PublishDraftOwner =
  | { kind: "guest" }
  | { kind: "account"; accountId: AuthUser["id"] };

export type PublishDraftForm = Partial<Omit<FormData, "id">>;
export type PublishDraftRevision = string | null;

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
  form: FormData;
  imageFile: File | null;
  onRestore: (draft: PublishDraft) => void;
  onReset: () => void;
}

export type PublishDraftRequestHandler<T> = (value: T) => void;
