"use client";

import { useTranslations } from "next-intl";
import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { captureException } from "@sentry/nextjs";
import {
  getRegionValue,
  formDataToBackendDTO,
  getTownValue,
} from "@utils/helpers";
import { normalizeUrl, slugifySegment } from "@utils/string-helpers";
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

  const isLoadingRegions =
    isLoadingRegionsWithCities ||
    (!regionsWithCities && !isErrorRegionsWithCities);

  const { categories } = useCategories();

  const regionOptions = useMemo(
    () =>
      regionsWithCities
        ? regionsWithCities.map((region) => ({
          label: region.name,
          value: region.id.toString(),
        }))
        : [],
    [regionsWithCities]
  );

  const cityOptions = useMemo(() => {
    if (!regionsWithCities || !form.region) return [];

    const regionId = getRegionValue(form.region);
    if (!regionId) return [];

    const region = regionsWithCities.find((r) => r.id.toString() === regionId);
    return region
      ? region.cities.map((city) => ({
        id: city.id,
        label: city.label,
        value: city.id.toString(),
      }))
      : [];
  }, [regionsWithCities, form.region]);

  const categoryOptions = useMemo(
    () =>
      categories.map((category) => ({
        label: category.name,
        value: category.id.toString(),
      })),
    [categories]
  );

  const handleFormChange = <K extends keyof FormData>(
    name: K,
    value: FormData[K]
  ) => {
    setForm({ ...form, [name]: value });
  };

  const handleRegionChange = (region: Option | null) => {
    handleFormChange("region", region);
  };

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

  const handleTownChange = (town: Option | null) =>
    handleFormChange("town", town);

  const handleCategoriesChange = (categories: Option[]) =>
    handleFormChange("categories", categories);

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

    if (imageFile && imageFile.size > MAX_TOTAL_UPLOAD_BYTES) {
      setError(
        `La imatge supera el límit permès de ${MAX_UPLOAD_LIMIT_LABEL} MB. Si us plau, tria una imatge més petita.`
      );
      return;
    }

    if (isUploadingImage) {
      return;
    }

    startTransition(async () => {
      try {
        let resolvedImageUrl = uploadedImageUrl;

        if (imageFile) {
          const signature = buildFileSignature(imageFile);
          if (signature !== uploadedImageSignature) {
            setIsUploadingImage(true);
            setUploadProgress(0);
            uploadAbortController?.abort();
            const controller = new AbortController();
            setUploadAbortController(controller);
            try {
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
            } catch (uploadError) {
              if (
                uploadError instanceof DOMException &&
                uploadError.name === "AbortError"
              ) {
                setIsUploadingImage(false);
                setUploadProgress(0);
                setImageUploadMessage(null);
                setUploadAbortController(null);
                return;
              }
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
          setError(t("errorCreate"));
          captureException("Error creating event");
          return;
        }

        const { slug } = event;
        if (typeof document !== "undefined") {
          document.body.dataset.lastE2eSlug = slug;
        }
        if (typeof window !== "undefined") {
          window.__LAST_E2E_PUBLISH_SLUG__ = slug;
        }

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

        if (isImageUploadLimit) {
          setError(
            `La imatge supera el límit permès de ${MAX_UPLOAD_LIMIT_LABEL} MB. Si us plau, redueix-la o tria un altre fitxer.`
          );
        } else if (isBodyLimit || isRequestTooLarge) {
          setError(
            "La mida total de la sol·licitud (imatge + dades) supera el límit permès pel servidor. Redueix la mida de la imatge abans de tornar-ho a intentar."
          );
        } else if (isFormParsingError) {
          setError(
            "S'ha tallat la connexió mentre s'enviava el formulari. Recarrega la pàgina i torna-ho a provar."
          );
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
          captureException(error);
        }
      }
    });
  };

  return (
    <div className="container flex flex-col justify-center pt-2 pb-14">
      <div className="flex flex-col gap-4 px-2 lg:px-0">
        <div className="flex flex-col gap-2">
          <h1 className="uppercase font-semibold">
            {t("heading")}
          </h1>
          <p className="text-sm text-center">{t("requiredNote")}</p>
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
            isLoading={isPending}
            regionOptions={regionOptions}
            cityOptions={cityOptions}
            categoryOptions={categoryOptions}
            progress={uploadProgress}
            isLoadingRegionsWithCities={isLoadingRegions}
            handleFormChange={handleFormChange}
            handleImageChange={handleImageChange}
            handleRegionChange={handleRegionChange}
            handleTownChange={handleTownChange}
            handleCategoriesChange={handleCategoriesChange}
            imageToUpload={imagePreview}
            imageFile={imageFile}
            isUploadingImage={isUploadingImage}
            uploadMessage={imageUploadMessage}
          />
        </div>
      </div>
    </div>
  );
};

export default Publica;
