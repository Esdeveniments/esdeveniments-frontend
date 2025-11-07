import { z } from "zod";
import type { EventDetailResponseDTO } from "types/api/event";
import { CategorySummaryResponseDTOSchema } from "./category";

// --- Summary DTOs needed for event payload validation ---
const RegionSummaryResponseDTOSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
});

const ProvinceSummaryResponseDTOSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
});

const CitySummaryResponseDTOSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  postalCode: z.string(),
  rssFeed: z.string().nullable(),
  enabled: z.boolean(),
});

export const EventSummaryResponseDTOSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  url: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  startDate: z.string(),
  startTime: z.string().nullable().optional(),
  endDate: z.string().nullable(),
  endTime: z.string().nullable().optional(),
  location: z.string().optional(),
  visits: z.number().optional(),
  categories: z.array(CategorySummaryResponseDTOSchema).optional(),
  // Optional to be resilient to partial payloads
  city: CitySummaryResponseDTOSchema.optional(),
  region: RegionSummaryResponseDTOSchema.optional(),
  province: ProvinceSummaryResponseDTOSchema.optional(),
});

export const EventDetailResponseDTOSchema =
  EventSummaryResponseDTOSchema.extend({
    videoUrl: z.string().optional(),
    duration: z.string().optional(),
    tags: z.array(z.string()).optional(),
    relatedEvents: z.array(EventSummaryResponseDTOSchema).optional(),
  });

export function parseEventDetail(
  input: unknown
): EventDetailResponseDTO | null {
  const result = EventDetailResponseDTOSchema.safeParse(input);
  if (!result.success) {
    console.error("parseEventDetail: invalid event payload", result.error);
    return null;
  }
  return result.data as EventDetailResponseDTO;
}
