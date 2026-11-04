"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import ConfirmDialog from "@components/ui/common/confirmDialog";
import type { PublishDraftPanelProps } from "types/props";

export default function PublishDraftPanel({
  variant, state, onRestore, onRestoreGuest, onDiscard, onRetry, warnings,
}: PublishDraftPanelProps) {
  const t = useTranslations("App.Publish");
  const formT = useTranslations("Components.EventForm");
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [discardFailed, setDiscardFailed] = useState(false);
  const { status, failure, pendingDraft, guestConflict } = state;
  const busy = status === "loading" || status === "discarding";
  const needsDecision = guestConflict || !!pendingDraft;
  const canDiscard = !guestConflict && (state.canDiscard || state.dirty);
  const discardButton = (
    <button type="button" onClick={() => { setDiscardFailed(false); setConfirmDiscard(true); }} disabled={busy}
      className={`btn-ghost normal-case tracking-normal font-medium text-foreground/80${needsDecision ? " w-full sm:w-auto" : ""}`}>
      {t("restoreDraftDiscard")}
    </button>
  );
  const failureKey = failure?.reason === "stale" ? "draftConflict"
    : failure?.reason === "quota" || failure?.reason === "capacity" || failure?.reason === "too-large"
      ? "draftStorageFull"
      : failure?.reason === "corrupt" || failure?.reason === "version"
        ? "draftRecordInvalid" : "draftSaveFailed";
  const statusText = status === "loading" ? t("draftLoading")
    : status === "saving" ? t("draftSaving")
      : status === "saved" ? t("draftSaved")
        : status === "discarding" ? t("draftDiscarding") : "";

  const dialog = (
    <ConfirmDialog
      open={confirmDiscard}
      setOpen={setConfirmDiscard}
      title={t("draftDiscardConfirm")}
      description={t("draftDiscardDescription")}
      confirmLabel={t("restoreDraftDiscard")}
      cancelLabel={t("draftKeep")}
      busy={busy}
      // The panel's own failure message sits behind the modal, so repeat it here.
      error={discardFailed ? t(failureKey) : undefined}
      testId="draft-discard-modal"
      onConfirm={async () => {
        const result = await onDiscard();
        const ok = result?.ok ?? false;
        setDiscardFailed(!ok);
        return ok;
      }}
    />
  );

  // Save status sits next to the form actions, like "Draft saved" beside Send in Gmail.
  if (variant === "status") {
    return (
      <div className="flex-between gap-2 min-h-button">
        <p className="body-small text-muted-foreground" role="status" aria-live="polite" data-testid="draft-save-status">
          {statusText}
        </p>
        {canDiscard && !needsDecision && discardButton}
        {dialog}
      </div>
    );
  }

  if (!needsDecision && !failure && warnings.length === 0) return null;

  return (
    <section className="stack" aria-label={t("draftHeading")} data-testid="publish-draft-panel">
      {needsDecision && (
        <div className="card-bordered card-body stack">
          <h2 className="heading-4 text-foreground-strong">
            {t(guestConflict ? "draftChooseTitle" : "restoreDraftTitle")}
          </h2>
          <p className="body-small text-foreground/80">
            {guestConflict
              ? t("draftChooseDescription")
              : t("restoreDraftDescription")}
          </p>
          {state.dirty && (
            <p className="body-small font-medium text-foreground-strong">{t("draftRestoreReplacesEdits")}</p>
          )}
          {guestConflict && pendingDraft && (
            <p className="body-small text-foreground/80">
              {t("draftAccountTitle", { title: pendingDraft.form.title || formT("previewNoTitle") })}
            </p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {guestConflict && (
              <button type="button" className="btn-primary w-full sm:w-auto" onClick={onRestoreGuest}
                disabled={busy || (!!failure && status !== "decision")} data-testid="draft-restore-guest">
                {t("draftUseGuest")}
              </button>
            )}
            {pendingDraft && (
              <button type="button" className={`${guestConflict ? "btn-neutral" : "btn-primary"} w-full sm:w-auto`}
                onClick={onRestore} disabled={busy || !!failure}>
                {t(guestConflict ? "draftUseAccount" : "restoreDraftApply")}
              </button>
            )}
            {canDiscard && discardButton}
          </div>
        </div>
      )}
      {failure && (
        <div className="rounded-card border border-error/40 bg-error/5 p-4 stack" role="alert">
          <p className="body-small text-foreground-strong">{t(failureKey)}</p>
          <button type="button" className="btn-neutral self-start" onClick={onRetry} disabled={busy}>
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
      {dialog}
    </section>
  );
}
