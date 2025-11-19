import EventCardSkeleton from "./EventCardSkeleton";

export default function HomePageSkeleton() {
  return (
    <>
      <div className="w-full bg-background overflow-hidden">
        <div className="container mt-element-gap">
          {/* SEO Content skeleton */}
          <h1 className="heading-1 mb-2">
            <div className="space-y-2">
              <div className="h-6 bg-border/40 rounded w-2/3 animate-pulse" />
              <div className="h-6 bg-border/40 rounded w-1/2 animate-pulse" />
            </div>
          </h1>
          <h2 className="heading-2 text-foreground text-left">
            <div className="space-y-2">
              <div className="h-5 bg-border/40 rounded w-3/4 animate-pulse" />
              <div className="h-5 bg-border/40 rounded w-2/3 animate-pulse" />
            </div>
          </h2>

          {/* Location Discovery Widget skeleton */}
          <div className="w-full h-16 bg-border/40 rounded animate-pulse my-element-gap" />
        </div>

        <div className="container">
          {/* Category sections skeleton - reduced to 2 for faster FCP */}
          {Array.from({ length: 2 }).map((_, categoryIndex) => (
            <div key={categoryIndex}>
              {/* Category header */}
              <div className="flex justify-between items-center">
                <h3 className="heading-3">
                  <div className="space-y-2">
                    <div className="h-5 bg-border/40 rounded w-64 animate-pulse" />
                    <div className="h-5 bg-border/40 rounded w-40 animate-pulse" />
                  </div>
                </h3>
                <div className="flex items-center gap-1">
                  <div className="h-5 bg-border/40 rounded w-16 animate-pulse" />
                  <div className="w-5 h-5 bg-border/40 rounded-full animate-pulse" />
                </div>
              </div>

              {/* Badge navigation skeleton */}
              <nav aria-label="Vegeu també" className="mt-element-gap-sm mb-element-gap-sm">
                <div className="flex gap-element-gap">
                  <div className="h-8 bg-border/40 rounded-badge w-20 animate-pulse" />
                  <div className="h-8 bg-border/40 rounded-badge w-32 animate-pulse" />
                </div>
              </nav>

              {/* Events horizontal scroll skeleton - reduced to 2 for faster FCP */}
              <div className="w-full flex overflow-x-auto py-element-gap px-section-x gap-element-gap min-w-0">
                {Array.from({ length: 2 }).map((_, eventIndex) => (
                  <div
                    key={eventIndex}
                    className="snap-start flex-none w-[85vw] min-w-[85vw] sm:w-96 sm:min-w-[24rem] flex flex-col bg-background overflow-hidden"
                  >
                    <EventCardSkeleton />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
