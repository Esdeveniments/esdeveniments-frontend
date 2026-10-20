"use client";
import { useRouter, Link } from "@i18n/routing";
import { useState, useMemo, useTransition } from "react";
import { useImagePreview } from "@components/hooks/useImagePreview";
import { useTranslations } from "next-intl";
import { getProfileSlug } from "@utils/user-helpers";
import EventForm from "@components/ui/EventForm";
import type { FormData, CoverImageIntent } from "types/event";
import { editEvent } from "./actions";
import { formDataToBackendDTO, eventDtoToFormData } from "@utils/helpers";
import { normalizeUrl } from "@utils/string-helpers";
import { Option } from "types/common";
import type { EditEventClientProps } from "types/props";
import { useCategories } from "@components/hooks/useCategories";
import { generateCityOptionsWithRegionMap } from "@utils/options-helpers";
import { ArrowLeftIcon, PencilIcon } from "@heroicons/react/24/outline";

export default function EditEventClient({ event, regions }: EditEventClientProps) {
  const t = useTranslations("Components.EventPage");
  const tEdit = useTranslations("App.EventEdit");
  const router = useRouter();
  const creatorSlug = event.owner ? getProfileSlug(event.owner) : null;
  const [form, setForm] = useState<FormData>(eventDtoToFormData(event));
  const [imageToUpload, updateImagePreview] = useImagePreview(event.imageUrl);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [coverIntent, setCoverIntent] = useState<CoverImageIntent>("keep");
  // A saved title change renames the slug even when the cover step fails;
  // retries must look the event up by the new one.
  const [slug, setSlug] = useState(event.slug ?? "");
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);

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
    setImageFile(file);
    setCoverIntent(file ? "replace" : "remove");
    updateImagePreview(file);
  };

  async function onSubmit() {
    // The EventForm component will handle validation internally
    // This will only be called if validation passes
    setSubmitError(null);
    startTransition(async () => {
      try {
        if (!event) return;
        // Normalize URL before sending to backend (auto-add https:// if missing)
        const data = formDataToBackendDTO({
          ...form,
          url: normalizeUrl(form.url),
        });
        let cover: globalThis.FormData | undefined;
        if (coverIntent === "replace" && imageFile) {
          cover = new globalThis.FormData();
          cover.append("imageFile", imageFile);
        } else if (coverIntent === "remove" && event.imageUrl) {
          cover = new globalThis.FormData();
          cover.append("removeImage", "1");
        }
        const result = await editEvent(event.id, slug, data, cover);
        if (result?.newSlug) setSlug(result.newSlug);
        if (result && result.success) {
          router.push(`/e/${result.newSlug || slug}`);
        } else {
          setSubmitError(
            result?.errorCode === "COVER_UPDATE_FAILED"
              ? tEdit("coverUpdateFailed")
              : result?.error ?? t("editError"),
          );
        }
      } catch (error) {
        console.error("Error updating event:", error);
        setSubmitError(t("editError"));
      }
    });
  }


  return (
    <div className="container flex flex-col justify-center pt-6 pb-14">
      <div className="flex flex-col gap-6 px-2 lg:px-0">
        {/* Hero Header Section — matches publica page */}
        <div className="flex flex-col items-center text-center gap-4 mb-2">
          <h1 className="heading-1 text-foreground-strong">
            {tEdit("heading")}
          </h1>
          <p className="body-large text-foreground/80 max-w-xl mx-auto">
            {tEdit("subheading")}
          </p>
          <p className="body-small text-foreground/60 mt-2">
            {tEdit("requiredNote")}
          </p>
        </div>

        {/* Navigation links — back to event + my events */}
        <div className="flex flex-col sm:flex-row sm:justify-center items-center gap-3">
          <Link
            href={`/e/${slug}`}
            className="inline-flex items-center gap-2 btn-outline btn-sm w-full sm:w-auto justify-center"
          >
            <ArrowLeftIcon className="w-4 h-4" aria-hidden="true" />
            {tEdit("backToEvent")}
          </Link>
          {creatorSlug && (
            <Link
              href={`/perfil/${encodeURIComponent(creatorSlug)}`}
              className="inline-flex items-center gap-2 btn-ghost btn-sm w-full sm:w-auto justify-center"
            >
              {tEdit("myEvents")}
            </Link>
          )}
        </div>

        {/* Edit title — shows which event is being edited */}
        <div className="flex flex-col gap-y-4 pt-4">
          <div className="w-full px-4 py-3 bg-primary-tint rounded-lg flex items-center gap-3">
            <PencilIcon
              className="w-5 h-5 text-primary flex-shrink-0"
              aria-hidden="true"
            />
            <p className="text-sm font-medium text-foreground-strong text-left">
              {t("editTitle", { title: event.title })}
            </p>
          </div>

          {submitError && (
            <div
              className="w-full px-4 py-3 bg-error/10 border border-error rounded-lg flex items-start gap-3"
              role="alert"
            >
              <svg
                className="w-5 h-5 text-error flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm font-medium text-error">{submitError}</p>
            </div>
          )}

          <EventForm
            form={form}
            onSubmit={onSubmit}
            submitLabel={t("editSave")}
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
            imageToUpload={imageToUpload}
            imageFile={imageFile}
          />
        </div>
      </div>
    </div>
  );
}
