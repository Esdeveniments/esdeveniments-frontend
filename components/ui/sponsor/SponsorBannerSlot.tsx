import { Suspense } from "react";
import { getActiveSponsorForPlace } from "@config/sponsors";
import type { SponsorBannerSlotProps } from "types/sponsor";
import SponsorBanner from "./SponsorBanner";
import SponsorEmptyState from "./SponsorEmptyState";

/**
 * Server component that fetches sponsor data and renders the appropriate banner.
 * Uses cascade logic: tries primary place first, then fallbacks (region → country).
 * Shows SponsorBanner if active sponsor exists, otherwise SponsorEmptyState CTA.
 */
function SponsorBannerSlotContent({
  place,
  fallbackPlaces,
}: SponsorBannerSlotProps) {
  const result = getActiveSponsorForPlace(place, fallbackPlaces);

  if (result) {
    // Use matchedPlace for analytics (shows which tier actually displayed)
    return <SponsorBanner sponsor={result.sponsor} place={result.matchedPlace} />;
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
