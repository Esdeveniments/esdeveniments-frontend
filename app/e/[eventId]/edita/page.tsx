// Migrated from pages/e/[eventId]/edita/index.tsx
import { notFound } from "next/navigation";
import { useRouter } from "next/navigation";
import { fetchEventById } from "lib/api/events";
import type { FormData, FormState } from "types/event";
import { EventFormSchema, type EventFormSchemaType } from "types/event";
import EventForm from "@components/ui/EventForm";
import { useGetRegionsWithCities } from "components/hooks/useGetRegionsWithCities";
import { useState, useMemo } from "react";
import { Metadata } from "next";
import { siteUrl } from "@config/index";
import { useTransition } from "react";
import { editEvent } from "./actions";
import { formDataToBackendDTO, eventDtoToFormData } from "@utils/helpers";

// Helper: Metadata generation
export async function generateMetadata({
  params,
}: {
  params: { eventId: string };
}): Promise<Metadata> {
  const event = await fetchEventById(params.eventId);
  if (!event) return { title: "No trobat" };
  return {
    title: `Edita: ${event.title}`,
    description: event.description ?? undefined,
    openGraph: {
      title: `Edita: ${event.title}`,
      description: event.description ?? undefined,
      url: `${siteUrl}/e/${event.id}/edita`,
    },
  };
}

// --- Helper: Zod-based validation ---
const getZodValidationState = (
  form: EventFormSchemaType,
  isPristine: boolean
): FormState => {
  if (!isPristine) {
    return { isDisabled: true, isPristine: true, message: "" };
  }
  const result = EventFormSchema.safeParse(form);
  if (!result.success) {
    const firstError =
      Object.values(result.error.flatten().fieldErrors)[0]?.[0] ||
      "Hi ha errors de validació";
    return { isDisabled: true, isPristine: true, message: firstError };
  }
  return { isDisabled: false, isPristine: false, message: "" };
};

export default async function EditaPage({
  params,
}: {
  params: { eventId: string };
}) {
  const router = useRouter();
  const event = await fetchEventById(params.eventId);

  if (!event) return notFound();

  const { regionsWithCities, isLoading: isLoadingRegionsWithCities } =
    useGetRegionsWithCities();
  const [form, setForm] = useState<FormData>(eventDtoToFormData(event));
  const [formState, setFormState] = useState<FormState>({
    isDisabled: true,
    isPristine: true,
    message: "",
  });
  const [imageToUpload, setImageToUpload] = useState<string | null>(
    form.imageUrl
  );
  const [progress] = useState<number>(0);
  const [isPending, startTransition] = useTransition();

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
      (r) =>
        r.id.toString() ===
        (form.region && "value" in form.region ? form.region.value : "")
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

  const handleRegionChange = (region: any) =>
    handleFormChange("region", region);
  const handleTownChange = (town: any) => handleFormChange("town", town);

  const handleImageChange = (file: File) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      setImageToUpload(reader.result as string);
    });
    reader.readAsDataURL(file);
  };

  async function onSubmit() {
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
            message: "Error actualitzant l'esdeveniment. Torna-ho a provar.",
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
        initialValues={form}
        onSubmit={onSubmit}
        submitLabel="Desa canvis"
        isEditMode={true}
        isLoading={isPending}
        isLoadingRegionsWithCities={isLoadingRegionsWithCities}
        regionOptions={regionOptions}
        cityOptions={cityOptions}
        handleFormChange={handleFormChange}
        handleImageChange={handleImageChange}
        handleRegionChange={handleRegionChange}
        handleTownChange={handleTownChange}
        progress={progress}
        imageToUpload={imageToUpload}
      />
    </div>
  );
}
