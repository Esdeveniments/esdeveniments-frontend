"use client";

import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { captureException } from "@sentry/nextjs";
import { getPathname } from "@i18n/routing";
import { sendGoogleEvent } from "@utils/analytics";
import { hasPublishFormEnded } from "@utils/publish-draft-warnings";
import {
  POSTER_SCAN_INTENT_STORAGE_KEY,
  POSTER_SCAN_INTENT_TTL_MS,
  PUBLISH_RESUME_PATH,
} from "@utils/constants";
import type { FormData } from "types/event";
import type {
  PendingPosterExtraction,
  PosterAutofillFieldKey,
  PosterAutofillPublishAnalytics,
  PosterAutofillTelemetrySnapshot,
  PosterAutofillUndoRecord,
  PosterExtractedEvent,
  PosterExtractionAppliedSummary,
  PosterScanIntentRecord,
} from "types/api/poster";
import type { UsePublishPosterAutofillOptions } from "types/props";

let cachedPosterAutofillModule: typeof import("@utils/poster-autofill") | null =
  null;
let pendingPosterAutofillImport: Promise<
  typeof import("@utils/poster-autofill")
> | null = null;

async function loadPosterAutofillUtils(): Promise<
  typeof import("@utils/poster-autofill")
> {
  if (cachedPosterAutofillModule) return cachedPosterAutofillModule;
  if (!pendingPosterAutofillImport) {
    pendingPosterAutofillImport = import("@utils/poster-autofill").then(
      (mod) => {
        cachedPosterAutofillModule = mod;
        return mod;
      },
      (err) => {
        pendingPosterAutofillImport = null;
        throw err;
      },
    );
  }
  return pendingPosterAutofillImport;
}

const formKeyToAutofillField = (
  name: keyof FormData,
): PosterAutofillFieldKey | null => {
  switch (name) {
    case "title":
      return "title";
    case "description":
      return "description";
    case "url":
      return "url";
    case "town":
    case "region":
      return "town";
    case "location":
      return "location";
    case "categories":
      return "categories";
    case "startDate":
    case "endDate":
    case "startTime":
    case "endTime":
    case "isAllDay":
      return "dates";
    case "priceType":
    case "priceAmount":
    case "originalPrice":
      return "price";
    default:
      return null;
  }
};

const EMPTY_APPLIED_SUMMARY: PosterExtractionAppliedSummary = {
  filledFields: [],
  unmatchedTown: null,
  pastDate: false,
  dateInferred: false,
  priceNeedsReview: false,
  isMultiEvent: false,
};

export function usePublishPosterAutofill({
  form,
  setForm,
  autoDatesRef,
  cityOptions,
  cityToRegionOptionMap,
  categories,
  isLoadingCities,
  isLoadingCategories,
  isAuthLoading,
  locale,
  signIn,
  prepareResume,
  draftOwnerChanged,
  markEdited,
  trackFieldInteraction,
  setImageFile,
  updateImagePreview,
  setError,
  setHandingOff,
  handoffStartedRef,
  handedOffRef,
  draftHandoffFailedMessage,
}: UsePublishPosterAutofillOptions) {
  const [posterAutofillBusy, setPosterAutofillBusy] = useState(false);
  const [verifiedScanIntentId, setVerifiedScanIntentId] = useState<
    string | null
  >(null);
  const [undoRecord, setUndoRecord] =
    useState<PosterAutofillUndoRecord | null>(null);
  const [pendingExtraction, setPendingExtraction] =
    useState<PendingPosterExtraction | null>(null);
  const [deferredUnmatchedTown, setDeferredUnmatchedTown] = useState<
    string | null
  >(null);
  const [deferredFilledFields, setDeferredFilledFields] = useState<
    PosterAutofillFieldKey[]
  >([]);
  const userOwnedFieldsRef = useRef<Set<PosterAutofillFieldKey>>(new Set());
  const telemetryRef = useRef<PosterAutofillTelemetrySnapshot | null>(null);
  const autofillRunIdRef = useRef(0);
  const formRef = useRef(form);

  useEffect(() => {
    formRef.current = form;
  }, [form]);

  // Verify one-shot Logto scan return (?resume=1&scan=<intentId>). Any load
  // without a matching scan param deletes stale scan intents so a later manual
  // Publish login can never trigger an unintended AI scan.
  useEffect(() => {
    const url = new URL(window.location.href);
    const scanParam = url.searchParams.get("scan");
    let rawIntent: string | null = null;
    try {
      rawIntent = sessionStorage.getItem(POSTER_SCAN_INTENT_STORAGE_KEY);
      sessionStorage.removeItem(POSTER_SCAN_INTENT_STORAGE_KEY);
    } catch {
      rawIntent = null;
    }

    if (scanParam) {
      url.searchParams.delete("scan");
      window.history.replaceState(window.history.state, "", url);
    }

    if (!scanParam || !rawIntent) return;
    try {
      const parsed = JSON.parse(rawIntent) as PosterScanIntentRecord;
      const fresh =
        parsed.intentId === scanParam &&
        typeof parsed.createdAt === "number" &&
        Date.now() - parsed.createdAt <= POSTER_SCAN_INTENT_TTL_MS;
      if (fresh) {
        queueMicrotask(() => setVerifiedScanIntentId(scanParam));
      }
    } catch {
      // Ignore corrupt intent record.
    }
  }, []);

  const resetPosterAutofill = useCallback(
    (options?: { keepScanIntent?: boolean }) => {
      if (!options?.keepScanIntent) {
        setVerifiedScanIntentId(null);
      }
      setUndoRecord(null);
      setPendingExtraction(null);
      setDeferredUnmatchedTown(null);
      setDeferredFilledFields([]);
      setPosterAutofillBusy(false);
      userOwnedFieldsRef.current.clear();
      telemetryRef.current = null;
    },
    [],
  );

  const clearVerifiedScanIntent = useCallback(() => {
    setVerifiedScanIntentId(null);
  }, []);

  const releaseUndoOwnership = useCallback((field: PosterAutofillFieldKey) => {
    setUndoRecord((current) => {
      if (!current || !current.ownedFields.has(field)) return current;
      const remaining = new Set(current.ownedFields);
      remaining.delete(field);
      return remaining.size > 0
        ? { ...current, ownedFields: remaining }
        : null;
    });
  }, []);

  const trackFormFieldOwnership = useCallback(
    (name: keyof FormData, isCleared: boolean) => {
      const autofillField = formKeyToAutofillField(name);
      if (!autofillField) return;
      // Every user edit (including clearing a field) takes ownership away from
      // Undo so Undo never restores an old value over an explicit clear, and
      // records a per-field correction for publish-time accuracy telemetry.
      releaseUndoOwnership(autofillField);
      if (telemetryRef.current?.filledFields.has(autofillField)) {
        telemetryRef.current.editedFields.add(autofillField);
      }
      if (isCleared) {
        userOwnedFieldsRef.current.delete(autofillField);
      } else {
        userOwnedFieldsRef.current.add(autofillField);
      }
    },
    [releaseUndoOwnership],
  );

  const handlePosterPrepared = useCallback(
    (file: File) => {
      setError(null);
      setPendingExtraction(null);
      setDeferredUnmatchedTown(null);
      setDeferredFilledFields([]);
      trackFieldInteraction("image");
      setImageFile(file);
      updateImagePreview(file);
    },
    [setError, setImageFile, trackFieldInteraction, updateImagePreview],
  );

  const handleRequestAuthForScan = useCallback(
    async (file: File) => {
      if (isAuthLoading || draftOwnerChanged || handoffStartedRef.current) {
        return;
      }
      handoffStartedRef.current = true;
      setHandingOff(true);

      const intentId =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const failHandoff = () => {
        handedOffRef.current = false;
        handoffStartedRef.current = false;
        setHandingOff(false);
        setError(draftHandoffFailedMessage);
      };

      const result = await prepareResume("login", "restore", {
        imageFile: file,
      });
      if (!result.ok) {
        failHandoff();
        return;
      }

      try {
        const record: PosterScanIntentRecord = {
          intentId,
          createdAt: Date.now(),
        };
        sessionStorage.setItem(
          POSTER_SCAN_INTENT_STORAGE_KEY,
          JSON.stringify(record),
        );
      } catch {
        failHandoff();
        return;
      }

      try {
        handedOffRef.current = true;
        const resumePath = getPathname({ href: PUBLISH_RESUME_PATH, locale });
        const separator = resumePath.includes("?") ? "&" : "?";
        signIn(`${resumePath}${separator}scan=${encodeURIComponent(intentId)}`);
      } catch (signInError) {
        captureException(signInError);
        try {
          sessionStorage.removeItem(POSTER_SCAN_INTENT_STORAGE_KEY);
        } catch {
          // Ignore storage cleanup error.
        }
        failHandoff();
      }
    },
    [
      draftHandoffFailedMessage,
      draftOwnerChanged,
      handedOffRef,
      handoffStartedRef,
      isAuthLoading,
      locale,
      prepareResume,
      setError,
      setHandingOff,
      signIn,
    ],
  );

  const commitAppliedFields = useCallback(
    (
      nextForm: FormData,
      filledFields: PosterAutofillFieldKey[],
      previousForm: FormData,
      previousAutoDates: boolean,
      options: {
        runId: number;
        model: string | null;
        preserveUserValues: boolean;
        appliedDates?: boolean;
        mergeUndo?: boolean;
      },
    ) => {
      markEdited();
      if (!options.preserveUserValues) {
        for (const field of filledFields) {
          userOwnedFieldsRef.current.delete(field);
        }
      }
      if (options.appliedDates) {
        autoDatesRef.current = false;
      }
      formRef.current = nextForm;
      setForm(nextForm);

      const servingModel = options.model ?? "unknown";
      const currentTelemetry = telemetryRef.current;
      if (options.mergeUndo && currentTelemetry && currentTelemetry.runId === options.runId) {
        for (const field of filledFields) {
          currentTelemetry.filledFields.add(field);
          currentTelemetry.editedFields.delete(field);
        }
      } else {
        telemetryRef.current = {
          runId: options.runId,
          model: servingModel,
          filledFields: new Set(filledFields),
          editedFields: new Set(),
        };
      }

      if (options.mergeUndo) {
        setUndoRecord((prev) => {
          // Only merge into the Undo record created by this exact extraction run;
          // if an earlier scan owned `prev`, replace it so Undo scope matches apply-time fills.
          if (!prev || prev.runId !== options.runId) {
            return {
              runId: options.runId,
              ownedFields: new Set(filledFields),
              previousForm,
              previousAutoDates,
            };
          }
          const nextOwned = new Set(prev.ownedFields);
          for (const field of filledFields) nextOwned.add(field);
          return { ...prev, ownedFields: nextOwned };
        });
      } else {
        setUndoRecord({
          runId: options.runId,
          ownedFields: new Set(filledFields),
          previousForm,
          previousAutoDates,
        });
      }
    },
    [autoDatesRef, markEdited, setForm],
  );

  const handlePosterExtractionApplied = useCallback(
    async (
      extracted: PosterExtractedEvent,
      options?: {
        allowOverwriteOwned?: boolean;
        model?: string | null;
        isStale?: () => boolean;
      },
    ): Promise<PosterExtractionAppliedSummary> => {
      const { applyPosterExtractionToForm } = await loadPosterAutofillUtils();
      if (options?.isStale?.()) return EMPTY_APPLIED_SUMMARY;

      const current = formRef.current;
      const previousAutoDates = autoDatesRef.current;
      const preserveUserValues = !options?.allowOverwriteOwned;
      const runId = ++autofillRunIdRef.current;
      const model = options?.model ?? null;

      const result = applyPosterExtractionToForm({
        currentForm: current,
        extracted,
        cityOptions,
        cityToRegionOptionMap,
        categories,
        autoDates: previousAutoDates,
        userOwnedFields: userOwnedFieldsRef.current,
        preserveUserValues,
      });

      if (result.filledFields.length > 0) {
        commitAppliedFields(
          result.nextForm,
          result.filledFields,
          current,
          previousAutoDates,
          { runId, model, preserveUserValues, appliedDates: result.appliedDates },
        );
      }

      // Keep extraction + runId + overwrite policy for deferred reconciliation if
      // town/category catalogs were still loading when the AI response arrived.
      setDeferredUnmatchedTown(null);
      setDeferredFilledFields([]);
      setPendingExtraction(
        (isLoadingCities && Boolean(extracted.town)) ||
          (isLoadingCategories && extracted.categories.length > 0)
          ? { runId, model, extracted, preserveUserValues }
          : null,
      );

      return {
        filledFields: result.filledFields,
        unmatchedTown: isLoadingCities ? null : result.unmatchedTown,
        pastDate: Boolean(
          result.appliedDates && hasPublishFormEnded(result.nextForm),
        ),
        dateInferred: Boolean(result.appliedDates && extracted.dateInferred),
        priceNeedsReview: Boolean(extracted.priceResolution?.needsReview),
        isMultiEvent: extracted.isMultiEvent,
      };
    },
    [
      autoDatesRef,
      categories,
      cityOptions,
      cityToRegionOptionMap,
      commitAppliedFields,
      isLoadingCategories,
      isLoadingCities,
    ],
  );

  // Reconcile pending town/categories once catalogs finish loading.
  const reconcilePendingExtraction = useEffectEvent(
    (pending: PendingPosterExtraction) => {
      setPendingExtraction(null);
      if (!cachedPosterAutofillModule) return;
      const current = formRef.current;
      const reconciled = cachedPosterAutofillModule.applyPosterExtractionToForm(
        {
          currentForm: current,
          extracted: {
            ...pending.extracted,
            title: null,
            description: null,
            url: null,
            location: null,
            startDate: null,
            endDate: null,
            price: null,
            priceResolution: null,
          },
          cityOptions,
          cityToRegionOptionMap,
          categories,
          autoDates: autoDatesRef.current,
          userOwnedFields: userOwnedFieldsRef.current,
          preserveUserValues: pending.preserveUserValues,
        },
      );
      if (reconciled.unmatchedTown) {
        setDeferredUnmatchedTown(reconciled.unmatchedTown);
      }
      if (reconciled.filledFields.length === 0) return;
      setDeferredFilledFields(reconciled.filledFields);
      commitAppliedFields(
        reconciled.nextForm,
        reconciled.filledFields,
        current,
        autoDatesRef.current,
        {
          runId: pending.runId,
          model: pending.model,
          preserveUserValues: pending.preserveUserValues,
          mergeUndo: true,
        },
      );
    },
  );

  useEffect(() => {
    if (pendingExtraction && !isLoadingCities && !isLoadingCategories) {
      queueMicrotask(() => reconcilePendingExtraction(pendingExtraction));
    }
  }, [pendingExtraction, isLoadingCities, isLoadingCategories]);

  const handlePosterUndo = useCallback(() => {
    if (!undoRecord || !cachedPosterAutofillModule) return;
    const { nextForm, restoredAutoDates } =
      cachedPosterAutofillModule.undoPosterAutofill(
        formRef.current,
        undoRecord,
      );
    if (restoredAutoDates) {
      autoDatesRef.current = true;
    }
    formRef.current = nextForm;
    setForm(nextForm);
    setUndoRecord(null);
    setPendingExtraction(null);
    setDeferredUnmatchedTown(null);
    setDeferredFilledFields([]);
    telemetryRef.current = null;
    markEdited();
  }, [autoDatesRef, markEdited, setForm, undoRecord]);

  const reportPosterAutofillPublishOutcome =
    useCallback((): PosterAutofillPublishAnalytics => {
      const snapshot = telemetryRef.current;
      if (!snapshot || snapshot.filledFields.size === 0) {
        return { poster_autofill_used: false };
      }

      for (const field of snapshot.filledFields) {
        sendGoogleEvent("publish_poster_autofill_field", {
          source: "publica",
          element: field,
          outcome: snapshot.editedFields.has(field) ? "edited" : "kept",
          mode: snapshot.model,
        });
      }

      return {
        poster_autofill_used: true,
        poster_autofill_filled_count: snapshot.filledFields.size,
        poster_autofill_edited_count: snapshot.editedFields.size,
        mode: snapshot.model,
      };
    }, []);

  return {
    posterAutofillBusy,
    setPosterAutofillBusy,
    verifiedScanIntentId,
    clearVerifiedScanIntent,
    canUndo: Boolean(undoRecord && undoRecord.ownedFields.size > 0),
    deferredFilledFields,
    deferredUnmatchedTown,
    resetPosterAutofill,
    trackFormFieldOwnership,
    handlePosterPrepared,
    handleRequestAuthForScan,
    handlePosterExtractionApplied,
    handlePosterUndo,
    reportPosterAutofillPublishOutcome,
  };
}
