import { cva } from "class-variance-authority";
import { forwardRef } from "react";
import type { InputProps } from "types/ui";
import { cn } from "@components/utils/cn";
import { FormField } from "../FormField";

export const inputVariants = cva(
  "block w-full rounded-md border border-blackCorp/30 bg-whiteCorp text-blackCorp shadow-sm transition placeholder:text-blackCorp/40 hover:border-blackCorp/40 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default: "",
        error: "border-error focus-visible:ring-error/20",
        success: "border-success focus-visible:ring-success/20",
      },
      size: {
        sm: "h-8 px-component-sm text-body-sm",
        md: "h-9 px-component-sm text-body-sm",
        lg: "h-10 px-component-md text-body-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      variant,
      size,
      type = "text",
      disabled,
      "aria-describedby": ariaDescribedBy,
      label,
      subtitle,
      error,
      required,
      helperText,
      id,
      ...rest
    },
    ref,
  ) => {
    const inputElement = (
      <input
        ref={ref}
        id={id}
        type={type}
        className={cn(
          inputVariants({ variant: error ? "error" : variant, size }),
          "aria-invalid:border-error aria-invalid:ring-2 aria-invalid:ring-error/20",
          className,
        )}
        disabled={disabled}
        aria-describedby={
          ariaDescribedBy ||
          (error ? `${id}-error` : helperText ? `${id}-helper` : undefined)
        }
        aria-invalid={!!error}
        {...rest}
      />
    );

    // If label is provided, wrap with FormField
    if (label || subtitle || error || helperText || required) {
      return (
        <FormField
          id={id}
          label={label}
          subtitle={subtitle}
          error={error}
          required={required}
          helperText={helperText}
        >
          {inputElement}
        </FormField>
      );
    }

    return inputElement;
  },
);

Input.displayName = "Input";
