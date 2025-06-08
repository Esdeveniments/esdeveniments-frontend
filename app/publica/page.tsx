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
import EventForm from "@components/ui/EventForm";
import { useGetRegionsWithCities } from "@components/hooks/useGetRegionsWithCities";
import { createEventAction } from "./actions";
import { fetchRegionById } from "@lib/api/regions";
import { fetchCityById } from "@lib/api/cities";
import type { FormData } from "types/event";
import { EventFormSchema, type EventFormSchemaType } from "types/event";
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

const getZodValidationState = (
  form: EventFormSchemaType,
  isPristine: boolean
): { isDisabled: boolean; isPristine: boolean; message: string } => {
  if (!isPristine) {
    return { isDisabled: true, isPristine: true, message: "" };
  }
  const result = EventFormSchema.safeParse(form);
  if (!result.success) {
    // Collect first error message
    const firstError =
      Object.values(result.error.flatten().fieldErrors)[0]?.[0] ||
      "Hi ha errors de validació";
    return { isDisabled: true, isPristine: true, message: firstError };
  }
  return { isDisabled: false, isPristine: false, message: "" };
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
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [imageToUpload, setImageToUpload] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [isPending, startTransition] = useTransition();

  const { regionsWithCities, isLoading: isLoadingRegionsWithCities } =
    useGetRegionsWithCities();

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
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      setImageToUpload(reader.result as string);
    });
    reader.readAsDataURL(file);
  };

  const handleTownChange = (town: Option | null) =>
    handleFormChange("town", town);

  const onSubmit = async () => {
    const newFormState = getZodValidationState(form, formState.isPristine);
    setFormState(newFormState);
    if (!newFormState.isDisabled) {
      startTransition(async () => {
        setIsLoading(true);
        try {
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

          if (imageToUpload) {
            const url = `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUDNAME}/upload`;
            const xhr = new XMLHttpRequest();
            const fd = new FormData();
            xhr.open("POST", url, true);
            xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");

            xhr.upload.addEventListener("progress", (e) => {
              setProgress(Math.round((e.loaded * 100.0) / e.total));
            });

            xhr.onreadystatechange = () => {
              if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                  const response = JSON.parse(xhr.responseText);
                  eventData.imageUrl = response.secure_url;
                  createEventAction(eventData).then((result) => {
                    if (result && result.success && result.event) {
                      const { id } = result.event;
                      const { formattedStart } = getFormattedDate(
                        String(form.startDate), // Ensure date is passed as string
                        String(form.endDate) // Ensure date is passed as string
                      );
                      const slugifiedTitle = slug(
                        form.title,
                        formattedStart,
                        id
                      );
                      router.push(`/e/${id}/${slugifiedTitle}`);
                    } else {
                      setFormState({
                        isDisabled: true,
                        isPristine: true,
                        message:
                          "Error creant l'esdeveniment. Torna-ho a provar.",
                      });
                    }
                  });
                } else {
                  const error = JSON.parse(xhr.responseText).error;
                  setIsLoading(false);
                  setFormState({
                    isDisabled: true,
                    isPristine: true,
                    message: `Hi ha hagut un error en pujar la imatge: ${error.message}, torna-ho a provar més tard o contacta amb nosaltres.`,
                  });
                  captureException(
                    new Error(`Error uploading file: ${error.message}`)
                  );
                }
              }
            };

            fd.append(
              "upload_preset",
              process.env
                .NEXT_PUBLIC_CLOUDINARY_UNSIGNED_UPLOAD_PRESET as string
            );
            fd.append("tags", "browser_upload");
            fd.append("file", imageToUpload as string);
            xhr.send(fd);
          } else {
            setIsLoading(false);
            setFormState({
              isDisabled: true,
              isPristine: true,
              message: "Imatge obligatòria",
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
        } finally {
          setIsLoading(false);
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
            initialValues={defaultForm}
            onSubmit={onSubmit}
            submitLabel="Publica"
            isLoading={isPending || isLoading}
            regionOptions={regionOptions}
            cityOptions={cityOptions}
            progress={progress}
            isLoadingRegionsWithCities={isLoadingRegionsWithCities}
            handleFormChange={handleFormChange}
            handleImageChange={handleImageChange}
            handleRegionChange={handleRegionChange}
            handleTownChange={handleTownChange}
            imageToUpload={imageToUpload}
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
