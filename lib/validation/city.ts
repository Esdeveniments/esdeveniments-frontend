import { z } from "zod";
import type { CitySummaryResponseDTO } from "types/api/city";
import type { PagedResponseDTO } from "types/api/event";
import { CitySummaryResponseDTOSchema, PagedResponseMetaSchema } from "./event";

export const CitySummaryArraySchema = z.array(CitySummaryResponseDTOSchema);

export function parseCities(input: unknown): CitySummaryResponseDTO[] {
  const result = CitySummaryArraySchema.safeParse(input);
  if (!result.success) {
    console.error("parseCities: invalid cities payload", result.error.format());
    return [];
  }
  return result.data;
}

export function parseCity(input: unknown): CitySummaryResponseDTO | null {
  const result = CitySummaryResponseDTOSchema.safeParse(input);
  if (!result.success) {
    console.error("parseCity: invalid city payload", result.error.format());
    return null;
  }
  return result.data;
}

const PagedCitiesSchema = PagedResponseMetaSchema.extend({
  content: z.array(CitySummaryResponseDTOSchema),
});

export function parsePagedCities(
  input: unknown
): PagedResponseDTO<CitySummaryResponseDTO> | null {
  const result = PagedCitiesSchema.safeParse(input);
  if (!result.success) {
    console.error("parsePagedCities: invalid paged cities payload", result.error);
    return null;
  }
  return result.data;
}
