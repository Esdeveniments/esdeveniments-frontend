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
import { IMAGE_UPLOAD_ACCEPT, MAX_TOTAL_UPLOAD_BYTES } from "@utils/constants";
import { imageUploadErrorMessage } from "@utils/image-upload";
import { usePosterAutofill } from "@components/hooks/usePosterAutofill";
import type { PosterAutofillFieldKey } from "types/api/poster";
import type { EventFormStep } from "types/event";
import type { PosterAutofillCardProps } from "types/props";

const FIELD_STEP_MAP: Record<PosterAutofillFieldKey, EventFormStep> = {
  title: 0,
  description: 0,
  url: 0,
  town: 1,
  location: 1,
  categories: 1,
  dates: 2,
  price: 2,
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
  onNavigateStep,
  canUndo,
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
    lastScannedFile,
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
    : errorCode === "not_configured"
      ? t("posterAutofill.errorUnavailable")
      : errorCode === "rate_limited"
        ? t("posterAutofill.errorRateLimited")
        : errorCode === "overloaded"
          ? t("posterAutofill.errorBusy")
          : errorCode === "upstream_timeout"
            ? t("posterAutofill.errorTimeout")
            : errorCode === "invalid_image" || errorCode === "too_large"
              ? t("posterAutofill.errorInvalidImage")
              : errorCode === "network_error"
                ? t("posterAutofill.errorNetwork")
                : errorCode
                  ? t("posterAutofill.errorGeneric")
                  : null;

  const canRetry =
    phase === "error" &&
    Boolean(currentImageFile) &&
    errorCode !== "not_configured" &&
    errorCode !== "invalid_image" &&
    errorCode !== "too_large";

  const hasExistingPoster = Boolean(currentImageFile && currentImagePreview);
  const showScanOverlay = phase === "analyzing" || phase === "checking";

  const fieldLabel = (field: PosterAutofillFieldKey): string => {
    switch (field) {
      case "title":
        return t("posterAutofill.fields.title");
      case "description":
        return t("posterAutofill.fields.description");
      case "url":
        return t("posterAutofill.fields.url");
      case "town":
        return t("posterAutofill.fields.town");
      case "location":
        return t("posterAutofill.fields.location");
      case "categories":
        return t("posterAutofill.fields.categories");
      case "dates":
        return t("posterAutofill.fields.dates");
      case "price":
        return t("posterAutofill.fields.price");
    }
  };

  const statusIcon =
    phase === "success" ? (
      <CheckCircleIcon
        key="success"
        className="h-5 w-5 text-success-dark shrink-0 poster-icon-swap"
        aria-hidden="true"
      />
    ) : phase === "error" ? (
      <ExclamationTriangleIcon
        key="error"
        className="h-5 w-5 text-error-dark shrink-0 poster-icon-swap"
        aria-hidden="true"
      />
    ) : (
      <SparklesIcon
        key="sparkle"
        className="h-5 w-5 text-primary shrink-0 poster-icon-swap"
        aria-hidden="true"
      />
    );

  return (
    <section
      aria-label={t("posterAutofill.heading")}
      data-testid="poster-autofill-card"
      data-phase={phase}
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
          : phase === "success"
            ? "border-success-border bg-success-light/40"
            : "bg-background"
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={IMAGE_UPLOAD_ACCEPT}
        className="hidden"
        aria-label={t("posterAutofill.pickButton")}
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
              <div className="relative h-14 w-12 sm:h-16 sm:w-14 shrink-0 overflow-hidden rounded-input bg-muted poster-thumb-outline">
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
                className={`flex-center h-10 w-10 shrink-0 rounded-input border transition-[border-color,background-color,transform] duration-200 ${
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
                <h2 className="body-normal font-semibold text-foreground-strong">
                  {t("posterAutofill.heading")}
                </h2>
              </div>
              <p className="body-small text-muted-foreground">
                {isAuthenticated || isAuthLoading
                  ? t("posterAutofill.description")
                  : t("posterAutofill.descriptionGuest")}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={openFilePicker}
              disabled={disabled || isBusy || isAuthLoading}
              data-testid="poster-autofill-pick"
              className="btn-neutral btn-sm normal-case tracking-normal font-medium active:scale-[0.96] transition-transform duration-100"
            >
              {hasExistingPoster
                ? t("posterAutofill.changeButton")
                : t("posterAutofill.pickButton")}
            </button>

            {hasExistingPoster &&
              !isBusy &&
              (phase === "idle" ||
                canRetry ||
                phase === "success" ||
                phase === "empty") && (
                <button
                  type="button"
                  onClick={handleAnalyzeExisting}
                  disabled={disabled || isAuthLoading}
                  data-testid="poster-autofill-analyze-existing"
                  className="btn-ghost btn-sm normal-case tracking-normal font-medium text-foreground active:scale-[0.96] transition-transform duration-100"
                >
                  <ArrowPathIcon
                    className="h-4 w-4 mr-1 shrink-0"
                    aria-hidden="true"
                  />
                  {lastScannedFile === currentImageFile
                    ? t("posterAutofill.rereadButton")
                    : t("posterAutofill.analyzeExistingButton")}
                </button>
              )}

            {canUndo && !isBusy && (
              <button
                type="button"
                onClick={handleUndoClick}
                disabled={disabled}
                data-testid="poster-autofill-undo"
                className="btn-ghost btn-sm normal-case tracking-normal font-medium text-muted-foreground active:scale-[0.96] transition-transform duration-100"
              >
                <ArrowUturnLeftIcon
                  className="h-4 w-4 mr-1 shrink-0"
                  aria-hidden="true"
                />
                {t("posterAutofill.undoButton")}
              </button>
            )}
          </div>
        </div>

        {isBusy && (
          <div
            role="status"
            aria-live="polite"
            data-testid="poster-autofill-status"
            className="flex-between flex-wrap gap-2 rounded-input border border-border/60 bg-muted px-3 py-2"
          >
            <span className="body-small font-medium text-foreground-strong">
              {phase === "preparing"
                ? t("posterAutofill.statusPreparing")
                : phase === "checking"
                  ? t("posterAutofill.statusChecking")
                  : t("posterAutofill.statusAnalyzing")}
            </span>
            <button
              type="button"
              onClick={cancelActiveScan}
              data-testid="poster-autofill-cancel"
              className="btn-ghost btn-sm normal-case tracking-normal font-medium text-muted-foreground active:scale-[0.96] transition-transform duration-100"
            >
              {t("posterAutofill.cancelButton")}
            </button>
          </div>
        )}

        {phase === "success" && filledFields.length > 0 && (
          <div
            role="status"
            aria-live="polite"
            data-testid="poster-autofill-success"
            className="stack gap-2"
          >
            <p className="body-small font-medium text-success-dark">
              {t("posterAutofill.successSummary", {
                count: filledFields.length,
              })}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {filledFields.map((field, index) => (
                <button
                  key={field}
                  type="button"
                  onClick={() => onNavigateStep?.(FIELD_STEP_MAP[field])}
                  style={{ animationDelay: `${index * 40}ms` }}
                  className="badge-default poster-chip-enter hover:border-foreground/40 focus-ring active:scale-[0.96] transition-[border-color,transform] duration-150"
                >
                  {fieldLabel(field)}
                </button>
              ))}
            </div>
          </div>
        )}

        {phase === "success" &&
          (unmatchedTown ||
            dateInferredWarning ||
            pastDateWarning ||
            priceReviewWarning ||
            multiEventWarning) && (
            <ul
              data-testid="poster-autofill-warnings"
              className="stack gap-1 rounded-input border border-warning-border bg-warning-light px-3 py-2 body-small text-warning-dark"
            >
              {unmatchedTown && (
                <li>
                  {t("posterAutofill.warningUnmatchedTown", {
                    town: unmatchedTown,
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

        {phase === "empty" && (
          <p
            role="status"
            aria-live="polite"
            data-testid="poster-autofill-empty"
            className="body-small text-muted-foreground"
          >
            {t("posterAutofill.emptyResult")}
          </p>
        )}

        {phase === "error" && errorMessage && (
          <p
            role="alert"
            data-testid="poster-autofill-error"
            className="body-small font-medium text-error-dark"
          >
            {errorMessage}
          </p>
        )}
      </div>
    </section>
  );
}
