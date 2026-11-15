import { z } from "zod";
import { withImageCacheKey } from "@utils/image-cache";
import { canonicalizeLocaleTag } from "@utils/i18n-routing";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "types/i18n";
import type {
  EventDetailResponseDTO,
  EventDetailTranslationDTO,
  EventSummaryResponseDTO,
  EventSummaryTranslationDTO,
  EventTranslationsMap,
  PagedResponseDTO,
  CategorizedEvents,
} from "types/api/event";

// --- Summary DTOs needed for event payload validation ---
const EventOriginEnum = z.enum(["SCRAPE", "RSS", "MANUAL", "MIGRATION"]);

export const CategorySummaryResponseDTOSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
});

export const RegionSummaryResponseDTOSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
});

export const ProvinceSummaryResponseDTOSchema = z.object({
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
  rssFeed: z.string().nullable().optional(),
  enabled: z.boolean(),
});

// The AI importer stored the word "null" as text for missing values
// (esdeveniments-backend#114). Read it, like blank text, as missing so no page
// shows "null".
const isMissingText = (value: string): boolean => {
  const trimmed = value.trim();
  return !trimmed || trimmed.toLowerCase() === "null";
};
const optionalText = z
  .string()
  .nullable()
  .transform((value) => (value === null || isMissingText(value) ? null : value));
const requiredText = z
  .string()
  .transform((value) => (isMissingText(value) ? "" : value));

const MAX_TRANSLATION_LOCALES = 32;
const SUPPORTED_LOCALE_SET = new Set<string>(SUPPORTED_LOCALES);

function cleanTranslationString(value: unknown): string | undefined {
  if (typeof value !== "string" || isMissingText(value)) return undefined;
  return value.trim();
}

/**
 * Sanitizes `translations` into a plain `{}` map (React Flight RSC rejects
 * null-prototype objects) using ECMA-402 `canonicalizeLocaleTag`. Prioritizes
 * `SUPPORTED_LOCALES` before capping key count, strips `description` on summary
 * items, and returns `undefined` when empty so Catalan-only events carry zero extra keys.
 */
function parseEventTranslationsMap(
  raw: unknown,
  includeDescription: false,
): EventTranslationsMap<EventSummaryTranslationDTO> | undefined;
function parseEventTranslationsMap(
  raw: unknown,
  includeDescription: true,
): EventTranslationsMap<EventDetailTranslationDTO> | undefined;
function parseEventTranslationsMap(
  raw: unknown,
  includeDescription: boolean,
): EventTranslationsMap<EventDetailTranslationDTO> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;

  const entries = Object.entries(raw as Record<string, unknown>)
    .flatMap(([rawKey, val]) => {
      const parsed = canonicalizeLocaleTag(rawKey);
      if (!parsed || parsed.canonical === DEFAULT_LOCALE) return [];
      const isSupported =
        SUPPORTED_LOCALE_SET.has(parsed.canonical) ||
        SUPPORTED_LOCALE_SET.has(parsed.language);
      const isStandard = !parsed.canonical.includes("-x-");
      const isCanonicalCase = rawKey === parsed.canonical;
      return [
        {
          canonical: parsed.canonical,
          val,
          isSupported,
          isStandard,
          isCanonicalCase,
        },
      ];
    })
    .sort((a, b) => {
      if (a.isSupported !== b.isSupported) return a.isSupported ? -1 : 1;
      if (a.isStandard !== b.isStandard) return a.isStandard ? -1 : 1;
      if (a.isCanonicalCase !== b.isCanonicalCase) {
        return a.isCanonicalCase ? -1 : 1;
      }
      return 0;
    });

  const out: EventTranslationsMap<EventDetailTranslationDTO> = {};
  let count = 0;

  for (const { canonical, val } of entries) {
    if (Object.hasOwn(out, canonical)) continue;
    if (count >= MAX_TRANSLATION_LOCALES) break;
    if (!val || typeof val !== "object" || Array.isArray(val)) continue;

    const record = val as Record<string, unknown>;
    const title = cleanTranslationString(record.title);
    const description = includeDescription
      ? cleanTranslationString(record.description)
      : undefined;
    if (!title && !description) continue;

    const entry: EventDetailTranslationDTO = {};
    if (title) entry.title = title;
    if (description) entry.description = description;
    out[canonical] = entry;
    count += 1;
  }

  return count > 0 ? out : undefined;
}

const summaryTranslationsSchema = z
  .unknown()
  .transform((val) => parseEventTranslationsMap(val, false));
const detailTranslationsSchema = z
  .unknown()
  .transform((val) => parseEventTranslationsMap(val, true));
// The backend writes unset objects as null; the DTOs mark them optional.
const nullAsMissing = <T extends z.ZodTypeAny>(schema: T) =>
  schema.nullish().transform((value) => value ?? undefined);
const WeatherSchema = z.object({
  temperature: z.string(),
  description: z.string(),
  icon: z.string(),
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
    translations: summaryTranslationsSchema,
    // Absent on the pre-v2 backend still serving prod; default keeps it parsing.
    isPromoted: z.boolean().default(false),
    url: optionalText,
    description: requiredText,
    imageUrl: optionalText,
    startDate: z.string(),
    startTime: z.string().nullable(),
    endDate: z.string().nullable(),
    endTime: z.string().nullable(),
    location: requiredText,
    // A bad coordinate drops the pin, never the event.
    latitude: z.number().nullish().catch(null),
    longitude: z.number().nullish().catch(null),
    locationPrecision: z
      .enum(["VENUE", "CITY", "UNKNOWN"])
      .nullish()
      .catch(null),
    visits: z.number(),
    origin: EventOriginEnum,
    categories: z.array(CategorySummaryResponseDTOSchema),
    updatedAt: z.string().optional(),
    weather: nullAsMissing(WeatherSchema),
  })
  .passthrough();

// Event summary schema for list endpoints (optional location fields)
export const EventSummaryResponseDTOSchema = EventSummaryBaseSchema.extend({
  city: nullAsMissing(CitySummaryResponseDTOSchema),
  region: nullAsMissing(RegionSummaryResponseDTOSchema),
  province: nullAsMissing(ProvinceSummaryResponseDTOSchema),
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
    translations: summaryTranslationsSchema,
    url: optionalText.optional(),
    description: optionalText.optional(),
    imageUrl: optionalText.optional(),
    startDate: z.string(),
    startTime: z.string().nullable().optional(),
    endDate: z.string().nullable().optional(),
    endTime: z.string().nullable().optional(),
    location: requiredText.optional(),
    visits: z.number().optional(),
    categories: z.array(CategorySummaryResponseDTOSchema).optional(),
    city: CitySummaryResponseDTOSchema.optional().nullable(),
    region: RegionSummaryResponseDTOSchema.optional().nullable(),
    province: ProvinceSummaryResponseDTOSchema.optional().nullable(),
    isPromoted: z.boolean().default(false),
    origin: EventOriginEnum.optional(),
    hash: z.string().optional(),
    updatedAt: z.string().optional(),
    weather: nullAsMissing(WeatherSchema),
  })
  .passthrough();

// 🛡️ SECURITY: Sanitize HTML tags from meta fields to prevent XSS
function sanitizeMetaField(
  value: string | null | undefined
): string | null | undefined {
  if (!value || typeof value !== "string") return value;
  // Remove HTML tags and trim whitespace
  const text = value.replace(/<[^>]*>/g, "").trim();
  return isMissingText(text) ? null : text;
}

export const EventDetailResponseDTOSchema = EventDetailBaseSchema.extend({
  translations: detailTranslationsSchema,
  videoUrl: z.string().optional(),
  duration: z.string().optional(),
  tags: z.array(z.string()).optional(),
  relatedEvents: z.array(RelatedEventSummarySchema).optional(),
  // No length cap: a long price must not fail the whole event payload.
  price: optionalText.optional(),
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

  const { relatedEvents, ...fields } = result.data;
  const event: EventDetailResponseDTO = {
    ...fields,
    // The only cast: the backend sends full summaries, but this schema is
    // lenient so one partial related event can't drop the whole page.
    relatedEvents: relatedEvents as EventSummaryResponseDTO[] | undefined,
  };
  // Log warning if title is empty (helps identify data quality issues)
  if (!event.title || event.title.trim() === "") {
    console.warn(
      `Event with empty title detected: id=${event.id}, slug=${event.slug}`
    );
  }

  return enhanceEventDetail(event);
}

/** Page fields of the backend's PagedResponseDTO; extend it with `content`. */
export const PagedResponseMetaSchema = z.object({
  currentPage: z.number(),
  pageSize: z.number(),
  totalElements: z.number(),
  totalPages: z.number(),
  last: z.boolean(),
});

// Paged response schema for events
export const PagedEventResponseDTOSchema = PagedResponseMetaSchema.extend({
  content: z.array(EventSummaryResponseDTOSchema),
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

  const payload: PagedResponseDTO<EventSummaryResponseDTO> = result.data;
  return {
    ...payload,
    content: payload.content.map(enhanceEventSummary),
  };
}

/** Plain array of summaries (e.g. GET /events/promoted). Drops invalid items. */
export function parseEventSummaryList(input: unknown): EventSummaryResponseDTO[] {
  if (!Array.isArray(input)) {
    console.error("parseEventSummaryList: expected an array");
    return [];
  }
  return input.flatMap((item) => {
    const result = EventSummaryResponseDTOSchema.safeParse(item);
    if (!result.success) {
      console.error("parseEventSummaryList: invalid event", result.error);
      return [];
    }
    const event: EventSummaryResponseDTO = result.data;
    return [enhanceEventSummary(event)];
  });
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

  const categorized: CategorizedEvents = result.data;
  const normalizedEntries = Object.entries(categorized).map(
    ([category, events]) => [category, events.map(enhanceEventSummary)]
  );
  return Object.fromEntries(normalizedEntries) as CategorizedEvents;
}

/**
 * Cards never render translated descriptions; sanitize `translations` to title-only
 * and delete empty `translations` keys so listing RSC and SWR payloads stay small.
 */
function enhanceEventSummary<
  T extends {
    imageUrl?: string | null;
    hash?: string | null;
    updatedAt?: string;
    translations?: unknown;
  }
>(event: T): T {
  const enhanced = enhanceEventImage(event);
  const sanitizedTranslations = parseEventTranslationsMap(
    enhanced.translations,
    false,
  );
  if (sanitizedTranslations === undefined) {
    if ("translations" in enhanced) {
      const rest = { ...(enhanced as Record<string, unknown>) };
      delete rest.translations;
      return rest as T;
    }
    return enhanced;
  }
  return {
    ...enhanced,
    translations: sanitizedTranslations,
  };
}

function enhanceEventImage<
  T extends { imageUrl?: string | null; hash?: string | null; updatedAt?: string }
>(event: T): T {
  const cacheKey = event.hash || event.updatedAt;
  if (
    !cacheKey ||
    typeof event.imageUrl !== "string" ||
    event.imageUrl.length === 0
  ) {
    return event;
  }

  const nextImageUrl = withImageCacheKey(event.imageUrl, cacheKey);
  if (nextImageUrl === event.imageUrl) {
    return event;
  }

  return {
    ...event,
    imageUrl: nextImageUrl,
  };
}

function enhanceEventDetail(
  event: EventDetailResponseDTO
): EventDetailResponseDTO {
  let normalizedEvent = enhanceEventImage(event) as EventDetailResponseDTO;
  if (normalizedEvent.translations === undefined && "translations" in normalizedEvent) {
    const rest = { ...(normalizedEvent as unknown as Record<string, unknown>) };
    delete rest.translations;
    normalizedEvent = rest as unknown as EventDetailResponseDTO;
  }
  if (!event.relatedEvents || event.relatedEvents.length === 0) {
    return normalizedEvent;
  }

  // Related events' description is not rendered by card components and only
  // bloats the HTML/RSC payload. Drop it here so the wire size stays small.
  // JSON-LD ItemList items fall back to a synthesized description in generateJsonData.
  return {
    ...normalizedEvent,
    relatedEvents: event.relatedEvents.map((relatedEvent) => ({
      ...enhanceEventSummary(relatedEvent),
      description: "",
    })) as EventDetailResponseDTO["relatedEvents"],
  };
}
