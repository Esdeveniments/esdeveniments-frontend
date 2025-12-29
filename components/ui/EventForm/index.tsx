"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import setHours from "date-fns/setHours";
import setMinutes from "date-fns/setMinutes";
import setSeconds from "date-fns/setSeconds";
import {
  DatePicker,
  Input,
  Select,
  TextArea,
  ImageUpload,
  MultiSelect,
} from "@components/ui/common/form";
import { SelectSkeleton } from "@components/ui/common/skeletons";
import Button from "@components/ui/common/button";
import type { EventFormProps } from "types/event";
import { isOption, Option } from "types/common";
import { getZodValidationState } from "@utils/form-validation";
import { useTranslations } from "next-intl";

export const EventForm: React.FC<EventFormProps> = ({
  form,
  onSubmit,
  submitLabel,
  analyticsContext,
  isEditMode = false,
  isLoading = false,
  isLoadingCities = false,
  isLoadingCategories = false,
  cityOptions,
  categoryOptions,
  handleFormChange,
  handleImageChange,
  handleTownChange,
  handleCategoriesChange,
  handleUseGeolocation,
  handleTestUrl,
  isLocating = false,
  progress,
  imageToUpload,
  imageFile,
  isUploadingImage = false,
  uploadMessage,
  onPreview,
  canPreview,
  previewLabel,
  previewTestId,
  imageMode = "upload",
  onImageModeChange,
  imageUrlValue = null,
  handleImageUrlChange,
}) => {
  const t = useTranslations("Utils.Validation");
  const tForm = useTranslations("Components.EventForm");
  const [isHydrated, setIsHydrated] = useState(false);
  const [step, setStep] = useState(0);
  const canPublishRef = useRef(false);
  const publishArmTimeoutRef = useRef<number | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const steps = ["stepBasics", "stepLocation", "stepImage"];
  const helperTitle = tForm.has("titleHint") ? tForm("titleHint") : "";
  const helperLocation = tForm.has("locationHint") ? tForm("locationHint") : "";
  const helperUrl = tForm.has("urlHint") ? tForm("urlHint") : "";
  const helperImage = tForm.has("imageHint") ? tForm("imageHint") : "";

  const reviewImageLabel = tForm.has("imageLabel") ? tForm("imageLabel") : "";
  const reviewDatesLabel = tForm.has("datesLabel") ? tForm("datesLabel") : "";
  const validationLabels = useMemo(
    () => ({
      genericError: t("genericError"),
      imageRequired: t("imageRequired"),
    }),
    [t]
  );
  const zodLabels = useMemo(
    () => ({
      titleRequired: t("titleRequired"),
      descriptionRequired: t("descriptionRequired"),
      locationRequired: t("locationRequired"),
      invalidUrl: t("invalidUrl"),
      invalidEmail: t("invalidEmail"),
    }),
    [t]
  );
  // Reactive form state based on interaction
  const formState = useMemo(() => {
    return getZodValidationState(
      form,
      !hasInteracted, // If interacted, validation runs in non-pristine mode
      imageFile,
      isEditMode,
      validationLabels,
      zodLabels,
      form.imageUrl
    );
  }, [form, imageFile, isEditMode, validationLabels, zodLabels, hasInteracted]);

  const handleAllDayToggle = (isAllDayEvent: boolean) => {
    const startDateValue = form.startDate ? new Date(form.startDate) : new Date();
    const targetEndDate = isAllDayEvent
      ? setSeconds(setMinutes(setHours(startDateValue, 23), 59), 59)
      : new Date(startDateValue.getTime() + 60 * 60 * 1000);
    handleFormChange("isAllDay", isAllDayEvent);
    handleFormChange("endDate", targetEndDate.toISOString().slice(0, 16));
  };

  const [internalImageMode, setInternalImageMode] =
    useState<"upload" | "url">(imageMode);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    canPublishRef.current = false;
    if (publishArmTimeoutRef.current !== null) {
      window.clearTimeout(publishArmTimeoutRef.current);
      publishArmTimeoutRef.current = null;
    }

    if (step === steps.length - 1) {
      // Guard against accidental publish when the Next button is replaced by the Publish
      // submit button during a step transition (can happen under CI timing/layout shifts).
      publishArmTimeoutRef.current = window.setTimeout(() => {
        canPublishRef.current = true;
        publishArmTimeoutRef.current = null;
      }, 250);
    }

    return () => {
      if (publishArmTimeoutRef.current !== null) {
        window.clearTimeout(publishArmTimeoutRef.current);
        publishArmTimeoutRef.current = null;
      }
    };
  }, [step, steps.length]);

  useEffect(() => {
    setInternalImageMode(imageMode);
  }, [imageMode]);

  const effectiveImageMode = onImageModeChange ? imageMode : internalImageMode;
  const effectiveImageUrlValue = imageUrlValue ?? form.imageUrl ?? null;
  const handleImageModeChangeValue = onImageModeChange ?? setInternalImageMode;
  const handleImageUrlValueChange =
    handleImageUrlChange ??
    ((value: string) => handleFormChange("imageUrl", value || null));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setHasInteracted(true);

    // Never publish via implicit form submits (e.g. pressing Enter in a field).
    // Only allow publish when the user explicitly clicks the publish button.
    // Also, if submit happens before the last step, treat it as a "Next" attempt.
    if (step < steps.length - 1) {
      goNext();
      return;
    }

    const nativeEvent = e.nativeEvent as SubmitEvent;
    const submitter = (nativeEvent?.submitter as HTMLElement | null) ?? null;
    const submitterTestId = submitter?.getAttribute?.("data-testid") ?? null;
    const isExplicitPublishClick = submitterTestId === "publish-button";

    if (!isExplicitPublishClick) {
      return;
    }

    if (!canPublishRef.current) {
      return;
    }

    // Run one-off validation to check if we can proceed
    const submitValidation = getZodValidationState(
      form,
      false, // Force non-pristine check
      imageFile,
      isEditMode,
      validationLabels,
      zodLabels,
      form.imageUrl
    );

    if (!submitValidation.isDisabled) {
      onSubmit(e);
    }
  };

  const hasImage = Boolean(
    imageToUpload || imageFile || effectiveImageUrlValue || form.imageUrl
  );
  const hasDates = Boolean(form.startDate && (form.isAllDay ? true : form.endDate));


  const previewRequirements = [
    form.title.trim() ? null : tForm("title"),
    form.town ? null : tForm("town"),
    form.location.trim() ? null : tForm("location"),
    hasImage ? null : reviewImageLabel || tForm("imageLabel"),
    hasDates ? null : reviewDatesLabel || tForm("datesLabel"),
  ].filter(Boolean) as string[];

  const isPreviewReady =
    typeof canPreview === "boolean" ? canPreview : previewRequirements.length === 0;
  const previewButtonLabel =
    previewLabel ||
    (tForm.has("previewButton") ? tForm("previewButton") : "Previsualitzar");

  const getStepMissing = (currentStep: number): string[] => {
    if (currentStep === 0) {
      const missing: string[] = [];
      if (!form.title.trim()) missing.push(t("titleRequired"));
      if (!form.description.trim()) missing.push(t("descriptionRequired"));
      return missing;
    }
    if (currentStep === 1) {
      const missing: string[] = [];
      if (!form.town) missing.push(tForm("town"));
      if (!form.location.trim()) missing.push(t("locationRequired"));
      return missing;
    }
    if (currentStep === 2) {
      // Step 2 validation (Image + Dates)
      // Visual check for missing fields
      const missing: string[] = [];
      if (!hasImage) missing.push(reviewImageLabel || t("imageRequired"));
      if (!form.startDate) missing.push(reviewDatesLabel || tForm("datesLabel"));
      if (!form.isAllDay && !form.endDate) {
        missing.push(reviewDatesLabel || tForm("datesLabel"));
      }
      return missing;
    }
    return [];
  };

  const stepMissing = getStepMissing(step);
  const stepErrorMessage =
    stepMissing.length > 0
      ? tForm.has("reviewMissing")
        ? tForm("reviewMissing", {
          count: stepMissing.length,
          fields: stepMissing.join(", ")
        })
        : stepMissing.join(", ")
      : "";
  const isNextDisabled = stepMissing.length > 0 || isUploadingImage;
  const shouldShowFeedback = hasInteracted;

  // Feedback message comes from step errors OR global form errors (if we are at the end)
  const feedbackMessage = shouldShowFeedback
    ? stepErrorMessage ||
    (step === steps.length - 1 ? formState.message : "")
    : "";

  const goNext = () => {
    if (isNextDisabled) {
      setHasInteracted(true);
      return;
    }
    if (step < steps.length - 1) {
      // When moving steps, we can reset interaction if we want to treat new step as fresh, 
      // but usually keeping it true is safer to show errors immediately. 
      // However, design pattern usually suggests showing errors only after interaction on that step?
      // For now, let's keep hasInteracted=true if we clicked next.
      setStep((prev) => prev + 1);
    }
  };

  const goPrev = () => setStep((prev) => Math.max(0, prev - 1));

  const handleStepClick = (targetStep: number) => {
    // Only allow navigation to previous steps or current step
    if (targetStep <= step) {
      setStep(targetStep);
    }
  };

  const handleFieldBlur = (fieldName: string) => {
    setTouchedFields((prev) => new Set(prev).add(fieldName));

    // Validate specific field
    const errors: Record<string, string> = {};
    if (fieldName === "title" && !form.title.trim()) {
      errors.title = t("titleRequired");
    }
    if (fieldName === "description" && !form.description.trim()) {
      errors.description = t("descriptionRequired");
    }
    if (fieldName === "location" && !form.location.trim()) {
      errors.location = t("locationRequired");
    }

    setFieldErrors((prev) => ({ ...prev, ...errors }));
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full flex flex-col justify-center items-center gap-y-4"
      data-testid="event-form"
      data-hydrated={isHydrated ? "true" : "false"}
    >
      <div className="w-full">
        <div className="flex justify-between text-sm md:text-base text-foreground/80 mb-2">
          <span className="font-medium">
            {tForm.has("step")
              ? tForm("step", { current: step + 1, total: steps.length })
              : `${step + 1}/${steps.length}`}
          </span>
          <span className="font-medium">{tForm.has(steps[step]) ? tForm(steps[step]) : steps[step]}</span>
        </div>
        {/* Clickable progress bar */}
        <div className="w-full flex gap-1">
          {steps.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleStepClick(index)}
              disabled={index > step}
              className={`h-2 flex-1 rounded-input transition-all ${index < step
                ? "bg-primary hover:bg-primary-dark cursor-pointer"
                : index === step
                  ? "bg-primary"
                  : "bg-border cursor-not-allowed"
                }`}
              aria-label={`${tForm.has(steps[index]) ? tForm(steps[index]) : steps[index]} ${index < step ? "(completed)" : index === step ? "(current)" : "(pending)"}`}
            />
          ))}
        </div>
      </div>

      {step === 0 && (
        <>
          <Input
            id="title"
            title={tForm("title")}
            subtitle={helperTitle}
            value={form.title}
            onChange={(e) => handleFormChange("title", e.target.value)}
            onBlur={() => handleFieldBlur("title")}
            error={touchedFields.has("title") ? fieldErrors.title : undefined}
          />

          <TextArea
            id="description"
            value={form.description}
            onChange={(e) => handleFormChange("description", e.target.value)}
            onBlur={() => handleFieldBlur("description")}
            error={touchedFields.has("description") ? fieldErrors.description : undefined}
          />

          <div className="w-full">
            <Input
              id="url"
              title={tForm("url")}
              subtitle={helperUrl}
              value={form.url}
              onChange={(e) => handleFormChange("url", e.target.value)}
            />
            {handleTestUrl ? (
              <div className="flex justify-end mt-2">
                <Button
                  type="button"
                  variant="neutral"
                  className="btn-outline"
                  data-testid="test-link-button"
                  onClick={() => handleTestUrl(form.url)}
                >
                  {tForm.has("testLink") ? tForm("testLink") : "Prova l'enllaç"}
                </Button>
              </div>
            ) : null}
          </div>
        </>
      )}

      {step === 1 && (
        <>
          {isLoadingCities ? (
            <SelectSkeleton label={tForm("townSkeleton")} />
          ) : (
            <div className="w-full space-y-2">
              <Select
                id="town"
                title={`${tForm("town")} *`}
                options={cityOptions}
                value={isOption(form.town) ? form.town : null}
                onChange={handleTownChange}
                isClearable
                placeholder={tForm("townPlaceholder")}
                testId="town-select"
              />
              {handleUseGeolocation ? (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="neutral"
                    className="btn-outline"
                    disabled={isLocating}
                    data-testid="geolocate-button"
                    onClick={handleUseGeolocation}
                  >
                    {isLocating
                      ? tForm.has("locating")
                        ? tForm("locating")
                        : "Localitzant..."
                      : tForm.has("useLocation")
                        ? tForm("useLocation")
                        : "Usa la meva ubicació"}
                  </Button>
                </div>
              ) : null}
            </div>
          )}

          <Input
            id="location"
            title={`${tForm("location")} *`}
            subtitle={helperLocation}
            value={form.location}
            onChange={(e) => handleFormChange("location", e.target.value)}
            onBlur={() => handleFieldBlur("location")}
            error={touchedFields.has("location") ? fieldErrors.location : undefined}
          />

          <MultiSelect
            id="categories"
            title={tForm("categories") + " *"}
            value={
              Array.isArray(form.categories)
                ? form.categories
                  .map((cat) => {
                    if (isOption(cat)) {
                      return cat;
                    }
                    if (typeof cat === "object" && "id" in cat && "name" in cat) {
                      return { value: cat.id.toString(), label: cat.name };
                    }
                    return null;
                  })
                  .filter((cat): cat is Option => cat !== null)
                : []
            }
            onChange={handleCategoriesChange}
            options={categoryOptions}
            isDisabled={isLoadingCategories}
            isLoading={isLoadingCategories}
            placeholder={tForm("categoriesPlaceholder")}
          />
        </>
      )}

      {step === 2 && (
        <>
          <ImageUpload
            value={imageToUpload}
            onUpload={handleImageChange}
            progress={progress}
            isUploading={isUploadingImage}
            uploadMessage={uploadMessage}
            mode={effectiveImageMode}
            onModeChange={handleImageModeChangeValue}
            imageUrlValue={effectiveImageUrlValue || ""}
            onImageUrlChange={handleImageUrlValueChange}
          />
          {helperImage ? (
            <p className="text-[12px] text-foreground/80 w-full px-2 -mt-2">
              {helperImage}
            </p>
          ) : null}

          <DatePicker
            idPrefix="event-date"
            startDate={form.startDate}
            endDate={form.endDate}
            minDate={form.startDate}
            onChange={(field, value) => handleFormChange(field, value)}
            required
            enableAllDayToggle
            isAllDay={Boolean(form.isAllDay)}
            onToggleAllDay={handleAllDayToggle}
          />



          {isEditMode && (
            <Input
              id="email"
              title={tForm("email")}
              subtitle={tForm("emailSubtitle")}
              value={form.email || ""}
              onChange={(e) => handleFormChange("email", e.target.value)}
            />
          )}
        </>
      )}

      {feedbackMessage && (
        <div className="p-4 my-3 text-primary rounded-lg text-md">
          {feedbackMessage}
        </div>
      )}

      <div className="flex justify-between w-full pt-6">
        {step > 0 ? (
          <Button
            type="button"
            variant="ghost"
            data-testid="prev-button"
            onClick={goPrev}
            className="min-h-[44px] px-6"
          >
            {tForm.has("previous") ? tForm("previous") : "Enrere"}
          </Button>
        ) : (
          <div />
        )}
        <div className="flex items-center gap-2">
          {step === steps.length - 1 && onPreview ? (
            <Button
              type="button"
              variant="neutral"
              className="btn-outline min-h-[44px] px-6"
              disabled={!isPreviewReady || isLoading}
              data-testid={previewTestId || "preview-button"}
              data-analytics-event-name={
                analyticsContext === "publica" ? "publish_preview_click" : undefined
              }
              data-analytics-context={analyticsContext}
              data-analytics-target={
                analyticsContext === "publica" ? "preview_button" : undefined
              }
              onClick={onPreview}
            >
              {previewButtonLabel}
            </Button>
          ) : null}
          {step < steps.length - 1 ? (
            <Button
              type="button"
              variant="primary"
              disabled={isNextDisabled}
              data-testid="next-button"
              onClick={goNext}
              className={`min-h-[44px] px-6 ${isNextDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {tForm.has("next") ? tForm("next") : "Següent"}
            </Button>
          ) : (
            <Button
              type="submit"
              variant="primary"
              disabled={formState.isDisabled || isLoading}
              className={`min-h-[44px] px-6 ${formState.isDisabled || isLoading
                ? "opacity-50 cursor-not-allowed"
                : "opacity-100"
                }`}
              data-testid="publish-button"
              data-analytics-event-name={
                analyticsContext === "publica" ? "publish_submit_click" : undefined
              }
              data-analytics-context={analyticsContext}
              data-analytics-target={
                analyticsContext === "publica" ? "publish_button" : undefined
              }
            >
              {isLoading ? (
                <>
                  <svg
                    role="status"
                    className="inline w-4 h-4 mr-2 text-border/40 animate-spin dark:text-border"
                    viewBox="0 0 100 101"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                      fill="#FF0037"
                    />
                    <path
                      d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                      fill="#FF0037"
                    />
                  </svg>
                  {tForm("publishing")}
                </>
              ) : (
                submitLabel
              )}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
};

export default EventForm;
