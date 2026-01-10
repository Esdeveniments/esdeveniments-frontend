import { useState, useEffect } from "react";
import CreatableSelect from "react-select/creatable";
import { components, StylesConfig, GroupBase } from "react-select";
import { Option } from "types/common";
import { MultiSelectProps } from "types/props";
import { useTranslations } from "next-intl";

const borderColor = "#CCC !important";

const customStyles: StylesConfig<Option, true, GroupBase<Option>> = {
  container: (provided) => ({
    ...provided,
    borderColor: "#FFF !important",
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
    boxShadow: state.isFocused ? "#000 !important" : "#CCC !important",
    borderRadius: "8px",
  }),
  placeholder: (provided) => ({
    ...provided,
    fontSize: "16px",
    color: "#CCC",
    padding: "0px 15px",
  }),
  option: (provided, state) => ({
    ...provided,
    fontSize: "16px",
    background: state.isFocused ? "#D6002F" : "#FFF",
    color: state.isFocused ? "#FFF" : "#454545",
  }),
  multiValue: (provided) => ({
    ...provided,
    backgroundColor: "#D6002F",
    borderRadius: "4px",
  }),
  multiValueLabel: (provided) => ({
    ...provided,
    color: "#FFF",
    fontSize: "14px",
  }),
  multiValueRemove: (provided) => ({
    ...provided,
    color: "#FFF",
    ":hover": {
      backgroundColor: "#CC002E",
      color: "#FFF",
    },
  }),
  menu: (provided) => ({
    ...provided,
    border: "0px",
    borderRadius: "0px",
    boxShadow: "0px 10px 30px -25px #454545",
    background: "#FFF",
    padding: "0px 10px 30px",
  }),
};

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
}: MultiSelectProps) {
  const t = useTranslations("Components.MultiSelect");
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
      <label htmlFor={id} className="text-foreground-strong font-bold">
        {title}
      </label>
      <div className="mt-2">
        {!isMounted ? (
          <div className="h-[42px] bg-muted border border-border rounded-lg animate-pulse" />
        ) : (
          <CreatableSelect<Option, true>
            key={`multiselect-${id}-${isMounted}`}
            id={id}
            instanceId={id}
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
            styles={customStyles}
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
