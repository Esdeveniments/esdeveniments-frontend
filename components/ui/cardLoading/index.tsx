import { JSX, memo } from "react";

function CardLoading(): JSX.Element {
  return (
    <div className="rounded-card overflow-hidden bg-background shadow-sm h-full flex flex-col">
      {/* Image placeholder — 2:1 aspect ratio */}
      <div className="aspect-[2/1] bg-muted animate-fast-pulse" />

      {/* Content */}
      <div className="p-card-padding-sm flex-1 flex flex-col">
        {/* Title */}
        <div className="w-3/4 h-5 bg-border/40 rounded animate-fast-pulse mb-2" />
        <div className="w-1/2 h-5 bg-border/40 rounded animate-fast-pulse mb-3" />

        {/* Metadata */}
        <div className="mt-auto flex flex-col gap-1.5">
          <div className="w-2/3 h-3.5 bg-border/40 rounded animate-fast-pulse" />
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 bg-border/40 rounded-full animate-fast-pulse flex-shrink-0" />
            <div className="w-1/2 h-3.5 bg-border/40 rounded animate-fast-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(CardLoading);
