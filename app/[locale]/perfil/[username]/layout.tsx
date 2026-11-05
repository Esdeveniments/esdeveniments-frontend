import { Suspense } from "react";
import ProfileHeader from "@components/ui/profile/ProfileHeader";
import ProfileClaimCta from "@components/ui/profile/ProfileClaimCta";
import { getUserByUsernameCached } from "@lib/api/profiles";
import ProfileLoading from "./loading";

// Shared shell for the profile's Propers/Passats tabs. The 404 stays in the
// pages below (notFound() thrown here would resolve to the *parent* segment's
// boundary and bypass ./not-found.tsx), so this layout tolerates a null
// profile by rendering children bare — the page underneath still 404s.
// getUserByUsernameCached is "use cache", so each username's own shell still
// carries the header. The boundary only matters for the generic fallback
// shell, where `params` is unknown; without it the root layout would block.
export default function ProfileLayout({
  children,
  params,
}: LayoutProps<"/[locale]/perfil/[username]">) {
  return (
    <Suspense
      fallback={
        <div className="container flex flex-col justify-center items-center pt-[6rem]">
          <ProfileLoading />
        </div>
      }
    >
      <ProfileShell params={params}>{children}</ProfileShell>
    </Suspense>
  );
}

async function ProfileShell({
  children,
  params,
}: LayoutProps<"/[locale]/perfil/[username]">) {
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
