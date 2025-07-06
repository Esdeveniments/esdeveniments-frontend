"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { captureException } from "@sentry/nextjs";
import { getRegionValue, formDataToBackendDTO } from "@utils/helpers";
import EventForm from "@components/ui/EventForm";
import { useGetRegionsWithCities } from "@components/hooks/useGetRegionsWithCities";
import { useCategories } from "@components/hooks/useCategories";
import { createEventAction } from "./actions";
import type { FormData } from "types/event";
import { Option } from "types/common";

const defaultForm: FormData = {
  title: "",
  description: "",
  type: "FREE",
  startDate: (() => {
    const now = new Date();
    now.setHours(9, 0, 0, 0); // Set to 9:00 AM
    return now.toISOString().slice(0, 16);
  })(),
  startTime: "",
  endDate: (() => {
    const now = new Date();
    now.setHours(10, 0, 0, 0); // Set to 10:00 AM
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

const Publica = () => {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(defaultForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const { regionsWithCities, isLoading: isLoadingRegionsWithCities } =
    useGetRegionsWithCities();

  // Fetch categories
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

    // SIMPLIFIED: Direct region lookup without complex find operation
    const regionId = getRegionValue(form.region);
    if (!regionId) return [];

    const region = regionsWithCities.find((r) => r.id.toString() === regionId);
    return region
      ? region.cities.map((city) => ({
          id: city.id,
          label: city.label,
          value: city.id.toString(), // Use ID as value for proper form handling
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

  // Simple form change handler - no validation here
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
    // The EventForm component will handle validation internally
    // This will only be called if validation passes
    console.log("Form submitted successfully, processing...");

    startTransition(async () => {
      try {
        // Check if image is provided
        if (!imageFile) {
          console.log("No image file provided");
          return;
        }

        const regionLabel =
          form.region && "label" in form.region ? form.region.label : "";
        const townLabel =
          form.town && "label" in form.town ? form.town.label : "";
        const location = `${form.location}, ${townLabel}, ${regionLabel}`;

        const eventData = formDataToBackendDTO({
          ...form,
          location,
        });

        const result = await createEventAction(eventData, imageFile);

        if (result && result.success && result.event) {
          const { slug } = result.event;

          router.push(`/e/${slug}`);
        } else {
          console.error("Error creating event");
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
            Publica un esdeveniment
          </h1>
          <p className="text-sm text-center">* camps obligatoris</p>
        </div>
        <div className="w-full flex flex-col justify-center items-center gap-y-4 pt-4 sm:w-[580px] md:w-[768px] lg:w-[1024px]">
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
          />
        </div>
      </div>
    </div>
  );
};

export default Publica;
