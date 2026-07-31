import EventCardSkeleton from "./EventCardSkeleton";
import type { EventsGridSkeletonProps } from "types/props";

export default function EventsGridSkeleton({
  count = 6,
}: EventsGridSkeletonProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </div>
  );
}
