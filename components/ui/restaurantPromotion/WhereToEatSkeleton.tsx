"use client";

import FireIcon from "@heroicons/react/outline/esm/FireIcon";
import { useTranslations } from "next-intl";
import type { WhereToEatSkeletonProps } from "types/ui/restaurant-promotion";

// Skeleton loader matching the final WhereToEatSection layout to avoid layout shift.
export default function WhereToEatSkeleton({
  items = 2,
  onPromoteClick,
}: WhereToEatSkeletonProps) {
  const t = useTranslations("Components.WhereToEatSection");
  const count = Number.isFinite(items)
    ? Math.min(Math.max(Math.floor(items), 1), 10)
    : 2;
  const skeletons = Array.from({ length: count });
  return (
    <section
      className="stack w-full min-w-0"
      aria-labelledby="where-to-eat-skel"
    >
      <div className="flex items-center justify-between gap-element-gap">
        <div className="flex items-center gap-element-gap">
          <FireIcon
            className="w-5 h-5 text-foreground-strong flex-shrink-0"
            aria-hidden="true"
          />
          <h2 id="where-to-eat-skel" className="heading-2">
            {t("title")}
          </h2>
        </div>
        {onPromoteClick && (
          <button
            type="button"
            onClick={onPromoteClick}
            className="text-xs font-medium text-primary underline focus:outline-none disabled:opacity-50"
            disabled
            aria-disabled="true"
          >
            {t("promote")}
          </button>
        )}
      </div>
      <div className="space-y-element-gap px-section-x" aria-busy="true">
        {skeletons.map((_, idx) => (
          <div
            key={idx}
            className="border border-border rounded-lg pr-4 py-4 pl-0 animate-pulse"
          >
            <div className="flex items-start gap-4">
              <div className="relative w-20 h-20 rounded-md overflow-hidden flex-shrink-0 bg-border/40 ml-4" />
              <div className="flex-1 min-w-0 flex flex-col gap-2">
                <div className="h-4 bg-border/40 rounded w-2/3" />
                <div className="h-3 bg-border/40 rounded w-1/2" />
                <div className="flex flex-wrap gap-2 mt-1">
                  <span className="h-3 bg-border/40 rounded w-16" />
                  <span className="h-3 bg-border/40 rounded w-10" />
                  <span className="h-3 bg-border/40 rounded w-12" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="text-xs text-foreground/70 pt-2 border-t border-border/30">
        &nbsp;
      </div>
    </section>
  );
}
