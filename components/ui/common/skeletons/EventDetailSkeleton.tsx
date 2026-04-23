export default function EventDetailSkeleton() {
  return (
    <div
      className="w-full bg-background pb-10"
      aria-hidden="true"
    >
      <div className="container flex flex-col gap-section-y min-w-0">
        <article className="w-full flex flex-col gap-section-y">
          {/* Breadcrumb placeholder */}
          <div className="flex gap-2 px-section-x pt-4">
            <div className="h-4 bg-border/40 rounded w-16 animate-pulse" />
            <div className="h-4 bg-border/40 rounded w-20 animate-pulse" />
            <div className="h-4 bg-border/40 rounded w-24 animate-pulse" />
          </div>

          <div className="flex flex-col lg:flex-row lg:gap-8">
            {/* Main content column */}
            <div className="flex-1 min-w-0 flex flex-col gap-section-y-sm">
              {/* Hero image placeholder — matches EventMedia aspect */}
              <div className="w-full aspect-[16/9] bg-border/40 rounded animate-pulse" />

              {/* Share bar placeholder */}
              <div className="w-full flex justify-between items-center mt-element-gap-sm">
                <div className="flex gap-2">
                  <div className="h-8 w-8 bg-border/40 rounded-full animate-pulse" />
                  <div className="h-8 w-8 bg-border/40 rounded-full animate-pulse" />
                  <div className="h-8 w-8 bg-border/40 rounded-full animate-pulse" />
                </div>
                <div className="h-8 w-8 bg-border/40 rounded-full animate-pulse" />
              </div>

              {/* Title skeleton */}
              <div className="flex flex-col gap-2">
                <div className="h-8 bg-border/40 rounded w-3/4 animate-pulse" />
                <div className="h-8 bg-border/40 rounded w-1/2 animate-pulse" />
              </div>

              {/* Description skeleton */}
              <div className="space-y-2">
                <div className="h-4 bg-border/40 rounded w-full animate-pulse" />
                <div className="h-4 bg-border/40 rounded w-full animate-pulse" />
                <div className="h-4 bg-border/40 rounded w-5/6 animate-pulse" />
                <div className="h-4 bg-border/40 rounded w-2/3 animate-pulse" />
              </div>
            </div>

            {/* Sidebar placeholder (desktop only) */}
            <div className="hidden lg:block w-80 flex-shrink-0">
              <div className="sticky top-24 space-y-4">
                <div className="h-48 bg-border/40 rounded animate-pulse" />
                <div className="h-32 bg-border/40 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
