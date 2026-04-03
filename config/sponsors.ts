/**
 * Sponsor configuration for the self-service advertising system.
 * @see /docs/strategy-pricing.md for full system documentation
 *
 * IMPORTANT: Active sponsors are now stored in the Turso database,
 * NOT in this file. The Stripe webhook handler automatically creates
 * sponsor records on payment, and the image upload handler activates them.
 *
 * Sponsor data operations are in lib/db/sponsors.ts.
 * This file only contains house ads configuration (pure config, no DB).
 */

import type { HouseAdConfig, HouseAdResult } from "types/sponsor";

// Re-export DB operations so existing imports keep working
export {
  getActiveSponsorForPlace,
  getAllActiveSponsors,
  getOccupiedPlaceSlugs,
  getOccupiedPlaceStatus,
} from "@lib/db/sponsors";

// House ads config
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

function getAllHouseAds(): HouseAdConfig[] {
  return houseAds;
}

/**
 * Get a house ad for the slot deterministically.
 * Uses the current hour as a seed so the ad rotates over time but is
 * consistent within the same cache window — required for cacheComponents
 * (RSC resumption expects identical tree structure across renders).
 */
export function getHouseAdForSlot(): HouseAdResult | null {
  const allAds = getAllHouseAds();

  if (allAds.length === 0) {
    return null;
  }

  // Rotate ads by hour — deterministic within each cache window
  const hourSeed = new Date().getHours();
  const index = hourSeed % allAds.length;
  const houseAd = allAds[index];
  if (!houseAd) {
    return null;
  }

  return { houseAd };
}
