import type { TabItem, ProfileTranslator } from "types/props";
import { buildPeriodTabItems } from "./period-tabs";

// Shared by preferits/page.tsx and preferits/passats/page.tsx, mirroring
// buildProfileTabItems' role for the profile Propers/Passats pages.
export function buildFavoritesTabItems(
  counts: { activeCount?: number; pastCount?: number },
  t: ProfileTranslator,
): TabItem[] {
  return buildPeriodTabItems({
    activeHref: "/preferits",
    pastHref: "/preferits/passats",
    activeLabel: t("tabUpcoming"),
    pastLabel: t("tabPast"),
    activeCount: counts.activeCount,
    pastCount: counts.pastCount,
  });
}
