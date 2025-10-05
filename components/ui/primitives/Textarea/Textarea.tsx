import { cva } from "class-variance-authority";
import { forwardRef, useEffect, useRef, useState, useMemo } from "react";
import DOMPurify from "isomorphic-dompurify";
import { processDescription } from "utils/text-processing";
import type { TextareaProps } from "types/ui";
import { cn } from "@components/utils/cn";
import { FormField } from "../FormField";
import { Text } from "../Text";

/**
 * Class Variance Authority (CVA) configuration for textarea styling.
 * Provides variant and size combinations for consistent textarea appearance.
 *
 * @example
 * import { textareaVariants } from './Textarea';
 * const classes = textareaVariants({ variant: 'error', size: 'lg' });
 */
export const textareaVariants = cva(
  "resize-vertical block min-h-[300px] w-full rounded-xl border border-bColor bg-whiteCorp text-blackCorp shadow-sm transition placeholder:text-blackCorp/40 hover:border-blackCorp/40 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default: "",
        error: "border-error focus-visible:ring-error/20",
        success: "border-success focus-visible:ring-success/20",
      },
      size: {
        sm: "px-component-sm py-component-sm text-body-sm",
        md: "px-component-sm py-component-sm text-body-sm",
        lg: "px-component-md py-component-md text-body-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

/**
 * A rich textarea component with preview functionality, auto-expansion, and character counting.
 * Supports markdown-like text processing and integrates with FormField for consistent styling.
 *
 * @param id - The unique identifier for the textarea element.
 * @param label - The label text displayed above the textarea.
 * @param subtitle - Optional subtitle text displayed below the label.
 * @param error - Error message to display when validation fails.
 * @param required - Indicates if the field is required.
 * @param helperText - Optional helper text displayed below the textarea.
 * @param className - Additional CSS classes to apply.
 * @param value - The current value of the textarea.
 * @param onChange - Callback function called when the value changes.
 * @param rest - Other standard HTML textarea attributes.
 *
 * @example
 * // Basic textarea
 * <Textarea
 *   id="description"
 *   label="Event Description"
 *   value={description}
 *   onChange={(e) => setDescription(e.target.value)}
 * />
 *
 * @example
 * // Textarea with preview toggle
 * <Textarea
 *   id="bio"
 *   label="Biography"
 *   subtitle="Tell us about yourself"
 *   value={bio}
 *   onChange={(e) => setBio(e.target.value)}
 *   required
 * />
 *
 * @example
 * // Textarea with error state
 * <Textarea
 *   id="comments"
 *   label="Comments"
 *   error="Comments are required"
 *   helperText="Please provide your feedback"
 *   value={comments}
 *   onChange={(e) => setComments(e.target.value)}
 * />
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      id,
      label,
      subtitle,
      error,
      required,
      helperText,
      className,
      value,
      onChange,
      ...rest
    },
    ref,
  ) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [showPreview, setShowPreview] = useState(false);
    const characterCount = value?.length || 0;
    const maxLength = 1000;

    // Auto-expand textarea height based on content
    useEffect(() => {
      const textarea = textareaRef.current;
      if (textarea && !showPreview) {
        textarea.style.height = "auto";
        textarea.style.height = `${Math.max(300, textarea.scrollHeight)}px`;
      }
    }, [value, showPreview]);

    // Sanitize the processed description to prevent XSS attacks
    const sanitizedHtml = useMemo(
      () => DOMPurify.sanitize(processDescription(value || "")),
      [value],
    );

    return (
      <FormField
        id={id}
        label={
          <div className="flex items-center justify-between">
            <span>{label || "Descripció"}</span>
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="hover:text-primarydark focus:outline-none"
            >
              <Text variant="body-sm" color="primary">
                {showPreview ? "✏️ Editar" : "👁️ Previsualitzar"}
              </Text>
            </button>
          </div>
        }
        subtitle={subtitle}
        error={error}
        required={required}
        helperText={helperText}
      >
        {showPreview ? (
          <div className="min-h-[300px] w-full rounded-xl border border-bColor bg-whiteCorp p-component-sm">
            <div
              className="preview-content break-words"
              dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            />
            {!value && (
              <Text as="p" variant="caption" className="italic">
                Escriu alguna cosa per veure la previsualització...
              </Text>
            )}
            <style jsx>{`
              .preview-content :global(a) {
                color: #ff0037 !important;
                text-decoration: underline;
                font-weight: 500;
                transition: color 0.2s ease;
              }
              .preview-content :global(a:hover) {
                color: #cc002c !important;
                text-decoration: none;
              }
            `}</style>
          </div>
        ) : (
          <textarea
            ref={ref || textareaRef}
            id={id}
            name={id}
            value={value}
            onChange={onChange}
            className={cn(
              textareaVariants({ variant: error ? "error" : "default" }),
              "aria-invalid:border-error aria-invalid:ring-2 aria-invalid:ring-error/20",
              className,
            )}
            placeholder="Descriu el teu esdeveniment... Pots escriure enllaços directament i es convertiran automàticament."
            maxLength={maxLength}
            aria-describedby={
              error ? `${id}-error` : helperText ? `${id}-helper` : undefined
            }
            {...rest}
          />
        )}
        <div className="mt-component-xs flex items-center justify-between">
          <Text
            as="p"
            variant="body-sm"
            color="black"
            className="text-blackCorp/80"
          >
            {showPreview
              ? "Així és com veuran la descripció els visitants"
              : "Els enllaços es convertiran automàticament. Prem Enter per fer salts de línia."}
          </Text>
          <Text
            as="span"
            variant="body-sm"
            color="muted"
            className={
              characterCount > maxLength * 0.9 ? "text-orange-500" : ""
            }
          >
            {characterCount}/{maxLength}
          </Text>
        </div>
      </FormField>
    );
  },
);

Textarea.displayName = "Textarea";
