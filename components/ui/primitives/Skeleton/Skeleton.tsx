import React, { forwardRef } from "react";
import { cva } from "class-variance-authority";
import type { SkeletonProps } from "types/ui";
import { cn } from "@components/utils/cn";
import { FireIcon } from "@heroicons/react/outline";
import { Text } from "@components/ui/primitives";

/**
 * Class Variance Authority (CVA) configuration for skeleton styling.
 * Provides variant combinations for consistent skeleton appearance.
 *
 * @example
 * import { skeletonVariants } from './Skeleton';
 * const classes = skeletonVariants({ variant: 'text' });
 */
export const skeletonVariants = cva("animate-fast-pulse bg-darkCorp", {
  variants: {
    variant: {
      text: "rounded",
      avatar: "rounded-full",
      card: "", // Handled as complex variant
      "card-horizontal": "", // Handled as complex variant
      "card-compact": "", // Handled as complex variant
      restaurant: "", // Handled as complex variant
      share: "", // Handled as complex variant
      image: "", // Handled as complex variant
    },
  },
  defaultVariants: {
    variant: "text",
  },
});

/**
 * A skeleton component for loading states with multiple variants.
 *
 * @param variant - The visual style of the skeleton. Options include basic shapes and complex layouts.
 * @param className - Additional CSS classes to apply.
 * @param rest - Other standard HTML attributes and variant-specific props.
 *
 * @example
 * // Basic text skeleton
 * <Skeleton />
 *
 * @example
 * // Card skeleton
 * <Skeleton variant="card" className="h-32 w-full" />
 *
 * @example
 * // Avatar skeleton
 * <Skeleton variant="avatar" className="h-10 w-10" />
 *
 * @example
 * // Complex card layout
 * <Skeleton variant="card-horizontal" />
 */
export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant = "text", ...rest }, ref) => {
    // Handle complex variants with specific layouts
    if (variant === "card") {
      return (
        <div
          ref={ref}
          className={cn(
            "mb-2xl flex cursor-pointer flex-col justify-center overflow-hidden bg-whiteCorp",
            className,
          )}
        >
          {/* Title */}
          <div className="flex h-fit items-center justify-between gap-component-xs bg-whiteCorp pr-component-md">
            <div className="m-xs flex items-center justify-start gap-xs pt-[2px]">
              <div className="h-6 w-2 bg-gradient-to-r from-primary to-primarydark"></div>
            </div>
            {/* Title */}
            <div className="flex w-9/12 animate-fast-pulse items-center justify-start">
              <div className="h-5 w-2/3 rounded-xl bg-darkCorp"></div>
            </div>
            {/* WeatherIcon */}
            <div className="flex w-2/12 animate-fast-pulse justify-center">
              <div className="h-4 w-4 rounded-xl bg-darkCorp opacity-50"></div>
            </div>
          </div>
          {/* ImageEvent */}
          <div className="flex items-center justify-center p-component-xs">
            <div className="m-component-xs h-60 w-full animate-fast-pulse bg-darkCorp"></div>
          </div>
          {/* Info */}
          {/* InfoEvent */}
          <div className="flex flex-col gap-component-md bg-whiteCorp px-component-xs pt-component-md">
            {/* Date */}
            <div className="h-5 w-2/3 animate-fast-pulse rounded-xl bg-darkCorp pl-xs"></div>
            {/* Location */}
            <div className="flex h-full w-full animate-fast-pulse items-start">
              <div className="h-4 w-4 rounded-xl bg-darkCorp"></div>
              <div className="flex h-full w-full flex-col items-start justify-center gap-component-xs px-component-xs">
                <div className="my-xs h-3 w-2/3 rounded-xl bg-darkCorp"></div>
                <div className="my-xs h-3 w-2/3 rounded-xl bg-darkCorp"></div>
              </div>
            </div>
            {/* hour */}
            <div className="flex h-full w-full animate-fast-pulse items-start">
              <div className="h-4 w-4 rounded-xl bg-darkCorp"></div>
              <div className="flex h-full w-full flex-col items-start justify-center gap-component-xs px-component-xs">
                <div className="my-xs h-3 w-2/3 rounded-xl bg-darkCorp"></div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (variant === "card-horizontal") {
      return (
        <div
          ref={ref}
          className={cn(
            "flex w-96 min-w-[24rem] flex-none cursor-pointer flex-col overflow-hidden bg-whiteCorp",
            className,
          )}
        >
          {/* Image Placeholder */}
          <div className="flex h-64 w-full animate-fast-pulse items-center justify-center overflow-hidden">
            <div className="h-full w-full bg-darkCorp"></div>
          </div>
          {/* Title Placeholder */}
          <div className="p-component-xs pt-component-md">
            <div className="h-5 w-2/3 animate-fast-pulse rounded-xl bg-darkCorp"></div>
          </div>
          {/* Location Placeholder */}
          <div className="p-component-xs">
            <div className="flex h-full w-full animate-fast-pulse items-start">
              <div className="h-4 w-4 rounded-xl bg-darkCorp"></div>
              <div className="flex h-full w-full flex-col items-start justify-center gap-component-xs px-component-xs">
                <div className="my-xs h-3 w-2/3 rounded-xl bg-darkCorp"></div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (variant === "card-compact") {
      return (
        <div
          ref={ref}
          className={cn(
            "flex w-40 min-w-[10rem] flex-none cursor-pointer flex-col overflow-hidden bg-whiteCorp",
            className,
          )}
        >
          {/* Image Placeholder */}
          <div className="flex h-32 w-full animate-fast-pulse items-center justify-center overflow-hidden">
            <div className="h-full w-full bg-darkCorp"></div>
          </div>
          {/* Title Placeholder */}
          <div className="p-component-xs pt-component-md">
            <div className="h-5 w-2/3 animate-fast-pulse rounded-xl bg-darkCorp"></div>
          </div>
          {/* Location Placeholder */}
          <div className="p-component-xs">
            <div className="flex h-full w-full animate-fast-pulse items-start">
              <div className="h-4 w-4 rounded-xl bg-darkCorp"></div>
              <div className="flex h-full w-full flex-col items-start justify-center gap-component-xs px-component-xs">
                <div className="my-xs h-3 w-2/3 rounded-xl bg-darkCorp"></div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (variant === "restaurant") {
      const { items = 2, onPromoteClick } = rest as any;
      const count = Number.isFinite(items)
        ? Math.min(Math.max(Math.floor(items), 1), 10)
        : 2;
      const skeletons = Array.from({ length: count });
      return (
        <>
          <FireIcon className="mt-component-xs h-5 w-5" aria-hidden="true" />
          <section
            className="flex w-11/12 flex-col gap-component-md"
            aria-labelledby="where-to-eat-skel"
          >
            <div className="flex items-center justify-between gap-component-xs">
              <Text
                as="h2"
                id="where-to-eat-skel"
                className="flex-1"
                variant="h2"
              >
                On pots menjar
              </Text>
              {onPromoteClick && (
                <button
                  type="button"
                  onClick={onPromoteClick}
                  className="underline focus:outline-none disabled:opacity-50"
                  disabled
                  aria-disabled="true"
                >
                  <Text size="xs" color="primary" className="font-medium">
                    Promociona
                  </Text>
                </button>
              )}
            </div>
            <div className="space-y-3" aria-busy="true">
              {skeletons.map((_, idx) => (
                <div
                  key={idx}
                  className="animate-pulse rounded-lg border border-bColor/50 py-component-md pl-xs pr-component-md"
                >
                  <div className="flex items-start gap-component-md">
                    <div className="relative ml-component-md h-20 w-20 flex-shrink-0 overflow-hidden rounded-md bg-darkCorp/80" />
                    <div className="flex min-w-0 flex-1 flex-col gap-component-xs">
                      <div className="h-4 w-2/3 rounded bg-darkCorp/80" />
                      <div className="h-3 w-1/2 rounded bg-darkCorp/80" />
                      <div className="mt-component-xs flex flex-wrap gap-component-xs">
                        <span className="h-3 w-16 rounded bg-darkCorp/80" />
                        <span className="h-3 w-10 rounded bg-darkCorp/80" />
                        <span className="h-3 w-12 rounded bg-darkCorp/80" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Text
              className="border-t border-bColor/50 pt-component-xs"
              size="xs"
              color="muted"
            >
              &nbsp;
            </Text>
          </section>
        </>
      );
    }

    if (variant === "share") {
      const { count = 4 } = rest as any;
      return (
        <div
          ref={ref}
          className={cn(
            "flex h-8 w-[172px] items-center gap-component-md",
            className,
          )}
          aria-hidden="true"
        >
          {Array.from({ length: count }).map((_, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <div
              key={i}
              className="h-2 w-2 animate-fast-pulse rounded-full bg-bColor dark:bg-blackCorp/30"
            />
          ))}
        </div>
      );
    }

    if (variant === "image") {
      const { width = "w-full", height = "h-60" } = rest as any;
      return (
        <div
          ref={ref}
          className={cn(
            `${width} ${height} animate-fast-pulse bg-darkCorp`,
            className,
          )}
        />
      );
    }

    // Handle basic variants with CVA
    return (
      <div
        ref={ref}
        className={cn(skeletonVariants({ variant }), className)}
        {...rest}
      />
    );
  },
);

Skeleton.displayName = "Skeleton";
