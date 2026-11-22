/* eslint-disable @next/next/no-img-element */
"use client";

import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowPathIcon,
  ArrowUturnLeftIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import Button from "@components/ui/common/button";
import { IMAGE_UPLOAD_ACCEPT, MAX_TOTAL_UPLOAD_BYTES } from "@utils/constants";
import { imageUploadErrorMessage } from "@utils/image-upload";
import { usePosterAutofill } from "@components/hooks/usePosterAutofill";
import type {
  PosterAutofillFieldKey,
  PosterExtractionErrorCode,
} from "types/api/poster";
import type { PosterAutofillCardProps } from "types/props";

const FIELD_LABEL_KEYS: Record<PosterAutofillFieldKey, string> = {
  title: "posterAutofill.fields.title",
  description: "posterAutofill.fields.description",
  url: "posterAutofill.fields.url",
  town: "posterAutofill.fields.town",
  location: "posterAutofill.fields.location",
  categories: "posterAutofill.fields.categories",
  dates: "posterAutofill.fields.dates",
  price: "posterAutofill.fields.price",
};

function formatFieldList(items: string[], locale: string): string {
  if (items.length <= 1) return items[0] ?? "";
  try {
    return new Intl.ListFormat(locale, {
      style: "long",
      type: "conjunction",
    }).format(items);
  } catch {
    return items.join(", ");
  }
}

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

const CORNER_BADGE_BG: Partial<
  Record<"success" | "error" | "empty", string>
> = {
  success: "bg-success-dark",
  error: "bg-error-dark",
  empty: "bg-warning-dark",
};

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
  deferredFilledFields = [],
  deferredUnmatchedTown = null,
  hasSelectedTown = false,
  isFormDateEnded,
  onUndo,
  onBusyChange,
}: PosterAutofillCardProps) {
  const t = useTranslations("App.Publish");
  const tImg = useTranslations("Components.ImageUploader");
  const locale = useLocale();
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

  const effectiveFilledFields =
    phase === "success" || phase === "empty"
      ? Array.from(new Set([...filledFields, ...deferredFilledFields]))
      : filledFields;

  const rawUnmatchedTown =
    unmatchedTown ??
    (phase === "success" || phase === "empty" ? deferredUnmatchedTown : null);
  const effectiveUnmatchedTown = hasSelectedTown ? null : rawUnmatchedTown;
  const effectivePastDateWarning =
    pastDateWarning && (isFormDateEnded ?? true);

  const effectivePhase =
    phase === "empty" &&
    (effectiveFilledFields.length > 0 || Boolean(effectiveUnmatchedTown))
      ? "success"
      : phase;

  const heading = isBusy
    ? t(
        phase === "preparing"
          ? "posterAutofill.statusPreparing"
          : phase === "checking"
            ? "posterAutofill.statusChecking"
            : "posterAutofill.statusAnalyzing",
      )
    : t(
        effectivePhase === "success"
          ? "posterAutofill.headingSuccess"
          : effectivePhase === "empty"
            ? "posterAutofill.headingEmpty"
            : effectivePhase === "error"
              ? "posterAutofill.headingError"
              : "posterAutofill.heading",
      );

  const idleSubtitle = t(
    hasExistingPoster
      ? isAuthenticated || isAuthLoading
        ? "posterAutofill.descriptionReady"
        : "posterAutofill.descriptionReadyGuest"
      : isAuthenticated || isAuthLoading
        ? "posterAutofill.description"
        : "posterAutofill.descriptionGuest",
  );

  const subtitle = isBusy
    ? { text: t("posterAutofill.statusHint") }
    : effectivePhase === "success"
      ? {
          text:
            effectiveFilledFields.length > 0
              ? t("posterAutofill.successSummary", {
                  fields: formatFieldList(
                    effectiveFilledFields.map((field) =>
                      t(FIELD_LABEL_KEYS[field]),
                    ),
                    locale,
                  ),
                })
              : t("posterAutofill.successWarningsOnly"),
          role: "status" as const,
          testId:
            effectiveFilledFields.length > 0
              ? "poster-autofill-success"
              : undefined,
        }
      : effectivePhase === "empty"
        ? {
            text: t("posterAutofill.emptyResult"),
            role: "status" as const,
            testId: "poster-autofill-empty",
          }
        : effectivePhase === "error"
          ? {
              text: errorMessage,
              role: "alert" as const,
              testId: "poster-autofill-error",
              isError: true,
            }
          : { text: idleSubtitle };

  const reviewItems: Array<{ id: string; label: string; detail: string }> = [];
  if (effectivePhase === "success") {
    if (effectiveUnmatchedTown) {
      reviewItems.push({
        id: "town",
        label: t("posterAutofill.fields.town"),
        detail: t("posterAutofill.warningUnmatchedTown", {
          town: effectiveUnmatchedTown,
        }),
      });
    }
    const dateDetails = [
      dateInferredWarning ? t("posterAutofill.warningDateInferred") : null,
      effectivePastDateWarning ? t("posterAutofill.warningPastDate") : null,
    ].filter((item): item is string => Boolean(item));
    if (dateDetails.length > 0) {
      reviewItems.push({
        id: "dates",
        label: t("posterAutofill.fields.dates"),
        detail: dateDetails.join(" · "),
      });
    }
    if (priceReviewWarning) {
      reviewItems.push({
        id: "price",
        label: t("posterAutofill.fields.price"),
        detail: t("posterAutofill.warningPriceReview"),
      });
    }
    if (multiEventWarning) {
      reviewItems.push({
        id: "multi",
        label: t("posterAutofill.warningMultiLabel"),
        detail: t("posterAutofill.warningMultiEvent"),
      });
    }
  }

  const badgeBg =
    effectivePhase === "success" ||
    effectivePhase === "error" ||
    effectivePhase === "empty"
      ? CORNER_BADGE_BG[effectivePhase]
      : null;

  const pickLabel = t(
    hasExistingPoster
      ? "posterAutofill.changeButton"
      : "posterAutofill.pickButton",
  );

  const pickDisabled = disabled || isAuthLoading;
  const pickButton = (variant: "neutral" | "ghost") => (
    <Button
      key={`pick-${variant}`}
      type="button"
      variant={variant}
      onClick={openFilePicker}
      disabled={pickDisabled}
      data-testid="poster-autofill-pick"
      className={
        variant === "ghost"
          ? `${ACTION_BTN_CLASSES} text-foreground`
          : ACTION_BTN_CLASSES
      }
    >
      {pickLabel}
    </Button>
  );

  const actions = isBusy ? (
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
      {pickButton("neutral")}
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
          <ArrowUturnLeftIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
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
        disabled={pickDisabled}
        data-testid="poster-autofill-retry"
        className={ACTION_BTN_CLASSES}
      >
        <ArrowPathIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
        {t("posterAutofill.retryButton")}
      </Button>
      {pickButton("ghost")}
    </>
  ) : phase === "idle" && hasExistingPoster ? (
    <>
      <Button
        key="analyze"
        type="button"
        variant="neutral"
        onClick={handleAnalyzeExisting}
        disabled={pickDisabled}
        data-testid="poster-autofill-analyze-existing"
        className={ACTION_BTN_CLASSES}
      >
        {t("posterAutofill.analyzeExistingButton")}
      </Button>
      {pickButton("ghost")}
    </>
  ) : (
    pickButton("neutral")
  );

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
      className={`card-bordered overflow-hidden shadow-xs transition-[border-color,background-color,box-shadow] duration-200 ${
        dragOver
          ? "border-primary bg-primary/5 shadow-sm"
          : effectivePhase === "error"
            ? "border-error/40 bg-background"
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

      <div className="p-card-padding-sm flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-3.5">
          <div className="relative h-14 w-11 shrink-0">
            {hasExistingPoster && currentImagePreview ? (
              <div className="relative h-full w-full overflow-hidden rounded-input bg-muted poster-thumb-outline">
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
                className={`flex-center h-full w-full rounded-input border border-dashed transition-[border-color,background-color,transform] duration-200 ${
                  dragOver
                    ? "border-primary bg-primary/10 -translate-y-0.5"
                    : "border-input bg-muted"
                }`}
                aria-hidden="true"
              >
                <SparklesIcon className="h-5 w-5 text-primary" />
              </div>
            )}
            {badgeBg && (
              <span
                key={effectivePhase}
                aria-hidden="true"
                className={`poster-icon-swap flex-center absolute -bottom-1 -right-1 h-5 w-5 rounded-full ${badgeBg} text-background ring-2 ring-background`}
              >
                {effectivePhase === "success" ? (
                  <CheckIcon className="h-3 w-3 stroke-[2.5]" />
                ) : (
                  <ExclamationTriangleIcon className="h-3 w-3 stroke-2" />
                )}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-0.5">
            <h2
              role={isBusy ? "status" : undefined}
              aria-live={isBusy ? "polite" : undefined}
              data-testid={isBusy ? "poster-autofill-status" : undefined}
              className="body-normal font-semibold text-foreground-strong leading-snug"
            >
              {heading}
            </h2>
            {subtitle.text && (
              <p
                role={subtitle.role}
                aria-live={subtitle.role === "status" ? "polite" : undefined}
                data-testid={subtitle.testId}
                className={`body-small leading-snug text-pretty ${
                  subtitle.isError
                    ? "font-medium text-error-dark"
                    : "text-muted-foreground"
                }`}
              >
                {subtitle.text}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          {actions}
        </div>
      </div>

      {reviewItems.length > 0 && (
        <ul
          data-testid="poster-autofill-warnings"
          className="border-t border-border/60 bg-muted/60 px-card-padding-sm py-2.5 space-y-1.5"
        >
          {reviewItems.map((item) => (
            <li
              key={item.id}
              className="flex items-baseline gap-2 body-small leading-snug"
            >
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 shrink-0 -translate-y-px rounded-full bg-warning-dark"
              />
              <span className="text-pretty">
                <span className="font-medium capitalize text-foreground-strong">
                  {item.label}
                </span>
                <span className="text-muted-foreground"> · {item.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

