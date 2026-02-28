import { JSX, memo } from "react";

function CardLoading(): JSX.Element {
  return (
    <div className="rounded-card overflow-hidden bg-background shadow-sm h-full flex flex-col">
      {/* Image — 3:2 aspect ratio */}
      <div className="aspect-[3/2] bg-muted animate-fast-pulse" />

      {/* Content */}
      <div className="px-3 pt-3 pb-3 flex-1 flex flex-col">
        {/* Date */}
        <div className="w-2/3 h-3.5 bg-border/40 rounded animate-fast-pulse mb-1.5" />
        {/* Title */}
        <div className="w-full h-4 bg-border/40 rounded animate-fast-pulse mb-1" />
        <div className="w-3/4 h-4 bg-border/40 rounded animate-fast-pulse mb-2" />
        {/* Location */}
        <div className="mt-auto flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 bg-border/40 rounded-full animate-fast-pulse flex-shrink-0" />
          <div className="w-1/2 h-3 bg-border/40 rounded animate-fast-pulse" />
        </div>
      </div>
    </div>
  );
}

export default memo(CardLoading);
