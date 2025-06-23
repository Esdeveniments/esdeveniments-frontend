"use client";
import { useRouter } from "next/navigation";
import { useState, useMemo, useTransition } from "react";
import EventForm from "@components/ui/EventForm";
import type { FormData } from "types/event";
import { getZodValidationState } from "@utils/form-validation";
import { editEvent } from "./actions";
import { formDataToBackendDTO, eventDtoToFormData } from "@utils/helpers";
import { EventSummaryResponseDTO } from "types/api/event";
import { RegionsGroupedByCitiesResponseDTO } from "types/api/region";
import { Option } from "types/common";
import { useCategories } from "@components/hooks/useCategories";

export default function EditEventClient({
  event,
  regions,
}: {
  event: EventSummaryResponseDTO;
  regions: RegionsGroupedByCitiesResponseDTO[] | null;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(eventDtoToFormData(event));
  const [formState, setFormState] = useState<{
    isDisabled: boolean;
    isPristine: boolean;
    message: string;
  }>({
    isDisabled: true,
    isPristine: true,
    message: "",
  });
  const [imageToUpload, setImageToUpload] = useState<string | null>(
    form.imageUrl
  );
  const [progress] = useState<number>(0);
  const [isPending, startTransition] = useTransition();

  // Fetch categories
  const { categories, isLoading: isLoadingCategories } = useCategories();

  const regionOptions = useMemo(
    () =>
      regions
        ? regions.map((region) => ({
            label: region.name,
            value: region.id.toString(),
          }))
        : [],
    [regions]
  );

  const categoryOptions = useMemo(
    () =>
      categories.map((category) => ({
        label: category.name,
        value: category.id.toString(),
      })),
    [categories]
  );

  const cityOptions = useMemo(() => {
    if (!regions || !form.region) return [];
    const region = regions.find(
      (r) =>
        r.id.toString() ===
        (form.region && "value" in form.region ? form.region.value : "")
    );
    return region
      ? region.cities.map((city) => ({ label: city.label, value: city.value }))
      : [];
  }, [regions, form.region]);

  const handleFormChange = <K extends keyof FormData>(
    name: K,
    value: FormData[K]
  ) => {
    const newForm = { ...form, [name]: value };
    setForm(newForm);
    setFormState(getZodValidationState(newForm, true));
  };

  const handleRegionChange = (region: Option | null) =>
    handleFormChange("region", region);
  const handleTownChange = (town: Option | null) =>
    handleFormChange("town", town);

  const handleCategoriesChange = (categories: Option[]) =>
    handleFormChange("categories", categories);

  const handleImageChange = (file: File) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      setImageToUpload(reader.result as string);
    });
    reader.readAsDataURL(file);
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newFormState = getZodValidationState(form, formState.isPristine);
    setFormState(newFormState);
    if (!newFormState.isDisabled) {
      startTransition(async () => {
        try {
          if (!event) return;
          const data = formDataToBackendDTO(form);
          const result = await editEvent(event.id, data);
          if (result && result.success) {
            router.push(`/e/${event.id}/${form.slug}`);
          } else {
            setFormState({
              isDisabled: true,
              isPristine: true,
              message: "Error actualitzant l'esdeveniment. Torna-ho a provar.",
            });
          }
        } catch (error) {
          setFormState({
            isDisabled: true,
            isPristine: true,
            message: `Error actualitzant l'esdeveniment. Torna-ho a provar. ${error}`,
          });
        }
      });
    }
  }

  return (
    <div>
      <h1>Edita: {event.title}</h1>
      <EventForm
        form={form}
        onSubmit={onSubmit}
        submitLabel="Desa canvis"
        isEditMode={true}
        isLoading={isPending}
        regionOptions={regionOptions}
        cityOptions={cityOptions}
        categoryOptions={categoryOptions}
        isLoadingCategories={isLoadingCategories}
        handleFormChange={handleFormChange}
        handleImageChange={handleImageChange}
        handleRegionChange={handleRegionChange}
        handleTownChange={handleTownChange}
        handleCategoriesChange={handleCategoriesChange}
        progress={progress}
        imageToUpload={imageToUpload}
        formState={formState}
        setFormState={setFormState}
      />
    </div>
  );
}
