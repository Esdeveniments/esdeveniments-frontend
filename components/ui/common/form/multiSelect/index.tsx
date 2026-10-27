import { useState, useEffect } from "react";
import ReactSelect, { components } from "react-select";
import { getSelectClassNames } from "../selectClassNames";
import { Option } from "types/common";
import { MultiSelectProps } from "types/props";
import { useTranslations } from "next-intl";

const selectClassNames = getSelectClassNames<true>();

const Input = components.Input;

export default function MultiSelectComponent({
  id,
  title,
  value = [],
  onChange,
  options = [],
  isDisabled = false,
  placeholder = "Selecciona categories",
  isLoading = false,
  optionalLabel,
}: MultiSelectProps) {
  const t = useTranslations("Components.MultiSelect");
  const inputId = `${id}-input`;
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
    <div className="w-full">
      <label htmlFor={inputId} className="form-label">
        {title}
        {optionalLabel ? (
          <span className="font-normal text-muted-foreground"> {optionalLabel}</span>
        ) : null}
      </label>
      <div className="mt-2">
        {!isMounted ? (
          <div className="h-12 bg-muted border border-border rounded-input animate-pulse" />
        ) : (
          <ReactSelect<Option, true>
            key={`multiselect-${id}-${isMounted}`}
            id={id}
            instanceId={id}
            inputId={inputId}
            isMulti
            isSearchable
            isClearable
            isLoading={isLoading}
            placeholder={
              isLoading ? t("loading") : placeholder || t("placeholder")
            }
            value={selectedOptions}
            onChange={handleChange}
            options={options}
            unstyled
            classNames={selectClassNames}
            isDisabled={isDisabled || isLoading}
            noOptionsMessage={() => t("noOptions")}
            loadingMessage={() => t("loadingShort")}
            components={{
              Input,
            }}
          />
        )}
      </div>
    </div>
  );
}
