"use client";
import { useRouter } from "../../../../i18n/routing";
import { useState, useMemo, useTransition } from "react";
import EventForm from "@components/ui/EventForm";
import type { FormData } from "types/event";
import { editEvent } from "./actions";
import { formDataToBackendDTO, eventDtoToFormData } from "@utils/helpers";
import { normalizeUrl } from "@utils/string-helpers";
import { EventDetailResponseDTO } from "types/api/event";
import { RegionsGroupedByCitiesResponseDTO } from "types/api/region";
import { Option } from "types/common";
import { useCategories } from "@components/hooks/useCategories";
import { generateCityOptionsWithRegionMap } from "@utils/options-helpers";

export default function EditEventClient({
  event,
  regions,
}: {
  event: EventDetailResponseDTO;
  regions: RegionsGroupedByCitiesResponseDTO[] | null;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(eventDtoToFormData(event));
  const [imageToUpload, setImageToUpload] = useState<string | null>(
    form.imageUrl
  );
  const [progress] = useState<number>(0);
  const [isPending, startTransition] = useTransition();

  // Fetch categories
  const { categories, isLoading: isLoadingCategories } = useCategories();

  const categoryOptions = useMemo(
    () =>
      categories.map((category) => ({
        label: category.name,
        value: category.id.toString(),
      })),
    [categories]
  );

  const { cityOptions, cityToRegionOptionMap } = useMemo(
    () => generateCityOptionsWithRegionMap(regions),
    [regions]
  );

  const isLoadingCities = !regions;

  // Simple form change handler - no validation here
  const handleFormChange = <K extends keyof FormData>(
    name: K,
    value: FormData[K]
  ) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleTownChange = (town: Option | null) =>
    setForm((prev) => {
      const next = { ...prev, town };
      if (town) {
        next.region = cityToRegionOptionMap[town.value] ?? prev.region ?? null;
      } else {
        next.region = null;
      }
      return next;
    });

  const handleCategoriesChange = (categories: Option[]) =>
    handleFormChange("categories", categories);

  const handleImageChange = (file: File | null) => {
    if (!file) {
      setImageToUpload(null);
      return;
    }
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      setImageToUpload(reader.result as string);
    });
    reader.readAsDataURL(file);
  };

  async function onSubmit() {
    // The EventForm component will handle validation internally
    // This will only be called if validation passes
    startTransition(async () => {
      try {
        if (!event) return;
        // Normalize URL before sending to backend (auto-add https:// if missing)
        const data = formDataToBackendDTO({
          ...form,
          url: normalizeUrl(form.url),
        });
        const result = await editEvent(event.id, event.slug, data);
        if (result && result.success) {
          router.push(`/e/${result.newSlug}`);
        } else {
          console.error("Error updating event");
        }
      } catch (error) {
        console.error("Error updating event:", error);
      }
    });
  }

  return (
    <div>
      <h1 className="heading-2">Edita: {event.title}</h1>
      <EventForm
        form={form}
        onSubmit={onSubmit}
        submitLabel="Desa canvis"
        isEditMode={true}
        isLoading={isPending}
        cityOptions={cityOptions}
        categoryOptions={categoryOptions}
        isLoadingCities={isLoadingCities}
        isLoadingCategories={isLoadingCategories}
        handleFormChange={handleFormChange}
        handleImageChange={handleImageChange}
        handleTownChange={handleTownChange}
        handleCategoriesChange={handleCategoriesChange}
        progress={progress}
        imageToUpload={imageToUpload}
      />
    </div>
  );
}
