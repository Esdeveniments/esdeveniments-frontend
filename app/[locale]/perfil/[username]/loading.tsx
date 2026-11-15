import ProfilePageSkeleton from "@components/ui/common/skeletons/ProfilePageSkeleton";

// Next wraps `{children}` in layout.tsx with a <Suspense> using this file as
// fallback — it substitutes ONLY for page.tsx's own output, not the layout
// around it. ProfileHeader renders in layout.tsx, outside that boundary, and
// stays mounted across Propers <-> Passats navigation, so this matches only
// page.tsx's own shape (Tabs + events grid).
export default function ProfileLoading() {
  return <ProfilePageSkeleton />;
}
