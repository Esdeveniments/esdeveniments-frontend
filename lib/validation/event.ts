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

// Base event schema for list endpoints - does not include location fields
const EventSummaryBaseSchema = z
  .object({
    id: z.string(),
    hash: z.string(),
    slug: z.string(),
    // Note: title is allowed to be empty string (backend may return empty titles)
    // Frontend code should handle empty titles defensively (see app/e/[eventId]/page.tsx)
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

// Event summary schema for list endpoints (optional location fields)
export const EventSummaryResponseDTOSchema = EventSummaryBaseSchema.extend({
  city: CitySummaryResponseDTOSchema.optional().nullable(),
  region: RegionSummaryResponseDTOSchema.optional().nullable(),
  province: ProvinceSummaryResponseDTOSchema.optional().nullable(),
});

// Event detail schema - includes required location fields
const EventDetailBaseSchema = EventSummaryBaseSchema.extend({
  city: CitySummaryResponseDTOSchema,
  region: RegionSummaryResponseDTOSchema,
  province: ProvinceSummaryResponseDTOSchema,
});

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
    city: CitySummaryResponseDTOSchema.optional().nullable(),
    region: RegionSummaryResponseDTOSchema.optional().nullable(),
    province: ProvinceSummaryResponseDTOSchema.optional().nullable(),
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

// 🛡️ SECURITY: Sanitize HTML tags from meta fields to prevent XSS
function sanitizeMetaField(
  value: string | null | undefined
): string | null | undefined {
  if (!value || typeof value !== "string") return value;
  // Remove HTML tags and trim whitespace
  return value.replace(/<[^>]*>/g, "").trim() || null;
}

export const EventDetailResponseDTOSchema = EventDetailBaseSchema.extend({
  videoUrl: z.string().optional(),
  duration: z.string().optional(),
  tags: z.array(z.string()).optional(),
  relatedEvents: z.array(RelatedEventSummarySchema).optional(),
  metaTitle: z
    .string()
    .max(200, "Meta title too long")
    .optional()
    .nullable()
    .transform(sanitizeMetaField),
  metaDescription: z
    .string()
    .max(500, "Meta description too long")
    .optional()
    .nullable()
    .transform(sanitizeMetaField),
});

export function parseEventDetail(
  input: unknown
): EventDetailResponseDTO | null {
  const result = EventDetailResponseDTOSchema.safeParse(input);
  if (!result.success) {
    console.error("parseEventDetail: invalid event payload", result.error);
    return null;
  }

  const event = result.data as EventDetailResponseDTO;
  
  // Log warning if title is empty (helps identify data quality issues)
  if (!event.title || event.title.trim() === "") {
    console.warn(
      `Event with empty title detected: id=${event.id}, slug=${event.slug}`
    );
  }

  return event;
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

  return result.data as CategorizedEvents;
}
