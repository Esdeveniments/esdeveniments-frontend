"use client";

import { useTranslations } from "next-intl";
import { useState, useMemo, useTransition, useCallback } from "react";
import dynamic from "next/dynamic";
import { Link, useRouter } from "@i18n/routing";
import { addBreadcrumb, captureException } from "@sentry/nextjs";
import { getRegionValue, formDataToBackendDTO, getTownValue } from "@utils/helpers";
import { generateCityOptionsWithRegionMap } from "@utils/options-helpers";
import { normalizeUrl, slugifySegment } from "@utils/string-helpers";
import { getZodValidationState } from "@utils/form-validation";
import EventForm from "@components/ui/EventForm";
import { useGetRegionsWithCities } from "@components/hooks/useGetRegionsWithCities";
import { useCategories } from "@components/hooks/useCategories";
import { createEventAction } from "./actions";
import type { FormData } from "types/event";
import { Option } from "types/common";
import type { E2EEventExtras } from "types/api/event";
import type { CitySummaryResponseDTO } from "types/api/city";
import type { RegionSummaryResponseDTO } from "types/api/event";
import type { CategorySummaryResponseDTO } from "types/api/category";
import {
  EVENT_IMAGE_UPLOAD_TOO_LARGE_ERROR,
  MAX_TOTAL_UPLOAD_BYTES,
  MAX_UPLOAD_LIMIT_LABEL,
} from "@utils/constants";
import { uploadImageWithProgress } from "@utils/upload-event-image-client";
import { mapDraftToPreviewEvent } from "@components/ui/EventForm/preview/mapper";
import { sendGoogleEvent } from "@utils/analytics";
import {
  buildPublishContext,
  classifyPublishError,
  classifyUploadError,
} from "@utils/publica-analytics";

import Modal from "@components/ui/common/modal";
import type { EventDetailResponseDTO } from "types/api/event";

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
    startDate: startDate.toISOString().slice(0, 16),
    endDate: endDate.toISOString().slice(0, 16),
  };
};

const defaultEventDates = getDefaultEventDates();

const defaultForm: FormData = {
  title: "",
  description: "",
  type: "FREE",
  startDate: defaultEventDates.startDate,
  startTime: "",
  endDate: defaultEventDates.endDate,
  endTime: "",
  region: null,
  town: null,
  location: "",
  imageUrl: null,
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

const buildFileSignature = (file: File) =>
  `${file.name}-${file.size}-${file.lastModified}`;

const Publica = () => {
  const t = useTranslations("App.Publish");
  const tForm = useTranslations("Components.EventForm");
  const router = useRouter();
  const [form, setForm] = useState<FormData>(defaultForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploadAbortController, setUploadAbortController] =
    useState<AbortController | null>(null);
  const [uploadedImageSignature, setUploadedImageSignature] = useState<
    string | null
  >(null);
  const [imageUploadMessage, setImageUploadMessage] = useState<string | null>(
    null
  );

  const {
    regionsWithCities,
    isLoading: isLoadingRegionsWithCities,
    isError: isErrorRegionsWithCities,
  } = useGetRegionsWithCities();

  const isLoadingCities =
    isLoadingRegionsWithCities ||
    (!regionsWithCities && !isErrorRegionsWithCities);

  const { categories } = useCategories();

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

  const handleFormChange = useCallback(<K extends keyof FormData>(
    name: K,
    value: FormData[K]
  ) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleImageChange = (file: File | null) => {
    setError(null);
    setImageUploadMessage(null);

    if (!file) {
      setImageFile(null);
      setImagePreview(null);
      setUploadedImageUrl(null);
      setUploadedImageSignature(null);
      setUploadProgress(0);
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      setImagePreview(reader.result as string);
    });
    reader.readAsDataURL(file);
    setUploadedImageUrl(null);
    setUploadedImageSignature(null);
    setUploadProgress(0);
  };

  const handleTownChange = (town: Option | null) => {
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
      ...buildPublishContext({ form, imageFile, uploadedImageUrl }),
      source: "publica",
    });
  };

  const [showPreview, setShowPreview] = useState(false);
  const [previewEvent, setPreviewEvent] = useState<EventDetailResponseDTO | null>(
    null
  );

  const handlePreview = () => {
    sendGoogleEvent("publish_preview_open", {
      ...buildPublishContext({ form, imageFile, uploadedImageUrl }),
      source: "publica",
    });

    // Determine the image URL to show in preview
    // 1. Uploaded image URL if available
    // 2. Currently selected file (as data URL) if available
    // 3. Any manual URL entered
    const previewImageUrl =
      uploadedImageUrl || imagePreview || form.imageUrl || "";

    const event = mapDraftToPreviewEvent({
      form,
      imageUrl: previewImageUrl,
    });
    setPreviewEvent(event);
    setShowPreview(true);
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
    setError(null); // Clear any previous errors
    setImageUploadMessage(null);

    addBreadcrumb({
      category: "publica",
      message: "publish_submit_attempt",
      level: "info",
      data: {
        source: "publica",
        ...buildPublishContext({ form, imageFile, uploadedImageUrl }),
      },
    });

    sendGoogleEvent("publish_submit_attempt", {
      ...buildPublishContext({ form, imageFile, uploadedImageUrl }),
      source: "publica",
    });

    if (imageFile && imageFile.size > MAX_TOTAL_UPLOAD_BYTES) {
      sendGoogleEvent("publish_submit_blocked", {
        ...buildPublishContext({ form, imageFile, uploadedImageUrl }),
        source: "publica",
        reason: "image_too_large_client",
      });
      setError(
        `La imatge supera el límit permès de ${MAX_UPLOAD_LIMIT_LABEL} MB. Si us plau, tria una imatge més petita.`
      );
      return;
    }

    if (isUploadingImage) {
      sendGoogleEvent("publish_submit_blocked", {
        ...buildPublishContext({ form, imageFile, uploadedImageUrl }),
        source: "publica",
        reason: "upload_in_progress",
      });
      return;
    }

    startTransition(async () => {
      try {
        let resolvedImageUrl =
          uploadedImageUrl ||
          (form.imageUrl ? normalizeUrl(form.imageUrl) || null : null);

        if (imageFile) {
          const signature = buildFileSignature(imageFile);
          if (signature !== uploadedImageSignature) {
            setIsUploadingImage(true);
            setUploadProgress(0);
            uploadAbortController?.abort();
            const controller = new AbortController();
            setUploadAbortController(controller);
            try {
              sendGoogleEvent("publish_image_upload_start", {
                ...buildPublishContext({
                  form,
                  imageFile,
                  uploadedImageUrl,
                }),
                source: "publica",
              });

              const uploadResult = await uploadImageWithProgress(imageFile, {
                onProgress: (percent) => setUploadProgress(percent),
                signal: controller.signal,
              });
              resolvedImageUrl = uploadResult.url;
              setUploadedImageUrl(uploadResult.url);
              setUploadedImageSignature(signature);
              setImageUploadMessage("Imatge pujada correctament.");
              setUploadProgress(100);
              setTimeout(() => setUploadProgress(0), 800);

              sendGoogleEvent("publish_image_upload_success", {
                ...buildPublishContext({
                  form,
                  imageFile,
                  uploadedImageUrl: uploadResult.url,
                }),
                source: "publica",
              });
            } catch (uploadError) {
              const reason = classifyUploadError(uploadError);
              if (reason === "abort") {
                sendGoogleEvent("publish_image_upload_abort", {
                  ...buildPublishContext({ form, imageFile, uploadedImageUrl }),
                  source: "publica",
                });
                setIsUploadingImage(false);
                setUploadProgress(0);
                setImageUploadMessage(null);
                setUploadAbortController(null);
                return;
              }

              sendGoogleEvent("publish_image_upload_error", {
                ...buildPublishContext({ form, imageFile, uploadedImageUrl }),
                source: "publica",
                reason,
              });

              const uploadMessage =
                uploadError instanceof Error
                  ? uploadError.message
                  : String(uploadError);
              if (uploadMessage === EVENT_IMAGE_UPLOAD_TOO_LARGE_ERROR) {
                setError(
                  `La imatge supera el límit permès de ${MAX_UPLOAD_LIMIT_LABEL} MB. Si us plau, redueix-la o tria un altre fitxer.`
                );
              } else {
                setError(
                  "No hem pogut pujar la imatge. Revisa la connexió i torna-ho a intentar."
                );
              }
              setImageUploadMessage(null);
              setIsUploadingImage(false);
              setUploadProgress(0);
              return;
            } finally {
              setIsUploadingImage(false);
              setUploadAbortController(null);
            }
          }
        }

        if (!resolvedImageUrl) {
          sendGoogleEvent("publish_submit_blocked", {
            ...buildPublishContext({ form, imageFile, uploadedImageUrl }),
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
          imageUrl: resolvedImageUrl,
        });

        const e2eExtras = buildE2EExtras();
        const { success, event } = await createEventAction(eventData, e2eExtras);

        if (!success || !event) {
          sendGoogleEvent("publish_error", {
            ...buildPublishContext({
              form,
              imageFile,
              uploadedImageUrl: resolvedImageUrl,
            }),
            source: "publica",
            category: "generic",
          });
          setError(t("errorCreate"));
          captureException(new Error("publica: createEventAction returned no event"), {
            tags: { section: "publica", action: "create-event", result: "empty" },
            extra: {
              publish_context: buildPublishContext({
                form,
                imageFile,
                uploadedImageUrl: resolvedImageUrl,
              }),
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
          ...buildPublishContext({
            form,
            imageFile,
            uploadedImageUrl: resolvedImageUrl,
          }),
          source: "publica",
          has_slug: Boolean(slug),
        });

        router.push(`/e/${slug}`);
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
          ...buildPublishContext({ form, imageFile, uploadedImageUrl }),
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
              publish_context: buildPublishContext({
                form,
                imageFile,
                uploadedImageUrl,
              }),
            },
          });
        }
      }
    });
  };

  const { isDisabled: isFormDisabled } = getZodValidationState(form, false, imageFile);

  return (
    <>
      {showPreview && previewEvent && (
        <Modal
          open={showPreview}
          setOpen={setShowPreview}
          title={tForm("previewModalTitle")}
          actionButton={t("submitLabel")}
          actionButtonDisabled={isFormDisabled || isPending}
          onActionButtonClick={async () => {
            await onSubmit();
          }}
          testId="preview-modal"
        >
          <PreviewContent event={previewEvent} />
        </Modal>
      )}
      <div className="container flex flex-col justify-center pt-6 pb-14">
        <div className="flex flex-col gap-6 px-2 lg:px-0">
          {/* Hero Header Section */}
          <div className="flex flex-col items-center text-center gap-4 mb-2">
            <h1 className="heading-1 text-foreground-strong">
              {t("heading")}
            </h1>
            <p className="body-large text-foreground/80 max-w-xl mx-auto">
              {t("subheading")}
            </p>

            {/* Benefits Pills */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:justify-center items-center gap-2 sm:gap-3 mt-2">
              <span className="badge-default gap-2 w-fit">
                <svg className="w-4 h-4 text-primary shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {t("benefits.free")}
              </span>
              <span className="badge-default gap-2 w-fit">
                <svg className="w-4 h-4 text-primary shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                {t("benefits.fast")}
              </span>
              <span className="badge-default gap-2 w-fit">
                <svg className="w-4 h-4 text-primary shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                </svg>
                {t("benefits.reach")}
              </span>
            </div>

            <p className="body-small text-foreground/60 mt-2">{t("requiredNote")}</p>
          </div>
          {error && (
            <div className="w-full px-4 py-3 bg-destructive/10 border border-destructive rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
          <div className="w-full flex flex-col gap-y-4 pt-4">
            <EventForm
              form={form}
              onSubmit={onSubmit}
              submitLabel={t("submitLabel")}
              analyticsContext="publica"
              isLoading={isPending}
              cityOptions={cityOptions}
              categoryOptions={categoryOptions}
              progress={uploadProgress}
              isLoadingCities={isLoadingCities}
              handleFormChange={handleFormChange}
              handleImageChange={handleImageChange}
              handleTownChange={handleTownChange}
              handleCategoriesChange={handleCategoriesChange}
              imageToUpload={imagePreview}
              imageFile={imageFile}
              isUploadingImage={isUploadingImage}
              uploadMessage={imageUploadMessage}
              handleTestUrl={handleTestUrl}
              onPreview={handlePreview}
              canPreview={true}
            />
          </div>
          <div className="flex-center pt-2 text-center">
            <p className="body-small text-foreground/70">
              {t("sponsorTitle")}{" "}
              <Link
                href="/patrocina"
                className="body-small text-primary hover:text-primary/80 transition-interactive pressable-inline focus-ring"
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

export default Publica;
