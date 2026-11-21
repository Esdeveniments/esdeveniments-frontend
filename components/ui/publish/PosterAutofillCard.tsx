/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowPathIcon,
  ArrowUturnLeftIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PhotoIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import {
  IMAGE_UPLOAD_ACCEPT,
  MAX_TOTAL_UPLOAD_BYTES,
} from "@utils/constants";
import { imageUploadErrorMessage, loadAndPrepareImage } from "@utils/image-upload";
import { sendGoogleEvent } from "@utils/analytics";
import type {
  PosterAutofillFieldKey,
  PosterExtractionApiError,
  PosterExtractionApiSuccess,
  PosterExtractionErrorCode,
  PosterExtractionStatusResponse,
} from "types/api/poster";
import type { EventFormStep } from "types/event";
import type { PosterAutofillCardProps } from "types/props";

const CLIENT_SCAN_TIMEOUT_MS = 52_000;

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

function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

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
  const abortRef = useRef<AbortController | null>(null);
  const sequenceRef = useRef(0);
  const autoScanConsumedRef = useRef<string | null>(null);
  const onBusyChangeRef = useRef(onBusyChange);

  useEffect(() => {
    onBusyChangeRef.current = onBusyChange;
  });

  const [phase, setPhase] = useState<
    "idle" | "preparing" | "checking" | "analyzing" | "success" | "empty" | "error"
  >("idle");
  const [dragOver, setDragOver] = useState(false);
  const [errorCode, setErrorCode] = useState<PosterExtractionErrorCode | null>(null);
  const [customError, setCustomError] = useState<string | null>(null);
  const [filledFields, setFilledFields] = useState<PosterAutofillFieldKey[]>([]);
  const [unmatchedTown, setUnmatchedTown] = useState<string | null>(null);
  const [pastDateWarning, setPastDateWarning] = useState(false);
  const [dateInferredWarning, setDateInferredWarning] = useState(false);
  const [priceReviewWarning, setPriceReviewWarning] = useState(false);
  const [multiEventWarning, setMultiEventWarning] = useState(false);
  const [lastScannedFile, setLastScannedFile] = useState<File | null>(null);

  const isBusy =
    phase === "preparing" || phase === "checking" || phase === "analyzing";

  useEffect(() => {
    onBusyChangeRef.current?.(isBusy);
  }, [isBusy]);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      onBusyChangeRef.current?.(false);
    },
    [],
  );

  const clearFeedback = useCallback(() => {
    setErrorCode(null);
    setCustomError(null);
    setFilledFields([]);
    setUnmatchedTown(null);
    setPastDateWarning(false);
    setDateInferredWarning(false);
    setPriceReviewWarning(false);
    setMultiEventWarning(false);
  }, []);

  const cancelActiveScan = useCallback(() => {
    sequenceRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    setPhase("idle");
    clearFeedback();
  }, [clearFeedback]);

  const dispatchExtraction = useCallback(
    async (
      file: File,
      seq: number,
      allowOverwriteOwned = false,
    ): Promise<void> => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const timeoutId = window.setTimeout(
        () => controller.abort("timeout"),
        CLIENT_SCAN_TIMEOUT_MS,
      );

      setPhase("analyzing");
      setErrorCode(null);
      setCustomError(null);
      sendGoogleEvent("publish_poster_autofill_start", { source: "publica" });

      try {
        const body = new FormData();
        body.append("imageFile", file);
        body.append("sequence", String(seq));

        const response = await fetch("/api/events/extract-poster", {
          method: "POST",
          body,
          signal: controller.signal,
        });

        if (seq !== sequenceRef.current) return;

        if (!response.ok) {
          let payload: PosterExtractionApiError | null = null;
          try {
            payload = (await response.json()) as PosterExtractionApiError;
          } catch {
            // Non-JSON error body
          }

          if (response.status === 401 || payload?.code === "unauthorized") {
            setPhase("idle");
            await onRequestAuthForScan(file);
            return;
          }

          const code: PosterExtractionErrorCode =
            payload?.code ??
            (response.status === 429
              ? "rate_limited"
              : response.status === 504 || response.status === 408
                ? "upstream_timeout"
                : response.status === 503
                  ? "not_configured"
                  : response.status === 413
                    ? "too_large"
                    : response.status === 415 || response.status === 400
                      ? "invalid_image"
                      : "upstream_error");

          setErrorCode(code);
          setPhase("error");
          sendGoogleEvent("publish_poster_autofill_error", {
            source: "publica",
            code,
          });
          return;
        }

        const data = (await response.json()) as PosterExtractionApiSuccess;
        if (seq !== sequenceRef.current) return;

        setLastScannedFile(file);

        if (!data.hasData) {
          clearFeedback();
          setPhase("empty");
          sendGoogleEvent("publish_poster_autofill_empty", {
            source: "publica",
          });
          return;
        }

        const applied = onExtractionApplied(data.extracted, {
          allowOverwriteOwned,
        });
        setFilledFields(applied.filledFields);
        setUnmatchedTown(applied.unmatchedTown);
        setPastDateWarning(applied.pastDate);
        setDateInferredWarning(applied.dateInferred);
        setPriceReviewWarning(applied.priceNeedsReview);
        setMultiEventWarning(applied.isMultiEvent);
        setPhase(applied.filledFields.length > 0 ? "success" : "empty");

        sendGoogleEvent("publish_poster_autofill_success", {
          source: "publica",
          filled_count: applied.filledFields.length,
          has_unmatched_town: Boolean(applied.unmatchedTown),
        });
      } catch (err) {
        if (seq !== sequenceRef.current) return;
        const timedOut = controller.signal.reason === "timeout";
        if (controller.signal.aborted && !timedOut) {
          setPhase("idle");
          return;
        }
        const code: PosterExtractionErrorCode = timedOut
          ? "upstream_timeout"
          : "network_error";
        setErrorCode(code);
        setPhase("error");
        sendGoogleEvent("publish_poster_autofill_error", {
          source: "publica",
          code,
          message: err instanceof Error ? err.name : "unknown",
        });
      } finally {
        window.clearTimeout(timeoutId);
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
      }
    },
    [clearFeedback, onExtractionApplied, onRequestAuthForScan],
  );

  const checkAvailabilityAndScan = useCallback(
    async (
      file: File,
      seq: number,
      allowOverwriteOwned = false,
    ): Promise<void> => {
      setPhase("checking");
      setErrorCode(null);
      setCustomError(null);

      try {
        const statusRes = await fetch("/api/events/extract-poster", {
          method: "GET",
          cache: "no-store",
        });
        if (seq !== sequenceRef.current) return;

        if (statusRes.ok) {
          const status = (await statusRes.json()) as PosterExtractionStatusResponse;
          if (seq !== sequenceRef.current) return;

          if (status.state === "disabled") {
            setErrorCode("not_configured");
            setPhase("error");
            return;
          }
          if (status.state === "app_limit" || status.state === "account_limit") {
            setErrorCode("rate_limited");
            setPhase("error");
            return;
          }
          if (!status.signedIn) {
            setPhase("idle");
            await onRequestAuthForScan(file);
            return;
          }
        }
      } catch {
        // Fall through to POST or auth check if status check hit a transient blip.
        if (seq !== sequenceRef.current) return;
        if (!isAuthenticated) {
          setErrorCode("network_error");
          setPhase("error");
          return;
        }
      }

      if (seq !== sequenceRef.current) return;
      await dispatchExtraction(file, seq, allowOverwriteOwned);
    },
    [dispatchExtraction, isAuthenticated, onRequestAuthForScan],
  );

  const handleSelectedFile = useCallback(
    async (rawFile: File): Promise<void> => {
      if (disabled || isAuthLoading) return;
      const seq = ++sequenceRef.current;
      abortRef.current?.abort();
      clearFeedback();
      setPhase("preparing");

      try {
        const prepared = await loadAndPrepareImage(rawFile, {
          maxBytes: MAX_TOTAL_UPLOAD_BYTES,
        });
        if (seq !== sequenceRef.current) return;

        if (!prepared.ok) {
          setCustomError(
            imageUploadErrorMessage(tImg, prepared.reason, MAX_TOTAL_UPLOAD_BYTES),
          );
          setPhase("error");
          return;
        }

        // Attach immediately so Step 3 already has the optimized poster.
        onPosterPrepared(prepared.file);
        await checkAvailabilityAndScan(prepared.file, seq, false);
      } catch {
        if (seq !== sequenceRef.current) return;
        setCustomError(tImg("compressFailed"));
        setPhase("error");
      }
    },
    [
      checkAvailabilityAndScan,
      clearFeedback,
      disabled,
      isAuthLoading,
      onPosterPrepared,
      tImg,
    ],
  );

  // One-shot auto-extraction when returning from a verified Logto scan redirect.
  useEffect(() => {
    if (
      !autoScanIntentId ||
      autoScanConsumedRef.current === autoScanIntentId ||
      disabled ||
      isAuthLoading ||
      !isAuthenticated ||
      !currentImageFile
    ) {
      return;
    }
    autoScanConsumedRef.current = autoScanIntentId;
    onAutoScanHandled?.();
    const seq = ++sequenceRef.current;
    void dispatchExtraction(currentImageFile, seq, false);
  }, [
    autoScanIntentId,
    currentImageFile,
    disabled,
    dispatchExtraction,
    isAuthLoading,
    isAuthenticated,
    onAutoScanHandled,
  ]);

  // Image-only paste support (ignores text pastes and pastes inside form fields).
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (disabled || isBusy || isEditableElement(event.target)) return;
      const items = event.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const pasted = item.getAsFile();
          if (pasted) {
            event.preventDefault();
            void handleSelectedFile(pasted);
            return;
          }
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [disabled, handleSelectedFile, isBusy]);

  const handleAnalyzeExisting = () => {
    if (!currentImageFile || disabled || isBusy) return;
    const seq = ++sequenceRef.current;
    const isReread = lastScannedFile === currentImageFile;
    void checkAvailabilityAndScan(currentImageFile, seq, isReread);
  };

  const handleUndoClick = () => {
    onUndo();
    setPhase("idle");
    clearFeedback();
    sendGoogleEvent("publish_poster_autofill_undo", { source: "publica" });
  };

  const openFilePicker = () => {
    if (disabled || isBusy) return;
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const errorMessage = customError
    ? customError
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

      <div className="card-body stack">
        <div className="flex items-start gap-3">
          {hasExistingPoster && currentImagePreview ? (
            <div className="relative h-20 w-16 sm:h-24 sm:w-20 shrink-0 overflow-hidden rounded-input bg-muted poster-thumb-outline">
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
              className={`flex-center h-11 w-11 shrink-0 rounded-input border transition-[border-color,background-color,transform] duration-200 ${
                dragOver
                  ? "border-primary/40 bg-primary/10 -translate-y-0.5"
                  : "border-border/60 bg-muted"
              }`}
              aria-hidden="true"
            >
              <PhotoIcon className="h-5 w-5 text-foreground" />
            </div>
          )}

          <div className="min-w-0 flex-1 stack gap-1.5">
            <div className="flex items-center gap-2">
              {statusIcon}
              <h2 className="heading-4 text-foreground-strong">
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

        {/* Honest live status region while preparing or scanning */}
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

        {/* Extracted fields summary + review chips */}
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

        {/* Contextual uncertainty notices (only shown when real uncertainty exists) */}
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

        {/* Empty / non-poster notice */}
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

        {/* Error alert */}
        {phase === "error" && errorMessage && (
          <p
            role="alert"
            data-testid="poster-autofill-error"
            className="body-small font-medium text-error-dark"
          >
            {errorMessage}
          </p>
        )}

        {/* Action row: secondary emphasis so EventForm's btn-primary stays sole CTA */}
        <div className="flex flex-wrap items-center gap-2">
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

          {hasExistingPoster && !isBusy && (phase === "idle" || canRetry || phase === "success" || phase === "empty") && (
            <button
              type="button"
              onClick={handleAnalyzeExisting}
              disabled={disabled || isAuthLoading}
              data-testid="poster-autofill-analyze-existing"
              className="btn-ghost btn-sm normal-case tracking-normal font-medium text-foreground active:scale-[0.96] transition-transform duration-100"
            >
              <ArrowPathIcon className="h-4 w-4 mr-1.5 shrink-0" aria-hidden="true" />
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
              <ArrowUturnLeftIcon className="h-4 w-4 mr-1.5 shrink-0" aria-hidden="true" />
              {t("posterAutofill.undoButton")}
            </button>
          )}
        </div>

        <p className="body-small text-muted-foreground">
          {t("posterAutofill.privacyNote")}
        </p>
      </div>
    </section>
  );
}
