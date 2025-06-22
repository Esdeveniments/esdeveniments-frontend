import { siteUrl } from "@config/index";
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
    province = undefined,
  } = event;

  // Handle optional properties that only exist in EventDetailResponseDTO
  const duration = "duration" in event ? event.duration || "" : "";
  const videoUrl = "videoUrl" in event ? event.videoUrl : undefined;

  const defaultImage = `${siteUrl}/static/images/logo-seo-meta.webp`;

  // Enhanced image handling with future-proof fallback logic
  const images = [
    imageUrl,
    // Future: Add additional image sources here when available
    // 'imageUploaded' in event ? event.imageUploaded : undefined,
    // 'eventImage' in event ? event.eventImage : undefined,
    defaultImage,
  ].filter(Boolean) as string[];

  const videoObject: VideoObject | null = videoUrl
    ? {
        "@type": "VideoObject" as const,
        name: title,
        contentUrl: videoUrl,
        description,
        thumbnailUrl: images[0] || defaultImage, // Use first available image
        uploadDate: startDate,
      }
    : null;

  // Enhanced location data with better fallbacks
  const getLocationData = () => {
    return {
      streetAddress: location || "",
      addressLocality: city?.name || "",
      postalCode: city?.postalCode || "",
      addressCountry: province?.name || "ES",
      addressRegion: region?.name || "CT",
    };
  };

  // Generate genre from categories
  const getGenre = () => {
    return "categories" in event && event.categories?.length > 0
      ? event.categories.map((category) => category.name)
      : undefined;
  };

  // Enhanced offers based on event type
  const getOffers = () => {
    const baseOffer = {
      "@type": "Offer" as const,
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      url: `${siteUrl}/e/${slug}`,
      validFrom: startDate,
    };

    if (event.type === "FREE") {
      return {
        ...baseOffer,
        price: 0,
      };
    } else {
      return {
        ...baseOffer,
        price: "Contact for pricing",
        priceSpecification: {
          "@type": "PriceSpecification" as const,
          priceCurrency: "EUR",
        },
      };
    }
  };

  return {
    "@context": "https://schema.org" as const,
    "@type": "Event" as const,
    name: title,
    url: `${siteUrl}/e/${slug}`,
    startDate,
    endDate,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
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
    ...(getGenre() && { genre: getGenre() }),
    performer: {
      "@type": "PerformingGroup" as const,
      name: location,
    },
    organizer: {
      "@type": "Organization" as const,
      name: location,
      url: siteUrl,
    },
    offers: getOffers(),
    isAccessibleForFree: event.type === "FREE",
    duration,
    ...(videoObject ? { video: videoObject } : {}),
  };
};
