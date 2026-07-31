import EventsGridSkeleton from "@components/ui/common/skeletons/EventsGridSkeleton";

export default function ProfileLoading() {
  return (
    <div
      className="container flex flex-col justify-center items-center pt-[6rem]"
      data-testid="profile-page-skeleton"
    >
      {/* Profile header skeleton — mirrors ProfileHeader's actual markup
          (no cover banner: there's no cover-image field to fill it) so
          swapping in the real content doesn't shift the layout. */}
      <div className="card-bordered rounded-lg overflow-hidden mb-section-y w-full">
        <div className="px-section-x py-element-gap relative">
          <div className="flex items-end gap-element-gap mb-element-gap">
            <div className="w-20 h-20 rounded-full bg-border/60 animate-pulse" />
          </div>
          <div className="h-8 bg-border/40 rounded w-1/3 animate-pulse mb-2" />
          <div className="h-4 bg-border/40 rounded w-1/4 animate-pulse mb-1" />
          <div className="h-4 bg-border/40 rounded w-2/3 animate-pulse mb-element-gap" />
          <div className="h-3 bg-border/40 rounded w-28 animate-pulse" />
        </div>
      </div>

      {/* Events list skeleton — same grid as List / the Suspense fallback in
          page.tsx, so swapping in real content doesn't reflow the layout. */}
      <div className="w-full mt-section-y">
        <EventsGridSkeleton count={3} />
      </div>
    </div>
  );
}
