"use client";

import { forwardRef } from "react";
import { cva } from "class-variance-authority";
import { cn } from "@components/utils/cn";
import XIcon from "@heroicons/react/outline/XIcon";
import { RangeInputProps } from "types/ui/primitives";
import { FormField } from "../FormField";
import { Text } from "../Text";

/**
 * Range input variants using Class Variance Authority.
 */
const rangeVariants = cva(
  "h-2 w-full cursor-pointer appearance-none rounded-lg bg-darkCorp/80 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      state: {
        default: "",
        error: "focus:ring-destructive/50",
      },
    },
    defaultVariants: {
      state: "default",
    },
  },
);

/**
 * A range input component for selecting values within a range.
 *
 * @param id - Unique identifier for the range input
 * @param label - Label text for the range input
 * @param subtitle - Subtitle text for additional context
 * @param error - Error message to display
 * @param required - Whether the field is required
 * @param min - Minimum value for the range
 * @param max - Maximum value for the range
 * @param value - Current value of the range input
 * @param onChange - Callback when the range value changes
 * @param disabled - Whether the range input is disabled
 * @param className - Additional CSS classes
 *
 * @example
 * ```tsx
 * <RangeInput
 *   id="distance"
 *   label="Distance"
 *   min={10}
 *   max={100}
 *   value={50}
 *   onChange={(e) => setDistance(Number(e.target.value))}
 * />
 * ```
 */
export const RangeInput = forwardRef<HTMLInputElement, RangeInputProps>(
  (
    {
      id,
      label,
      subtitle,
      error,
      required,
      min,
      max,
      value,
      onChange,
      disabled,
      className,
      ...props
    },
    ref,
  ) => {
    const hasError = !!error;

    // Create custom label with value display and clear button
    const customLabel = label ? (
      <div className="flex w-full items-center justify-start gap-component-xs">
        <Text variant="body-sm">{label}</Text>
        <div className="flex items-center justify-start gap-component-xs pb-xs">
          <Text
            variant="body-lg"
            color="primary"
            className="font-barlow font-semibold"
          >
            {value} km
          </Text>
        </div>
        {value && value !== min && (
          <button
            type="button"
            onClick={() => onChange({ target: { value: min.toString() } })}
            className="flex items-center justify-center rounded p-component-xs hover:bg-darkCorp focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
            aria-label={`Clear ${label?.toLowerCase()} filter`}
          >
            <XIcon className="h-4 w-4 text-primary" aria-hidden="true" />
          </button>
        )}
      </div>
    ) : undefined;

    const inputElement = (
      <div className={cn("w-full", className)}>
        <input
          ref={ref}
          id={id}
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={rangeVariants({ state: hasError ? "error" : "default" })}
          aria-describedby={error ? `${id}-error` : undefined}
          aria-invalid={hasError}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-valuetext={`${value} km`}
          {...props}
        />
        {/* Custom styling for webkit browsers */}
        <style jsx>{`
          input[type="range"]::-webkit-slider-thumb {
            appearance: none;
            height: 20px;
            width: 20px;
            border-radius: 50%;
            background: #2563eb;
            cursor: pointer;
            border: 2px solid #ffffff;
            box-shadow: 0 0 2px rgba(0, 0, 0, 0.2);
          }
          input[type="range"]::-webkit-slider-thumb:hover {
            background: #1d4ed8;
          }
          input[type="range"]::-webkit-slider-track {
            height: 8px;
            border-radius: 4px;
            background: #e5e7eb;
          }
          input[type="range"]::-moz-range-thumb {
            height: 20px;
            width: 20px;
            border-radius: 50%;
            background: #2563eb;
            cursor: pointer;
            border: 2px solid #ffffff;
            box-shadow: 0 0 2px rgba(0, 0, 0, 0.2);
          }
          input[type="range"]::-moz-range-thumb:hover {
            background: #1d4ed8;
          }
          input[type="range"]::-moz-range-track {
            height: 8px;
            border-radius: 4px;
            background: #e5e7eb;
          }
        `}</style>
      </div>
    );

    // If label, subtitle, error, or required is provided, wrap with FormField
    if (customLabel || subtitle || error || required) {
      return (
        <FormField
          id={id}
          label={customLabel}
          subtitle={subtitle}
          error={error}
          required={required}
        >
          {inputElement}
        </FormField>
      );
    }

    return inputElement;
  },
);

RangeInput.displayName = "RangeInput";
