import { useState, useEffect } from "react";
import CreatableSelect from "react-select/creatable";
import { components, StylesConfig, GroupBase } from "react-select";
import type { SelectProps } from "types/ui";
import { Option } from "types/common";
import { FormField } from "../FormField";
import { neutralColors, primaryColors } from "types/ui/colors";

const borderColor = `${neutralColors.bColor} !important`;

const customStyles: StylesConfig<Option, false, GroupBase<Option>> = {
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
  singleValue: (provided) => ({
    ...provided,
    fontSize: "16px",
    color: neutralColors.blackCorp,
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
 * A customizable select component built on react-select with creatable options.
 * Provides a searchable dropdown with support for creating new options and integrates with FormField for consistent styling.
 *
 * @param id - The unique identifier for the select element.
 * @param label - The label text displayed above the select field.
 * @param subtitle - Optional subtitle text displayed below the label.
 * @param error - Error message to display when validation fails.
 * @param required - Indicates if the field is required.
 * @param value - The currently selected option value.
 * @param onChange - Callback function called when the selection changes.
 * @param options - Array of available options for the select.
 * @param isDisabled - Disables the select input.
 * @param isValidNewOption - Function to validate if a new option can be created.
 * @param isClearable - Allows clearing the selected value.
 * @param placeholder - Placeholder text when no option is selected.
 * @param rest - Other standard HTML select attributes.
 *
 * @example
 * // Basic select with predefined options
 * <Select
 *   id="category"
 *   label="Category"
 *   options={[
 *     { value: 'music', label: 'Music' },
 *     { value: 'sports', label: 'Sports' },
 *     { value: 'art', label: 'Art' }
 *   ]}
 *   onChange={(option) => console.log(option)}
 * />
 *
 * @example
 * // Select with creatable options
 * <Select
 *   id="location"
 *   label="Location"
 *   isValidNewOption={() => true}
 *   options={[]}
 *   onChange={(option) => console.log(option)}
 *   placeholder="Select or create a location"
 * />
 *
 * @example
 * // Select with error state
 * <Select
 *   id="priority"
 *   label="Priority"
 *   error="Please select a priority level"
 *   required
 *   options={[
 *     { value: 'low', label: 'Low' },
 *     { value: 'medium', label: 'Medium' },
 *     { value: 'high', label: 'High' }
 *   ]}
 *   onChange={(option) => console.log(option)}
 * />
 */
export const Select: React.FC<SelectProps & { ariaLabelledBy?: string }> = ({
  id,
  label,
  subtitle,
  error,
  required,
  value: initialValue = null,
  onChange,
  options = [],
  isDisabled = false,
  isValidNewOption = false,
  isClearable = false,
  placeholder = "una opció",
  ariaLabelledBy,
  ...props
}) => {
  // Removed setState - no longer needed for page/scroll reset
  const [selectedOption, setSelectedOption] = useState<Option | null>(
    initialValue,
  );
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setSelectedOption(initialValue);
  }, [initialValue]);

  const handleChange = (newValue: Option | null) => {
    setSelectedOption(newValue);
    onChange(newValue);

    // Removed page/scrollPosition reset - no longer needed with server-side filtering
  };

  return (
    <FormField
      id={id}
      label={label}
      subtitle={subtitle}
      error={error}
      required={required}
    >
      {!isMounted ? (
        <div className="h-[42px] animate-pulse rounded-lg border border-bColor bg-darkCorp" />
      ) : (
        <CreatableSelect<Option>
          key={`select-${id}-${isMounted}`}
          id={id}
          instanceId={id}
          isSearchable
          isClearable={isClearable}
          formatCreateLabel={(inputValue: string) =>
            `Afegir nou lloc: "${inputValue}"`
          }
          placeholder={placeholder}
          defaultValue={selectedOption || initialValue}
          value={selectedOption || initialValue}
          onChange={handleChange}
          options={options}
          styles={customStyles}
          classNames={{
            control: () =>
              "focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2",
          }}
          isDisabled={isDisabled}
          isValidNewOption={() => isValidNewOption}
          components={{
            Input,
          }}
          aria-label={label}
          aria-labelledby={ariaLabelledBy}
          {...props}
        />
      )}
    </FormField>
  );
};

Select.displayName = "Select";
