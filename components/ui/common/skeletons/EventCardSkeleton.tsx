export default function EventCardSkeleton() {
  return (
    <div className="rounded-card overflow-hidden bg-background shadow h-full flex flex-col">
      <div className="aspect-[3/2] bg-border/40 animate-pulse" />
      <div className="px-4 pt-3 pb-4 flex-1 flex flex-col">
        {/* Category badge skeleton */}
        <div className="w-16 h-4 bg-border/40 rounded-badge animate-pulse mb-1" />
        {/* Date line skeleton */}
        <div className="w-2/3 h-3.5 bg-border/40 rounded animate-pulse mb-1" />
        {/* Title skeleton (min-h matches real card) */}
        <div className="min-h-[2.75rem] mb-1.5">
          <div className="w-full h-4 bg-border/40 rounded animate-pulse mb-1" />
          <div className="w-3/4 h-4 bg-border/40 rounded animate-pulse" />
        </div>
        {/* Location skeleton */}
        <div className="mt-auto w-1/2 h-3.5 bg-border/40 rounded animate-pulse" />
      </div>
    </div>
  );
}
