import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  DetailedHTMLProps,
  HTMLAttributes,
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";
import type { VariantProps } from "class-variance-authority";

/**
 * Shared prop contracts for primitive (atom) components.
 *
 * Primitives should model HTML semantics closely and expose
 * lightweight abstractions on top of native elements.
 */

export interface BasePrimitiveProps<T extends HTMLElement = HTMLElement>
  extends DetailedHTMLProps<HTMLAttributes<T>, T> {
  /**
   * Additional CSS utility classes appended to the component root.
   * Always merged using the `cn` helper to avoid Tailwind conflicts.
   */
  className?: string;
  /**
   * Optional slot for overriding component content.
   */
  children?: ReactNode;
}

export interface ButtonProps
  extends DetailedHTMLProps<
      ButtonHTMLAttributes<HTMLButtonElement>,
      HTMLButtonElement
    >,
    VariantProps<
      typeof import("@components/ui/primitives/button/Button").buttonVariants
    > {
  hasIcon?: boolean;
  isLoading?: boolean;
}

export interface AnchorProps
  extends DetailedHTMLProps<
    AnchorHTMLAttributes<HTMLAnchorElement>,
    HTMLAnchorElement
  > {
  /**
   * Target describing the link destination semantics (internal, external, CTA, etc.).
   */
  intent?: "primary" | "secondary" | "ghost";
}

export interface LinkProps
  extends Omit<
      DetailedHTMLProps<
        AnchorHTMLAttributes<HTMLAnchorElement>,
        HTMLAnchorElement
      >,
      "href"
    >,
    VariantProps<
      typeof import("@components/ui/primitives/Link/Link").linkVariants
    > {
  /**
   * The URL to link to. Supports both internal routes and external URLs.
   */
  href?: string;
  /**
   * Alternative URL property for backward compatibility.
   */
  url?: string;
  /**
   * CSS class to apply when the link is active (current page).
   */
  activeLinkClass?: string;
  /**
   * Whether to disable prefetching for this link.
   */
  prefetch?: boolean;
}

export interface InputProps
  extends Omit<
      DetailedHTMLProps<
        InputHTMLAttributes<HTMLInputElement>,
        HTMLInputElement
      >,
      "size"
    >,
    VariantProps<
      typeof import("@components/ui/primitives/Input/Input").inputVariants
    > {
  /**
   * Optional label text rendered by the shared Field wrapper.
   */
  label?: string;
  /**
   * Optional subtitle text.
   */
  subtitle?: string;
  /**
   * Error message to display.
   */
  error?: string;
  /**
   * Whether the field is required.
   */
  required?: boolean;
  /**
   * Displays helper or validation feedback beneath the field.
   */
  helperText?: ReactNode;
}

export interface TextareaProps
  extends Omit<
      DetailedHTMLProps<
        TextareaHTMLAttributes<HTMLTextAreaElement>,
        HTMLTextAreaElement
      >,
      "value"
    >,
    VariantProps<
      typeof import("@components/ui/primitives/Textarea/Textarea").textareaVariants
    > {
  label?: string;
  subtitle?: string;
  error?: string;
  required?: boolean;
  helperText?: ReactNode;
  value?: string;
}

export interface SelectProps {
  id: string;
  label?: string;
  subtitle?: string;
  error?: string;
  required?: boolean;
  helperText?: ReactNode;
  value?: import("types/common").Option | null;
  onChange: (value: import("types/common").Option | null) => void;
  options?:
    | import("types/common").Option[]
    | import("types/common").GroupedOption[];
  isDisabled?: boolean;
  isValidNewOption?: boolean;
  isClearable?: boolean;
  placeholder?: string;
}

export interface MultiSelectProps {
  id: string;
  label?: string;
  subtitle?: string;
  error?: string;
  required?: boolean;
  value?: import("types/common").Option[];
  onChange: (values: import("types/common").Option[]) => void;
  options?: import("types/common").Option[];
  isDisabled?: boolean;
  placeholder?: string;
  isLoading?: boolean;
  className?: string;
}

export interface ImageUploadProps {
  value?: string | null;
  onUpload: (file: File) => void;
  progress?: number;
  className?: string;
  accept?: string;
  maxSize?: number;
  disabled?: boolean;
}

export interface LabelProps
  extends DetailedHTMLProps<
    LabelHTMLAttributes<HTMLLabelElement>,
    HTMLLabelElement
  > {
  /**
   * Associates the label with an accessible element ID.
   */
  htmlFor: string;
}

export interface TextProps
  extends Omit<
      DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>,
      "color"
    >,
    VariantProps<
      typeof import("@components/ui/primitives/Text/Text").textVariants
    > {
  /**
   * The HTML element to render. Defaults to "span" for backward compatibility.
   * Use semantic elements like "h1", "h2", "h3", "p" for proper typography hierarchy.
   * "div" is also supported for cases requiring a generic container element.
   */
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span" | "a" | "div";
  /**
   * Anchor-specific props when as="a"
   */
  href?: string;
  target?: string;
  rel?: string;
}

export interface BadgeProps
  extends DetailedHTMLProps<HTMLAttributes<HTMLSpanElement>, HTMLSpanElement>,
    VariantProps<
      typeof import("@components/ui/primitives/Badge/Badge").badgeVariants
    > {
  /**
   * Optional link URL to make the badge clickable.
   */
  href?: string;
  /**
   * Optional click handler for interactive badges.
   */
  onClick?: () => void;
  /**
   * Optional aria-label for accessibility.
   */
  ariaLabel?: string;
}

export interface DatePickerProps {
  idPrefix?: string;
  label?: string;
  subtitle?: string;
  error?: string;
  required?: boolean;
  helperText?: ReactNode;
  startDate: string; // "YYYY-MM-DD" or ISO string
  endDate: string; // "YYYY-MM-DD" or ISO string
  minDate?: string; // "YYYY-MM-DD" or ISO string
  onChange: (field: "startDate" | "endDate", value: string) => void;
  className?: string;
}

export interface SkeletonProps
  extends DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>,
    VariantProps<
      typeof import("@components/ui/primitives/Skeleton/Skeleton").skeletonVariants
    > {
  /**
   * For restaurant variant: number of skeleton items to display
   */
  items?: number;
  /**
   * For restaurant variant: callback when promote button is clicked
   */
  onPromoteClick?: () => void;
  /**
   * For share variant: number of dots to display
   */
  count?: number;
  /**
   * For image variant: width class
   */
  width?: string;
  /**
   * For image variant: height class
   */
  height?: string;
}

export interface IconProps
  extends Omit<
      DetailedHTMLProps<React.SVGProps<SVGSVGElement>, SVGSVGElement>,
      "size"
    >,
    VariantProps<
      typeof import("@components/ui/primitives/Icon/Icon").iconVariants
    > {
  /**
   * The icon name (for Heroicons or custom icons)
   */
  name?: string;
}

export interface ImageProps
  extends Omit<
    DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>,
    "title"
  > {
  /**
   * The title or name for the image content.
   */
  title: string;
  /**
   * Optional image URL to display.
   */
  image?: string;
  /**
   * Alternative text for accessibility.
   */
  alt?: string;
  /**
   * Whether this image should be prioritized for loading.
   */
  priority?: boolean;
  /**
   * Image quality setting (1-100).
   */
  quality?: number;
  /**
   * Location information for fallback display.
   */
  location?: string;
  /**
   * Region information for fallback display.
   */
  region?: string;
  /**
   * Date information for fallback display.
   */
  date?: string;
  /**
   * Context for responsive image sizing optimization.
   */
  context?: "card" | "hero" | "list" | "detail";
}

export type RadioInputValue = string | number;
export interface RadioInputProps {
  /**
   * Unique identifier for the radio input.
   */
  id: string;
  /**
   * Name attribute for grouping radio inputs.
   */
  name: string;
  /**
   * Value of this radio input option.
   */
  value: RadioInputValue;
  /**
   * Currently selected value in the radio group.
   */
  checkedValue: RadioInputValue;
  /**
   * Callback when this radio input is selected.
   */
  onChange: (value: RadioInputValue) => void;
  /**
   * Label text for the radio input.
   */
  label: string;
  /**
   * Whether the radio input is disabled.
   */
  disabled?: boolean;
  /**
   * Error message to display.
   */
  error?: string;
  /**
   * Whether the field is required.
   */
  required?: boolean;
  /**
   * Additional CSS classes.
   */
  className?: string;
}

export type RangeInputValue = string | number;
export interface RangeInputProps {
  /**
   * Unique identifier for the range input.
   */
  id: string;
  /**
   * Label text for the range input.
   */
  label?: string;
  /**
   * Subtitle text for additional context.
   */
  subtitle?: string;
  /**
   * Error message to display.
   */
  error?: string;
  /**
   * Whether the field is required.
   */
  required?: boolean;
  /**
   * Minimum value for the range.
   */
  min: number;
  /**
   * Maximum value for the range.
   */
  max: number;
  /**
   * Current value of the range input.
   */
  value: number;
  /**
   * Callback when the range value changes.
   */
  onChange: (
    event:
      | React.ChangeEvent<HTMLInputElement>
      | { target: { value: RangeInputValue } },
  ) => void;
  /**
   * Whether the range input is disabled.
   */
  disabled?: boolean;
  /**
   * Additional CSS classes.
   */
  className?: string;
}

export interface ModalProps {
  /**
   * Whether the modal is open.
   */
  open: boolean;
  /**
   * Callback when the modal should be closed.
   */
  onClose: () => void;
  /**
   * Optional title for the modal.
   */
  title?: string;
  /**
   * Content to display inside the modal.
   */
  children: ReactNode;
  /**
   * Additional CSS classes.
   */
  className?: string;
}
