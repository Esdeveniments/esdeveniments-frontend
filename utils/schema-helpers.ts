import { siteUrl } from "@config/index";
import { normalizeEndTime } from "@utils/date-helpers";
import type {
  EventSummaryResponseDTO,
  EventDetailResponseDTO,
} from "types/api/event";
import type { VideoObject, SchemaOrgEvent } from "types/schema";

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
    // Future: Add additional image sources here when available
    // 'imageUploaded' in event ? event.imageUploaded : undefined,
    // 'eventImage' in event ? event.eventImage : undefined,
    defaultImage,
  ];
  const images = Array.from(
    new Set(imageCandidates.filter((src): src is string => isValidHttpUrl(src)))
  );
  if (images.length === 0 && isValidHttpUrl(defaultImage)) {
    images.push(defaultImage);
  }

  const videoObject: VideoObject | null =
    videoUrl && isValidHttpUrl(videoUrl)
      ? {
          "@type": "VideoObject" as const,
          name: title,
          contentUrl: videoUrl,
          description,
          thumbnailUrl: images[0] || defaultImage, // Use first available image
          uploadDate: startDate,
        }
      : null;

  // Enhanced location data with better fallbacks and fixed country
  const getLocationData = () => {
    return {
      streetAddress: location || "",
      addressLocality: city?.name || "",
      postalCode: city?.postalCode || "",
      addressCountry: "ES", // Fixed: Always use "ES" for Spain
      // All events are in Catalonia, so default to "CT" when region data is unavailable
      addressRegion: region?.name || "CT",
    };
  };

  // Generate genre from categories
  const getGenre = () => {
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
  };

  // Enhanced datetime with time if available
  const getEnhancedDateTime = (date: string, time: string | null) => {
    return time ? `${date}T${time}` : date;
  };

  // Enhanced offers based on event type - only include for FREE events
  // For PAID events without known price, omit offers entirely per Google's best practices
  const getOffers = () => {
    // Only include offers for FREE events
    if (event.type === "FREE") {
      return {
        "@type": "Offer" as const,
        price: 0,
        priceCurrency: "EUR",
        availability: "https://schema.org/InStock",
        url: `${siteUrl}/e/${slug}`,
        validFrom: getEnhancedDateTime(startDate, startTime),
      };
    }
    // For PAID events without price data, omit offers entirely
    return undefined;
  };

  // Get organizer/performer name with fallback to location/venue or city name
  // For cultural events, organizer and performer are often the same entity
  const getOrganizerName = (): string => {
    // Use location (venue name) as primary fallback, then city name, then default
    // Explicitly filter out empty/whitespace-only strings to ensure we always return a meaningful name
    const locationName = location.trim();
    const cityName = city?.name?.trim();
    if (locationName.length > 0) return locationName;
    if (cityName && cityName.length > 0) return cityName;
    return "Esdeveniments Catalunya";
  };

  // Dynamic eventStatus (improves accuracy for past/ongoing events)
  const now = new Date();
  const parseDateTime = (
    date: string | undefined | null,
    time: string | null,
    isEnd?: boolean
  ): Date | undefined => {
    if (!date) return undefined;
    const hasTime = typeof time === "string" && time.trim().length > 0;
    // When time is missing, treat start of day as 00:00:00 and end of day as 23:59:59
    const iso = hasTime
      ? `${date}T${time}`
      : `${date}T${isEnd ? "23:59:59" : "00:00:00"}`;
    const parsed = new Date(iso);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  };
  const startDateTime = parseDateTime(startDate, startTime);
  const endDateTime = parseDateTime(endDate, normalizedEndTime, true);
  let eventStatusValue = "https://schema.org/EventScheduled";
  if (endDateTime && now > endDateTime) {
    eventStatusValue = "https://schema.org/EventCompleted"; // Completed
  } else if (
    startDateTime &&
    now >= startDateTime &&
    (!endDateTime || now <= endDateTime)
  ) {
    eventStatusValue = "https://schema.org/EventInProgress"; // Live
  }

  // Compute offers once (only for FREE events)
  const offers = getOffers();

  return {
    "@context": "https://schema.org" as const,
    "@type": "Event" as const,
    "@id": `${siteUrl}/e/${slug}`,
    name: title,
    url: `${siteUrl}/e/${slug}`,
    startDate: getEnhancedDateTime(startDate, startTime),
    endDate: getEnhancedDateTime(endDate, normalizedEndTime),
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: eventStatusValue,
    location: {
      "@type": "Place" as const,
      name: location,
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
        ...getLocationData(),
      },
    },
    image: images,
    description,
    inLanguage: "ca",
    ...(getGenre() && { genre: getGenre() }),
    // For cultural events, performer and organizer are often the same entity
    // Use same fallback logic for both (venue/city name)
    performer: {
      "@type": "PerformingGroup" as const,
      name: getOrganizerName(),
    },
    organizer: {
      "@type": "Organization" as const,
      name: getOrganizerName(),
      url: siteUrl,
    },
    // Only include offers for FREE events (omit for PAID without price)
    ...(offers ? { offers } : {}),
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
