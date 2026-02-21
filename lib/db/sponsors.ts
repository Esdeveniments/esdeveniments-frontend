import "server-only";

/**
 * Sponsor database operations using Turso (libSQL).
 *
 * Replaces the static sponsors array in config/sponsors.ts with
 * a database-backed store. Sponsors are automatically created by
 * the Stripe webhook on payment and activated after image upload.
 *
 * @see /docs/strategy-pricing.md for system documentation
 */

import { captureException } from "@sentry/nextjs";
import { isDbConfigured, execute, ensureSchema } from "./turso";
import { createCache, createKeyedCache } from "@lib/api/cache";
import { MS_PER_DAY } from "@utils/constants";
import type {
  SponsorConfig,
  ActiveSponsor,
  GeoScope,
  DbSponsorRow,
  CreateSponsorInput,
  SponsorStatus,
} from "types/sponsor";
import { VALID_GEO_SCOPES } from "types/sponsor";

// In-memory TTL caches — consistent with categories/cities/regions pattern.
// 10 min for sponsor lookups (hot path on every page render).
// 5 min for availability (used by PlaceSelector API).
const SPONSOR_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const AVAILABILITY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const sponsorByPlaceCache = createKeyedCache<{
  sponsor: ActiveSponsor;
  matchedPlace: string;
} | null>(SPONSOR_CACHE_TTL);

const allActiveSponsorsCache = createCache<ActiveSponsor[]>(SPONSOR_CACHE_TTL);

const occupiedStatusCache = createCache<Map<string, number>>(
  AVAILABILITY_CACHE_TTL,
);

/**
 * Clear all sponsor caches. Called after writes (create, activate).
 */
function invalidateCaches(): void {
  sponsorByPlaceCache.clear();
  allActiveSponsorsCache.clear();
  occupiedStatusCache.clear();
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

/**
 * Get today's date as YYYY-MM-DD in UTC.
 */
function todayUtcString(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Safely parse places JSON from DB row.
 */
function parsePlaces(placesJson: string): string[] {
  try {
    const parsed: unknown = JSON.parse(placesJson);
    if (Array.isArray(parsed) && parsed.every((p) => typeof p === "string")) {
      return parsed;
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Validate geo_scope from DB to ensure type safety.
 */
function isValidGeoScope(value: string): value is GeoScope {
  return VALID_GEO_SCOPES.includes(value as GeoScope);
}

/**
 * Convert a DB row to the existing SponsorConfig interface
 * used by the rest of the application.
 */
function rowToSponsorConfig(row: DbSponsorRow): SponsorConfig | null {
  if (!isValidGeoScope(row.geo_scope)) return null;

  const places = parsePlaces(row.places);
  if (places.length === 0) return null;

  return {
    businessName: row.business_name,
    imageUrl: row.image_url ?? "",
    targetUrl: row.target_url ?? "",
    places,
    geoScope: row.geo_scope,
    startDate: row.start_date,
    endDate: row.end_date,
  };
}

/**
 * Calculate remaining days from today to end date (inclusive).
 */
function getRemainingDays(endDate: string): number {
  const now = new Date();
  const todayUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const endDateUtc = new Date(`${endDate}T00:00:00.000Z`);
  const diffDays = Math.floor(
    (endDateUtc.getTime() - todayUtc.getTime()) / MS_PER_DAY,
  );
  return Math.max(1, diffDays + 1);
}

// ═══════════════════════════════════════════════════════════════════
// WRITE OPERATIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Create a new sponsor record in the database.
 * Called by the Stripe webhook on successful payment.
 *
 * @returns The created sponsor's ID, or null if DB is unavailable
 */
export async function createSponsor(
  input: CreateSponsorInput,
): Promise<string | null> {
  if (!isDbConfigured()) return null;

  await ensureSchema();

  const id = crypto.randomUUID();
  const normalizedPlaces = Array.isArray(input.places)
    ? input.places.filter(Boolean)
    : [];
  if (normalizedPlaces.length === 0) {
    throw new Error("createSponsor: 'places' must contain at least one entry.");
  }

  const placesJson = JSON.stringify(normalizedPlaces);
  const status: SponsorStatus = input.status ?? "pending_image";

  await execute(
    `INSERT INTO sponsors (
      id, business_name, image_url, target_url, places, geo_scope,
      start_date, end_date, status, stripe_session_id,
      stripe_payment_intent_id, customer_email, amount_paid,
      currency, duration, duration_days
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.businessName,
      input.imageUrl ?? null,
      input.targetUrl ?? null,
      placesJson,
      input.geoScope,
      input.startDate,
      input.endDate,
      status,
      input.stripeSessionId ?? null,
      input.stripePaymentIntentId ?? null,
      input.customerEmail ?? null,
      input.amountPaid ?? null,
      input.currency ?? null,
      input.duration ?? null,
      input.durationDays ?? null,
    ],
  );

  invalidateCaches();

  return id;
}

/**
 * Update a sponsor's image and activate it.
 * Called by the image upload handler after successful upload.
 *
 * @param stripeSessionId - The Stripe checkout session ID
 * @param imageUrl - The uploaded image URL
 * @returns true if updated, false if not found or DB unavailable
 */
export async function activateSponsorImage(
  stripeSessionId: string,
  imageUrl: string,
): Promise<boolean> {
  if (!isDbConfigured()) return false;

  await ensureSchema();

  const result = await execute(
    `UPDATE sponsors
     SET image_url = ?, status = 'active', updated_at = datetime('now')
     WHERE stripe_session_id = ? AND status = 'pending_image'`,
    [imageUrl, stripeSessionId],
  );

  const updated = result.rowsAffected > 0;
  if (updated) invalidateCaches();

  return updated;
}

// ═══════════════════════════════════════════════════════════════════
// READ OPERATIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Get the active sponsor for a place, with cascade fallbacks.
 * Replaces the static getActiveSponsorForPlace from config/sponsors.ts.
 *
 * @param place - Primary place slug (e.g., "cardedeu")
 * @param fallbackPlaces - Cascade fallbacks (e.g., ["valles-oriental", "catalunya"])
 * @returns The active sponsor and matched place, or null
 */
export async function getActiveSponsorForPlace(
  place: string,
  fallbackPlaces?: string[],
): Promise<{ sponsor: ActiveSponsor; matchedPlace: string } | null> {
  // Cache key combines place + fallbacks for unique lookup
  const cacheKey = [place, ...(fallbackPlaces ?? [])].join("|");

  return sponsorByPlaceCache.cache(cacheKey, async () => {
    if (!isDbConfigured()) return null;

    try {
      // Reuse the cached list of all active sponsors to avoid redundant DB reads
      const sponsors = await getAllActiveSponsors();
      if (!sponsors.length) return null;

      // Check primary place first, then fallbacks (same cascade logic as before)
      const placesToCheck = [place, ...(fallbackPlaces ?? [])].filter(Boolean);

      for (const checkPlace of placesToCheck) {
        for (const sponsor of sponsors) {
          if (sponsor.places.includes(checkPlace)) {
            return { sponsor, matchedPlace: checkPlace };
          }
        }
      }

      return null;
    } catch (error) {
      // Sponsors are non-critical — show house ad or CTA instead
      captureException(error, {
        tags: { db: "sponsors", operation: "getActiveSponsorForPlace" },
      });
      return null;
    }
  });
}

/**
 * Get all active sponsors (for debugging/admin).
 */
export async function getAllActiveSponsors(): Promise<ActiveSponsor[]> {
  return allActiveSponsorsCache.cache(async () => {
    if (!isDbConfigured()) return [];

    try {
      const today = todayUtcString();

      const result = await execute(
        `SELECT * FROM sponsors
         WHERE status = 'active'
           AND start_date <= ?
           AND end_date >= ?
         ORDER BY created_at DESC`,
        [today, today],
      );

      const rows = result.rows as unknown as DbSponsorRow[];
      return rows.map(rowToSponsorConfig).filter(Boolean) as ActiveSponsor[];
    } catch (error) {
      captureException(error, {
        tags: { db: "sponsors", operation: "getAllActiveSponsors" },
      });
      return [];
    }
  });
}

/**
 * Get occupied places with remaining days.
 * Includes both 'active' and 'pending_image' sponsors (place is booked).
 * Used by PlaceSelector to show availability status.
 */
export async function getOccupiedPlaceStatus(): Promise<Map<string, number>> {
  return occupiedStatusCache.cache(async () => {
    if (!isDbConfigured()) return new Map();

    try {
      const today = todayUtcString();

      const result = await execute(
        `SELECT places, end_date FROM sponsors
         WHERE status IN ('active', 'pending_image')
           AND start_date <= ?
           AND end_date >= ?`,
        [today, today],
      );

      const rows = result.rows as unknown as Pick<
        DbSponsorRow,
        "places" | "end_date"
      >[];
      const status = new Map<string, number>();

      for (const row of rows) {
        const places = parsePlaces(row.places);
        const remainingDays = getRemainingDays(row.end_date);

        for (const place of places) {
          const existing = status.get(place) ?? 0;
          status.set(place, Math.max(existing, remainingDays));
        }
      }

      return status;
    } catch (error) {
      captureException(error, {
        tags: { db: "sponsors", operation: "getOccupiedPlaceStatus" },
      });
      return new Map();
    }
  });
}

/**
 * Get all place slugs that currently have sponsors (active or pending).
 */
export async function getOccupiedPlaceSlugs(): Promise<string[]> {
  const status = await getOccupiedPlaceStatus();
  return Array.from(status.keys());
}

/**
 * Check if a sponsor already exists for a Stripe session (idempotency).
 */
export async function findSponsorBySessionId(
  stripeSessionId: string,
): Promise<boolean> {
  if (!isDbConfigured()) return false;

  try {
    const result = await execute(
      "SELECT id FROM sponsors WHERE stripe_session_id = ? LIMIT 1",
      [stripeSessionId],
    );

    return result.rows.length > 0;
  } catch (error) {
    captureException(error, {
      tags: { db: "sponsors", operation: "findSponsorBySessionId" },
    });
    return false;
  }
}
