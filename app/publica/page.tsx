"use client";

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

const defaultForm: FormData = {
  title: "",
  description: "",
  type: "FREE",
  startDate: (() => {
    const now = new Date();
    now.setHours(9, 0, 0, 0);
    return now.toISOString().slice(0, 16);
  })(),
  startTime: "",
  endDate: (() => {
    const now = new Date();
    now.setHours(10, 0, 0, 0);
    return now.toISOString().slice(0, 16);
  })(),
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

const Publica = () => {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(defaultForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const { regionsWithCities, isLoading: isLoadingRegionsWithCities } =
    useGetRegionsWithCities();

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

  const handleImageChange = (file: File) => {
    setImageFile(file);
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      setImagePreview(reader.result as string);
    });
    reader.readAsDataURL(file);
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
        const name = option?.label ?? `Regió ${regionIdValue}`;
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
        const name = option?.label ?? `Ciutat ${townIdValue}`;
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
    startTransition(async () => {
      try {
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

        const e2eExtras = buildE2EExtras();
        const result = await createEventAction(
          eventData,
          imageFile || undefined,
          e2eExtras
        );

        if (result && result.success && result.event) {
          const { slug } = result.event;
          if (typeof document !== "undefined") {
            document.body.dataset.lastE2eSlug = slug;
          }
          if (typeof window !== "undefined") {
            window.__LAST_E2E_PUBLISH_SLUG__ = slug;
          }

          router.push(`/e/${slug}`);
        } else {
          captureException("Error creating event");
        }
      } catch (error) {
        console.error("Submission error:", error);
        captureException(error);
      }
    });
  };
  return (
    <div className="container flex flex-col justify-center pt-2 pb-14">
      <div className="flex flex-col gap-4 px-2 lg:px-0">
        <div className="flex flex-col gap-2">
          <h1 className="italic uppercase font-semibold">
            Publica un esdeveniment
          </h1>
          <p className="text-sm text-center">* camps obligatoris</p>
        </div>
        <div className="w-full flex flex-col gap-y-4 pt-4">
          <EventForm
            form={form}
            onSubmit={onSubmit}
            submitLabel="Publicar"
            isLoading={isPending}
            regionOptions={regionOptions}
            cityOptions={cityOptions}
            categoryOptions={categoryOptions}
            progress={0}
            isLoadingRegionsWithCities={isLoadingRegionsWithCities}
            handleFormChange={handleFormChange}
            handleImageChange={handleImageChange}
            handleRegionChange={handleRegionChange}
            handleTownChange={handleTownChange}
            handleCategoriesChange={handleCategoriesChange}
            imageToUpload={imagePreview}
            imageFile={imageFile}
          />
        </div>
      </div>
    </div>
  );
};

export default Publica;
