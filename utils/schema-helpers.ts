import { siteUrl } from "@config/index";
import { normalizeEndTime } from "@utils/date-helpers";
import type {
  EventSummaryResponseDTO,
  EventDetailResponseDTO,
} from "types/api/event";
import type { VideoObject, SchemaOrgEvent } from "types/schema";

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

const sanitizeText = (value?: string | null): string => {
  if (!value || typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ");
};

const ensureIsoDate = (value?: string | null): string | undefined => {
  const trimmed = sanitizeText(value);
  if (!trimmed) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
    return trimmed.split("T")[0];
  }
  return undefined;
};

const ensureTime = (value?: string | null): string | undefined => {
  const trimmed = sanitizeText(value);
  if (!trimmed) return undefined;
  return /^\d{2}:\d{2}(:\d{2})?$/.test(trimmed) ? trimmed : undefined;
};

const buildDateTime = (
  date?: string | null,
  time?: string | null,
  fallbackDate?: string
): string | undefined => {
  const baseDate = ensureIsoDate(date) ?? ensureIsoDate(fallbackDate);
  if (!baseDate) return undefined;
  const cleanTime = ensureTime(time);
  return cleanTime ? `${baseDate}T${cleanTime}` : baseDate;
};

const parseDateFromIso = (iso?: string, isEnd?: boolean): Date | undefined => {
  if (!iso) return undefined;
  const hasTime = iso.includes("T");
  const candidate = hasTime ? iso : `${iso}T${isEnd ? "23:59:59" : "00:00:00"}`;
  const parsed = new Date(candidate);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

export const generateJsonData = (
  event: EventDetailResponseDTO | EventSummaryResponseDTO
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
  const startTime = "startTime" in event ? event.startTime : null;
  const endTime = "endTime" in event ? event.endTime : null;
  const normalizedEndTime = normalizeEndTime(startTime, endTime);

  const trimmedTitle = sanitizeText(title);
  const sanitizedLocation = sanitizeText(location);
  const cityName = sanitizeText(city?.name);
  const regionName = sanitizeText(region?.name);
  const fallbackPlace = cityName || regionName || sanitizedLocation || "Catalunya";

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

  // Enhanced image handling with validation, de-duplication and fallback
  const imageCandidates = [
    imageUrl,
    defaultImage,
  ];
  const images = Array.from(
    new Set(imageCandidates.filter((src): src is string => isValidHttpUrl(src)))
  );
  if (images.length === 0 && isValidHttpUrl(defaultImage)) {
    images.push(defaultImage);
  }
  if (!imageUrl || !isValidHttpUrl(imageUrl)) {
    logSchemaWarning(slug, "image");
  }

  const sanitizedDescription = sanitizeText(description);
  if (!sanitizedDescription) {
    logSchemaWarning(slug, "description");
  }
  const descriptionValue =
    sanitizedDescription ||
    `${trimmedTitle || "Esdeveniment cultural"} a ${fallbackPlace}`;

  const startDateWithTime = buildDateTime(startDate, startTime);
  const resolvedStartDate =
    startDateWithTime ??
    ensureIsoDate(startDate) ??
    new Date().toISOString();
  if (!startDateWithTime && !ensureIsoDate(startDate)) {
    logSchemaWarning(slug, "startDate");
  }

  const startDateOnly = resolvedStartDate.split("T")[0];
  const endDateWithTime = buildDateTime(endDate, normalizedEndTime, startDateOnly);
  const resolvedEndDate = endDateWithTime ?? startDateOnly ?? resolvedStartDate;
  if (!endDateWithTime && !ensureIsoDate(endDate)) {
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
          uploadDate: resolvedStartDate,
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

  const organizerName =
    sanitizedLocation || cityName || regionName || "Esdeveniments Catalunya";
  if (!trimmedTitle) {
    logSchemaWarning(slug, "name");
  }

  const buildOffer = () => {
    const baseOffer = {
      "@type": "Offer" as const,
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      url: `${siteUrl}/e/${slug}`,
      validFrom: resolvedStartDate,
    };

    if (event.type === "FREE") {
      return {
        ...baseOffer,
        price: 0,
      };
    }

    logSchemaWarning(slug, "offers", "missing price for paid event");
    return {
      ...baseOffer,
      price: "Consultar",
      priceSpecification: {
        "@type": "PriceSpecification" as const,
        priceCurrency: "EUR",
      },
    };
  };

  const offers = buildOffer();

  // Dynamic eventStatus (improves accuracy for past/ongoing events)
  const now = new Date();
  const startDateTime = parseDateFromIso(resolvedStartDate);
  const endDateTime = parseDateFromIso(resolvedEndDate, true);
  let eventStatusValue = "https://schema.org/EventScheduled";
  if (endDateTime && now > endDateTime) {
    eventStatusValue = "https://schema.org/EventCompleted";
  } else if (
    startDateTime &&
    now >= startDateTime &&
    (!endDateTime || now <= endDateTime)
  ) {
    eventStatusValue = "https://schema.org/EventInProgress";
  }

  const schemaName =
    trimmedTitle || `Esdeveniment a ${fallbackPlace}`.trim();
  const placeName = sanitizedLocation || addressLocality || fallbackPlace;

  return {
    "@context": "https://schema.org" as const,
    "@type": "Event" as const,
    "@id": `${siteUrl}/e/${slug}`,
    name: schemaName,
    url: `${siteUrl}/e/${slug}`,
    startDate: resolvedStartDate,
    endDate: resolvedEndDate,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: eventStatusValue,
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
    image: images,
    description: descriptionValue,
    inLanguage: "ca",
    ...(genre && { genre }),
    performer: {
      "@type": "PerformingGroup" as const,
      name: organizerName,
    },
    organizer: {
      "@type": "Organization" as const,
      name: organizerName,
      url: siteUrl,
    },
    offers,
    isAccessibleForFree: event.type === "FREE",
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
