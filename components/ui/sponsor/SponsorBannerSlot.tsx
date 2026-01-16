import { Suspense } from "react";
import { getActiveSponsorForPlace } from "@config/sponsors";
import type { SponsorBannerSlotProps } from "types/sponsor";
import SponsorBanner from "./SponsorBanner";
import SponsorEmptyState from "./SponsorEmptyState";

/**
 * Server component that fetches sponsor data and renders the appropriate banner.
 * Shows SponsorBanner if active sponsor exists, otherwise SponsorEmptyState CTA.
 */
function SponsorBannerSlotContent({ place }: SponsorBannerSlotProps) {
  const sponsor = getActiveSponsorForPlace(place);

  if (sponsor) {
    return <SponsorBanner sponsor={sponsor} place={place} />;
  }

  return <SponsorEmptyState />;
}

/**
 * Wrapper with Suspense for non-blocking render.
 * Place this below heading/filters, above events list.
 */
export default function SponsorBannerSlot({ place }: SponsorBannerSlotProps) {
  return (
    <div className="mb-4 mt-2" data-testid="sponsor-slot">
      <Suspense fallback={null}>
        <SponsorBannerSlotContent place={place} />
      </Suspense>
    </div>
  );
}
