import EventsGridSkeleton from "@components/ui/common/skeletons/EventsGridSkeleton";

// Mirrors NewsList: city chips, the featured card, then the card grid.
export default function NewsListSkeleton() {
  return (
    <>
      <div className="flex gap-2 overflow-hidden" aria-hidden="true">
        {["w-16", "w-24", "w-20", "w-28", "w-14"].map((width) => (
          <div key={width} className={`h-7 ${width} shrink-0 bg-border/40 rounded-badge animate-pulse`} />
        ))}
      </div>
      <div className="flex flex-col gap-5">
        <div className="rounded-card overflow-hidden border border-border/20 flex flex-col md:flex-row">
          <div className="aspect-[3/2] md:w-1/2 md:shrink-0 bg-border/40 animate-pulse" />
          <div className="flex-1 flex flex-col gap-2 px-4 pt-3 pb-4 md:p-card-padding md:justify-center">
            <div className="w-1/3 h-3.5 bg-border/40 rounded animate-pulse" />
            <div className="w-full h-6 bg-border/40 rounded animate-pulse" />
            <div className="w-2/3 h-6 bg-border/40 rounded animate-pulse" />
            <div className="w-full h-4 bg-border/40 rounded animate-pulse" />
            <div className="w-1/2 h-3.5 bg-border/40 rounded animate-pulse" />
          </div>
        </div>
        <EventsGridSkeleton count={3} />
      </div>
    </>
  );
}
