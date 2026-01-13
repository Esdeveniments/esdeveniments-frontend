/**
 * Sponsor configuration for the self-service advertising system.
 * @see /strategy-pricing.md for full system documentation
 *
 * To add a new sponsor:
 * 1. Add entry to the `sponsors` array below
 * 2. Commit and deploy
 *
 * Sponsors are automatically hidden when endDate passes.
 */

import type { SponsorConfig, ActiveSponsor } from "types/sponsor";

/**
 * Active sponsors list.
 * Add new sponsors here after receiving Stripe payment.
 *
 * @example
 * {
 *   businessName: "Restaurant Example",
 *   imageUrl: "https://example.com/banner.jpg",
 *   targetUrl: "https://example.com",
 *   places: ["barcelona", "gracia"],
 *   startDate: "2026-01-15",
 *   endDate: "2026-01-22",
 * }
 */
const sponsors: SponsorConfig[] = [
  // ═══════════════════════════════════════════════════════════════════
  // TEST SPONSOR - Uncomment to test the banner system
  // After testing, comment out again before committing
  // ═══════════════════════════════════════════════════════════════════
  // {
  //   businessName: "Test Sponsor",
  //   imageUrl:
  //     "https://placehold.co/800x200/dc2626/ffffff?text=🎉+Patrocinador+de+prova+•+Restaurant+Example",
  //   targetUrl: "https://esdeveniments.cat/patrocina",
  //   places: ["mataro"],           // or ["maresme"] for region, or ["catalunya"] for country
  //   geoScope: "town",             // "town" | "region" | "country"
  //   startDate: "2026-01-01",
  //   endDate: "2026-12-31",
  // },
  // ═══════════════════════════════════════════════════════════════════
  // ACTIVE SPONSORS - Add new sponsors below after payment confirmation
  // ═══════════════════════════════════════════════════════════════════
];

/**
 * Get the active sponsor for a specific place.
 * Returns the first matching sponsor that:
 * 1. Has the place in its places array
 * 2. Is within the date range (startDate <= today <= endDate)
 *
 * @param place - The place slug (e.g., "barcelona", "gracia")
 * @returns The active sponsor or null if none found
 */
export function getActiveSponsorForPlace(place: string): ActiveSponsor | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to start of day

  for (const sponsor of sponsors) {
    // Check if place matches
    if (!sponsor.places.includes(place)) {
      continue;
    }

    // Check date range
    const startDate = new Date(sponsor.startDate);
    const endDate = new Date(sponsor.endDate);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999); // Include full end day

    if (today >= startDate && today <= endDate) {
      return sponsor;
    }
  }

  return null;
}

/**
 * Check if any sponsor exists for a place (regardless of date).
 * Useful for analytics/debugging.
 */
export function hasSponsorConfigForPlace(place: string): boolean {
  return sponsors.some((sponsor) => sponsor.places.includes(place));
}

/**
 * Get all active sponsors (for debugging/admin purposes).
 */
export function getAllActiveSponsors(): ActiveSponsor[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return sponsors.filter((sponsor) => {
    const startDate = new Date(sponsor.startDate);
    const endDate = new Date(sponsor.endDate);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    return today >= startDate && today <= endDate;
  });
}
