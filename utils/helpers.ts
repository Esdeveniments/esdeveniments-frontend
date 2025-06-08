import { DAYS, MONTHS, CATEGORIES } from "./constants";
import { siteUrl } from "@config/index";
import { fetchCityById } from "@lib/api/cities";
import { fetchRegionById } from "@lib/api/regions";
import { type Option, CategoryKey } from "types/common";
import {
  EventSummaryResponseDTO,
  EventDetailResponseDTO,
} from "types/api/event";

// Centralized helpers for extracting region/town values from form fields
export function getRegionValue(
  region: Option | { id: string | number } | null | undefined
): string | null {
  if (!region) return null;
  if (typeof region === "object" && "value" in region) return region.value;
  if (typeof region === "object" && "id" in region) return String(region.id);
  return null;
}

export function getTownValue(
  town: Option | { id: string | number } | null | undefined
): string | null {
  if (!town) return null;
  if (typeof town === "object" && "value" in town) return town.value;
  if (typeof town === "object" && "id" in town) return String(town.id);
  return null;
}

export interface DateObject {
  date?: string;
  dateTime?: string;
}

export interface FormattedDateResult {
  originalFormattedStart: string;
  formattedStart: string;
  formattedEnd: string | null;
  startTime: string;
  endTime: string;
  nameDay: string;
  startDate: Date;
  isLessThanFiveDays: boolean;
  isMultipleDays: boolean;
  duration: string;
}

export interface Location {
  lat: number;
  lng: number;
}

interface VideoObject {
  "@type": "VideoObject";
  name: string;
  contentUrl: string;
  description: string;
  thumbnailUrl: string;
  uploadDate: string;
}

interface SchemaOrgEvent {
  "@context": "https://schema.org";
  "@type": "Event";
  name: string | undefined;
  url: string;
  startDate: string;
  endDate: string;
  eventAttendanceMode: string;
  eventStatus: string;
  location: {
    "@type": "Place";
    name: string | undefined;
    address: {
      "@type": "PostalAddress";
      streetAddress: string | undefined;
      addressLocality: string | undefined;
      postalCode: string | undefined;
      addressCountry: string;
      addressRegion: string;
    };
  };
  image: string[];
  description: string;
  performer: {
    "@type": "PerformingGroup";
    name: string | undefined;
  };
  organizer: {
    "@type": "Organization";
    name: string | undefined;
    url: string;
  };
  offers: {
    "@type": "Offer";
    price: number;
    priceCurrency: string;
    availability: string;
    url: string;
    validFrom: string;
  };
  isAccessibleForFree: boolean;
  duration: string;
  video?: VideoObject;
}

export const isLessThanFiveDays = (date: Date): boolean => {
  const currentDate = new Date();
  const timeDiff = currentDate.getTime() - date.getTime();
  const dayDiff = timeDiff / (1000 * 3600 * 24);
  return Math.floor(Math.abs(dayDiff)) < 5;
};

export const sanitize = (url: string): string => {
  const accents = [
    /[\u0300-\u030f]/g,
    /[\u1AB0-\u1AFF]/g,
    /[\u1DC0-\u1DFF]/g,
    /[\u1F00-\u1FFF]/g,
    /[\u2C80-\u2CFF]/g,
    /[\uFB00-\uFB06]/g,
  ];

  let sanitizedUrl = url.toLowerCase();
  sanitizedUrl = sanitizedUrl.replace(/\s+$/, "");

  accents.forEach((regex) => {
    sanitizedUrl = sanitizedUrl.normalize("NFD").replace(regex, "");
  });

  sanitizedUrl = sanitizedUrl.replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-");
  sanitizedUrl = sanitizedUrl.replace(/[-\s]+/g, "-");

  return sanitizedUrl;
};

export const slug = (str: string, formattedStart: string, id: string): string =>
  `${sanitize(str)}-${formattedStart
    .toLowerCase()
    .replace(/ /g, "-")
    .replace("---", "-")
    .replace("ç", "c")
    .replace(/--/g, "-")}-${id}`;

export const convertTZ = (date: Date | string, tzString: string): Date =>
  new Date(
    (typeof date === "string" ? new Date(date) : date).toLocaleString("en-US", {
      timeZone: tzString,
    })
  );

function calculateDetailedDurationISO8601(start: Date, end: Date): string {
  const differenceInMs = end.getTime() - start.getTime();

  const days = Math.floor(differenceInMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (differenceInMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  const minutes = Math.floor((differenceInMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((differenceInMs % (1000 * 60)) / 1000);

  let duration = "P";
  if (days > 0) duration += `${days}D`;

  if (hours > 0 || minutes > 0 || seconds > 0) {
    duration += "T";
    if (hours > 0) duration += `${hours}H`;
    if (minutes > 0) duration += `${minutes}M`;
    if (seconds > 0) duration += `${seconds}S`;
  }

  return duration === "P" ? "PT1H" : duration;
}

export const getFormattedDate = (
  start: string | DateObject,
  end?: string | DateObject
): FormattedDateResult => {
  const startDate = new Date(
    typeof start === "object" ? start.date || start.dateTime || "" : start
  );
  const endDate = end
    ? new Date(typeof end === "object" ? end.date || end.dateTime || "" : end)
    : startDate;

  const startDateConverted = convertTZ(startDate, "Europe/Madrid");
  const endDateConverted = convertTZ(endDate, "Europe/Madrid");
  const duration = calculateDetailedDurationISO8601(startDate, endDate);

  let isMultipleDays = false;
  let isSameMonth = false;
  let isSameYear = false;
  const startDay = startDateConverted.getDate();
  const endDay = endDateConverted.getDate();

  if (startDay !== endDay) isMultipleDays = true;
  if (startDateConverted.getMonth() === endDateConverted.getMonth())
    isSameMonth = true;
  if (startDateConverted.getFullYear() === endDateConverted.getFullYear())
    isSameYear = true;

  const weekDay = startDateConverted.getDay();
  const month = startDateConverted.getMonth();
  const year = startDateConverted.getFullYear();
  const nameDay = DAYS[weekDay];
  const nameMonth = MONTHS[month];

  const originalFormattedStart = `${startDay} de ${nameMonth} del ${year}`;
  const formattedStart =
    isMultipleDays && isSameMonth
      ? `${startDay}`
      : `${startDay} de ${nameMonth}${
          isMultipleDays && isSameYear ? "" : ` del ${year}`
        }`;
  const formattedEnd = `${endDay} de ${
    MONTHS[endDateConverted.getMonth()]
  } del ${endDateConverted.getFullYear()}`;

  const startTime = `${startDateConverted.getHours()}:${String(
    startDateConverted.getMinutes()
  ).padStart(2, "0")}`;
  const endTime = `${endDateConverted.getHours()}:${String(
    endDateConverted.getMinutes()
  ).padStart(2, "0")}`;

  return {
    originalFormattedStart,
    formattedStart,
    formattedEnd: isMultipleDays ? formattedEnd : null,
    startTime,
    endTime,
    nameDay,
    startDate: isMultipleDays
      ? (startDay <= new Date().getDate() &&
          convertTZ(new Date(), "Europe/Madrid")) ||
        startDateConverted
      : startDateConverted,
    isLessThanFiveDays: isLessThanFiveDays(startDate),
    isMultipleDays,
    duration,
  };
};

export const nextDay = (x: number): Date => {
  const now = new Date();
  now.setDate(now.getDate() + ((x + (7 - now.getDay())) % 7));
  const convertedDate = convertTZ(now, "Europe/Madrid");
  return convertedDate;
};

export const isWeekend = (): boolean => {
  const today = new Date();
  return today.getDay() === 0 || today.getDay() === 5 || today.getDay() === 6;
};

export const monthsName: string[] = [
  "gener",
  "febrer",
  "març",
  "abril",
  "maig",
  "juny",
  "juliol",
  "agost",
  "setembre",
  "octubre",
  "novembre",
  "desembre",
];

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
  const images = [imageUrl, defaultImage].filter(Boolean) as string[];

  const videoObject = videoUrl
    ? {
        "@type": "VideoObject" as const,
        name: title,
        contentUrl: videoUrl,
        description,
        thumbnailUrl: imageUrl || defaultImage,
        uploadDate: startDate,
      }
    : null;

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
      address: {
        "@type": "PostalAddress" as const,
        streetAddress: location,
        addressLocality: city?.name || "",
        postalCode: city?.postalCode || "",
        addressCountry: province?.name || "ES",
        addressRegion: region?.name || "CT",
      },
    },
    image: images,
    description,
    performer: {
      "@type": "PerformingGroup" as const,
      name: location,
    },
    organizer: {
      "@type": "Organization" as const,
      name: location,
      url: siteUrl,
    },
    offers: {
      "@type": "Offer" as const,
      price: 0,
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      url: `${siteUrl}/e/${slug}`,
      validFrom: startDate,
    },
    isAccessibleForFree: true,
    duration,
    ...(videoObject ? { video: videoObject } : {}),
  };
};

export type PlaceTypeAndLabel = { type: "region" | "town"; label: string };

export const getPlaceTypeAndLabel = async (
  place: string
): Promise<PlaceTypeAndLabel> => {
  if (place && !isNaN(Number(place))) {
    // Try region
    const region = await fetchRegionById(place);
    if (region) return { type: "region", label: region.name };
    // Try city
    const city = await fetchCityById(place);
    if (city) return { type: "town", label: city.name };
  }
  // Fallback
  return { type: "town", label: place };
};

export const truncateString = (str: string, num: number): string => {
  if (str.length <= num) return str;
  return str.slice(0, num) + "...";
};

export const getDistance = (
  location1: Location,
  location2: Location
): number => {
  const R = 6371;
  const dLat = deg2rad(location2.lat - location1.lat);
  const dLon = deg2rad(location2.lng - location1.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(location1.lat)) *
      Math.cos(deg2rad(location2.lat)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const deg2rad = (deg: number): number => {
  return deg * (Math.PI / 180);
};

export const sendEventToGA = (
  filterName: string,
  filterValue: string
): void => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", "filter_change", {
      event_category: "Filter",
      event_label: `${filterName}: ${filterValue}`,
    });
  }
};

export const env: string =
  process.env.NODE_ENV !== "production"
    ? "dev"
    : process.env.NEXT_PUBLIC_VERCEL_ENV === "preview" ||
      process.env.NEXT_PUBLIC_VERCEL_ENV === "development"
    ? "staging"
    : "prod";

export const getRegionFromQuery = (q: string): string => {
  const parts = q.split(" ");
  if (parts.length > 1) {
    return parts[parts.length - 1];
  }
  return "";
};

export const findCategoryKeyByValue = (
  value: string
): CategoryKey | undefined => {
  return (Object.keys(CATEGORIES) as CategoryKey[]).find(
    (key) => CATEGORIES[key] === value
  );
};

// --- Helper: Parse time to { hour, minute, second, nano } ---
/**
 * Converts ISO time string or Date to EventTimeDTO shape for backend requests.
 * Provides a default fallback for invalid or empty input.
 * Accepts:
 *   - "14:30:00" or "14:30" (ISO time format)
 *   - Date object
 *   - null/undefined returns default { hour: 0, minute: 0, second: 0, nano: 0 }
 */
export function parseTimeToEventTimeDTO(
  dateOrString: Date | string | null | undefined
): EventTimeDTO {
  if (
    !dateOrString ||
    (typeof dateOrString === "string" && dateOrString.trim() === "")
  ) {
    return { hour: 0, minute: 0, second: 0, nano: 0 };
  }

  let date: Date | null = null;

  if (typeof dateOrString === "string") {
    const parts = dateOrString.split(":");
    if (parts.length < 2 || parts.length > 3) {
      return { hour: 0, minute: 0, second: 0, nano: 0 };
    }
    const [h, m, s] = parts.map(Number);
    // Validate numbers and ranges
    if (
      isNaN(h) ||
      isNaN(m) ||
      (parts.length === 3 && isNaN(s)) ||
      h < 0 ||
      h > 23 ||
      m < 0 ||
      m > 59 ||
      (typeof s === "number" && (s < 0 || s > 59))
    ) {
      return { hour: 0, minute: 0, second: 0, nano: 0 };
    }
    date = new Date(1970, 0, 1, h, m, s || 0);
  } else if (dateOrString instanceof Date && !isNaN(dateOrString.getTime())) {
    date = dateOrString;
  }

  if (!date) {
    return { hour: 0, minute: 0, second: 0, nano: 0 };
  }

  return {
    hour: date.getHours(),
    minute: date.getMinutes(),
    second: date.getSeconds(),
    nano: 0,
  };
}

// --- Mapping: FormData to backend DTO (EventCreateRequestDTO/EventUpdateRequestDTO) ---
import type { FormData } from "types/event";
import type {
  EventCreateRequestDTO,
  EventUpdateRequestDTO,
  EventTimeDTO,
} from "types/api/event";

export function formDataToBackendDTO(
  form: FormData
): EventCreateRequestDTO | EventUpdateRequestDTO {
  return {
    title: form.title,
    type: form.type ?? "FREE",
    url: form.url,
    description: form.description,
    imageUrl: form.imageUrl,
    regionId:
      form.region && "id" in form.region
        ? form.region.id
        : form.region && "value" in form.region
        ? Number(form.region.value)
        : 0,
    cityId:
      form.town && "id" in form.town
        ? form.town.id
        : form.town && "value" in form.town
        ? Number(form.town.value)
        : 0,
    startDate: form.startDate, // Already in YYYY-MM-DD format
    startTime: parseTimeToEventTimeDTO(form.startTime),
    endDate: form.endDate, // Already in YYYY-MM-DD format
    endTime: parseTimeToEventTimeDTO(form.endTime),
    location: form.location,
    categories: Array.isArray(form.categories)
      ? form.categories
          .map((cat: { id?: number; value?: string } | number | string) =>
            typeof cat === "object" && cat !== null && "id" in cat
              ? cat.id
              : cat && typeof cat === "object" && "value" in cat
              ? Number(cat.value)
              : Number(cat)
          )
          .filter((id): id is number => typeof id === "number" && !isNaN(id))
      : [],
  };
}

// --- Mapping: EventDetailResponseDTO to FormData ---

export function eventDtoToFormData(event: EventDetailResponseDTO): FormData {
  return {
    id: event.id ? String(event.id) : undefined,
    slug: event.slug || "",
    title: event.title || "",
    description: event.description || "",
    type: event.type || "FREE",
    startDate: event.startDate || "", // Keep as string, already in YYYY-MM-DD format
    startTime: event.startTime, // Keep as string | null, already in ISO time format
    endDate: event.endDate || "", // Keep as string, already in YYYY-MM-DD format
    endTime: event.endTime, // Keep as string | null, already in ISO time format
    region: event.region
      ? { value: String(event.region.id), label: event.region.name }
      : null,
    town: event.city
      ? { value: String(event.city.id), label: event.city.name }
      : null,
    location: event.location || "",
    imageUrl: event.imageUrl || null,
    url: event.url || "",
    categories: Array.isArray(event.categories)
      ? event.categories.map((cat) => ({ id: cat.id, name: cat.name }))
      : [],
    email: "", // UI only
  };
}
