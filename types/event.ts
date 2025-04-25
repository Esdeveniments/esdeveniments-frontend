import { z } from "zod";
import type {
  RegionSummaryResponseDTO,
  CitySummaryResponseDTO,
  EventDetailResponseDTO,
} from "./api/event";
import type { RefObject } from "react";
import type { DeleteReason, Option } from "./common";

// --- Zod schema for canonical event form data ---
export const EventFormSchema = z.object({
  id: z.string().optional(),
  slug: z.string().min(1, "Slug obligatori"),
  title: z.string().min(1, "Títol obligatori"),
  description: z.string().min(1, "Descripció obligatòria"),
  type: z.enum(["FREE", "PAID"]),
  startDate: z.union([z.string(), z.date()]),
  startTime: z.union([z.string(), z.date()]),
  endDate: z.union([z.string(), z.date()]),
  endTime: z.union([z.string(), z.date()]),
  region: z.any().nullable(),
  town: z.any().nullable(),
  location: z.string().min(1, "Localització obligatòria"),
  imageUrl: z.string().nullable(),
  url: z.string().url("URL invàlida"),
  categories: z.array(z.any()),
  email: z.string().email("Email invàlid").optional(),
});

export type EventFormSchemaType = z.infer<typeof EventFormSchema>;

// --- Centralized event form types ---
export interface FormData {
  id?: string;
  slug: string;
  title: string;
  description: string;
  type: "FREE" | "PAID";
  startDate: string | Date;
  startTime: string | Date;
  endDate: string | Date;
  endTime: string | Date;
  region: RegionSummaryResponseDTO | { value: string; label: string } | null;
  town: CitySummaryResponseDTO | { value: string; label: string } | null;
  location: string;
  imageUrl: string | null;
  url: string;
  categories: Array<
    { id: number; name: string } | { value: string; label: string } | number
  >;
  email?: string; // UI only
}

export interface FormState {
  isDisabled: boolean;
  isPristine: boolean;
  message: string;
}

/**
 * Canonical FormData for event creation/edit forms.
 * Use this interface everywhere for event forms.
 * - For UI, use Option | null for region/town, then convert to DTO for backend.
 * - Dates should be string (ISO) for storage, can be Date in UI state.
 */

export interface EditEventProps {
  event: FormData;
}

export interface EventData extends EventDetailResponseDTO {
  mapsLocation?: string;
  timeUntil?: string;
  nameDay?: string;
  formattedStart?: string;
  formattedEnd?: string;
  isFullDayEvent?: boolean;
  durationInHours?: number;
  eventImage?: string;
  eventUrl?: string;
  videoUrl?: string;
}

export interface EventProps {
  event: EventData;
  fallback?: {
    [key: string]: EventData;
  };
}

export interface EventPageProps {
  params: {
    eventId: string;
  };
}

export interface QueryParams {
  newEvent?: boolean;
  edit_suggested?: boolean;
}

export interface EventRefs {
  mapsRef: RefObject<HTMLDivElement>;
  weatherRef: RefObject<HTMLDivElement>;
  eventsAroundRef: RefObject<HTMLDivElement>;
  editModalRef: RefObject<HTMLDivElement>;
}

export interface DynamicOptionsLoadingProps {
  error?: Error | null;
  isLoading?: boolean;
  pastDelay?: boolean;
  timedOut?: boolean;
}

export interface FetchEventsParams {
  page?: number;
  maxResults: number;
  q?: string;
  town?: string;
  zone?: string;
  category?: string;
  region?: string;
  from?: string;
  until?: string;
  filterByDate?: boolean;
  normalizeRss?: boolean;
}

export interface EventHeaderProps {
  title: string;
  eventDate: string | { string: string; jsx: React.ReactNode };
  location: string;
  city?: string;
  region?: string;
}

export interface EventMediaProps {
  event: EventDetailResponseDTO;
  title: string;
}

export interface EventShareBarProps {
  slug: string;
  title: string;
  eventDateString: string;
  location: string;
  cityName: string;
  regionName: string;
}

export interface EventDescriptionProps {
  description: string;
}

export interface EventTagsProps {
  tags: string[];
}

export interface EventCalendarProps {
  event: EventDetailResponseDTO;
}

export type HideNotification = (hide: boolean) => void;

export interface EventNotificationProps {
  url?: string;
  title?: string;
  type?: "warning" | "success";
  customNotification?: boolean;
  hideNotification?: HideNotification;
  hideClose?: boolean;
}

export interface EventNotificationsProps {
  newEvent?: boolean | undefined;
  title: string;
  slug: string;
  showThankYouBanner: boolean;
  setShowThankYouBanner: HideNotification;
}

export interface EventMapsProps {
  location: string;
}

export interface EventWeatherProps {
  startDate: { date?: string; dateTime?: string } | string;
  location: string;
}

export interface EventImageProps {
  image: string | undefined;
  title: string;
  location: string;
  nameDay: string;
  formattedStart: string;
}

export interface EventLocationProps {
  location: string;
  cityName: string;
  regionName: string;
}

export interface EventFormProps {
  form: FormData;
  initialValues: FormData;
  onSubmit: (data: FormData) => Promise<void> | void;
  submitLabel: string;
  isEditMode?: boolean;
  isLoading?: boolean;
  regionOptions: Option[];
  cityOptions: Option[];
  isLoadingRegionsWithCities: boolean;
  handleFormChange: <K extends keyof FormData>(
    name: K,
    value: FormData[K]
  ) => void;
  handleImageChange: (file: File) => void;
  handleRegionChange: (region: Option | null) => void;
  handleTownChange: (town: Option | null) => void;
  progress: number;
  imageToUpload: string | null;
}

export { DeleteReason };
