"use client";

import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import { setHours, setMinutes, setSeconds } from "date-fns";
import { parseLocalDateTime, toLocalDateTimeString } from "@utils/date-helpers";
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
import { EventFormStepSchema } from "types/event";
import { isOption, Option } from "types/common";
import { getZodValidationState } from "@utils/form-validation";
import { isValidEventUrl } from "@utils/event-url";
import { sendGoogleEvent } from "@utils/analytics";
import { buildPublishContext } from "@utils/publica-analytics";
import { useTranslations } from "next-intl";

const subscribeNoop = () => () => {};
// Fields checked when leaving each step, and the element to focus first.
const STEP_FIELDS = [["title", "description", "url"], ["town", "location"], []] as const;
const FIELD_FOCUS_IDS = {
  title: "title", description: "description", url: "url", town: "town-input", location: "location",
} as const;

export const EventForm: React.FC<EventFormProps> = ({
  form,
  onSubmit,
  submitLabel,
  analyticsContext,
  isEditMode = false,
  isLoading = false,
  isSubmitDisabled = false,
  submitAnalyticsAction,
  isLoadingCities = false,
  isLoadingCategories = false,
  cityOptions,
  categoryOptions,
  handleFormChange,
  handleImageChange,
  onImagePreparingChange,
  handleTownChange,
  handleCategoriesChange,
  handleUseGeolocation,
  handleTestUrl,
  isLocating = false,
  imageToUpload,
  imageFile,
  onPreview,
  canPreview,
  previewLabel,
  previewTestId,
  initialStep = 0,
  onStepChange,
}) => {
  const t = useTranslations("Utils.Validation");
  const tForm = useTranslations("Components.EventForm");
  // true on the client, false during SSR: marks the form interactive for e2e.
  const isHydrated = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );
  const [step, setStep] = useState(initialStep);
  const changeStep = (next: number) => {
    if (next === step) return;
    const nextStep = EventFormStepSchema.parse(next);
    setStep(nextStep);
    onStepChange?.(nextStep);
  };
  const [isImagePreparing, setIsImagePreparing] = useState(false);
  // The last step whose publish button is armed; e2e waits on data-publish-armed.
  const [armedStep, setArmedStep] = useState<number | null>(null);
  // Errors appear only after the user tries to leave a step (GOV.UK pattern),
  // then update live so they disappear as soon as the field is fixed.
  const [attemptedSteps, setAttemptedSteps] = useState<ReadonlySet<number>>(() => new Set());
  const pendingFocusStepRef = useRef<number | null>(null);
  const steps = ["stepBasics", "stepLocation", "stepImage"];
  const helperLocation = tForm.has("locationHint") ? tForm("locationHint") : "";
  const helperUrl = tForm.has("urlHint") ? tForm("urlHint") : "";
  const optionalLabel = tForm("optional");
  const markAttempted = (target: number) =>
    setAttemptedSteps((prev) => (prev.has(target) ? prev : new Set(prev).add(target)));

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
  const handleAllDayToggle = (isAllDayEvent: boolean) => {
    let startDateValue = form.startDate
      ? parseLocalDateTime(form.startDate)
      : new Date();
    // The site shows a 00:00 start as all-day (utils/event-status.ts), so a
    // timed event cannot keep it: move it to the picker's default 09:00.
    if (!isAllDayEvent && startDateValue.getHours() === 0 && startDateValue.getMinutes() === 0) {
      startDateValue = setHours(startDateValue, 9);
      handleFormChange("startDate", toLocalDateTimeString(startDateValue));
    }
    const targetEndDate = isAllDayEvent
      ? setSeconds(setMinutes(setHours(startDateValue, 23), 59), 59)
      : new Date(startDateValue.getTime() + 60 * 60 * 1000);
    handleFormChange("isAllDay", isAllDayEvent);
    handleFormChange("endDate", toLocalDateTimeString(targetEndDate));
  };

  const isPublishArmed = armedStep === step && step === steps.length - 1;

  useEffect(() => {
    if (step !== steps.length - 1) return;
    // Guard against accidental publish when the Next button is replaced by the Publish
    // submit button during a step transition (can happen under CI timing/layout shifts).
    const timeoutId = window.setTimeout(() => setArmedStep(step), 250);
    return () => {
      window.clearTimeout(timeoutId);
      setArmedStep(null);
    };
  }, [step, steps.length]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isImagePreparing || isLoading) return;

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

    if (!isPublishArmed) {
      return;
    }
    if (isSubmitDisabled) return;

    // Run one-off validation to check if we can proceed
    const submitValidation = getZodValidationState(
      form,
      false, // Force non-pristine check
      imageFile,
      isEditMode,
      validationLabels,
      zodLabels
    );

    if (!submitValidation.isDisabled) {
      onSubmit(e);
      return;
    }
    if (analyticsContext === "publica") {
      sendGoogleEvent("publish_submit_blocked", {
        ...buildPublishContext({ form, imageFile: imageFile ?? null }),
        source: "publica",
        reason: "client_validation",
      });
    }
    // A restored draft can reach the last step with earlier fields empty: send the user there.
    const firstInvalidStep = STEP_FIELDS.findIndex((fields) => fields.some((field) => fieldErrors[field]));
    if (firstInvalidStep !== -1 && firstInvalidStep < step) {
      markAttempted(firstInvalidStep);
      pendingFocusStepRef.current = firstInvalidStep;
      changeStep(firstInvalidStep);
      return;
    }
    markAttempted(step);
  };

  const hasImage = Boolean(imageToUpload || imageFile);
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

  const fieldErrors: Record<(typeof STEP_FIELDS)[number][number], string | undefined> = {
    title: form.title.trim() ? undefined : t("titleRequired"),
    description: form.description.trim() ? undefined : t("descriptionRequired"),
    url: form.url.trim() && !isValidEventUrl(form.url) ? t("invalidUrl") : undefined,
    town: form.town ? undefined : t("townRequired"),
    location: form.location.trim() ? undefined : t("locationRequired"),
  };
  const showErrors = attemptedSteps.has(step);
  const errorFor = (field: keyof typeof fieldErrors) => (showErrors ? fieldErrors[field] : undefined);

  // The last step has no inline errors for image and dates, so list them.
  const lastStepMissing = [
    hasImage || isEditMode ? null : reviewImageLabel || t("imageRequired"),
    form.startDate && (form.isAllDay || form.endDate) ? null : reviewDatesLabel || tForm("datesLabel"),
  ].filter((item): item is string => Boolean(item));
  const isLastStep = step === steps.length - 1;
  const feedbackMessage = isLastStep && showErrors
    ? lastStepMissing.length > 0
      ? tForm("reviewMissing", { count: lastStepMissing.length, fields: lastStepMissing.join(", ") })
      : getZodValidationState(form, false, imageFile, isEditMode, validationLabels, zodLabels).message
    : "";

  useEffect(() => {
    if (pendingFocusStepRef.current !== step) return;
    pendingFocusStepRef.current = null;
    const invalid = STEP_FIELDS[step]?.find((field) => fieldErrors[field]);
    if (invalid) document.getElementById(FIELD_FOCUS_IDS[invalid])?.focus();
  });

  const goNext = () => {
    const invalid = STEP_FIELDS[step]?.filter((field) => fieldErrors[field]) ?? [];
    if (invalid.length > 0) {
      markAttempted(step);
      document.getElementById(FIELD_FOCUS_IDS[invalid[0]])?.focus();
      return;
    }
    if (step < steps.length - 1) changeStep(step + 1);
  };

  const goPrev = () => changeStep(Math.max(0, step - 1));

  const handleStepClick = (targetStep: number) => {
    // Only allow navigation to previous steps or current step
    if (targetStep <= step) {
      changeStep(targetStep);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full flex flex-col justify-center items-center gap-y-4"
      data-testid="event-form"
      data-hydrated={isHydrated ? "true" : "false"}
      data-publish-armed={isPublishArmed ? "true" : "false"}
    >
      <div className="w-full">
        <div className="flex justify-between body-small text-muted-foreground">
          <span>{tForm("step", { current: step + 1, total: steps.length })}</span>
          <span className="font-medium text-foreground">{tForm(steps[step])}</span>
        </div>
        <ol className="w-full flex gap-1">
          {steps.map((name, index) => (
            <li key={name} className="flex-1">
              <button
                type="button"
                onClick={() => handleStepClick(index)}
                disabled={index > step}
                aria-current={index === step ? "step" : undefined}
                aria-label={`${tForm(name)}, ${tForm(index < step ? "stepDone" : index === step ? "stepCurrent" : "stepTodo")}`}
                className="group block w-full py-2 rounded-badge focus-ring disabled:cursor-default"
              >
                <span className={`block h-1.5 rounded-badge transition-colors ${index <= step ? "bg-primary" : "bg-border"} ${index < step ? "group-hover:bg-primary-dark" : ""}`} />
              </button>
            </li>
          ))}
        </ol>
      </div>

      {step === 0 && (
        <>
          <Input
            id="title"
            title={tForm("title")}
            value={form.title}
            onChange={(e) => handleFormChange("title", e.target.value)}
            error={errorFor("title")}
          />

          <TextArea
            id="description"
            value={form.description}
            onChange={(e) => handleFormChange("description", e.target.value)}
            error={errorFor("description")}
          />

          <div className="w-full">
            <Input
              id="url"
              title={tForm("url")}
              optionalLabel={optionalLabel}
              subtitle={helperUrl}
              value={form.url}
              inputMode="url"
              autoComplete="url"
              onChange={(e) => handleFormChange("url", e.target.value)}
              error={errorFor("url")}
            />
            {handleTestUrl && form.url.trim() && isValidEventUrl(form.url) ? (
              <button
                type="button"
                className="mt-1 body-small font-medium text-primary underline underline-offset-4 hover:text-primary-dark rounded-sm focus-ring"
                data-testid="test-link-button"
                onClick={() => handleTestUrl(form.url)}
              >
                {tForm("testLink")}
              </button>
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
                title={tForm("town")}
                options={cityOptions}
                value={isOption(form.town) ? form.town : null}
                onChange={handleTownChange}
                isClearable
                placeholder={tForm("townPlaceholder")}
                testId="town-select"
                error={errorFor("town")}
              />
              {handleUseGeolocation ? (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isLocating}
                    data-testid="geolocate-button"
                    onClick={handleUseGeolocation}
                  >
                    {isLocating
                      ? tForm.has("locating")
                        ? tForm("locating")
                        : "Localitzant…"
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
            title={tForm("location")}
            subtitle={helperLocation}
            value={form.location}
            onChange={(e) => handleFormChange("location", e.target.value)}
            error={errorFor("location")}
          />

          <MultiSelect
            id="categories"
            title={tForm("categories")}
            optionalLabel={optionalLabel}
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
            onPreparingChange={(preparing) => {
              setIsImagePreparing(preparing);
              onImagePreparingChange?.(preparing);
            }}
          />

          <DatePicker
            idPrefix="event-date"
            startDate={form.startDate}
            endDate={form.endDate}
            onChange={(field, value) => handleFormChange(field, value)}
            required
            enableAllDayToggle
            isAllDay={Boolean(form.isAllDay)}
            onToggleAllDay={handleAllDayToggle}
            className="w-full"
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
        <p className="helper-text-error w-full" role="alert">
          {feedbackMessage}
        </p>
      )}

      <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-4 w-full pt-6">
        {step > 0 ? (
          <Button
            type="button"
            variant="ghost"
            data-testid="prev-button"
            disabled={isImagePreparing}
            onClick={goPrev}
            className="min-h-[44px] w-full sm:w-auto"
          >
            {tForm.has("previous") ? tForm("previous") : "Enrere"}
          </Button>
        ) : (
          <div className="hidden sm:block" />
        )}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          {step === steps.length - 1 && onPreview ? (
            <Button
              type="button"
              variant="neutral"
              className="min-h-[44px] w-full sm:w-auto"
              disabled={!isPreviewReady || isLoading || isImagePreparing}
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
              data-testid="next-button"
              onClick={goNext}
              className="min-h-[44px] w-full sm:w-auto"
            >
              {tForm.has("next") ? tForm("next") : "Següent"}
            </Button>
          ) : (
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading || isImagePreparing || isSubmitDisabled}
              className="min-h-[44px] w-full sm:w-auto"
              data-testid="publish-button"
              data-analytics-event-name={
                analyticsContext === "publica" && !submitAnalyticsAction ? "publish_submit_click" : undefined
              }
              data-analytics-action={submitAnalyticsAction}
              data-analytics-context={analyticsContext}
              data-analytics-target={
                analyticsContext === "publica" ? "publish_button" : undefined
              }
            >
              {isLoading ? (
                <>
                  <svg
                    aria-hidden="true"
                    className="inline w-4 h-4 mr-2 animate-spin"
                    viewBox="0 0 100 101"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                      fill="currentColor"
                      opacity={0.25}
                    />
                    <path
                      d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                      fill="currentColor"
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
