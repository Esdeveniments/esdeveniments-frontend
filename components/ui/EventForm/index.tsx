"use client";

import React, { useState, memo } from "react";
import {
  DatePicker,
  Input,
  Select,
  TextArea,
  ImageUpload,
} from "@components/ui/common/form";
import type { FormState, EventFormProps } from "types/event";
import { isOption } from "types/common";
import { EventFormSchema, type EventFormSchemaType } from "types/event";

const getZodValidationState = (
  form: EventFormSchemaType,
  isPristine: boolean
): FormState => {
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

export const EventForm: React.FC<EventFormProps> = ({
  form,
  onSubmit,
  submitLabel,
  isEditMode = false,
  isLoading = false,
  isLoadingRegionsWithCities = false,
  regionOptions,
  cityOptions,
  handleFormChange,
  handleImageChange,
  handleRegionChange,
  handleTownChange,
  progress,
  imageToUpload,
}) => {
  const [formState, setFormState] = useState<FormState>(
    getZodValidationState(form, true)
  );

  const _onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newFormState = getZodValidationState(form, formState.isPristine);
    setFormState(newFormState);
    if (!newFormState.isDisabled) {
      await onSubmit(form);
    }
  };

  return (
    <form onSubmit={_onSubmit}>
      <Input
        id="title"
        title="Títol *"
        value={form.title}
        onChange={(e) => handleFormChange("title", e.target.value)}
      />
      <TextArea
        id="description"
        value={form.description}
        onChange={(e) => handleFormChange("description", e.target.value)}
      />
      <Input
        id="url"
        title="Enllaç de l'esdeveniment"
        value={form.url}
        onChange={(e) => handleFormChange("url", e.target.value)}
      />
      <ImageUpload
        value={imageToUpload}
        onUpload={handleImageChange}
        progress={progress}
      />
      <Select
        id="region"
        title="Comarca *"
        options={regionOptions}
        value={isOption(form.region) ? form.region : null}
        onChange={handleRegionChange}
        isClearable
        placeholder={
          isLoadingRegionsWithCities
            ? "Carregant comarques..."
            : "Selecciona una comarca"
        }
      />
      <Select
        id="town"
        title="Població *"
        options={cityOptions}
        value={isOption(form.town) ? form.town : null}
        onChange={handleTownChange}
        isDisabled={!form.region || isLoadingRegionsWithCities}
        isClearable
        placeholder={
          isLoadingRegionsWithCities
            ? "Carregant pobles..."
            : "Selecciona un poble"
        }
      />
      <Input
        id="location"
        title="Lloc *"
        value={form.location}
        onChange={(e) => handleFormChange("location", e.target.value)}
      />
      {isEditMode && (
        <Input
          id="email"
          title="Correu electrònic"
          subtitle="Vols que t'avisem quan l'esdeveniment s'hagi actualitzat? (no guardem les dades)"
          value={form.email || ""}
          onChange={(e) => handleFormChange("email", e.target.value)}
        />
      )}
      <DatePicker
        idPrefix="event-date"
        startDate={
          typeof form.startDate === "string"
            ? form.startDate
              ? new Date(form.startDate)
              : new Date()
            : form.startDate
        }
        endDate={
          typeof form.endDate === "string"
            ? form.endDate
              ? new Date(form.endDate)
              : new Date()
            : form.endDate
        }
        minDate={new Date()}
        onChange={(field, date) => handleFormChange(field, date)}
        required
      />
      <button type="submit" disabled={formState.isDisabled || isLoading}>
        {submitLabel}
      </button>
      {formState.message && <div>{formState.message}</div>}
    </form>
  );
};

export default memo(EventForm);
