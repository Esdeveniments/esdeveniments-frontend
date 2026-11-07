import { siteUrl } from "@config/index";
import { normalizeEndTime } from "@utils/date-helpers";
import { toLocalizedUrl } from "@utils/i18n-seo";
import { getProfileSlug, isVerifiedOrganization } from "@utils/user-helpers";
import { getProfileDisplayName } from "@utils/profile-name";
import { getEventPriceText, parseSchemaPrice } from "@utils/event-price";
import { formatCatalanA } from "@utils/string-helpers";
import { TIMEZONE_MADRID } from "@utils/constants";
import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import type {
  EventSummaryResponseDTO,
  EventDetailResponseDTO,
} from "types/api/event";
import {
  DEFAULT_LOCALE,
  localeToHrefLang,
  type AppLocale,
} from "types/i18n";
import type {
  VideoObject,
  SchemaOrgEvent,
  SchemaOrganizer,
  SchemaEventListItem,
} from "types/schema";

const SCHEMA_WARNING_LIMIT = 5;
const schemaWarningCounts: Record<string, number> = {};

const shouldLogSchemaWarnings =
  typeof process !== "undefined" &&
  (process.env.NODE_ENV !== "production" ||
    process.env.SCHEMA_WARNINGS === "1");

const logSchemaWarning = (
  slug: string | undefined,
  field: string,
  detail?: string
) => {
  if (!shouldLogSchemaWarnings) return;
  schemaWarningCounts[field] = (schemaWarningCounts[field] || 0) + 1;
  if (schemaWarningCounts[field] > SCHEMA_WARNING_LIMIT) return;
  const parts = [
    "[schema-warning]",
    `field=${field}`,
    `slug=${slug ?? "unknown"}`,
  ];
  if (detail) parts.push(detail);
  console.warn(parts.join(" "));
};

// Exported for testing
export const sanitizeText = (value?: string | null): string => {
  if (!value || typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ");
};

export const ensureIsoDate = (value?: string | null): string | undefined => {
  const trimmed = sanitizeText(value);
  if (!trimmed) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
    return trimmed.split("T")[0];
  }
  return undefined;
};

export const ensureTime = (value?: string | null): string | undefined => {
  const trimmed = sanitizeText(value);
  if (!trimmed) return undefined;
  return /^\d{2}:\d{2}(:\d{2})?$/.test(trimmed) ? trimmed : undefined;
};

/**
 * Appends the Europe/Madrid UTC offset (DST-aware) to a local
 * "YYYY-MM-DDTHH:mm[:ss]" value, as Google's Event docs recommend.
 * Date-only and already-offset values are returned unchanged.
 */
export const withMadridOffset = (value: string): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(
    value
  );
  if (!match) return value;
  const [y, mo, d, h, mi, s] = match.slice(1).map((part) => Number(part ?? 0));
  const local = new TZDate(y, mo - 1, d, h, mi, s, TIMEZONE_MADRID);
  return `${value}${format(local, "xxx")}`;
};

export const buildDateTime = (
  date?: string | null,
  time?: string | null,
  fallbackDate?: string
): string | undefined => {
  const baseDate = ensureIsoDate(date) ?? ensureIsoDate(fallbackDate);
  if (!baseDate) return undefined;
  const cleanTime = ensureTime(time);
  return cleanTime ? `${baseDate}T${cleanTime}` : baseDate;
};

export const parseDateFromIso = (iso?: string, isEnd?: boolean): Date | undefined => {
  if (!iso) return undefined;
  const hasTime = iso.includes("T");
  const candidate = hasTime ? iso : `${iso}T${isEnd ? "23:59:59" : "00:00:00"}`;
  const parsed = new Date(candidate);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

/**
 * The event's verified organization owner (e.g. a town council), linked to
 * its profile page. Admins and regular users only publish or import events,
 * so they are never presented as the organizer.
 */
const buildOrganizer = (
  event: EventDetailResponseDTO | EventSummaryResponseDTO,
  locale: AppLocale
): SchemaOrganizer | undefined => {
  const owner = "owner" in event ? event.owner : null;
  if (!owner || !isVerifiedOrganization(owner)) return undefined;
  const slug = getProfileSlug(owner);
  const name = getProfileDisplayName(owner);
  if (!slug || !name) return undefined;
  return {
    "@type": "Organization",
    name,
    url: toLocalizedUrl(`/perfil/${encodeURIComponent(slug)}`, locale),
  };
};

/** List entries that link to each event page (see SchemaEventListItem). */
export const buildEventListItems = (
  events: Pick<EventSummaryResponseDTO, "slug" | "title">[],
  locale: AppLocale = DEFAULT_LOCALE
): SchemaEventListItem[] =>
  events.map((event, index) => ({
    "@type": "ListItem",
    position: index + 1,
    url: toLocalizedUrl(`/e/${event.slug}`, locale),
    name: event.title,
  }));

export const generateJsonData = (
  event: EventDetailResponseDTO | EventSummaryResponseDTO,
  locale?: AppLocale
): SchemaOrgEvent => {
  const {
    title,
    slug,
    description,
    startDate,
    endDate,
    location,
    imageUrl,
    city = undefined,
    region = undefined,
  } = event;

  // Handle optional properties that only exist in EventDetailResponseDTO
  const eventDuration = "duration" in event ? event.duration || "" : "";
  const videoUrl = "videoUrl" in event ? event.videoUrl : undefined;
  const priceText = "price" in event ? getEventPriceText(event.price) : null;
  const schemaPrice = priceText ? parseSchemaPrice(priceText) : null;
  const startTime = "startTime" in event ? event.startTime : null;
  const endTime = "endTime" in event ? event.endTime : null;
  const normalizedEndTime = normalizeEndTime(startTime, endTime);

  const trimmedTitle = sanitizeText(title);
  const sanitizedLocation = sanitizeText(location);
  const cityName = sanitizeText(city?.name);
  const regionName = sanitizeText(region?.name);
  const fallbackPlace =
    cityName || regionName || sanitizedLocation || "Catalunya";
  // The fallback copy is Catalan, so contract an article in the name ("al Masnou").
  const fallbackPlaceIn = formatCatalanA(fallbackPlace, "general", false);

  if (!cityName && !regionName && !sanitizedLocation) {
    logSchemaWarning(slug, "address", "missing location context");
  }

  const defaultImage = `${siteUrl}/static/images/logo-seo-meta.webp`;

  const isValidHttpUrl = (maybeUrl: string | undefined | null): boolean => {
    if (!maybeUrl || typeof maybeUrl !== "string") return false;
    const trimmed = maybeUrl.trim();
    if (trimmed.length === 0) return false;
    try {
      const u = new URL(trimmed);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  };

  // Google: event images "must represent the marked up content", so the site
  // logo is never used as an event image; `image` is omitted instead.
  const images = imageUrl && isValidHttpUrl(imageUrl) ? [imageUrl] : [];
  if (images.length === 0) {
    logSchemaWarning(slug, "image");
  }

  const sanitizedDescription = sanitizeText(description);
  if (!sanitizedDescription) {
    logSchemaWarning(slug, "description");
  }
  const descriptionValue =
    sanitizedDescription ||
    `${trimmedTitle || "Esdeveniment cultural"} ${fallbackPlaceIn}`;

  const startDateWithTime = buildDateTime(startDate, startTime);
  const resolvedStartDate =
    startDateWithTime ?? ensureIsoDate(startDate) ?? new Date().toISOString();
  if (!startDateWithTime && !ensureIsoDate(startDate)) {
    logSchemaWarning(slug, "startDate");
  }

  const startDateOnly = resolvedStartDate.split("T")[0];
  const endDateWithTime = buildDateTime(
    endDate,
    normalizedEndTime,
    startDateOnly
  );
  const resolvedEndDate = endDateWithTime ?? startDateOnly ?? resolvedStartDate;
  // Warn when the original data had no explicit end date or time.
  // Note: endDateWithTime will always have a value due to fallback to startDateOnly,
  // so we check the original input values instead.
  if (!ensureIsoDate(endDate) && !ensureTime(normalizedEndTime)) {
    logSchemaWarning(slug, "endDate");
  }

  const videoObject: VideoObject | null =
    videoUrl && isValidHttpUrl(videoUrl)
      ? {
          "@type": "VideoObject" as const,
          name: trimmedTitle || fallbackPlace,
          contentUrl: videoUrl,
          description: descriptionValue,
          thumbnailUrl: images[0] || defaultImage,
          uploadDate: withMadridOffset(resolvedStartDate),
        }
      : null;

  const addressLocality = cityName || regionName || fallbackPlace;
  const streetAddress = sanitizedLocation || addressLocality;
  const postalCode = sanitizeText(city?.postalCode);
  const addressRegion = regionName || "CT";

  const genre = (() => {
    if (
      !("categories" in event) ||
      !event.categories ||
      event.categories.length === 0
    ) {
      return undefined;
    }
    const names = event.categories
      .map((category) => category?.name)
      .filter(
        (name): name is string =>
          typeof name === "string" && name.trim().length > 0
      );
    const unique = Array.from(new Set(names));
    return unique.length > 0 ? unique : undefined;
  })();

  if (!trimmedTitle) {
    logSchemaWarning(slug, "name");
  }

  const localeToUse = locale ?? DEFAULT_LOCALE;
  const inLanguage = localeToHrefLang[localeToUse] ?? localeToUse;
  const slugPart = typeof slug === "string" ? slug : "";
  const eventUrl = toLocalizedUrl(`/e/${slugPart}`, localeToUse);

  // Always emit EventScheduled. schema.org/EventStatusType only defines:
  // EventScheduled, EventCancelled, EventMovedOnline, EventPostponed,
  // EventRescheduled. "EventInProgress" and "EventCompleted" are NOT valid
  // values — emitting them suppresses Google Event rich results. Past events
  // are filtered by Google's freshness policy regardless of this field.

  const schemaName = trimmedTitle || `Esdeveniment ${fallbackPlaceIn}`.trim();
  const organizer = buildOrganizer(event, localeToUse);
  const placeName = sanitizedLocation || addressLocality || fallbackPlace;

  return {
    "@context": "https://schema.org" as const,
    "@type": "Event" as const,
    "@id": eventUrl,
    name: schemaName,
    url: eventUrl,
    startDate: withMadridOffset(resolvedStartDate),
    endDate: withMadridOffset(resolvedEndDate),
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place" as const,
      name: placeName,
      ...(city?.latitude &&
        city?.longitude && {
          geo: {
            "@type": "GeoCoordinates" as const,
            latitude: city.latitude,
            longitude: city.longitude,
          },
        }),
      address: {
        "@type": "PostalAddress" as const,
        streetAddress: streetAddress || undefined,
        addressLocality: addressLocality || undefined,
        postalCode: postalCode || undefined,
        addressCountry: "ES",
        addressRegion,
      },
    },
    ...(images.length > 0 && { image: images }),
    description: descriptionValue,
    inLanguage,
    ...(genre && { genre }),
    // No performer: the backend has none, and the venue is not one (Google
    // sd-policies). The venue goes in `location`, not `organizer`.
    ...(organizer && { organizer }),
    // isAccessibleForFree removed: event.type defaults to "FREE" so this is unreliable.
    // We only want to claim "Free" when we are 100% sure.
    // offers only when the price text is exactly "free" (0) or one euro
    // amount; no url, since Google wants a ticket page there, not ours.
    ...(schemaPrice !== null && {
      offers: {
        "@type": "Offer" as const,
        price: schemaPrice,
        priceCurrency: "EUR",
      },
    }),
    ...(isValidHttpUrl(event.url) && {
      sameAs: event.url,
    }),
    ...(eventDuration &&
      eventDuration.trim() !== "" && { duration: eventDuration }),
    ...(videoObject ? { video: videoObject } : {}),
  };
};

// Backward-compatible alias with a clearer name for AEO/GEO context
export const buildEventSchema = generateJsonData;

export const generateHowToSchema = (
  name: string,
  steps: string[]
): import("types/schema").HowTo => {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    step: steps.map((text) => ({
      "@type": "HowToStep",
      text,
    })),
  };
};
