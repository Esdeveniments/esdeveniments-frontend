"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { initialPublishDraftState, PublishDraftSession } from "@utils/publish-draft-session";
import { savePublishResumeIntent, takePublishResumeIntent } from "@utils/publish-draft-resume";
import type {
  PublishDraftFlushResult, PublishDraftSessionState, PublishResumeStage, UsePublishDraftOptions,
} from "types/publish-draft";

export function usePublishDraft({
  accountId, form, imageFile, onRestore, onReset,
}: UsePublishDraftOptions) {
  const [state, setState] = useState(initialPublishDraftState);
  const session = useRef<PublishDraftSession | null>(null);
  const edited = useRef(false);
  const completed = useRef(false);
  const [resumeFailed, setResumeFailed] = useState(false);
  const resumeRequest = useRef<ReturnType<typeof takePublishResumeIntent> | null>(null);
  const restoreCallback = useRef(onRestore);
  useEffect(() => { restoreCallback.current = onRestore; }, [onRestore]);

  useEffect(() => {
    if (!accountId) return;
    const owner = { kind: "account", accountId } as const;
    let active = true;
    const current = new PublishDraftSession(owner, setState);
    session.current = current;
    const url = new URL(window.location.href);
    const returning = resumeRequest.current !== null || url.searchParams.get("resume") === "1";
    const request = returning
      ? (resumeRequest.current ??= takePublishResumeIntent()) : null;
    if (returning) {
      url.searchParams.delete("resume");
      window.history.replaceState(window.history.state, "", url);
    }
    void (async () => {
      if (request?.ok) {
        await Promise.resolve();
        if (!active) return;
      }
      const result = await current.load(request?.ok ? request.intent : undefined);
      if (!active || !returning) return;
      if (result?.resumed && result.status === "found") {
        restoreCallback.current(result.draft, true);
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
  }, [accountId]);

  useEffect(() => {
    if (!edited.current || completed.current) return;
    edited.current = false;
    session.current?.edit({ form, imageFile });
  }, [form, imageFile]);

  useEffect(() => {
    if (!state.dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [state.dirty]);

  const markEdited = useCallback(() => { edited.current = true; }, []);
  const restore = () => {
    const draft = session.current?.restore();
    if (draft) { edited.current = false; setResumeFailed(false); onRestore(draft); }
  };
  const discard = async () => {
    edited.current = false;
    const result = await session.current?.discard();
    if (result?.ok) { setResumeFailed(false); onReset(); }
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
    if (!accountId) return { ok: false, reason: "unavailable" };
    const current = session.current;
    const result = await flush();
    if (!current || current !== session.current) return { ok: false, reason: "stale" };
    if (!result.ok) return result;
    if (!session.current?.state.canDiscard) return { ok: true, revision: null };
    const confirmed = await current.confirmSaved();
    if (current !== session.current) return { ok: false, reason: "stale" };
    if (!confirmed.ok) return confirmed;
    return savePublishResumeIntent({
      version: 1, owner: { kind: "account", accountId },
      revision: confirmed.revision, stage, createdAt: Date.now(),
    });
  };
  const ownerState: PublishDraftSessionState = accountId ? state : {
    ...initialPublishDraftState, status: "error", failure: { ok: false, reason: "unavailable" },
  };
  return { ...ownerState, markEdited, restore, discard, flush, complete, prepareResume, resumeFailed,
    retry: () => session.current?.retry() };
}
