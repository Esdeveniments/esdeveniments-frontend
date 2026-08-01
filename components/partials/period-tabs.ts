import type { TabItem } from "types/props";

// Generic two-tab (upcoming/past) shape shared by the profile and
// favourites Propers/Passats pages. Feature-specific wrappers
// (buildProfileTabItems, buildFavoritesTabItems) supply hrefs, labels, and
// counts from their own domain.
export function buildPeriodTabItems({
  activeHref,
  pastHref,
  activeLabel,
  pastLabel,
  activeCount,
  pastCount,
}: {
  activeHref: string;
  pastHref: string;
  activeLabel: string;
  pastLabel: string;
  activeCount?: number;
  pastCount?: number;
}): TabItem[] {
  return [
    { id: "upcoming", href: activeHref, label: activeLabel, count: activeCount },
    { id: "past", href: pastHref, label: pastLabel, count: pastCount },
  ];
}
