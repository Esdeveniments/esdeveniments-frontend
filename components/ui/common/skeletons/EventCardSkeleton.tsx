export default function EventCardSkeleton() {
  return (
    <div className="card-bordered overflow-hidden">
      {/* Image placeholder — 16:9 aspect ratio */}
      <div className="aspect-[16/9] bg-border/40 animate-pulse" />

      {/* Content */}
      <div className="p-card-padding-sm md:p-card-padding">
        {/* Title with accent bar */}
        <div className="flex items-start gap-2 mb-element-gap-sm">
          <div className="w-1 h-5 bg-border/40 rounded-full flex-shrink-0 animate-pulse" />
          <div className="h-5 bg-border/40 rounded flex-1 animate-pulse" />
        </div>

        {/* Metadata lines */}
        <div className="flex flex-col gap-1.5">
          <div className="h-3.5 bg-border/40 rounded w-3/4 animate-pulse" />
          <div className="h-3.5 bg-border/40 rounded w-2/3 animate-pulse" />
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center mt-element-gap-sm pt-element-gap-sm border-t border-border/30">
          <div className="w-20 h-4 bg-border/40 rounded animate-pulse" />
          <div className="w-16 h-4 bg-border/40 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}
