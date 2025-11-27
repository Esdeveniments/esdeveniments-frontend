import { z } from "zod";
import type { PlaceResponseDTO } from "types/api/place";

const PlaceTypeEnum = z.enum(["PROVINCE", "REGION", "CITY"]);

export const PlaceResponseDTOSchema = z.object({
  id: z.number(),
  type: PlaceTypeEnum,
  name: z.string(),
  slug: z.string(),
});

export const PlaceResponseArraySchema = z.array(PlaceResponseDTOSchema);

export function parsePlace(input: unknown): PlaceResponseDTO | null {
  const result = PlaceResponseDTOSchema.safeParse(input);
  if (!result.success) {
    console.error("parsePlace: invalid place payload", result.error.format());
    return null;
  }
  return result.data;
}

export function parsePlaces(input: unknown): PlaceResponseDTO[] {
  const result = PlaceResponseArraySchema.safeParse(input);
  if (!result.success) {
    console.error("parsePlaces: invalid places payload", result.error.format());
    return [];
  }
  return result.data;
}
