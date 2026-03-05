export default function NewsListSkeleton() {
  return (
    <section className="px-2 lg:px-0">
      {/* Hero card skeleton */}
      <div className="mb-6">
        <NewsCardSkeleton />
      </div>
      {/* Grid skeletons */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-element-gap">
        {[1, 2, 3].map((i) => (
          <div key={i} className="w-full">
            <NewsCardSkeleton />
          </div>
        ))}
      </div>
    </section>
  );
}

function NewsCardSkeleton() {
  return (
    <div className="rounded-card overflow-hidden bg-background border border-border/20">
      {/* 3:2 image placeholder (matches NewsCard aspect-[3/2]) */}
      <div className="aspect-[3/2] w-full bg-muted animate-pulse" />
      <div className="p-4 sm:p-6">
        {/* Title (matches h3 with 2 lines) */}
        <div className="mb-4">
          <div className="h-5 w-full bg-muted animate-pulse rounded mb-2" />
          <div className="h-5 w-3/4 bg-muted animate-pulse rounded" />
        </div>
        {/* Badge row: date + location (matches badge-default) */}
        <div className="mb-4 flex items-center gap-2">
          <div className="h-6 w-32 bg-muted animate-pulse rounded-badge" />
          <div className="h-6 w-28 bg-muted animate-pulse rounded-badge" />
        </div>
        {/* Description (3 lines, matches line-clamp-3) */}
        <div className="space-y-2 mb-5">
          <div className="h-3.5 w-full bg-muted animate-pulse rounded" />
          <div className="h-3.5 w-full bg-muted animate-pulse rounded" />
          <div className="h-3.5 w-2/3 bg-muted animate-pulse rounded" />
        </div>
        {/* Read More button */}
        <div className="h-8 w-24 bg-muted animate-pulse rounded-button" />
      </div>
    </div>
  );
}
