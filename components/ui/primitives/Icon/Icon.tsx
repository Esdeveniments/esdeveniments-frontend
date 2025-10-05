import { forwardRef } from "react";
import { cva } from "class-variance-authority";
import type { IconProps } from "types/ui";
import { cn } from "@components/utils/cn";

/**
 * Class Variance Authority (CVA) configuration for icon styling.
 * Provides size variants for consistent icon appearance.
 */
export const iconVariants = cva("", {
  variants: {
    size: {
      xs: "h-3 w-3",
      sm: "h-4 w-4",
      md: "h-5 w-5",
      lg: "h-6 w-6",
      xl: "h-8 w-8",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

/**
 * A flexible icon component that supports Heroicons and custom SVG icons.
 *
 * @param name - The icon name from Heroicons (e.g., 'XMarkIcon')
 * @param size - The size of the icon. Options: 'xs', 'sm', 'md', 'lg', 'xl'. Default: 'md'.
 * @param className - Additional CSS classes to apply.
 * @param rest - Other standard SVG attributes.
 *
 * @example
 * // Using Heroicon
 * <Icon name="XMarkIcon" />
 *
 * @example
 * // Custom size
 * <Icon name="CheckIcon" size="lg" />
 */
export const Icon = forwardRef<SVGSVGElement, IconProps>(
  ({ name, size, className, ...rest }, ref) => {
    // For now, assume Heroicons are imported dynamically or passed as children
    // In a real implementation, you'd have a map of icon names to components
    return (
      <svg
        ref={ref}
        className={cn(iconVariants({ size }), className)}
        {...rest}
      >
        {/* Placeholder - in practice, you'd render the actual icon */}
        <use href={`#${name}`} />
      </svg>
    );
  },
);

Icon.displayName = "Icon";
