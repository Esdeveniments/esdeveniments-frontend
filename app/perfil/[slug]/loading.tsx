import EventCardSkeleton from "@components/ui/common/skeletons/EventCardSkeleton";

export default function ProfileLoading() {
  return (
    <div
      className="container flex-col justify-center items-center pt-[6rem]"
      data-testid="profile-page-skeleton"
    >
      {/* Profile header skeleton */}
      <div className="card-bordered rounded-lg overflow-hidden mb-section-y">
        <div className="h-40 sm:h-52 w-full bg-border/40 animate-pulse" />
        <div className="px-section-x py-element-gap -mt-10 relative">
          <div className="w-20 h-20 rounded-full bg-border/60 border-4 border-background animate-pulse mb-element-gap" />
          <div className="h-8 bg-border/40 rounded w-1/3 animate-pulse mb-2" />
          <div className="h-4 bg-border/40 rounded w-2/3 animate-pulse mb-element-gap" />
          <div className="flex gap-4">
            <div className="h-3 bg-border/40 rounded w-20 animate-pulse" />
            <div className="h-3 bg-border/40 rounded w-28 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Events list skeleton */}
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
