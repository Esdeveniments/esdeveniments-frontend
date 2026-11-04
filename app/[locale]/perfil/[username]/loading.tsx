import EventsGridSkeleton from "@components/ui/common/skeletons/EventsGridSkeleton";

// Next wraps `{children}` in layout.tsx with a <Suspense> using this file as
// fallback — it substitutes ONLY for page.tsx's own output, not the layout
// around it. ProfileHeader/ProfileClaimCta render in layout.tsx, outside that
// boundary, and stay mounted across Propers <-> Passats navigation, so
// mocking them here used to double them up under the real header instead of
// ever replacing it. Match page.tsx's own shape (Tabs + events grid) instead.
export default function ProfileLoading() {
  return (
    <div className="w-full mt-section-y" data-testid="profile-events-skeleton">
      <EventsGridSkeleton count={3} />
    </div>
  );
}
