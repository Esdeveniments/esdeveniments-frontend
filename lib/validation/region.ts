import { z } from "zod";
import { slugifySegment } from "@utils/string-helpers";
import type { RegionsGroupedByCitiesResponseDTO } from "types/api/region";

/**
 * Schema for each city in the regions/options dropdown response.
 */
const CityDropdownSchema = z.object({
  id: z.number(),
  value: z.string(),
  label: z.string(),
  latitude: z.number(),
  longitude: z.number(),
});

/**
 * Raw schema matching what the external API actually returns.
 * The API does NOT include a `slug` field, so it's optional here.
 */
const RegionGroupedRawSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string().optional(),
  cities: z.array(CityDropdownSchema),
});

const RegionGroupedArraySchema = z.array(RegionGroupedRawSchema);

/**
 * Parse and enrich regions-with-cities payload from the external API.
 *
 * 1. Validates the raw shape (slug optional — the API omits it).
 * 2. Computes slug from `name` when missing using `slugifySegment()`.
 * 3. Returns a fully validated array where every region has a slug.
 *
 * Returns `[]` on validation failure (safe fallback).
 */
export function parseRegionsGrouped(
  data: unknown,
): RegionsGroupedByCitiesResponseDTO[] {
  const raw = RegionGroupedArraySchema.safeParse(data);
  if (!raw.success) {
    console.error(
      "parseRegionsGrouped: validation failed",
      raw.error.format(),
    );
    return [];
  }

  return raw.data.map((region) => ({
    ...region,
    slug: region.slug || slugifySegment(region.name),
  }));
}
