import EventsGridSkeleton from "@components/ui/common/skeletons/EventsGridSkeleton";

// The pages read the session cookie first. layout.tsx (the h1) stays
// outside this boundary, so only the events grid is a placeholder.
export default function PreferitsLoading() {
  return (
    <div className="w-full mt-section-y" aria-hidden="true">
      <EventsGridSkeleton count={3} />
    </div>
  );
}
