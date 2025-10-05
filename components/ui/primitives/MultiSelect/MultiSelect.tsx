"use client";

import { useState, useEffect, memo } from "react";
import CreatableSelect from "react-select/creatable";
import { components, StylesConfig, GroupBase } from "react-select";
import { Option } from "types/common";
import { MultiSelectProps } from "types/ui/primitives";
import { FormField } from "@components/ui/patterns/FormField";
import { primaryColors, neutralColors } from "types/ui/colors";

const borderColor = `${neutralColors.bColor} !important`;

const customStyles: StylesConfig<Option, true, GroupBase<Option>> = {
  container: (provided) => ({
    ...provided,
    borderColor: `${neutralColors.whiteCorp} !important`,
    border: "0px",
  }),
  input: (provided) => ({
    ...provided,
    fontSize: "16px",
    padding: "0px 15px",
  }),
  control: (provided, state) => ({
    ...provided,
    borderColor: state.isFocused ? borderColor : borderColor,
    boxShadow: state.isFocused
      ? `${neutralColors.blackCorp} !important`
      : `${neutralColors.bColor} !important`,
    borderRadius: "8px",
  }),
  placeholder: (provided) => ({
    ...provided,
    fontSize: "16px",
    color: neutralColors.bColor,
    padding: "0px 15px",
  }),
  option: (provided, state) => ({
    ...provided,
    fontSize: "16px",
    background: state.isFocused
      ? primaryColors.primary
      : neutralColors.whiteCorp,
    color: state.isFocused ? neutralColors.whiteCorp : neutralColors.blackCorp,
  }),
  multiValue: (provided) => ({
    ...provided,
    backgroundColor: primaryColors.primary,
    borderRadius: "4px",
  }),
  multiValueLabel: (provided) => ({
    ...provided,
    color: neutralColors.whiteCorp,
    fontSize: "14px",
  }),
  multiValueRemove: (provided) => ({
    ...provided,
    color: neutralColors.whiteCorp,
    ":hover": {
      backgroundColor: primaryColors.primarydark,
      color: neutralColors.whiteCorp,
    },
  }),
  menu: (provided) => ({
    ...provided,
    border: "0px",
    borderRadius: "0px",
    boxShadow: `0px 10px 30px -25px ${neutralColors.blackCorp}`,
    background: neutralColors.whiteCorp,
    padding: "0px 10px 30px",
  }),
};

const Input = components.Input;

/**
 * MultiSelect primitive component for selecting multiple options.
 * Built on react-select with custom styling and accessibility features.
 *
 * @param id - Unique identifier for the component
 * @param label - Label text for the field
 * @param subtitle - Optional subtitle text
 * @param error - Error message to display
 * @param required - Whether the field is required
 * @param value - Currently selected options
 * @param onChange - Callback when selection changes
 * @param options - Available options to select from
 * @param isDisabled - Whether the component is disabled
 * @param placeholder - Placeholder text
 * @param isLoading - Whether the component is in loading state
 * @param className - Additional CSS classes
 */
export const MultiSelect = memo<MultiSelectProps>(
  ({
    id,
    label,
    subtitle,
    error,
    required,
    value = [],
    onChange,
    options = [],
    isDisabled = false,
    placeholder = "Selecciona categories",
    isLoading = false,
    className,
  }) => {
    const [selectedOptions, setSelectedOptions] = useState<Option[]>(value);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
      setIsMounted(true);
    }, []);

    useEffect(() => {
      setSelectedOptions(value);
    }, [value]);

    const handleChange = (newValue: readonly Option[]) => {
      const optionsArray = Array.from(newValue);
      setSelectedOptions(optionsArray);
      onChange(optionsArray);
    };

    return (
      <FormField
        id={id}
        label={label}
        subtitle={subtitle}
        error={error}
        required={required}
        className={className}
      >
        {/* Select Component */}
        {!isMounted ? (
          <div className="h-[42px] animate-pulse rounded-lg border border-bColor bg-darkCorp" />
        ) : (
          <CreatableSelect<Option, true>
            key={`multiselect-${id}-${isMounted}`}
            id={id}
            instanceId={id}
            isMulti
            isSearchable
            isClearable
            isLoading={isLoading}
            placeholder={isLoading ? "Carregant categories..." : placeholder}
            value={selectedOptions}
            onChange={handleChange}
            options={options}
            styles={customStyles}
            isDisabled={isDisabled || isLoading}
            noOptionsMessage={() => "No s'ha trobat cap categoria"}
            loadingMessage={() => "Carregant..."}
            aria-describedby={error ? `${id}-error` : `${id}-helper`}
            aria-invalid={!!error}
            components={{
              Input,
            }}
          />
        )}
      </FormField>
    );
  },
);

MultiSelect.displayName = "MultiSelect";
