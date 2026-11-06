import EventsGridSkeleton from "@components/ui/common/skeletons/EventsGridSkeleton";

// Mirrors NewsArticleDetail: breadcrumbs, header, then the events grid.
export default function NewsArticleSkeleton() {
  return (
    <div className="w-full bg-background pb-section-y" aria-hidden="true">
      <div className="container-article flex flex-col gap-section-y min-w-0">
        <div className="pt-4">
          <div className="h-4 w-64 bg-border/40 animate-pulse rounded" />
        </div>
        <div className="stack">
          <div className="h-5 w-24 bg-border/40 animate-pulse rounded-badge" />
          <div className="h-8 w-full bg-border/40 animate-pulse rounded" />
          <div className="h-8 w-2/3 bg-border/40 animate-pulse rounded" />
          <div className="h-4 w-1/2 bg-border/40 animate-pulse rounded" />
          <div className="h-5 w-full bg-border/40 animate-pulse rounded" />
          <div className="h-5 w-3/4 bg-border/40 animate-pulse rounded" />
        </div>
        <div className="stack">
          <div className="h-7 w-48 bg-border/40 animate-pulse rounded" />
          <EventsGridSkeleton count={3} />
        </div>
      </div>
    </div>
  );
}
