import type { UserPublicResponseDTO } from "types/api/user";
import type { TabItem, ProfileTranslator } from "types/props";

// Shared by page.tsx and passats/page.tsx: the Propers/Passats tab items are
// identical on both routes, only which one is `active` differs (passed
// separately to <Tabs>).
export function buildProfileTabItems(
  profile: UserPublicResponseDTO,
  tProfile: ProfileTranslator,
): TabItem[] {
  return [
    {
      id: "upcoming",
      href: `/perfil/${encodeURIComponent(profile.username)}`,
      label: tProfile("tabUpcoming"),
      count: profile.upcomingEventCount,
    },
    {
      id: "past",
      href: `/perfil/${encodeURIComponent(profile.username)}/passats`,
      label: tProfile("tabPast"),
      count: profile.pastEventCount,
    },
  ];
}
