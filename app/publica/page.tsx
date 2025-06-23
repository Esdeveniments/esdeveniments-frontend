"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { captureException } from "@sentry/nextjs";
import {
  slug,
  getFormattedDate,
  getRegionValue,
  getTownValue,
  formDataToBackendDTO,
} from "@utils/helpers";
import { getZodValidationState } from "@utils/form-validation";
import EventForm from "@components/ui/EventForm";
import { useGetRegionsWithCities } from "@components/hooks/useGetRegionsWithCities";
import { useCategories } from "@components/hooks/useCategories";
import { createEventAction } from "./actions";
import { fetchRegionById } from "@lib/api/regions";
import { fetchCityById } from "@lib/api/cities";
import type { FormData } from "types/event";
import { Option } from "types/common";

const defaultForm: FormData = {
  title: "",
  slug: "",
  description: "",
  type: "FREE",
  startDate: "",
  startTime: "",
  endDate: "",
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
  const [formState, setFormState] = useState<{
    isDisabled: boolean;
    isPristine: boolean;
    message: string;
  }>({
    isDisabled: true,
    isPristine: true,
    message: "",
  });
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
    const region = regionsWithCities.find(
      (r) => r.id.toString() === getRegionValue(form.region)
    );
    return region
      ? region.cities.map((city) => ({ label: city.label, value: city.value }))
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
    const newForm = { ...form, [name]: value };
    setForm(newForm);
    setFormState(getZodValidationState(newForm, true));
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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newFormState = getZodValidationState(form, formState.isPristine);
    setFormState(newFormState);
    if (!newFormState.isDisabled) {
      startTransition(async () => {
        try {
          // Check if image is provided
          if (!imageFile) {
            setFormState({
              isDisabled: true,
              isPristine: true,
              message: "Imatge obligatòria",
            });
            return;
          }

          const townValue = getTownValue(form.town);
          const regionValue = getRegionValue(form.region);
          let regionLabel = "";
          let townLabel = "";
          if (regionValue) {
            const region = await fetchRegionById(regionValue);
            regionLabel = region?.name || "";
          }
          if (townValue) {
            const city = await fetchCityById(townValue);
            townLabel = city?.name || "";
          }
          const location = `${form.location}, ${townLabel}, ${regionLabel}`;

          const eventData = formDataToBackendDTO({
            ...form,
            location,
          });

          // Call the new API with the image file
          const result = await createEventAction(eventData, imageFile);

          if (result && result.success && result.event) {
            const { id } = result.event;
            const { formattedStart } = getFormattedDate(
              String(form.startDate), // Ensure date is passed as string
              String(form.endDate) // Ensure date is passed as string
            );
            const slugifiedTitle = slug(form.title, formattedStart, id);
            router.push(`/e/${id}/${slugifiedTitle}`);
          } else {
            setFormState({
              isDisabled: true,
              isPristine: true,
              message: "Error creant l'esdeveniment. Torna-ho a provar.",
            });
          }
        } catch (error) {
          captureException(error);
          setFormState({
            isDisabled: true,
            isPristine: true,
            message:
              "Hi ha hagut un error, torna-ho a provar més tard o contacta amb nosaltres.",
          });
        }
      });
    }
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
            submitLabel="Publica"
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
            formState={formState}
            setFormState={setFormState}
          />
        </div>
      </div>
      {formState.isPristine && formState.message && (
        <div className="p-4 my-3 text-primary rounded-lg text-md">
          {formState.message}
        </div>
      )}
    </div>
  );
};

export default Publica;
