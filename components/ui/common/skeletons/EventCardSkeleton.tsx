export default function EventCardSkeleton() {
  return (
    <div className="w-full flex flex-col justify-center bg-background overflow-hidden">
      {/* Title bar with gradient line - simplified */}
      <div className="bg-background h-fit flex justify-start items-start gap-element-gap-sm pr-card-padding-sm">
        <div className="w-2 h-6 bg-border/40 animate-pulse" />
        <div className="h-6 bg-border/40 rounded flex-1 animate-pulse" />
        <div className="w-8 h-8 bg-border/40 rounded-full animate-pulse flex-shrink-0" />
      </div>
      {/* Image - largest element, critical for layout */}
      <div className="p-card-padding-sm">
        <div className="w-full h-64 bg-border/40 rounded animate-pulse" />
      </div>
      {/* Share and view counter - simplified */}
      <div className="w-full flex justify-between items-center px-card-padding-sm mb-element-gap-sm">
        <div className="w-20 h-4 bg-border/40 rounded animate-pulse" />
        <div className="w-16 h-4 bg-border/40 rounded animate-pulse" />
      </div>
      {/* Event details - simplified to 2 items for faster render */}
      <div className="w-full flex flex-col px-card-padding-sm gap-element-gap">
        <div className="h-4 bg-border/40 rounded w-3/4 animate-pulse" />
        <div className="h-4 bg-border/40 rounded w-2/3 animate-pulse" />
        <div className="mb-element-gap" />
      </div>
    </div>
  );
}

