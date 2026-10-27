import { useState, useEffect } from "react";
import CreatableSelect from "react-select/creatable";
import { components } from "react-select";
import { getSelectClassNames } from "../selectClassNames";
import { SelectComponentProps } from "types/props";
import { Option } from "types/common";
import { useTranslations } from "next-intl";

const selectClassNames = getSelectClassNames<false>();
const selectErrorClassNames = getSelectClassNames<false>(true);

const Input = components.Input;

export default function SelectComponent({
  id,
  title,
  value: initialValue = null,
  onChange,
  options = [],
  isDisabled = false,
  isValidNewOption = false,
  isClearable = false,
  placeholder,
  testId,
  autoFocus = false,
  menuPosition = "absolute",
  error,
}: SelectComponentProps) {
  const t = useTranslations("Components.Select");
  const inputId = `${id}-input`;
  const errorId = `${id}-error`;

  // Removed setState - no longer needed for page/scroll reset
  const [selectedOption, setSelectedOption] = useState<Option | null>(
    initialValue
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
    <div className="w-full" data-testid={testId}>
      {title ? (
        <label htmlFor={inputId} className="form-label">
          {title}
        </label>
      ) : null}
      <div className={title ? "mt-2" : undefined}>
        {!isMounted ? (
          <div className="h-12 bg-muted border border-border rounded-input animate-pulse" />
        ) : (
          <CreatableSelect<Option>
            key={`select-${id}-${isMounted}`}
            id={id}
            instanceId={id}
            inputId={inputId}
            isSearchable
            isClearable={isClearable}
            formatCreateLabel={(inputValue: string) =>
              t("create", { value: inputValue })
            }
            placeholder={placeholder || t("placeholder")}
            defaultValue={selectedOption || initialValue}
            value={selectedOption || initialValue}
            onChange={handleChange}
            options={options}
            unstyled
            classNames={error ? selectErrorClassNames : selectClassNames}
            aria-invalid={error ? true : undefined}
            aria-errormessage={error ? errorId : undefined}
            isDisabled={isDisabled}
            isValidNewOption={() => isValidNewOption}
            noOptionsMessage={() => t("noOptions")}
            autoFocus={autoFocus}
            menuPosition={menuPosition}
            components={{
              Input,
            }}
          />
        )}
      </div>
      {error && (
        <p id={errorId} className="helper-text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
