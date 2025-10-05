"use client";

import { forwardRef } from "react";
import { cva } from "class-variance-authority";
import { cn } from "@components/utils/cn";
import { RadioInputProps } from "types/ui/primitives";
import { FormField } from "../FormField";
import { Text } from "../Text";

/**
 * Radio input variants using Class Variance Authority.
 */
const radioVariants = cva(
  "h-4 w-4 rounded-full border border-primary text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      state: {
        checked: "border-primary bg-primary",
        unchecked: "bg-white border-bColor",
        error: "border-destructive focus:ring-destructive/50",
      },
    },
    defaultVariants: {
      state: "unchecked",
    },
  },
);

/**
 * A radio input component for single selection from a group of options.
 *
 * @param id - Unique identifier for the radio input
 * @param name - Name attribute for grouping radio inputs
 * @param value - Value of this radio input option
 * @param checkedValue - Currently selected value in the radio group
 * @param onChange - Callback when this radio input is selected
 * @param label - Label text for the radio input
 * @param disabled - Whether the radio input is disabled
 * @param error - Error message to display
 * @param required - Whether the field is required
 * @param className - Additional CSS classes
 *
 * @example
 * ```tsx
 * <RadioInput
 *   id="option1"
 *   name="options"
 *   value="option1"
 *   checkedValue={selectedValue}
 *   onChange={setSelectedValue}
 *   label="Option 1"
 * />
 * ```
 */
export const RadioInput = forwardRef<HTMLInputElement, RadioInputProps>(
  (
    {
      id,
      name,
      value,
      checkedValue,
      onChange,
      label,
      disabled,
      error,
      required,
      className,
      ...props
    },
    ref,
  ) => {
    const isChecked = checkedValue === value;
    const hasError = !!error;

    const inputElement = (
      <div
        className={cn(
          "flex items-center justify-start gap-component-xs",
          className,
        )}
      >
        <input
          ref={ref}
          id={id}
          name={name}
          type="radio"
          className={radioVariants({
            state: hasError ? "error" : isChecked ? "checked" : "unchecked",
          })}
          checked={isChecked}
          onChange={() => onChange(value)}
          onClick={() => onChange(value)}
          disabled={disabled}
          required={required}
          aria-describedby={error ? `${id}-error` : undefined}
          aria-invalid={hasError}
          {...props}
        />
        <label
          htmlFor={id}
          className={cn(
            "cursor-pointer",
            disabled && "cursor-not-allowed opacity-50",
          )}
        >
          <Text size="sm" className="font-medium">
            {label}
          </Text>
        </label>
      </div>
    );

    // If error or required is provided, wrap with FormField
    if (error || required) {
      return (
        <FormField id={id} error={error} required={required}>
          {inputElement}
        </FormField>
      );
    }

    return inputElement;
  },
);

RadioInput.displayName = "RadioInput";
