"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { initialPublishDraftState, PublishDraftSession } from "@utils/publish-draft-session";
import type {
  PublishDraftFlushResult, PublishDraftSessionState, UsePublishDraftOptions,
} from "types/publish-draft";

export function usePublishDraft({
  accountId, form, imageFile, onRestore, onReset,
}: UsePublishDraftOptions) {
  const [state, setState] = useState(initialPublishDraftState);
  const session = useRef<PublishDraftSession | null>(null);
  const edited = useRef(false);
  const completed = useRef(false);

  useEffect(() => {
    if (!accountId) return;
    const current = new PublishDraftSession({ kind: "account", accountId }, setState);
    session.current = current;
    void current.load();
    return () => { current.dispose(); session.current = null; };
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
    if (draft) { edited.current = false; onRestore(draft); }
  };
  const discard = async () => {
    edited.current = false;
    const result = await session.current?.discard();
    if (result?.ok) onReset();
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
  const ownerState: PublishDraftSessionState = accountId ? state : {
    ...initialPublishDraftState, status: "error", failure: { ok: false, reason: "unavailable" },
  };
  return { ...ownerState, markEdited, restore, discard, flush, complete,
    retry: () => session.current?.retry() };
}
