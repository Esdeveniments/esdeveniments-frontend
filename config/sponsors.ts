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

import type {
  SponsorConfig,
  ActiveSponsor,
  HouseAdConfig,
  HouseAdResult,
} from "types/sponsor";

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
  // {
  //   businessName: "Test Sponsor",
  //   imageUrl:
  //     "https://placehold.co/800x200/dc2626/ffffff?text=🎉+Patrocinador+de+prova+•+Restaurant+Example",
  //   targetUrl: "https://esdeveniments.cat/patrocina",
  //   places: ["catalunya"], // or ["maresme"] for region, or ["catalunya"] for country
  //   geoScope: "country", // "town" | "region" | "country"
  //   startDate: "2026-01-01",
  //   endDate: "2026-12-31",
  // },
  // ═══════════════════════════════════════════════════════════════════
  // ACTIVE SPONSORS - Add new sponsors below after payment confirmation
  // ═══════════════════════════════════════════════════════════════════
  {
    businessName: "Tastautors",
    imageUrl: "https://i.ibb.co/DfXFVNXr/Cartell-Tastautors-5-scaled-1-1.webp",
    targetUrl: "https://www.tastautors.cat/",
    places: ["catalunya"],
    geoScope: "country",
    startDate: "2026-01-21",
    endDate: "2026-01-30",
  },
  {
    businessName: "Tastautors",
    imageUrl: "https://i.ibb.co/DfXFVNXr/Cartell-Tastautors-5-scaled-1-1.webp",
    targetUrl: "https://www.tastautors.cat/",
    places: ["valles-oriental"],
    geoScope: "region",
    startDate: "2026-01-21",
    endDate: "2026-01-30",
  },
  {
    businessName: "Tastautors",
    imageUrl: "https://i.ibb.co/DfXFVNXr/Cartell-Tastautors-5-scaled-1-1.webp",
    targetUrl: "https://www.tastautors.cat/",
    places: ["cardedeu"],
    geoScope: "town",
    startDate: "2026-01-21",
    endDate: "2026-01-30",
  },
];

const MS_PER_DAY = 1000 * 60 * 60 * 24;

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
 * Get remaining days for an active sponsor (inclusive of end date).
 * @param sponsor - The sponsor configuration
 * @param todayUtc - Current day at UTC midnight
 * @returns Remaining days (minimum 1)
 */
function getRemainingDays(sponsor: SponsorConfig, todayUtc: Date): number {
  const endDateUtc = new Date(`${sponsor.endDate}T00:00:00.000Z`);
  const diffDays = Math.floor(
    (endDateUtc.getTime() - todayUtc.getTime()) / MS_PER_DAY,
  );
  return Math.max(1, diffDays + 1);
}

/**
 * Find an active sponsor for a single place (internal helper).
 */
function findActiveSponsorForSinglePlace(
  place: string,
  today: Date,
): ActiveSponsor | null {
  for (const sponsor of sponsors) {
    if (sponsor.places.includes(place) && isSponsorActive(sponsor, today)) {
      return sponsor;
    }
  }
  return null;
}

/**
 * Get the active sponsor for a specific place with optional cascade fallbacks.
 *
 * Cascade logic (specificity wins):
 * 1. Check primary place (e.g., town "cardedeu")
 * 2. If no sponsor, check fallbacks in order (e.g., region "valles-oriental", then "catalunya")
 *
 * This ensures:
 * - Town sponsors appear on their town's events
 * - Region sponsors fill gaps where no town sponsor exists
 * - Country sponsors are the ultimate fallback
 *
 * @param place - The primary place slug (e.g., "cardedeu")
 * @param fallbackPlaces - Optional cascade fallbacks (e.g., ["valles-oriental", "catalunya"])
 * @returns The active sponsor and which place matched, or null if none found
 */
export function getActiveSponsorForPlace(
  place: string,
  fallbackPlaces?: string[],
): { sponsor: ActiveSponsor; matchedPlace: string } | null {
  const now = new Date();
  // Get midnight of the current day in UTC for a reliable comparison point
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );

  // Try primary place first
  const primarySponsor = findActiveSponsorForSinglePlace(place, today);
  if (primarySponsor) {
    return { sponsor: primarySponsor, matchedPlace: place };
  }

  // Try fallback places in order (region → country)
  if (fallbackPlaces) {
    for (const fallback of fallbackPlaces) {
      if (fallback) {
        const fallbackSponsor = findActiveSponsorForSinglePlace(
          fallback,
          today,
        );
        if (fallbackSponsor) {
          return { sponsor: fallbackSponsor, matchedPlace: fallback };
        }
      }
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
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
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

/**
 * Get occupied places and their remaining days (inclusive of end date).
 * Used by PlaceSelector to display availability countdown.
 */
export function getOccupiedPlaceStatus(): Map<string, number> {
  const now = new Date();
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );

  const status = new Map<string, number>();
  for (const sponsor of sponsors) {
    if (!isSponsorActive(sponsor, today)) {
      continue;
    }

    const remainingDays = getRemainingDays(sponsor, today);
    for (const place of sponsor.places) {
      if (!status.has(place)) {
        status.set(place, remainingDays);
      }
    }
  }

  return status;
}

// ═══════════════════════════════════════════════════════════════════
// HOUSE ADS — Shown when no paid sponsor exists
// Text CTAs linking to /patrocina with varied messaging.
//
// STRATEGY: Demonstrate the ad slot value with persuasive CTAs.
// - Each variant highlights a different value prop
// - Different pages show different CTAs (ISR caching = variety)
// - Empty state shows ~30% of the time ("slot is available!")
// ═══════════════════════════════════════════════════════════════════

/**
 * House ads configuration.
 *
 * Text ads: CSS-rendered banners, no images needed. Link to /patrocina.
 *   Headline/subtitle use i18n keys from Sponsor.houseAd.{key}.
 *   More variants = more variety across pages = feels less repetitive.
 */
const houseAds: HouseAdConfig[] = [
  {
    id: "house-pricing",
    type: "text",
    headlineKey: "pricing",
    subtitleKey: "pricingSub",
  },
  {
    id: "house-reach",
    type: "text",
    headlineKey: "reach",
    subtitleKey: "reachSub",
  },
  {
    id: "house-exclusive",
    type: "text",
    headlineKey: "exclusive",
    subtitleKey: "exclusiveSub",
  },
  {
    id: "house-local",
    type: "text",
    headlineKey: "local",
    subtitleKey: "localSub",
  },
  {
    id: "house-intent",
    type: "text",
    headlineKey: "intent",
    subtitleKey: "intentSub",
  },
  {
    id: "house-simple",
    type: "text",
    headlineKey: "simple",
    subtitleKey: "simpleSub",
  },
  {
    id: "house-results",
    type: "text",
    headlineKey: "results",
    subtitleKey: "resultsSub",
  },
  {
    id: "house-seasonal",
    type: "text",
    headlineKey: "seasonal",
    subtitleKey: "seasonalSub",
  },
];

/** Probability of showing a house ad vs empty state CTA (0-1) */
const HOUSE_AD_SHOW_PROBABILITY = 0.7;

/**
 * Get all available house ads (text CTAs only).
 */
function getAllHouseAds(): HouseAdConfig[] {
  return houseAds;
}

/**
 * Get a house ad for the slot, or null to show the empty state CTA.
 *
 * Selection logic:
 * - 70% chance of showing a text house ad, 30% shows empty state CTA
 * - When multiple house ads exist, picks one randomly
 * - ISR caching means the same page shows the same ad for a while
 *
 * Called server-side; randomness per request is acceptable since
 * pages are ISR-cached and the variation adds freshness.
 */
export function getHouseAdForSlot(): HouseAdResult | null {
  const allAds = getAllHouseAds();

  if (allAds.length === 0) {
    return null;
  }

  // Probabilistic: show house ad ~70% of the time
  if (Math.random() > HOUSE_AD_SHOW_PROBABILITY) {
    return null;
  }

  // Pick a random house ad
  const index = Math.floor(Math.random() * allAds.length);
  const houseAd = allAds[index];
  if (!houseAd) {
    return null;
  }

  return { houseAd };
}
