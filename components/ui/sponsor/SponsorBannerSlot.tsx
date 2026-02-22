import { Suspense } from "react";
import { getActiveSponsorForPlace, getHouseAdForSlot } from "@config/sponsors";
import type { SponsorBannerSlotProps } from "types/sponsor";
import SponsorBanner from "./SponsorBanner";
import SponsorEmptyState from "./SponsorEmptyState";
import TextHouseAd from "./TextHouseAd";

/**
 * Server component that fetches sponsor data and renders the appropriate banner.
 * Uses cascade logic: tries primary place first, then fallbacks (region → country).
 *
 * Priority order:
 * 1. Paid sponsor (always wins)
 * 2. House ad (~70% when no paid sponsor):
 *    - "text": CSS-rendered banner linking to /patrocina (no image needed)
 * 3. Empty state CTA (~30% when no paid sponsor)
 */
async function SponsorBannerSlotContent({
  place,
  fallbackPlaces,
}: SponsorBannerSlotProps) {
  const result = await getActiveSponsorForPlace(place, fallbackPlaces);

  if (result) {
    return <SponsorBanner sponsor={result.sponsor} place={result.matchedPlace} />;
  }

  // No paid sponsor — try house ad
  const houseAdResult = getHouseAdForSlot();
  if (houseAdResult) {
    const { houseAd } = houseAdResult;

    // Text house ad — CSS-rendered, no image
    if (houseAd.type === "text") {
      return <TextHouseAd houseAd={houseAd} place={place} />;
    }
  }

  return <SponsorEmptyState />;
}

/**
 * Wrapper with Suspense for non-blocking render.
 * Place this below heading/filters, above events list.
 *
 * For event pages, pass fallbackPlaces to enable cascade:
 * <SponsorBannerSlot place={citySlug} fallbackPlaces={[regionSlug, "catalunya"]} />
 */
export default function SponsorBannerSlot({
  place,
  fallbackPlaces,
}: SponsorBannerSlotProps) {
  return (
    <div className="mb-4 mt-2" data-testid="sponsor-slot">
      <Suspense fallback={null}>
        <SponsorBannerSlotContent place={place} fallbackPlaces={fallbackPlaces} />
      </Suspense>
    </div>
  );
}
