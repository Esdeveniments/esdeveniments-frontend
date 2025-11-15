import EventCardSkeleton from "./EventCardSkeleton";

export default function PlacePageSkeleton() {
  return (
    <div
      className="container flex-col justify-center items-center mt-element-gap"
      data-testid="events-list-skeleton"
    >
      {/* Page header skeleton - improved spacing like HomePageSkeleton */}
      <div className="px-section-x mt-element-gap md:flex md:items-start md:justify-between gap-element-gap">
        <div className="h-10 bg-border/40 rounded w-2/3 animate-pulse" />
        <div className="h-8 bg-border/40 rounded w-24 animate-pulse hidden md:block" />
      </div>
      {/* Subtitle with better spacing - matches HomePageSkeleton h2 spacing */}
      <div className="h-5 bg-border/40 rounded w-3/4 mb-element-gap px-section-x animate-pulse mt-2" />

      {/* Event cards skeleton - matches List component structure (flex-col) */}
      {/* Reduced to 3 items for faster FCP */}
      <section className="flex flex-col justify-center items-center">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="w-full mb-element-gap">
            <EventCardSkeleton />
          </div>
        ))}
      </section>
    </div>
  );
}

