/* eslint-disable @next/next/no-img-element */
"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowPathIcon,
  ArrowUturnLeftIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PhotoIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import Button from "@components/ui/common/button";
import { IMAGE_UPLOAD_ACCEPT, MAX_TOTAL_UPLOAD_BYTES } from "@utils/constants";
import { imageUploadErrorMessage } from "@utils/image-upload";
import { usePosterAutofill } from "@components/hooks/usePosterAutofill";
import type { PosterExtractionErrorCode } from "types/api/poster";
import type { PosterAutofillCardProps } from "types/props";

const ERROR_MESSAGE_KEYS: Record<PosterExtractionErrorCode, string> = {
  not_configured: "posterAutofill.errorUnavailable",
  unauthorized: "posterAutofill.errorGeneric",
  rate_limited: "posterAutofill.errorRateLimited",
  overloaded: "posterAutofill.errorBusy",
  upstream_timeout: "posterAutofill.errorTimeout",
  invalid_image: "posterAutofill.errorInvalidImage",
  too_large: "posterAutofill.errorInvalidImage",
  network_error: "posterAutofill.errorNetwork",
  upstream_error: "posterAutofill.errorGeneric",
  model_rejected: "posterAutofill.errorGeneric",
  no_event_data: "posterAutofill.errorGeneric",
};

const ACTION_BTN_CLASSES =
  "btn-sm normal-case tracking-normal font-medium active:scale-[0.96] transition-transform duration-100";

export default function PosterAutofillCard({
  currentImageFile,
  currentImagePreview,
  isAuthenticated,
  isAuthLoading,
  disabled = false,
  autoScanIntentId,
  onAutoScanHandled,
  onRequestAuthForScan,
  onPosterPrepared,
  onExtractionApplied,
  canUndo,
  deferredUnmatchedTown = null,
  onUndo,
  onBusyChange,
}: PosterAutofillCardProps) {
  const t = useTranslations("App.Publish");
  const tImg = useTranslations("Components.ImageUploader");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const {
    phase,
    isBusy,
    errorCode,
    imagePrepFailure,
    filledFields,
    unmatchedTown,
    pastDateWarning,
    dateInferredWarning,
    priceReviewWarning,
    multiEventWarning,
    cancelActiveScan,
    handleSelectedFile,
    handleAnalyzeExisting,
    handleUndoClick,
  } = usePosterAutofill({
    currentImageFile,
    isAuthenticated,
    isAuthLoading,
    disabled,
    autoScanIntentId,
    onAutoScanHandled,
    onRequestAuthForScan,
    onPosterPrepared,
    onExtractionApplied,
    onUndo,
    onBusyChange,
  });

  const openFilePicker = () => {
    if (disabled || isBusy) return;
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const errorMessage = imagePrepFailure
    ? imageUploadErrorMessage(tImg, imagePrepFailure, MAX_TOTAL_UPLOAD_BYTES)
    : errorCode
      ? t(ERROR_MESSAGE_KEYS[errorCode])
      : null;

  const canRetry =
    phase === "error" &&
    Boolean(currentImageFile) &&
    !imagePrepFailure &&
    errorCode !== "not_configured" &&
    errorCode !== "invalid_image" &&
    errorCode !== "too_large";

  const hasExistingPoster = Boolean(currentImageFile && currentImagePreview);
  const showScanOverlay = phase === "analyzing" || phase === "checking";

  const busyHeading =
    phase === "preparing"
      ? t("posterAutofill.statusPreparing")
      : phase === "checking"
        ? t("posterAutofill.statusChecking")
        : t("posterAutofill.statusAnalyzing");

  const effectiveUnmatchedTown =
    unmatchedTown ??
    (phase === "success" || phase === "empty" ? deferredUnmatchedTown : null);

  const effectivePhase =
    phase === "empty" && effectiveUnmatchedTown ? "success" : phase;

  const heading = isBusy
    ? busyHeading
    : effectivePhase === "success"
      ? t("posterAutofill.headingSuccess")
      : effectivePhase === "empty"
        ? t("posterAutofill.headingEmpty")
        : effectivePhase === "error"
          ? t("posterAutofill.headingError")
          : t("posterAutofill.heading");

  const idleSubtitle = hasExistingPoster
    ? isAuthenticated || isAuthLoading
      ? t("posterAutofill.descriptionReady")
      : t("posterAutofill.descriptionReadyGuest")
    : isAuthenticated || isAuthLoading
      ? t("posterAutofill.description")
      : t("posterAutofill.descriptionGuest");

  const hasWarnings =
    effectivePhase === "success" &&
    Boolean(
      effectiveUnmatchedTown ||
        dateInferredWarning ||
        pastDateWarning ||
        priceReviewWarning ||
        multiEventWarning,
    );

  const statusIcon =
    effectivePhase === "success" ? (
      <CheckCircleIcon
        key="success"
        className="h-5 w-5 text-success-dark shrink-0 poster-icon-swap"
        aria-hidden="true"
      />
    ) : effectivePhase === "error" ? (
      <ExclamationTriangleIcon
        key="error"
        className="h-5 w-5 text-error-dark shrink-0 poster-icon-swap"
        aria-hidden="true"
      />
    ) : effectivePhase === "empty" ? (
      <ExclamationTriangleIcon
        key="empty"
        className="h-5 w-5 text-warning-dark shrink-0 poster-icon-swap"
        aria-hidden="true"
      />
    ) : (
      <SparklesIcon
        key="sparkle"
        className="h-5 w-5 text-primary shrink-0 poster-icon-swap"
        aria-hidden="true"
      />
    );

  const pickLabel = hasExistingPoster
    ? t("posterAutofill.changeButton")
    : t("posterAutofill.pickButton");

  return (
    <section
      aria-label={t("posterAutofill.heading")}
      data-testid="poster-autofill-card"
      data-phase={effectivePhase}
      onDragOver={(event) => {
        if (disabled || isBusy) return;
        event.preventDefault();
        event.stopPropagation();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setDragOver(false);
        if (disabled || isBusy) return;
        const dropped = event.dataTransfer.files?.[0];
        if (dropped) void handleSelectedFile(dropped);
      }}
      className={`card-bordered transition-[border-color,background-color,box-shadow] duration-200 ${
        dragOver
          ? "border-primary bg-primary/5 shadow-md"
          : effectivePhase === "success"
            ? "border-success-border bg-success-light/40"
            : "bg-background"
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={IMAGE_UPLOAD_ACCEPT}
        className="hidden"
        aria-label={pickLabel}
        data-testid="poster-autofill-input"
        disabled={disabled || isBusy}
        onChange={(event) => {
          const picked = event.target.files?.[0];
          if (picked) void handleSelectedFile(picked);
        }}
      />

      <div className="card-body stack gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3 sm:flex-nowrap">
          <div className="flex min-w-0 items-center gap-3">
            {hasExistingPoster && currentImagePreview ? (
              <div className="relative h-14 w-12 shrink-0 overflow-hidden rounded-input bg-muted poster-thumb-outline">
                <img
                  src={currentImagePreview}
                  alt={t("posterAutofill.thumbAlt")}
                  className="h-full w-full object-cover"
                />
                {showScanOverlay && (
                  <div className="poster-scan-beam" aria-hidden="true" />
                )}
              </div>
            ) : (
              <div
                className={`flex-center h-14 w-12 shrink-0 rounded-input border transition-[border-color,background-color,transform] duration-200 ${
                  dragOver
                    ? "border-primary/40 bg-primary/10 -translate-y-0.5"
                    : "border-border/60 bg-muted"
                }`}
                aria-hidden="true"
              >
                <PhotoIcon className="h-5 w-5 text-foreground" />
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                {statusIcon}
                <h2
                  role={isBusy ? "status" : undefined}
                  aria-live={isBusy ? "polite" : undefined}
                  data-testid={isBusy ? "poster-autofill-status" : undefined}
                  className="body-normal font-semibold text-foreground-strong"
                >
                  {heading}
                </h2>
              </div>

              {isBusy && (
                <p className="body-small text-muted-foreground">
                  {t("posterAutofill.statusHint")}
                </p>
              )}

              {effectivePhase === "idle" && (
                <p className="body-small text-muted-foreground">
                  {idleSubtitle}
                </p>
              )}

              {effectivePhase === "success" && (
                <p
                  role="status"
                  aria-live="polite"
                  data-testid={
                    filledFields.length > 0
                      ? "poster-autofill-success"
                      : undefined
                  }
                  className="body-small font-medium text-success-dark"
                >
                  {filledFields.length > 0
                    ? t("posterAutofill.successSummary", {
                        count: filledFields.length,
                      })
                    : t("posterAutofill.successWarningsOnly")}
                </p>
              )}

              {effectivePhase === "empty" && (
                <p
                  role="status"
                  aria-live="polite"
                  data-testid="poster-autofill-empty"
                  className="body-small text-muted-foreground"
                >
                  {t("posterAutofill.emptyResult")}
                </p>
              )}

              {effectivePhase === "error" && errorMessage && (
                <p
                  role="alert"
                  data-testid="poster-autofill-error"
                  className="body-small font-medium text-error-dark"
                >
                  {errorMessage}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            {isBusy ? (
              <Button
                key="cancel"
                type="button"
                variant="ghost"
                onClick={cancelActiveScan}
                data-testid="poster-autofill-cancel"
                className={`${ACTION_BTN_CLASSES} text-muted-foreground`}
              >
                {t("posterAutofill.cancelButton")}
              </Button>
            ) : effectivePhase === "success" ? (
              <>
                <Button
                  key="pick"
                  type="button"
                  variant="neutral"
                  onClick={openFilePicker}
                  disabled={disabled || isAuthLoading}
                  data-testid="poster-autofill-pick"
                  className={ACTION_BTN_CLASSES}
                >
                  {t("posterAutofill.changeButton")}
                </Button>
                {canUndo && (
                  <Button
                    key="undo"
                    type="button"
                    variant="ghost"
                    hasIcon
                    onClick={handleUndoClick}
                    disabled={disabled}
                    data-testid="poster-autofill-undo"
                    className={`${ACTION_BTN_CLASSES} text-muted-foreground`}
                  >
                    <ArrowUturnLeftIcon
                      className="h-4 w-4 shrink-0"
                      aria-hidden="true"
                    />
                    {t("posterAutofill.undoButton")}
                  </Button>
                )}
              </>
            ) : phase === "error" && canRetry ? (
              <>
                <Button
                  key="retry"
                  type="button"
                  variant="neutral"
                  hasIcon
                  onClick={handleAnalyzeExisting}
                  disabled={disabled || isAuthLoading}
                  data-testid="poster-autofill-retry"
                  className={ACTION_BTN_CLASSES}
                >
                  <ArrowPathIcon
                    className="h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  {t("posterAutofill.retryButton")}
                </Button>
                <Button
                  key="pick"
                  type="button"
                  variant="ghost"
                  onClick={openFilePicker}
                  disabled={disabled || isAuthLoading}
                  data-testid="poster-autofill-pick"
                  className={`${ACTION_BTN_CLASSES} text-foreground`}
                >
                  {pickLabel}
                </Button>
              </>
            ) : phase === "idle" && hasExistingPoster ? (
              <>
                <Button
                  key="analyze"
                  type="button"
                  variant="neutral"
                  onClick={handleAnalyzeExisting}
                  disabled={disabled || isAuthLoading}
                  data-testid="poster-autofill-analyze-existing"
                  className={ACTION_BTN_CLASSES}
                >
                  {t("posterAutofill.analyzeExistingButton")}
                </Button>
                <Button
                  key="pick"
                  type="button"
                  variant="ghost"
                  onClick={openFilePicker}
                  disabled={disabled || isAuthLoading}
                  data-testid="poster-autofill-pick"
                  className={`${ACTION_BTN_CLASSES} text-foreground`}
                >
                  {t("posterAutofill.changeButton")}
                </Button>
              </>
            ) : (
              <Button
                key="pick"
                type="button"
                variant="neutral"
                onClick={openFilePicker}
                disabled={disabled || isAuthLoading}
                data-testid="poster-autofill-pick"
                className={ACTION_BTN_CLASSES}
              >
                {pickLabel}
              </Button>
            )}
          </div>
        </div>

        {hasWarnings && (
          <ul
            data-testid="poster-autofill-warnings"
            className="stack gap-1 rounded-input border border-warning-border bg-warning-light px-3 py-2 body-small text-warning-dark"
          >
            {effectiveUnmatchedTown && (
              <li>
                {t("posterAutofill.warningUnmatchedTown", {
                  town: effectiveUnmatchedTown,
                })}
              </li>
            )}
            {dateInferredWarning && (
              <li>{t("posterAutofill.warningDateInferred")}</li>
            )}
            {pastDateWarning && (
              <li>{t("posterAutofill.warningPastDate")}</li>
            )}
            {priceReviewWarning && (
              <li>{t("posterAutofill.warningPriceReview")}</li>
            )}
            {multiEventWarning && (
              <li>{t("posterAutofill.warningMultiEvent")}</li>
            )}
          </ul>
        )}
      </div>
    </section>
  );
}

