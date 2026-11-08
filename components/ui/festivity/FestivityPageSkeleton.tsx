import SitemapLayout from "@components/ui/sitemap/SitemapLayout";
import EventsGridSkeleton from "@components/ui/common/skeletons/EventsGridSkeleton";

/** loading.tsx of the festivity pages: they wait on connection() and the backend. */
export default function FestivityPageSkeleton() {
  return (
    <SitemapLayout>
      <div className="stack gap-2 items-center" aria-hidden="true">
        <div className="h-10 w-72 max-w-full bg-border/40 animate-pulse rounded" />
        <div className="h-6 w-56 max-w-full bg-border/40 animate-pulse rounded" />
      </div>
      <div className="w-full" aria-hidden="true">
        <EventsGridSkeleton count={6} />
      </div>
    </SitemapLayout>
  );
}
