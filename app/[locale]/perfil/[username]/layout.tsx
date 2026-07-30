import type { ReactNode } from "react";
import ProfileHeader from "@components/ui/profile/ProfileHeader";
import ProfileClaimCta from "@components/ui/profile/ProfileClaimCta";
import { getUserByUsernameCached } from "@lib/api/profiles";

// Shared shell for the profile's Propers/Passats tabs. The 404 stays in the
// pages below (notFound() thrown here would resolve to the *parent* segment's
// boundary and bypass ./not-found.tsx), so this layout tolerates a null
// profile by rendering children bare — the page underneath still 404s.
// getUserByUsernameCached is "use cache", so it belongs in the static shell,
// never inside a <Suspense> boundary.
export default async function ProfileLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await getUserByUsernameCached(username);

  if (!profile) {
    return <>{children}</>;
  }

  return (
    <div className="container flex flex-col justify-center items-center pt-[6rem]">
      <ProfileHeader profile={profile} />
      <ProfileClaimCta username={profile.username} />
      {children}
    </div>
  );
}
