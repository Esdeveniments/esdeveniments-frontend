import { z } from "zod";
import type {
  EventDetailResponseDTO,
  EventSummaryResponseDTO,
  PagedResponseDTO,
  CategorizedEvents,
} from "types/api/event";

// --- Summary DTOs needed for event payload validation ---
const EventTypeEnum = z.enum(["FREE", "PAID"]);
const EventOriginEnum = z.enum(["SCRAPE", "RSS", "MANUAL", "MIGRATION"]);

// Category schema - defined here to avoid circular dependency with category.ts
export const CategorySummaryResponseDTOSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
});

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

export const CitySummaryResponseDTOSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  postalCode: z.string(),
  rssFeed: z.string().nullable(),
  enabled: z.boolean(),
});

export const EventSummaryResponseDTOSchema = z
  .object({
    id: z.string(),
    hash: z.string(),
    slug: z.string(),
    title: z.string(),
    type: EventTypeEnum,
    url: z.string(),
    description: z.string(),
    imageUrl: z.string().nullable(),
    startDate: z.string(),
    startTime: z.string().nullable(),
    endDate: z.string().nullable(),
    endTime: z.string().nullable(),
    location: z.string(),
    visits: z.number(),
    origin: EventOriginEnum,
    city: CitySummaryResponseDTOSchema.optional(),
    region: RegionSummaryResponseDTOSchema.optional(),
    province: ProvinceSummaryResponseDTOSchema.optional(),
    categories: z.array(CategorySummaryResponseDTOSchema),
    updatedAt: z.string().optional(),
    weather: z
      .object({
        temperature: z.string(),
        description: z.string(),
        icon: z.string(),
      })
      .nullable()
      .optional(),
  })
  .passthrough();

// Related events from the backend can be partial/minimal.
// Accept a more lenient shape to avoid dropping valid payloads.
const RelatedEventSummarySchema = z
  .object({
    id: z.string().optional(),
    slug: z.string(),
    title: z.string(),
    url: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    imageUrl: z.string().nullable().optional(),
    startDate: z.string(),
    startTime: z.string().nullable().optional(),
    endDate: z.string().nullable().optional(),
    endTime: z.string().nullable().optional(),
    location: z.string().optional(),
    visits: z.number().optional(),
    categories: z.array(CategorySummaryResponseDTOSchema).optional(),
    city: CitySummaryResponseDTOSchema.optional(),
    region: RegionSummaryResponseDTOSchema.optional(),
    province: ProvinceSummaryResponseDTOSchema.optional(),
    type: EventTypeEnum.optional(),
    origin: EventOriginEnum.optional(),
    hash: z.string().optional(),
    updatedAt: z.string().optional(),
    weather: z
      .object({
        temperature: z.string(),
        description: z.string(),
        icon: z.string(),
      })
      .nullable()
      .optional(),
  })
  .passthrough();

export const EventDetailResponseDTOSchema =
  EventSummaryResponseDTOSchema.extend({
    videoUrl: z.string().optional(),
    duration: z.string().optional(),
    tags: z.array(z.string()).optional(),
    relatedEvents: z.array(RelatedEventSummarySchema).optional(),
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

// Paged response schema for events
export const PagedEventResponseDTOSchema = z.object({
  content: z.array(EventSummaryResponseDTOSchema),
  currentPage: z.number(),
  pageSize: z.number(),
  totalElements: z.number(),
  totalPages: z.number(),
  last: z.boolean(),
});

export function parsePagedEvents(
  input: unknown
): PagedResponseDTO<EventSummaryResponseDTO> | null {
  const result = PagedEventResponseDTOSchema.safeParse(input);
  if (!result.success) {
    console.error(
      "parsePagedEvents: invalid paged events payload",
      result.error
    );
    return null;
  }
  // Type assertion needed due to passthrough() allowing extra fields
  // that may not match the exact TypeScript type
  return result.data as PagedResponseDTO<EventSummaryResponseDTO>;
}

// Categorized events schema
export const CategorizedEventsSchema = z.record(
  z.string(),
  z.array(EventSummaryResponseDTOSchema)
);

export function parseCategorizedEvents(
  input: unknown
): CategorizedEvents | null {
  const result = CategorizedEventsSchema.safeParse(input);
  if (!result.success) {
    console.error(
      "parseCategorizedEvents: invalid categorized events payload",
      result.error
    );
    return null;
  }
  // Type assertion needed due to passthrough() allowing extra fields
  // that may not match the exact TypeScript type
  return result.data as CategorizedEvents;
}
