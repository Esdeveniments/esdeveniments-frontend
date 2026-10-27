"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, useMemo, useTransition, useCallback, useRef, useEffect, useEffectEvent } from "react";
import dynamic from "next/dynamic";
import { getPathname, Link, useRouter } from "@i18n/routing";
import { addBreadcrumb, captureException } from "@sentry/nextjs";
import { getRegionValue, formDataToBackendDTO, getTownValue } from "@utils/helpers";
import { generateCityOptionsWithRegionMap } from "@utils/options-helpers";
import { normalizeUrl } from "@utils/event-url";
import { slugifySegment } from "@utils/string-helpers";
import { getZodValidationState } from "@utils/form-validation";
import { toLocalDateTimeString } from "@utils/date-helpers";
import EventForm from "@components/ui/EventForm";
import { useImagePreview } from "@components/hooks/useImagePreview";
import { usePublishDraft } from "@components/hooks/usePublishDraft";
import PublishDraftPanel from "@components/ui/publish/PublishDraftPanel";
import { getPublishDraftWarnings } from "@utils/publish-draft-warnings";
import { useGetRegionsWithCities } from "@components/hooks/useGetRegionsWithCities";
import { useCategories } from "@components/hooks/useCategories";
import { createEventAction } from "./actions";
import type { EventFormStep, FormData } from "types/event";
import { Option } from "types/common";
import type { E2EEventExtras } from "types/api/event";
import type { CitySummaryResponseDTO } from "types/api/city";
import type { RegionSummaryResponseDTO } from "types/api/event";
import type { CategorySummaryResponseDTO } from "types/api/category";
import {
  EVENT_IMAGE_UPLOAD_TOO_LARGE_ERROR,
  MAX_TOTAL_UPLOAD_BYTES,
  MAX_UPLOAD_LIMIT_LABEL,
  PUBLISH_RESUME_PATH,
} from "@utils/constants";
import { mapDraftToPreviewEvent } from "@components/ui/EventForm/preview/mapper";
import { sendGoogleEvent } from "@utils/analytics";
import {
  buildPublishContext,
  classifyPublishError,
} from "@utils/publica-analytics";

import Modal from "@components/ui/common/modal";
import { useAuth } from "@components/hooks/useAuth";
import type { PublishResumeAction, PublishResumeIntent, PublishResumeStage } from "types/publish-draft";

// Lazy load preview content (only shown in modal when user clicks preview)
// Client component, so we can use dynamic directly with ssr: false
const PreviewContent = dynamic(
  () => import("@components/ui/EventForm/preview/PreviewContent"),
  {
    ssr: false, // Preview is only shown in modal, not needed for initial render
    loading: () => (
      <div className="w-full h-64 bg-muted animate-pulse rounded" aria-label="Loading preview" />
    ),
  }
);

const getDefaultEventDates = () => {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  const startDate = new Date(now);
  startDate.setHours(9, 0, 0, 0);
  const endDate = new Date(startDate);
  endDate.setHours(10, 0, 0, 0);

  return {
    startDate: toLocalDateTimeString(startDate),
    endDate: toLocalDateTimeString(endDate),
  };
};

const defaultEventDates = getDefaultEventDates();

const defaultForm: FormData = {
  title: "",
  description: "",
  startDate: defaultEventDates.startDate,
  startTime: "",
  endDate: defaultEventDates.endDate,
  endTime: "",
  region: null,
  town: null,
  location: "",
  url: "",
  categories: [],
  email: "",
};

const isRegionDTO = (
  region: FormData["region"]
): region is RegionSummaryResponseDTO =>
  Boolean(region && typeof region === "object" && "slug" in region);

const isCityDTO = (town: FormData["town"]): town is CitySummaryResponseDTO =>
  Boolean(town && typeof town === "object" && "latitude" in town);

const isCategoryNamePair = (
  category: unknown
): category is { id: number; name: string } =>
  Boolean(
    category &&
    typeof category === "object" &&
    "id" in category &&
    "name" in category
  );

const isCategoryOption = (
  category: unknown
): category is { value: string; label: string } =>
  Boolean(
    category &&
    typeof category === "object" &&
    "value" in category &&
    "label" in category
  );

const PublishForm = () => {
  const t = useTranslations("App.Publish");
  const tForm = useTranslations("Components.EventForm");
  const router = useRouter();
  const locale = useLocale();
  const [form, setForm] = useState<FormData>(defaultForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreparing, setImagePreparing] = useState(false);
  const [imagePreview, updateImagePreview] = useImagePreview(null);
  const { user, signIn, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [restoredDraft, setRestoredDraft] = useState(false);
  const [editorVersion, setEditorVersion] = useState(0);
  const [wizardStep, setWizardStep] = useState<EventFormStep>(0);
  const [publishAfterReturn, setPublishAfterReturn] = useState<PublishResumeIntent | null>(null);
  const [continuingPublication, setContinuingPublication] = useState(false);
  const resetEditor = useCallback(() => {
    setWizardStep(0);
    setPublishAfterReturn(null);
    submittedRef.current = false;
    formStartedRef.current = false;
    abandonFiredRef.current = false;
    fieldsInteractedRef.current.clear();
    setError(null);
    setShowPreview(false);
    setEditorVersion((version) => version + 1);
    setForm({ ...defaultForm });
    setImageFile(null);
    updateImagePreview(null);
    setRestoredDraft(false);
  }, [updateImagePreview]);
  const draft = usePublishDraft({
    accountId: isAuthenticated ? user?.id : undefined, isAuthLoading, form, imageFile, step: wizardStep,
    onRestore: (saved, resumed, intent) => {
      setError(null);
      setEditorVersion((version) => version + 1);
      setForm({ ...defaultForm, ...saved.form });
      setImageFile(saved.imageFile);
      setWizardStep(saved.step ?? 0);
      setPublishAfterReturn(intent?.action === "publish" ? intent : null);
      updateImagePreview(saved.imageFile);
      setRestoredDraft(true);
      submittedRef.current = false;
      if (resumed) {
        handoffStartedRef.current = handedOffRef.current = false;
        setHandingOff(false);
        setAuthStage(null);
        setShowPreview(intent?.action === undefined);
      }
    },
    onReset: resetEditor,
  });
  const { markEdited } = draft;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [authStage, setAuthStage] = useState<PublishResumeStage | null>(null);
  const [handingOff, setHandingOff] = useState(false);
  const handoffStartedRef = useRef(false);
  const handedOffRef = useRef(false);
  const creatingRef = useRef(false);
  // Unknown profile enrichment stays eligible; a typed server rejection is authoritative.
  const requiredAuthStage = authStage ?? (!isAuthenticated ? "login"
    : user?.profileCompleted === false ? "profile" : null);
  const submitAnalyticsAction = requiredAuthStage ? `publish_cta_${requiredAuthStage}` : undefined;

  // Funnel tracking refs (no re-render needed)
  const formStartedRef = useRef(false);
  const fieldsInteractedRef = useRef<Set<string>>(new Set());
  const submittedRef = useRef(false);
  const abandonFiredRef = useRef(false);

  // Track form abandonment on page unload or SPA navigation
  useEffect(() => {
    const resetFrame = submittedRef.current ? requestAnimationFrame(resetEditor) : null;
    const handlePageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      if (submittedRef.current) resetEditor();
      if (!handedOffRef.current) return;
      handedOffRef.current = false;
      handoffStartedRef.current = false;
      setHandingOff(false);
    };
    const handleBeforeUnload = () => {
      if (abandonFiredRef.current || handedOffRef.current) return;
      if (formStartedRef.current && !submittedRef.current) {
        abandonFiredRef.current = true;
        sendGoogleEvent("publish_form_abandon", {
          fields_touched: Array.from(fieldsInteractedRef.current).join(","),
          fields_count: fieldsInteractedRef.current.size,
          source: "publica",
        });
      }
    };
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      if (resetFrame !== null) cancelAnimationFrame(resetFrame);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // Also fire on SPA navigation (component unmount)
      handleBeforeUnload();
    };
  }, [resetEditor]);

  const {
    regionsWithCities,
    isLoading: isLoadingRegionsWithCities,
    isError: isErrorRegionsWithCities,
    mutate: retryCities,
  } = useGetRegionsWithCities();

  const isLoadingCities =
    isLoadingRegionsWithCities ||
    (!regionsWithCities && !isErrorRegionsWithCities);

  const { categories, isLoading: isLoadingCategories, isError: isErrorCategories, refetch: retryCategories } = useCategories();

  const { cityOptions, cityToRegionOptionMap } = useMemo(
    () => generateCityOptionsWithRegionMap(regionsWithCities),
    [regionsWithCities]
  );

  const categoryOptions = useMemo(
    () =>
      categories.map((category) => ({
        label: category.name,
        value: category.id.toString(),
      })),
    [categories]
  );

  const trackFieldInteraction = useCallback((fieldName: string) => {
    setPublishAfterReturn(null);
    markEdited();
    if (!formStartedRef.current) {
      formStartedRef.current = true;
      sendGoogleEvent("publish_form_start", { source: "publica" });
    }
    if (!fieldsInteractedRef.current.has(fieldName)) {
      fieldsInteractedRef.current.add(fieldName);
      sendGoogleEvent("publish_field_interact", {
        field_name: fieldName,
        fields_count: fieldsInteractedRef.current.size,
        source: "publica",
      });
    }
  }, [markEdited]);
  const handleStepChange = useCallback((step: EventFormStep) => {
    markEdited();
    setPublishAfterReturn(null);
    setWizardStep(step);
  }, [markEdited]);

  const handleFormChange = useCallback(<K extends keyof FormData>(
    name: K,
    value: FormData[K]
  ) => {
    trackFieldInteraction(String(name));
    setForm((prev) => ({ ...prev, [name]: value }));
  }, [trackFieldInteraction]);

  const handleImageChange = (file: File | null) => {
    setError(null);
    trackFieldInteraction("image");

    setImageFile(file);
    updateImagePreview(file);
  };

  const handleTownChange = (town: Option | null) => {
    trackFieldInteraction("town");

    setForm((prev) => {
      const next = { ...prev, town };
      if (town) {
        next.region = cityToRegionOptionMap[town.value] ?? null;
      } else {
        next.region = null;
      }
      return next;
    });
  };

  const handleCategoriesChange = (categories: Option[]) =>
    handleFormChange("categories", categories);

  const handleTestUrl = (value: string) => {
    const normalized = normalizeUrl(value);
    if (!normalized) return;
    window.open(normalized, "_blank", "noopener,noreferrer");

    sendGoogleEvent("publish_test_url_click", {
      ...buildPublishContext({ form, imageFile }),
      source: "publica",
    });
  };

  const [showPreview, setShowPreview] = useState(false);
  const previewEvent = useMemo(() => mapDraftToPreviewEvent({
    form, imageUrl: imagePreview,
  }), [form, imagePreview]);

  const handlePreview = () => {
    sendGoogleEvent("publish_preview_open", {
      ...buildPublishContext({ form, imageFile }),
      source: "publica",
    });

    setShowPreview(true);
  };

  const beginAuthReturn = async (action: PublishResumeAction = "restore") => {
    if (!requiredAuthStage || isAuthLoading || draft.ownerChanged || imagePreparing || handoffStartedRef.current) return;
    const trigger = document.activeElement;
    handoffStartedRef.current = true;
    setHandingOff(true);
    const result = await draft.prepareResume(requiredAuthStage, action);
    if (!result.ok) {
      setError(t("draftHandoffFailed"));
      handoffStartedRef.current = false;
      setHandingOff(false);
      if (trigger instanceof HTMLElement) requestAnimationFrame(() => trigger.focus());
      return;
    }
    const destination = result.revision || new URL(window.location.href).searchParams.get("resume") === "1"
      ? PUBLISH_RESUME_PATH : "/publica";
    try {
      handedOffRef.current = true;
      if (requiredAuthStage === "login") signIn(getPathname({ href: destination, locale }));
      else router.push(`/perfil/edita?redirect=${encodeURIComponent(destination)}`);
    } catch (error) {
      captureException(error);
      handedOffRef.current = false;
      handoffStartedRef.current = false;
      setHandingOff(false);
      setError(t("draftHandoffFailed"));
      if (trigger instanceof HTMLElement) requestAnimationFrame(() => trigger.focus());
    }
  };

  const buildE2EExtras = (): E2EEventExtras | undefined => {
    const regionIdValue = getRegionValue(form.region);
    const townIdValue = getTownValue(form.town);

    let regionMeta: RegionSummaryResponseDTO | undefined;
    if (regionIdValue) {
      if (isRegionDTO(form.region)) {
        regionMeta = form.region;
      } else if (form.region) {
        const option = form.region as Option;
        const name = option?.label ?? t("fallbackRegion", { id: regionIdValue });
        regionMeta = {
          id: Number(regionIdValue),
          name,
          slug: slugifySegment(name) || `region-${regionIdValue}`,
        };
      }
    }

    let cityMeta: CitySummaryResponseDTO | undefined;
    if (townIdValue) {
      if (isCityDTO(form.town)) {
        cityMeta = form.town;
      } else if (form.town) {
        const option = form.town as Option;
        const name = option?.label ?? t("fallbackCity", { id: townIdValue });
        cityMeta = {
          id: Number(townIdValue),
          name,
          slug: slugifySegment(name) || `ciutat-${townIdValue}`,
          latitude: 41.3851,
          longitude: 2.1734,
          postalCode: "08001",
          rssFeed: null,
          enabled: true,
        };
      }
    }

    const categoriesMeta =
      Array.isArray(form.categories) && form.categories.length > 0
        ? form.categories
          .map((category, index) => {
            if (isCategoryNamePair(category)) {
              const slug =
                slugifySegment(category.name) || `categoria-${category.id}`;
              return {
                id: category.id,
                name: category.name,
                slug,
              };
            }
            if (isCategoryOption(category)) {
              const numericId = Number(category.value) || index + 1;
              const slug =
                slugifySegment(category.label) || `categoria-${numericId}`;
              return {
                id: numericId,
                name: category.label,
                slug,
              };
            }
            if (typeof category === "number") {
              return {
                id: category,
                name: `Categoria ${category}`,
                slug: `categoria-${category}`,
              };
            }
            return null;
          })
          .filter(
            (
              category
            ): category is {
              id: number;
              name: string;
              slug: string;
            } => Boolean(category)
          )
        : undefined;

    if (!regionMeta && !cityMeta && !categoriesMeta) {
      return undefined;
    }

    return {
      region: regionMeta,
      city: cityMeta,
      province: regionMeta
        ? {
          id: regionMeta.id,
          name: regionMeta.name,
          slug: regionMeta.slug,
        }
        : undefined,
      categories: categoriesMeta as CategorySummaryResponseDTO[] | undefined,
    };
  };

  const onSubmit = async () => {
    if (handingOff || isPending || creatingRef.current || submittedRef.current || isAuthLoading || draft.ownerChanged) return;
    if (draft.status === "decision" || draft.failure?.reason === "stale") {
      setError(t("draftResolveBeforePublish"));
      return;
    }
    if (draft.status === "loading" || draft.status === "discarding") return;
    if (requiredAuthStage) { await beginAuthReturn("publish"); return; }
    setError(null); // Clear any previous errors

    addBreadcrumb({
      category: "publica",
      message: "publish_submit_attempt",
      level: "info",
      data: {
        source: "publica",
        ...buildPublishContext({ form, imageFile }),
      },
    });

    sendGoogleEvent("publish_submit_attempt", {
      ...buildPublishContext({ form, imageFile }),
      source: "publica",
    });

    if (imageFile && imageFile.size > MAX_TOTAL_UPLOAD_BYTES) {
      sendGoogleEvent("publish_submit_blocked", {
        ...buildPublishContext({ form, imageFile }),
        source: "publica",
        reason: "image_too_large_client",
      });
      setError(
        `La imatge supera el límit permès de ${MAX_UPLOAD_LIMIT_LABEL} MB. Si us plau, tria una imatge més petita.`
      );
      return;
    }

    creatingRef.current = true;
    startTransition(async () => {
      try {
        if (!imageFile) {
          sendGoogleEvent("publish_submit_blocked", {
            ...buildPublishContext({ form, imageFile }),
            source: "publica",
            reason: "missing_image",
          });
          setError("La imatge és obligatòria.");
          return;
        }

        const regionLabel =
          form.region && "label" in form.region ? form.region.label : "";
        const townLabel =
          form.town && "label" in form.town ? form.town.label : "";
        const location = `${form.location}, ${townLabel}, ${regionLabel}`;

        // Normalize URL before sending to backend (auto-add https:// if missing)
        const eventData = formDataToBackendDTO({
          ...form,
          url: normalizeUrl(form.url),
          location,
        });

        const payload = new globalThis.FormData();
        payload.append("event", JSON.stringify(eventData));
        payload.append("imageFile", imageFile);

        const e2eExtras = buildE2EExtras();
        const result = await createEventAction(payload, e2eExtras);

        if (!result.success) {
          sendGoogleEvent("publish_error", {
            ...buildPublishContext({ form, imageFile }),
            source: "publica",
            category:
              result.reason === "profile-incomplete"
                ? "profile-incomplete"
                : "stale-session",
          });
          setShowPreview(false);
          setAuthStage(result.reason === "profile-incomplete" ? "profile" : "login");
          setError(t(result.reason === "profile-incomplete"
            ? "completeProfileGate.description" : "errorStaleSession"));
          return;
        }

        const { event } = result;
        if (!event) {
          // Defensive: the type guarantees `event` here, but a malformed
          // backend response body could still resolve to something falsy
          // at runtime despite what the type claims.
          sendGoogleEvent("publish_error", {
            ...buildPublishContext({ form, imageFile }),
            source: "publica",
            category: "generic",
          });
          setError(t("errorCreate"));
          captureException(new Error("publica: createEventAction returned no event"), {
            tags: { section: "publica", action: "create-event", result: "empty" },
            extra: {
              publish_context: buildPublishContext({ form, imageFile }),
            },
          });
          return;
        }

        const { slug } = event;
        if (typeof document !== "undefined") {
          document.body.dataset.lastE2eSlug = slug;
        }
        if (typeof window !== "undefined") {
          window.__LAST_E2E_PUBLISH_SLUG__ = slug;
        }

        sendGoogleEvent("publish_success", {
          ...buildPublishContext({ form, imageFile }),
          source: "publica",
          has_slug: Boolean(slug),
        });

        submittedRef.current = true;
        const cleanup = await draft.complete();
        if (!cleanup.ok) {
          captureException(new Error("Publish draft cleanup failed"), {
            tags: { section: "publica", action: "draft-cleanup", reason: cleanup.reason },
          });
          window.alert(t("draftCleanupFailed"));
        }
        // ?promote=1 tells the event page to show the promote upsell once.
        router.push(`/e/${slug}?promote=1`);
      } catch (error) {
        console.error("Submission error:", error);

        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const normalizedMessage = errorMessage.toLowerCase();
        const isImageUploadLimit = normalizedMessage.includes(
          EVENT_IMAGE_UPLOAD_TOO_LARGE_ERROR
        );
        const isBodyLimit =
          normalizedMessage.includes("body size limit") ||
          normalizedMessage.includes("body exceeded") ||
          normalizedMessage.includes("10 mb limit") ||
          normalizedMessage.includes("10mb");
        const isRequestTooLarge =
          normalizedMessage.includes("status: 413") ||
          normalizedMessage.includes("request entity too large");
        const isFormParsingError =
          normalizedMessage.includes("unexpected end of form") ||
          normalizedMessage.includes("failed to parse body as formdata");

        const isDuplicate =
          normalizedMessage.includes("duplicate") ||
          normalizedMessage.includes("integrity violation");

        sendGoogleEvent("publish_error", {
          ...buildPublishContext({ form, imageFile }),
          source: "publica",
          category: classifyPublishError({
            isImageUploadLimit,
            isBodyLimit,
            isRequestTooLarge,
            isFormParsingError,
            isDuplicate,
          }),
        });

        if (isImageUploadLimit) {
          setError(
            `La imatge supera el límit permès de ${MAX_UPLOAD_LIMIT_LABEL} MB. Si us plau, redueix-la o tria un altre fitxer.`
          );
        } else if (isBodyLimit || isRequestTooLarge) {
          setError(
            "La mida total de la sol·licitud (imatge + dades) supera el límit permès pel servidor. Redueix la mida de la imatge abans de tornar-ho a intentar."
          );
        } else if (isFormParsingError) {
          setError(t("errorFormParsing"));
        } else if (isDuplicate) {
          setError(t("errorDuplicate"));
        } else {
          setError(t("errorGeneric"));
        }

        if (
          !(
            isBodyLimit ||
            isRequestTooLarge ||
            isImageUploadLimit ||
            isFormParsingError
          )
        ) {
          captureException(error, {
            tags: {
              section: "publica",
              action: "create-event",
              category: classifyPublishError({
                isImageUploadLimit,
                isBodyLimit,
                isRequestTooLarge,
                isFormParsingError,
                isDuplicate,
              }),
            },
            extra: {
              publish_context: buildPublishContext({ form, imageFile }),
            },
          });
        }
      } finally {
        creatingRef.current = false;
      }
    });
  };

  const { isDisabled: isFormDisabled } = getZodValidationState(form, false, imageFile);
  const isDraftLocked = handingOff || continuingPublication || (draft.status === "loading" && !isAuthLoading) || draft.status === "discarding" ||
    (draft.status === "decision" && !draft.dirty);
  const submitLabel = isAuthLoading ? t("publishCta.resolving")
    : requiredAuthStage === "login" ? t("publishCta.signIn")
      : requiredAuthStage === "profile" ? t("publishCta.completeProfile") : t("submitLabel");
  const isSubmitDisabled = isAuthLoading || draft.ownerChanged;
  const continuePublication = useEffectEvent(async (intent: PublishResumeIntent) => {
    setPublishAfterReturn(null);
    const warnings = getPublishDraftWarnings(form, cityOptions, categoryOptions, true, true);
    if (draft.ownerChanged || !isAuthenticated || draft.failure ||
        isFormDisabled || !form.town || !form.region || !form.startDate || !form.endDate ||
        isErrorRegionsWithCities || isErrorCategories || warnings.length > 0 ||
        (intent.stage === "profile" && requiredAuthStage === "profile")) {
      setError(t("draftAutoPublishStopped"));
      return;
    }
    setContinuingPublication(true);
    try {
      const saved = await draft.claimPublication();
      if (!saved?.ok) {
        setError(t(saved?.reason === "stale" ? "draftResolveBeforePublish" : "draftAutoPublishStopped"));
        return;
      }
      await onSubmit();
    } finally {
      setContinuingPublication(false);
    }
  });
  useEffect(() => {
    if (!publishAfterReturn || isAuthLoading || imagePreparing || isLoadingCities || isLoadingCategories ||
        draft.status === "loading" || draft.status === "saving") return;
    void continuePublication(publishAfterReturn);
  }, [publishAfterReturn, isAuthLoading, imagePreparing, isLoadingCities, isLoadingCategories, draft.status]);

  return (
    <>
      {showPreview && previewEvent && (
        <Modal
          open={showPreview}
          setOpen={setShowPreview}
          title={tForm("previewModalTitle")}
          actionButton={submitLabel}
          actionButtonDisabled={isDraftLocked || isFormDisabled || isPending || isSubmitDisabled || imagePreparing}
          actionButtonAnalyticsAction={submitAnalyticsAction}
          onActionButtonClick={async () => {
            await onSubmit();
            return false;
          }}
          testId="preview-modal"
        >
          <PreviewContent event={previewEvent} />
          {error && <p className="helper-text-error" role="alert">{error}</p>}
        </Modal>
      )}
      <div className="container flex flex-col justify-center pt-6 pb-14">
        <div className="w-full max-w-2xl mx-auto flex flex-col gap-6 px-2 lg:px-0">
          <header className="flex flex-col gap-2 text-center">
            <h1 className="heading-1 text-foreground-strong">
              {t("heading")}
            </h1>
            <p className="body-normal text-foreground/80">
              {t("subheading")}
            </p>
            {!authStage && !isAuthLoading && !isAuthenticated && !isDraftLocked && !draft.ownerChanged && (
              <p className="body-small text-muted-foreground">
                {t("accountNotice")}{" "}
                <button type="button"
                  className="font-medium text-primary underline underline-offset-4 hover:text-primary-dark rounded-sm focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => { void beginAuthReturn(); }}
                  disabled={imagePreparing || isPending}
                  data-testid="publish-early-sign-in" data-analytics-action="publish_early_sign_in">
                  {t("earlySignIn")}
                </button>
              </p>
            )}
          </header>
          {error && (
            <p className="w-full rounded-card border border-error/40 bg-error/5 px-4 py-3 body-small font-medium text-error-dark" role="alert">
              {error}
            </p>
          )}
          {draft.resumeFailed && <p role="status" className="body-small text-foreground/80">{t("draftResumeFailed")}</p>}
          {draft.ownerChanged && <p role="alert" className="body-small font-medium text-error-dark">{t("draftOwnerChanged")}</p>}
          {(isErrorRegionsWithCities || isErrorCategories) && (
            <div className="stack" role="alert">
              <p className="body-small font-medium text-error-dark">{t("optionsFailed")}</p>
              <button type="button" className="btn-neutral self-start" onClick={() => {
                if (isErrorRegionsWithCities) void retryCities();
                if (isErrorCategories) void retryCategories();
              }}>{t("draftRetry")}</button>
            </div>
          )}
          {authStage && (
            <div className="stack">
              <p className="body-small text-foreground/80">{t(authStage === "profile" ? "draftProfileNotice" : "draftAuthNotice")}</p>
              <button
                type="button"
                className="btn-primary"
                disabled={imagePreparing || isDraftLocked || isPending}
                onClick={onSubmit}
                aria-busy={handingOff}
                data-testid="publish-resume-action"
                data-analytics-action={`publish_resume_${authStage}`}
              >{submitLabel}</button>
            </div>
          )}
          <fieldset disabled={handingOff} inert={handingOff}>
          <PublishDraftPanel
            variant="decision"
            state={draft}
            onRestore={draft.restore}
            onRestoreGuest={draft.restoreGuest}
            onDiscard={draft.discard}
            onRetry={() => { void draft.retry(); }}
            warnings={restoredDraft ? getPublishDraftWarnings(form, cityOptions, categoryOptions,
              !isLoadingCities && !isErrorRegionsWithCities,
              !isLoadingCategories && !isErrorCategories) : []}
          />
          </fieldset>
          {/* Until the user picks restore or discard, show only that choice instead of a locked form. */}
          <fieldset disabled={isDraftLocked || isPending} inert={isDraftLocked}
            hidden={draft.status === "decision" && !draft.dirty}>
          <div className="w-full">
            <EventForm
              key={editorVersion}
              initialStep={wizardStep}
              onStepChange={handleStepChange}
              form={form}
              onSubmit={onSubmit}
              submitLabel={submitLabel}
              analyticsContext="publica"
              isLoading={isPending}
              isSubmitDisabled={isSubmitDisabled}
              submitAnalyticsAction={submitAnalyticsAction}
              cityOptions={cityOptions}
              categoryOptions={categoryOptions}
              isLoadingCities={isLoadingCities}
              isLoadingCategories={isLoadingCategories}
              handleFormChange={handleFormChange}
              handleImageChange={handleImageChange}
              onImagePreparingChange={setImagePreparing}
              handleTownChange={handleTownChange}
              handleCategoriesChange={handleCategoriesChange}
              imageToUpload={imagePreview}
              imageFile={imageFile}
              handleTestUrl={handleTestUrl}
              onPreview={handlePreview}
              canPreview={true}
            />
          </div>
          </fieldset>
          <fieldset disabled={handingOff || isPending} inert={handingOff || isPending}>
            <PublishDraftPanel
              variant="status"
              state={draft}
              onRestore={draft.restore}
              onRestoreGuest={draft.restoreGuest}
              onDiscard={draft.discard}
              onRetry={() => { void draft.retry(); }}
              warnings={[]}
            />
          </fieldset>
          <div className="flex-center text-center">
            <p className="body-small text-muted-foreground">
              {t("sponsorTitle")}{" "}
              <Link
                href="/patrocina"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-4 hover:text-primary-dark transition-interactive focus-ring"
              >
                {t("sponsorLink")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

const Publica = () => <PublishForm />;

export default Publica;
