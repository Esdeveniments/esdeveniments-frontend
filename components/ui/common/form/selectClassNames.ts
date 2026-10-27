import type { ClassNamesConfig, GroupBase } from "react-select";
import type { Option } from "types/common";

/** Design-system classes for react-select (used with `unstyled`). */
export function getSelectClassNames<IsMulti extends boolean>(
  hasError = false
): ClassNamesConfig<
  Option,
  IsMulti,
  GroupBase<Option>
> {
  return {
    control: ({ isFocused, isDisabled }) =>
      `min-h-[48px] rounded-input border bg-background px-3 transition-[box-shadow,border-color] duration-normal ease-smooth ${
        hasError
          ? `border-error ${isFocused ? "ring-2 ring-error ring-offset-2" : ""}`
          : isFocused
            ? "border-primary ring-2 ring-primary ring-offset-2"
            : "border-input hover:border-foreground"
      } ${isDisabled ? "bg-muted opacity-60 cursor-not-allowed" : "cursor-pointer"}`,
    valueContainer: () => "gap-1 py-1",
    placeholder: () => "text-base text-muted-foreground",
    input: () => "text-base text-foreground",
    singleValue: () => "text-base text-foreground",
    indicatorsContainer: () => "gap-1 text-muted-foreground",
    indicatorSeparator: () => "hidden",
    dropdownIndicator: () => "p-1 rounded-full hover:text-foreground",
    clearIndicator: () => "p-1 rounded-full hover:text-foreground",
    loadingIndicator: () => "p-1",
    menu: () =>
      "mt-2 rounded-input border border-border bg-background shadow-lg overflow-hidden z-100",
    menuList: () => "py-1",
    option: ({ isFocused, isSelected }) =>
      `px-3 py-2 text-base cursor-pointer ${
        isSelected ? "font-semibold text-primary" : "text-foreground"
      } ${isFocused ? "bg-muted" : ""}`,
    noOptionsMessage: () => "px-3 py-2 body-small text-muted-foreground",
    loadingMessage: () => "px-3 py-2 body-small text-muted-foreground",
    multiValue: () => "items-center gap-1 rounded-badge bg-muted pl-2.5 pr-1 py-0.5",
    multiValueLabel: () => "body-small text-foreground",
    multiValueRemove: () =>
      "rounded-full p-0.5 text-muted-foreground hover:bg-border hover:text-foreground",
  };
}
