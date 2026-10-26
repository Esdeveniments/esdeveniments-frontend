"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { initialPublishDraftState, PublishDraftSession } from "@utils/publish-draft-session";
import { savePublishResumeIntent, takePublishResumeIntent } from "@utils/publish-draft-resume";
import type {
  PublishDraftFlushResult, PublishDraftInput, PublishDraftSessionState, PublishResumeStage, UsePublishDraftOptions,
} from "types/publish-draft";

// Auth may still be unresolved when this route unmounts. Do not guess an owner.
let pendingHydrationDraft: PublishDraftInput | null = null;
let hydrationGeneration = 0;
const warnPendingHydration = (event: BeforeUnloadEvent) => {
  if (!pendingHydrationDraft) return;
  event.preventDefault();
  event.returnValue = "";
};

export function usePublishDraft({
  accountId, isAuthLoading = false, form, imageFile, onRestore, onReset,
}: UsePublishDraftOptions) {
  const [state, setState] = useState(initialPublishDraftState);
  const session = useRef<PublishDraftSession | null>(null);
  const edited = useRef(false);
  const latestInput = useRef({ form, imageFile });
  const [restoringBuffer, setRestoringBuffer] = useState(() => pendingHydrationDraft !== null);
  const completed = useRef(false);
  const ownerKey = useRef<string | null>(null);
  const resolvedOwnerKey = accountId ? `account:${accountId}` : "guest";
  const ownerChanged = !isAuthLoading && ownerKey.current === "guest" && resolvedOwnerKey !== "guest";
  const [resumeFailed, setResumeFailed] = useState(false);
  const resumeRequest = useRef<ReturnType<typeof takePublishResumeIntent> | null>(null);
  const restoreCallback = useRef(onRestore);
  const resetCallback = useRef(onReset);
  useEffect(() => { restoreCallback.current = onRestore; resetCallback.current = onReset; }, [onRestore, onReset]);

  useEffect(() => { latestInput.current = { form, imageFile }; }, [form, imageFile]);
  useEffect(() => {
    if (!pendingHydrationDraft) return;
    const buffered = pendingHydrationDraft;
    pendingHydrationDraft = null;
    window.removeEventListener("beforeunload", warnPendingHydration);
    edited.current = true;
    if (buffered.form !== latestInput.current.form || buffered.imageFile !== latestInput.current.imageFile) {
      restoreCallback.current({ ...buffered, updatedAt: Date.now() });
    }
    setRestoringBuffer(false);
  }, [isAuthLoading]);
  useEffect(() => {
    const generation = ++hydrationGeneration;
    if (!isAuthLoading) return;
    return () => {
      if (generation !== hydrationGeneration || !edited.current) return;
      pendingHydrationDraft = latestInput.current;
      window.addEventListener("beforeunload", warnPendingHydration);
    };
  }, [isAuthLoading]);

  useEffect(() => {
    if (isAuthLoading || restoringBuffer || ownerChanged) return;
    if (ownerKey.current !== null && ownerKey.current !== resolvedOwnerKey) {
      edited.current = false;
      completed.current = false;
      resetCallback.current();
    }
    ownerKey.current = resolvedOwnerKey;
    const owner = accountId ? { kind: "account", accountId } as const : { kind: "guest" } as const;
    let active = true;
    const current = new PublishDraftSession(owner, (next) => { if (active) setState(next); });
    session.current = current;
    const url = new URL(window.location.href);
    const returning = !!accountId && (resumeRequest.current !== null || url.searchParams.get("resume") === "1");
    const request = returning
      ? (resumeRequest.current ??= takePublishResumeIntent()) : null;
    void (async () => {
      if (request?.ok) {
        await Promise.resolve();
        if (!active) return;
      }
      const result = await current.load(request?.ok ? request.intent : undefined);
      if (!active || !returning) return;
      if (result?.guestConflict && request?.ok) {
        const persisted = savePublishResumeIntent(request.intent);
        setResumeFailed(!persisted.ok);
        return;
      }
      url.searchParams.delete("resume");
      window.history.replaceState(window.history.state, "", url);
      resumeRequest.current = null;
      if (result?.matchesResume) {
        setResumeFailed(false);
        if (result.resumed && result.status === "found") restoreCallback.current(result.draft, true);
      } else if (request?.ok || request?.reason !== "missing") {
        setResumeFailed(true);
      }
    })();
    return () => {
      active = false;
      session.current = null;
      if (completed.current) current.dispose();
      else void current.flush().finally(() => current.dispose());
    };
  }, [accountId, isAuthLoading, restoringBuffer, ownerChanged, resolvedOwnerKey]);

  useEffect(() => {
    if (!edited.current || completed.current || !session.current) return;
    edited.current = false;
    session.current?.edit({ form, imageFile });
  }, [form, imageFile, accountId, isAuthLoading, restoringBuffer]);

  const hasUnsavedEdits = state.dirty || edited.current;
  useEffect(() => {
    if (!hasUnsavedEdits) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasUnsavedEdits]);

  const markEdited = useCallback(() => { edited.current = true; completed.current = false; }, []);
  const clearGuestReturn = () => {
    if (!state.guestConflict) return;
    resumeRequest.current = null;
    takePublishResumeIntent();
    const url = new URL(window.location.href);
    url.searchParams.delete("resume");
    window.history.replaceState(window.history.state, "", url);
  };
  const restore = () => {
    const draft = session.current?.restore();
    if (draft) { clearGuestReturn(); edited.current = false; setResumeFailed(false); onRestore(draft); }
  };
  const restoreGuest = async () => {
    const current = session.current;
    const draft = await current?.restoreGuest();
    if (draft && current === session.current) {
      clearGuestReturn();
      edited.current = false;
      setResumeFailed(false);
      onRestore(draft, true);
    }
  };
  const discard = async () => {
    edited.current = false;
    const result = await session.current?.discard();
    if (result?.ok) { clearGuestReturn(); setResumeFailed(false); onReset(); }
    return result;
  };
  const flush = async (): Promise<PublishDraftFlushResult> => {
    if (edited.current) {
      edited.current = false;
      session.current?.edit({ form, imageFile });
    }
    return session.current?.flush() ?? { ok: false, reason: "unavailable" };
  };
  const complete = async () => {
    completed.current = true;
    edited.current = false;
    return session.current?.discard() ?? { ok: false, reason: "unavailable" };
  };
  const prepareResume = async (stage: PublishResumeStage): Promise<PublishDraftFlushResult> => {
    const current = session.current;
    const result = await flush();
    if (!current || current !== session.current) return { ok: false, reason: "stale" };
    if (!result.ok) return result;
    if (!session.current?.state.canDiscard) return { ok: true, revision: null };
    const confirmed = await current.confirmSaved();
    if (current !== session.current) return { ok: false, reason: "stale" };
    if (!confirmed.ok) return confirmed;
    return savePublishResumeIntent({
      version: 1, owner: accountId ? { kind: "account", accountId } : { kind: "guest" },
      revision: confirmed.revision, stage, createdAt: Date.now(),
    });
  };
  const ownerState: PublishDraftSessionState = !ownerChanged ? state : {
    ...initialPublishDraftState, status: "error", dirty: state.dirty, failure: { ok: false, reason: "unavailable" },
  };
  return { ...ownerState, markEdited, restore, restoreGuest, discard, flush, complete, prepareResume, resumeFailed, ownerChanged,
    retry: () => session.current?.retry() };
}
