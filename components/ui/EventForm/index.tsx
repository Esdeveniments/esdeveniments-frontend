"use client";

import React, { memo } from "react";
import {
  DatePicker,
  Input,
  Select,
  TextArea,
  ImageUpload,
  MultiSelect,
} from "@components/ui/common/form";
import type { EventFormProps } from "types/event";
import { isOption, Option } from "types/common";

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
  formState,
}) => {
  return (
    <form onSubmit={onSubmit}>
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
      <MultiSelect
        id="categories"
        title="Categories"
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
        startDate={form.startDate}
        endDate={form.endDate}
        minDate={form.startDate}
        onChange={(field, value) => handleFormChange(field, value)}
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
