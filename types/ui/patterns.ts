import type { ReactNode } from "react";
import type { ButtonProps } from "./primitives";
import type { CardVariant, SizeToken } from "./variants";

/**
 * Types for composed components (molecules/organisms) built from primitives.
 */

export interface CompoundComponentProps {
  /**
   * Optional CSS utility classes appended to the root element.
   */
  className?: string;
  children?: ReactNode;
}

export interface CardProps extends CompoundComponentProps {
  /**
   * Visual variation controlling layout and density.
   */
  variant?: CardVariant;
  /**
   * Optional header/footer slots.
   */
  header?: ReactNode;
  footer?: ReactNode;
  /**
   * When true, renders skeleton placeholders instead of real content.
   */
  isLoading?: boolean;
}

export interface ModalProps extends CompoundComponentProps {
  /**
   * Controls visibility. Passed down from parent state.
   */
  open: boolean;
  /**
   * Callback invoked when the modal requests to close (overlay click, ESC, etc.).
   */
  onOpenChange: (nextOpen: boolean) => void;
  /**
   * Title displayed in the modal header for accessibility.
   */
  title?: ReactNode;
  /**
   * Optional primary action button rendered in the footer.
   */
  primaryAction?: ButtonProps;
  /**
   * Optional secondary action button rendered alongside the primary action.
   */
  secondaryAction?: ButtonProps;
  /**
   * Controls modal width; leverage Tailwind max-width tokens.
   */
  size?: SizeToken;
  /**
   * Initial focus element ref for accessibility
   */
  initialFocus?: React.RefObject<HTMLElement>;
}

export interface ModalHeaderProps {
  /**
   * Modal title text or React node
   */
  title?: ReactNode;
  /**
   * Callback when close button is clicked
   */
  onClose?: () => void;
  /**
   * Whether to show the close button
   */
  showCloseButton?: boolean;
  className?: string;
}

export interface ModalBodyProps {
  className?: string;
  children: ReactNode;
}

export interface ModalFooterProps {
  className?: string;
  children?: ReactNode;
}

export interface ListProps<T> extends CompoundComponentProps {
  /**
   * Data items rendered by the list.
   */
  items: readonly T[];
  /**
   * Render function returning React nodes for each item.
   */
  renderItem: (item: T, index: number) => ReactNode;
  /**
   * Optional placeholder when `items` is empty.
   */
  renderEmpty?: () => ReactNode;
  /**
   * Renders skeleton rows while data loads.
   */
  isLoading?: boolean;
}

export interface FormFieldProps extends CompoundComponentProps {
  /**
   * Unique identifier for the form field, used for accessibility.
   */
  id?: string;
  /**
   * Indicates if the field is required, shows a visual indicator.
   */
  required?: boolean;
  /**
   * Size variant for consistent spacing and typography.
   */
  size?: "sm" | "md" | "lg";
  /**
   * Label text for the form field.
   */
  label?: ReactNode;
  /**
   * Optional subtitle text.
   */
  subtitle?: string;
  /**
   * Error message to display.
   */
  error?: string;
  /**
   * Helper text to display below the field.
   */
  helperText?: ReactNode;
}

export interface FormFieldLabelProps {
  /**
   * The label text or React node.
   */
  children: ReactNode;
  /**
   * Associates the label with a form control ID.
   */
  htmlFor?: string;
  /**
   * Additional CSS classes.
   */
  className?: string;
}

export interface FormFieldInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  /**
   * Error state styling.
   */
  hasError?: boolean;
}

export interface FormFieldTextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "children"> {
  /**
   * Error state styling.
   */
  hasError?: boolean;
}

export interface FormFieldSelectProps {
  /**
   * Unique identifier for the select field.
   */
  id?: string;
  /**
   * Current selected value.
   */
  value?: import("types/common").Option | null;
  /**
   * Callback when selection changes.
   */
  onChange: (value: import("types/common").Option | null) => void;
  /**
   * Available options to select from.
   */
  options?:
    | import("types/common").Option[]
    | import("types/common").GroupedOption[];
  /**
   * Whether the field is disabled.
   */
  isDisabled?: boolean;
  /**
   * Whether new options can be created.
   */
  isCreatable?: boolean;
  /**
   * Whether the selection can be cleared.
   */
  isClearable?: boolean;
  /**
   * Placeholder text when no option is selected.
   */
  placeholder?: string;
  /**
   * Error state styling.
   */
  hasError?: boolean;
}

export interface FormFieldErrorProps {
  /**
   * Error message to display.
   */
  children: ReactNode;
  /**
   * ID for accessibility association.
   */
  id?: string;
  /**
   * Additional CSS classes.
   */
  className?: string;
}

export interface FormFieldHelperTextProps {
  /**
   * Helper text content.
   */
  children: ReactNode;
  /**
   * ID for accessibility association.
   */
  id?: string;
  /**
   * Additional CSS classes.
   */
  className?: string;
}
