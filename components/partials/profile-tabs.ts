import type { UserPublicResponseDTO } from "types/api/user";
import type { TabItem, ProfileTranslator } from "types/props";
import { buildPeriodTabItems } from "./period-tabs";

// Shared by page.tsx and passats/page.tsx: the Propers/Passats tab items are
// identical on both routes, only which one is `active` differs (passed
// separately to <Tabs>).
export function buildProfileTabItems(
  profile: UserPublicResponseDTO,
  tProfile: ProfileTranslator,
): TabItem[] {
  return buildPeriodTabItems({
    activeHref: `/perfil/${encodeURIComponent(profile.username)}`,
    pastHref: `/perfil/${encodeURIComponent(profile.username)}/passats`,
    activeLabel: tProfile("tabUpcoming"),
    pastLabel: tProfile("tabPast"),
    activeCount: profile.upcomingEventCount,
    pastCount: profile.pastEventCount,
  });
}
