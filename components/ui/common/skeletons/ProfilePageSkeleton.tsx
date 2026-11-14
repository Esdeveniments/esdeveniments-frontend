import EventsGridSkeleton from "./EventsGridSkeleton";

const BLOCK = "bg-border/40 animate-pulse";

/** Same boxes as ProfileHeader: avatar row, name, handle line. */
export function ProfileHeaderSkeleton() {
  return (
    <div className="w-full flex flex-col gap-element-gap" aria-hidden="true">
      <div className={`w-20 h-20 rounded-full ${BLOCK}`} />
      <div className="flex flex-col gap-1">
        <div className={`h-8 md:h-11 w-2/3 max-w-sm rounded ${BLOCK}`} />
        <div className={`h-5 w-1/2 max-w-xs rounded ${BLOCK}`} />
      </div>
    </div>
  );
}

/** Tab strip and first events, as in the profile pages under the header. */
export default function ProfilePageSkeleton() {
  return (
    <div className="w-full" aria-hidden="true" data-testid="profile-events-skeleton">
      <div className="flex gap-element-gap border-b border-border">
        {[0, 1].map((i) => (
          <div key={i} className="px-element-gap py-element-gap">
            <div className={`h-7 w-20 rounded ${BLOCK}`} />
          </div>
        ))}
      </div>
      <div className="mt-section-y">
        <EventsGridSkeleton count={3} />
      </div>
    </div>
  );
}
