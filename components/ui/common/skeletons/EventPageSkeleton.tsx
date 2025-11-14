export default function EventPageSkeleton() {
  return (
    <div className="w-full bg-background pb-10">
      <div className="container flex flex-col gap-section-y min-w-0">
        <article className="w-full flex flex-col gap-section-y">
          {/* Event Media Hero */}
          <div className="w-full flex flex-col">
            <div className="w-full h-64 md:h-96 bg-border/40 rounded animate-pulse" />
            {/* Share bar and view counter */}
            <div className="w-full flex justify-between items-center mt-element-gap-sm">
              <div className="w-40 h-8 bg-border/40 rounded animate-pulse" />
              <div className="w-16 h-6 bg-border/40 rounded animate-pulse ml-element-gap-sm" />
            </div>
          </div>

          {/* Event Header */}
          <div className="w-full flex flex-col gap-element-gap">
            <div className="h-10 bg-border/40 rounded w-3/4 heading-2 animate-pulse" />
            <div className="h-6 bg-border/40 rounded w-1/2 body-normal animate-pulse" />
          </div>

          {/* Event Calendar */}
          <div className="w-full h-32 bg-border/40 rounded animate-pulse" />

          {/* Event Description - reduced to 3 lines for faster FCP */}
          <div className="w-full flex flex-col gap-element-gap">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-4 bg-border/40 rounded w-full body-normal animate-pulse"
              />
            ))}
          </div>

          {/* Event Categories - reduced to 2 for faster FCP */}
          <div className="w-full flex flex-wrap gap-element-gap">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="h-8 bg-border/40 rounded-badge w-24 animate-pulse"
              />
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}

