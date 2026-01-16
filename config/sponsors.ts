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
 *   geoScope: "town",
 *   startDate: "2026-01-15",
 *   endDate: "2026-01-22",
 * }
 */
const sponsors: SponsorConfig[] = [
  // ═══════════════════════════════════════════════════════════════════
  // TEST SPONSOR - Uncomment to test the banner system
  // After testing, comment out again before committing
  // ═══════════════════════════════════════════════════════════════════
  {
    businessName: "Test Sponsor",
    imageUrl:
      "https://placehold.co/800x200/dc2626/ffffff?text=🎉+Patrocinador+de+prova+•+Restaurant+Example",
    targetUrl: "https://esdeveniments.cat/patrocina",
    places: ["catalunya"], // or ["maresme"] for region, or ["catalunya"] for country
    geoScope: "country", // "town" | "region" | "country"
    startDate: "2026-01-01",
    endDate: "2026-12-31",
  },
  // ═══════════════════════════════════════════════════════════════════
  // ACTIVE SPONSORS - Add new sponsors below after payment confirmation
  // ═══════════════════════════════════════════════════════════════════
];

/**
 * Check if a sponsor is active on a given date.
 * @param sponsor - The sponsor configuration
 * @param date - The date to check against (should be midnight UTC)
 * @returns true if the sponsor is active, false otherwise
 */
function isSponsorActive(sponsor: SponsorConfig, date: Date): boolean {
  // Parse date strings as UTC to avoid timezone ambiguity
  const startDate = new Date(`${sponsor.startDate}T00:00:00.000Z`);
  const endDate = new Date(`${sponsor.endDate}T23:59:59.999Z`);
  return date >= startDate && date <= endDate;
}

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
  const now = new Date();
  // Get midnight of the current day in UTC for a reliable comparison point
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );

  for (const sponsor of sponsors) {
    if (sponsor.places.includes(place) && isSponsorActive(sponsor, today)) {
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
  const now = new Date();
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );

  return sponsors.filter((sponsor) => isSponsorActive(sponsor, today));
}

/**
 * Get all place slugs that currently have active sponsors.
 * Used by PlaceSelector to show availability status.
 */
export function getOccupiedPlaceSlugs(): string[] {
  const activeSponsors = getAllActiveSponsors();
  const slugs = new Set<string>();
  for (const sponsor of activeSponsors) {
    for (const place of sponsor.places) {
      slugs.add(place);
    }
  }
  return Array.from(slugs);
}
