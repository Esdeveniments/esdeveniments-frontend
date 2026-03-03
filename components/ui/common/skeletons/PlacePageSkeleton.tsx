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

      {/* Event cards skeleton - matches List component grid (grid-cols-1 md:2 xl:3) */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i}>
            <EventCardSkeleton />
          </div>
        ))}
      </section>
    </div>
  );
}
