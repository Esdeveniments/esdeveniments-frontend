"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Modal from "@components/ui/common/modal";
import type { PublishDraftPanelProps } from "types/props";

export default function PublishDraftPanel({
  state, onRestore, onRestoreGuest, onDiscard, onRetry, warnings,
}: PublishDraftPanelProps) {
  const t = useTranslations("App.Publish");
  const formT = useTranslations("Components.EventForm");
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const { status, failure, pendingDraft } = state;
  const busy = status === "loading" || status === "discarding";
  const failureKey = failure?.reason === "stale" ? "draftConflict"
    : failure?.reason === "quota" || failure?.reason === "capacity" || failure?.reason === "too-large"
      ? "draftStorageFull"
      : failure?.reason === "corrupt" || failure?.reason === "version"
        ? "draftRecordInvalid" : "draftSaveFailed";
  return (
    <section className="card-bordered" aria-label={t("draftHeading")} data-testid="publish-draft-panel">
      <div className="card-body stack">
        {state.dirty && (state.guestConflict || pendingDraft) &&
          <p className="body-normal">{t("draftRestoreReplacesEdits")}</p>}
        {state.guestConflict && (
          <>
            <h2 className="heading-3">{t("draftChooseTitle")}</h2>
            <p className="body-normal">{t("draftChooseDescription")}</p>
            <button type="button" className="btn-primary" onClick={onRestoreGuest} disabled={busy || (!!failure && status !== "decision")}
              data-testid="draft-restore-guest">
              {t("draftUseGuest")}
            </button>
          </>
        )}
        {pendingDraft && (
          <>
            {!state.guestConflict && <h2 className="heading-3">{t("restoreDraftTitle")}</h2>}
            <p className="body-normal">{state.guestConflict
              ? t("draftAccountTitle", { title: pendingDraft.form.title || formT("previewNoTitle") })
              : t("restoreDraftDescription")}</p>
            <button type="button" className="btn-primary" onClick={onRestore} disabled={busy || !!failure}>
              {t(state.guestConflict ? "draftUseAccount" : "restoreDraftApply")}
            </button>
          </>
        )}
        <p className="body-small text-foreground/80">{t("draftDeviceOnlyNote")}</p>
        <p className="body-small" role="status" aria-live="polite" data-testid="draft-save-status">
          {status === "loading" ? t("draftLoading")
            : status === "saving" ? t("draftSaving")
              : status === "saved" ? t("draftSaved")
                : status === "discarding" ? t("draftDiscarding") : ""}
        </p>
        {failure && (
          <div className="stack" role="alert">
            <p className="body-normal">{t(failureKey)}</p>
            <button type="button" className="btn-outline" onClick={onRetry} disabled={busy}>
              {t(failure.reason === "stale" ? "draftReviewConflict" : "draftRetry")}
            </button>
          </div>
        )}
        {warnings.map((warning) => (
          <p className="body-small text-foreground/80" role="status" key={warning}>
            {t(warning === "date" ? "draftDateExpired"
              : warning === "city" ? "draftCityUnavailable" : "draftCategoryUnavailable")}
          </p>
        ))}
        {!state.guestConflict && (state.canDiscard || state.dirty) && (
          <button type="button" className="btn-muted" onClick={() => setConfirmDiscard(true)} disabled={busy}>
            {t("restoreDraftDiscard")}
          </button>
        )}
      </div>
      <Modal open={confirmDiscard} setOpen={setConfirmDiscard}
        title={t("draftDiscardConfirm")} testId="draft-discard-modal"
        actionButton={t("restoreDraftDiscard")} actionButtonDisabled={busy}
        onActionButtonClick={async () => {
          const result = await onDiscard();
          return result?.ok ?? false;
        }}>
        <p className="body-normal">{t("draftDiscardDescription")}</p>
        <button type="button" className="btn-outline" onClick={() => setConfirmDiscard(false)}>
          {t("draftKeep")}
        </button>
      </Modal>
    </section>
  );
}
