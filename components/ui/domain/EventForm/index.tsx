"use client";

import React, { memo, useState, useMemo } from "react";
import {
  DatePicker,
  ImageUpload,
  MultiSelect,
} from "@components/ui/primitives";
import { FormFieldCompound as FormField } from "@components/ui/patterns/FormField";
import type { EventFormProps } from "types/event";
import { isOption, Option } from "types/common";
import { getZodValidationState } from "@utils/form-validation";

export const EventForm: React.FC<EventFormProps> = ({
  form,
  onSubmit,
  submitLabel,
  isEditMode = false,
  isLoading = false,
  isLoadingRegionsWithCities = false,
  isLoadingCategories = false,
  regionOptions,
  cityOptions,
  categoryOptions,
  handleFormChange,
  handleImageChange,
  handleRegionChange,
  handleTownChange,
  handleCategoriesChange,
  progress,
  imageToUpload,
  imageFile,
}) => {
  const formState = useMemo(() => {
    return getZodValidationState(form, true, imageFile, isEditMode);
  }, [form, imageFile, isEditMode]);

  const [submitFormState, setSubmitFormState] = useState<{
    isDisabled: boolean;
    isPristine: boolean;
    message: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const submitValidation = getZodValidationState(
      form,
      false,
      imageFile,
      isEditMode,
    );
    setSubmitFormState(submitValidation);

    if (!submitValidation.isDisabled) {
      onSubmit(e);
    }
  };

  const currentFormState = submitFormState || formState;

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col items-center justify-center gap-y-4"
      data-testid="event-form"
    >
      <FormField id="title" required>
        <FormField.Label>Títol *</FormField.Label>
        <FormField.Input
          value={form.title}
          onChange={(e) => handleFormChange("title", e.target.value)}
        />
      </FormField>

      <FormField id="description">
        <FormField.Label>Descripció</FormField.Label>
        <FormField.Textarea
          value={form.description}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            handleFormChange("description", e.target.value)
          }
        />
      </FormField>

      <FormField id="url">
        <FormField.Label>Enllaç de l'esdeveniment</FormField.Label>
        <FormField.Input
          value={form.url}
          onChange={(e) => handleFormChange("url", e.target.value)}
        />
      </FormField>

      <ImageUpload
        value={imageToUpload}
        onUpload={handleImageChange}
        progress={progress}
      />

      <FormField id="region" required>
        <FormField.Label>Comarca *</FormField.Label>
        <FormField.Select
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
      </FormField>

      <FormField id="town" required>
        <FormField.Label>Població *</FormField.Label>
        <FormField.Select
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
      </FormField>

      <FormField id="location" required>
        <FormField.Label>Lloc *</FormField.Label>
        <FormField.Input
          value={form.location}
          onChange={(e) => handleFormChange("location", e.target.value)}
        />
      </FormField>

      <MultiSelect
        id="categories"
        label="Categories"
        value={
          Array.isArray(form.categories)
            ? form.categories
                .map((cat) => {
                  if (
                    typeof cat === "object" &&
                    "value" in cat &&
                    "label" in cat
                  ) {
                    return cat as Option;
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
        placeholder="Selecciona categories (opcional)"
      />

      {isEditMode && (
        <FormField id="email">
          <FormField.Label>Correu electrònic</FormField.Label>
          <FormField.HelperText>
            Vols que t'avisem quan l'esdeveniment s'hagi actualitzat? (no
            guardem les dades)
          </FormField.HelperText>
          <FormField.Input
            value={form.email || ""}
            onChange={(e) => handleFormChange("email", e.target.value)}
          />
        </FormField>
      )}

      <DatePicker
        idPrefix="event-date"
        startDate={form.startDate}
        endDate={form.endDate}
        minDate={form.startDate}
        onChange={(field, value) => handleFormChange(field, value)}
        required
      />

      {currentFormState.message && (
        <div className="text-md my-component-sm rounded-lg p-component-md text-primary">
          {currentFormState.message}
        </div>
      )}

      <div className="flex justify-center pt-2xl">
        <button
          type="submit"
          disabled={currentFormState.isDisabled || isLoading}
          className={`rounded-xl border border-blackCorp bg-whiteCorp px-component-lg py-component-sm font-barlow font-semibold uppercase italic tracking-wide text-blackCorp duration-300 ease-in-out hover:border-whiteCorp hover:bg-primary hover:text-whiteCorp focus:outline-none ${
            currentFormState.isDisabled || isLoading
              ? "cursor-not-allowed opacity-50"
              : "opacity-100"
          }`}
          data-testid="publish-button"
        >
          {isLoading ? (
            <>
              <svg
                role="status"
                className="mr-component-xs inline h-4 w-4 animate-spin text-blackCorp/40 dark:text-blackCorp/80"
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
              Publicant...
            </>
          ) : (
            submitLabel
          )}
        </button>
      </div>
    </form>
  );
};

export default memo(EventForm);
