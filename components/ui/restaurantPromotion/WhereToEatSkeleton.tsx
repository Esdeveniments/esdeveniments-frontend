import { FireIcon } from "@heroicons/react/outline";
import type { WhereToEatSkeletonProps } from "types/ui/restaurant-promotion";

// Skeleton loader matching the final WhereToEatSection layout to avoid layout shift.
export default function WhereToEatSkeleton({
  items = 2,
  onPromoteClick,
}: WhereToEatSkeletonProps) {
  const count = Number.isFinite(items)
    ? Math.min(Math.max(Math.floor(items), 1), 10)
    : 2;
  const skeletons = Array.from({ length: count });
  return (
    <>
      <FireIcon className="w-5 h-5 mt-1" aria-hidden="true" />
      <section
        className="w-11/12 flex flex-col gap-4"
        aria-labelledby="where-to-eat-skel"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 id="where-to-eat-skel" className="flex-1">
            On pots menjar
          </h2>
          {onPromoteClick && (
            <button
              type="button"
              onClick={onPromoteClick}
              className="text-xs font-medium text-primary underline focus:outline-none disabled:opacity-50"
              disabled
              aria-disabled="true"
            >
              Promociona
            </button>
          )}
        </div>
        <div className="space-y-3" aria-busy="true">
          {skeletons.map((_, idx) => (
            <div
              key={idx}
              className="border border-gray-200 rounded-lg pr-4 py-4 pl-0 animate-pulse"
            >
              <div className="flex items-start gap-4">
                <div className="relative w-20 h-20 rounded-md overflow-hidden flex-shrink-0 bg-gray-200 ml-4" />
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="flex flex-wrap gap-2 mt-1">
                    <span className="h-3 bg-gray-200 rounded w-16" />
                    <span className="h-3 bg-gray-200 rounded w-10" />
                    <span className="h-3 bg-gray-200 rounded w-12" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="text-xs text-gray-400 border-t border-gray-100 pt-2">
          &nbsp;
        </div>
      </section>
    </>
  );
}
