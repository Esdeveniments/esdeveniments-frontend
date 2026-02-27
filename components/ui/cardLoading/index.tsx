import { JSX, memo } from "react";

function CardLoading(): JSX.Element {
  return (
    <div className="card-bordered overflow-hidden">
      {/* Image placeholder — 16:9 aspect ratio */}
      <div className="aspect-[16/9] bg-muted animate-fast-pulse" />

      {/* Content */}
      <div className="p-card-padding-sm md:p-card-padding">
        {/* Title with accent bar */}
        <div className="flex items-start gap-2 mb-element-gap-sm">
          <div className="w-1 h-5 bg-border/40 rounded-full flex-shrink-0" />
          <div className="w-2/3 h-5 bg-border/40 rounded animate-fast-pulse" />
        </div>

        {/* Metadata lines */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-border/40 rounded animate-fast-pulse flex-shrink-0" />
            <div className="w-3/4 h-3.5 bg-border/40 rounded animate-fast-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-border/40 rounded animate-fast-pulse flex-shrink-0" />
            <div className="w-1/2 h-3.5 bg-border/40 rounded animate-fast-pulse" />
          </div>
        </div>

        {/* Footer separator */}
        <div className="flex justify-between items-center mt-element-gap-sm pt-element-gap-sm border-t border-border/30">
          <div className="w-24 h-4 bg-border/40 rounded animate-fast-pulse" />
          <div className="w-12 h-4 bg-border/40 rounded animate-fast-pulse" />
        </div>
      </div>
    </div>
  );
}

export default memo(CardLoading);
