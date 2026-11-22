"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { MAX_TOTAL_UPLOAD_BYTES } from "@utils/constants";
import { loadAndPrepareImage } from "@utils/image-upload";
import { sendGoogleEvent } from "@utils/analytics";
import type {
  PosterAutofillFieldKey,
  PosterExtractionApiError,
  PosterExtractionApiSuccess,
  PosterExtractionErrorCode,
  PosterExtractionStatusResponse,
} from "types/api/poster";
import type { PosterAutofillCardProps } from "types/props";
import type { ImageUploadFailure } from "types/upload";

const CLIENT_SCAN_TIMEOUT_MS = 52_000;

function createClientSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `c-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

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

function isChunkOrNetworkLoadError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const text = `${err.name} ${err.message}`.toLowerCase();
  return (
    text.includes("chunkloaderror") ||
    text.includes("loading chunk") ||
    text.includes("failed to fetch") ||
    text.includes("networkerror")
  );
}

export function usePosterAutofill({
  currentImageFile,
  isAuthenticated,
  isAuthLoading,
  disabled = false,
  autoScanIntentId,
  onAutoScanHandled,
  onRequestAuthForScan,
  onPosterPrepared,
  onExtractionApplied,
  onUndo,
  onBusyChange,
}: Pick<
  PosterAutofillCardProps,
  | "currentImageFile"
  | "isAuthenticated"
  | "isAuthLoading"
  | "disabled"
  | "autoScanIntentId"
  | "onAutoScanHandled"
  | "onRequestAuthForScan"
  | "onPosterPrepared"
  | "onExtractionApplied"
  | "onUndo"
  | "onBusyChange"
>) {
  const locale = useLocale();
  const abortRef = useRef<AbortController | null>(null);
  const clientIdRef = useRef<string | null>(null);
  const sequenceRef = useRef(0);
  const autoScanConsumedRef = useRef<string | null>(null);
  const activeScanFileRef = useRef<File | null>(null);
  const currentImageFileRef = useRef<File | null>(currentImageFile);
  const onBusyChangeRef = useRef(onBusyChange);
  const onExtractionAppliedRef = useRef(onExtractionApplied);
  const onRequestAuthForScanRef = useRef(onRequestAuthForScan);

  useEffect(() => {
    currentImageFileRef.current = currentImageFile;
    onBusyChangeRef.current = onBusyChange;
    onExtractionAppliedRef.current = onExtractionApplied;
    onRequestAuthForScanRef.current = onRequestAuthForScan;
  });

  const getClientId = () => {
    if (!clientIdRef.current) {
      clientIdRef.current = createClientSessionId();
    }
    return clientIdRef.current;
  };

  const [phase, setPhase] = useState<
    "idle" | "preparing" | "checking" | "analyzing" | "success" | "empty" | "error"
  >("idle");
  const [errorCode, setErrorCode] = useState<PosterExtractionErrorCode | null>(null);
  const [imagePrepFailure, setImagePrepFailure] =
    useState<ImageUploadFailure | null>(null);
  const [filledFields, setFilledFields] = useState<PosterAutofillFieldKey[]>([]);
  const [unmatchedTown, setUnmatchedTown] = useState<string | null>(null);
  const [pastDateWarning, setPastDateWarning] = useState(false);
  const [dateInferredWarning, setDateInferredWarning] = useState(false);
  const [priceReviewWarning, setPriceReviewWarning] = useState(false);
  const [multiEventWarning, setMultiEventWarning] = useState(false);
  const lastScannedFileRef = useRef<File | null>(null);
  const lastModelRef = useRef<string | null>(null);
  const phaseRef = useRef(phase);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const isBusy =
    phase === "preparing" || phase === "checking" || phase === "analyzing";

  useEffect(() => {
    onBusyChangeRef.current?.(isBusy);
  }, [isBusy]);

  useEffect(
    () => () => {
      sequenceRef.current += 1;
      activeScanFileRef.current = null;
      abortRef.current?.abort();
      onBusyChangeRef.current?.(false);
    },
    [],
  );

  const prevImageFileRef = useRef<File | null>(currentImageFile);

  const clearFeedback = useCallback(() => {
    setErrorCode(null);
    setImagePrepFailure(null);
    setFilledFields([]);
    setUnmatchedTown(null);
    setPastDateWarning(false);
    setDateInferredWarning(false);
    setPriceReviewWarning(false);
    setMultiEventWarning(false);
  }, []);

  // React to external poster changes (Step 3 ImageUpload replacing or removing
  // the poster): cancel an in-flight scan OR reset a finished success/error
  // banner so we never show "Cartell llegit" on a removed or unscanned image.
  useEffect(() => {
    const prevFile = prevImageFileRef.current;
    prevImageFileRef.current = currentImageFile;
    if (currentImageFile === prevFile) return;

    const activeFile = activeScanFileRef.current;
    if (activeFile && currentImageFile !== activeFile) {
      sequenceRef.current += 1;
      activeScanFileRef.current = null;
      abortRef.current?.abort();
      abortRef.current = null;
      queueMicrotask(() => {
        setPhase("idle");
        clearFeedback();
      });
      return;
    }

    if (
      !activeFile &&
      currentImageFile !== lastScannedFileRef.current
    ) {
      queueMicrotask(() => {
        setPhase((current) =>
          current === "success" || current === "empty" || current === "error"
            ? "idle"
            : current,
        );
        clearFeedback();
      });
    }
  }, [clearFeedback, currentImageFile]);

  const cancelActiveScan = useCallback(() => {
    const cancelledPhase = phaseRef.current;
    sequenceRef.current += 1;
    activeScanFileRef.current = null;
    abortRef.current?.abort();
    abortRef.current = null;
    setPhase("idle");
    clearFeedback();
    sendGoogleEvent("publish_poster_autofill_cancel", {
      source: "publica",
      reason: cancelledPhase,
    });
  }, [clearFeedback]);

  const requestAuthForScan = useCallback(async (file: File): Promise<void> => {
    sendGoogleEvent("publish_poster_autofill_auth_handoff", {
      source: "publica",
    });
    await onRequestAuthForScanRef.current(file);
  }, []);

  const dispatchExtraction = useCallback(
    async (
      file: File,
      seq: number,
      allowOverwriteOwned = false,
      triggerState: "initial" | "rescan" | "auto_return" = "initial",
    ): Promise<void> => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      activeScanFileRef.current = file;
      const startedAt = performance.now();
      const timeoutId = window.setTimeout(
        () => controller.abort("timeout"),
        CLIENT_SCAN_TIMEOUT_MS,
      );

      setPhase("analyzing");
      setErrorCode(null);
      setImagePrepFailure(null);
      sendGoogleEvent("publish_poster_autofill_start", {
        source: "publica",
        state: triggerState,
      });

      try {
        const body = new FormData();
        body.append("imageFile", file);
        body.append("sequence", String(seq));
        body.append("clientId", getClientId());
        body.append("locale", locale);

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
          if (seq !== sequenceRef.current) return;

          if (response.status === 401 || payload?.code === "unauthorized") {
            setPhase("idle");
            await requestAuthForScan(file);
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
            reason: code,
            state: "extract",
          });
          return;
        }

        const data = (await response.json()) as PosterExtractionApiSuccess;
        if (seq !== sequenceRef.current) return;

        lastScannedFileRef.current = file;
        const servingModel = data.model ?? "unknown";
        lastModelRef.current = servingModel;

        if (!data.hasData) {
          clearFeedback();
          setPhase("empty");
          sendGoogleEvent("publish_poster_autofill_empty", {
            source: "publica",
            mode: servingModel,
          });
          return;
        }

        const applied = await onExtractionAppliedRef.current(data.extracted, {
          allowOverwriteOwned,
          model: data.model,
          isStale: () => seq !== sequenceRef.current,
        });
        if (seq !== sequenceRef.current) return;
        setFilledFields(applied.filledFields);
        setUnmatchedTown(applied.unmatchedTown);
        setPastDateWarning(applied.pastDate);
        setDateInferredWarning(applied.dateInferred);
        setPriceReviewWarning(applied.priceNeedsReview);
        setMultiEventWarning(applied.isMultiEvent);
        const hasAnyWarning =
          Boolean(applied.unmatchedTown) ||
          applied.pastDate ||
          applied.dateInferred ||
          applied.priceNeedsReview ||
          applied.isMultiEvent;
        const hasAnyGuidance =
          applied.filledFields.length > 0 ||
          hasAnyWarning ||
          Boolean(applied.hasPendingCatalogs);
        setPhase(hasAnyGuidance ? "success" : "empty");

        if (!hasAnyGuidance) {
          sendGoogleEvent("publish_poster_autofill_empty", {
            source: "publica",
            mode: servingModel,
          });
          return;
        }

        sendGoogleEvent("publish_poster_autofill_success", {
          source: "publica",
          mode: servingModel,
          outcome: hasAnyWarning ? "warnings" : "clean",
          filled_count: applied.filledFields.length,
          duration_ms: Math.round(performance.now() - startedAt),
          has_unmatched_town: Boolean(applied.unmatchedTown),
          has_date_inferred: applied.dateInferred,
          has_past_date: applied.pastDate,
          has_price_review: applied.priceNeedsReview,
          is_multi_event: applied.isMultiEvent,
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
          reason: code,
          state: "extract",
          message: err instanceof Error ? err.name : "unknown",
        });
      } finally {
        window.clearTimeout(timeoutId);
        if (abortRef.current === controller) {
          abortRef.current = null;
          activeScanFileRef.current = null;
        }
      }
    },
    [clearFeedback, locale, requestAuthForScan],
  );

  const checkAvailabilityAndScan = useCallback(
    async (
      file: File,
      seq: number,
      allowOverwriteOwned = false,
    ): Promise<void> => {
      activeScanFileRef.current = file;
      setPhase("checking");
      setErrorCode(null);
      setImagePrepFailure(null);

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
            activeScanFileRef.current = null;
            setErrorCode("not_configured");
            setPhase("error");
            sendGoogleEvent("publish_poster_autofill_error", {
              source: "publica",
              reason: "not_configured",
              state: "check",
            });
            return;
          }
          if (status.state === "app_limit" || status.state === "account_limit") {
            activeScanFileRef.current = null;
            setErrorCode("rate_limited");
            setPhase("error");
            sendGoogleEvent("publish_poster_autofill_error", {
              source: "publica",
              reason: status.state,
              state: "check",
            });
            return;
          }
          if (!status.signedIn) {
            activeScanFileRef.current = null;
            setPhase("idle");
            await requestAuthForScan(file);
            return;
          }
        }
      } catch {
        if (seq !== sequenceRef.current) return;
        if (!isAuthenticated) {
          activeScanFileRef.current = null;
          setErrorCode("network_error");
          setPhase("error");
          sendGoogleEvent("publish_poster_autofill_error", {
            source: "publica",
            reason: "network_error",
            state: "check",
          });
          return;
        }
      }

      if (seq !== sequenceRef.current) return;
      await dispatchExtraction(
        file,
        seq,
        allowOverwriteOwned,
        allowOverwriteOwned ? "rescan" : "initial",
      );
    },
    [dispatchExtraction, isAuthenticated, requestAuthForScan],
  );

  const handleSelectedFile = useCallback(
    async (rawFile: File): Promise<void> => {
      if (disabled || isAuthLoading) return;
      const seq = ++sequenceRef.current;
      const initialPosterFile = currentImageFileRef.current;
      abortRef.current?.abort();
      clearFeedback();
      setPhase("preparing");

      try {
        const prepared = await loadAndPrepareImage(rawFile, {
          maxBytes: MAX_TOTAL_UPLOAD_BYTES,
        });
        if (seq !== sequenceRef.current) return;
        // If Step 3 attached a different poster while this file was preparing,
        // keep the organizer's newer selection and drop this stale preparation.
        if (currentImageFileRef.current !== initialPosterFile) {
          setPhase("idle");
          return;
        }

        if (!prepared.ok) {
          setImagePrepFailure(prepared.reason);
          setPhase("error");
          sendGoogleEvent("publish_poster_autofill_error", {
            source: "publica",
            reason: `prep_${prepared.reason}`,
            state: "prep",
          });
          return;
        }

        // Attach immediately so Step 3 already has the optimized poster.
        currentImageFileRef.current = prepared.file;
        onPosterPrepared(prepared.file);
        // First scan preserves anything the user typed beforehand; replacing or
        // re-uploading a poster after an earlier scan overwrites with the new poster
        // (and stays 1-click reversible via Undo).
        const isRescanOrReplace = lastScannedFileRef.current !== null;
        await checkAvailabilityAndScan(prepared.file, seq, isRescanOrReplace);
      } catch (prepError) {
        if (seq !== sequenceRef.current) return;
        const isChunkErr = isChunkOrNetworkLoadError(prepError);
        if (isChunkErr) {
          setErrorCode("network_error");
        } else {
          setImagePrepFailure("encode_failed");
        }
        setPhase("error");
        sendGoogleEvent("publish_poster_autofill_error", {
          source: "publica",
          reason: isChunkErr ? "network_error" : "prep_encode_failed",
          state: "prep",
        });
      }
    },
    [
      checkAvailabilityAndScan,
      clearFeedback,
      disabled,
      isAuthLoading,
      onPosterPrepared,
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
    void dispatchExtraction(currentImageFile, seq, false, "auto_return");
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
    // Retry after a failed replace keeps overwrite intent from an earlier scan;
    // scanning a manually attached poster (or re-reading after Undo) respects
    // fields the user already typed.
    const allowOverwriteOwned =
      phase === "error" && lastScannedFileRef.current !== null;
    void checkAvailabilityAndScan(currentImageFile, seq, allowOverwriteOwned);
  };

  const handleUndoClick = () => {
    onUndo();
    setPhase("idle");
    clearFeedback();
    sendGoogleEvent("publish_poster_autofill_undo", {
      source: "publica",
      mode: lastModelRef.current ?? "unknown",
    });
  };

  return {
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
  };
}
