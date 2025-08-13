"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { captureException } from "@sentry/nextjs";
import { getRegionValue, formDataToBackendDTO } from "@utils/helpers";
import EventForm from "@components/ui/EventForm";
import { useGetRegionsWithCities } from "@components/hooks/useGetRegionsWithCities";
import { useCategories } from "@components/hooks/useCategories";
import { createEventAction } from "@app/publica/actions";
import type { FormData } from "types/event";
import { Option } from "types/common";

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

export default function NewEventPage() {
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

  const onSubmit = async () => {
    startTransition(async () => {
      try {
        const regionLabel =
          form.region && "label" in form.region ? form.region.label : "";
        const townLabel =
          form.town && "label" in form.town ? form.town.label : "";
        const location = `${form.location}, ${townLabel}, ${regionLabel}`;

        const eventData = formDataToBackendDTO({
          ...form,
          location,
        });

        const result = await createEventAction(eventData, imageFile || undefined);

        if (result && result.success && result.event) {
          const { slug } = result.event;
          // Save ownership via API
          try {
            await fetch("/api/user/events", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ slug }),
            });
          } catch {}
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
    <div className="w-full flex flex-col justify-center items-center pt-2 pb-14 sm:w-[580px] md:w-[768px] lg:w-[1024px] px-4 md:px-0">
      <div className="flex flex-col items-center gap-4">
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-center italic uppercase font-semibold">
            Crea un esdeveniment
          </h1>
          <p className="text-sm text-center">* camps obligatoris</p>
        </div>
        <div className="w-full flex flex-col justify-center items-center gap-y-4 pt-4 sm:w-[580px] md:w-[768px] lg:w-[1024px]">
          <EventForm
            form={form}
            onSubmit={onSubmit}
            submitLabel="Crear"
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
}