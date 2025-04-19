// --- Centralized event form types ---
import type {
  RegionSummaryResponseDTO,
  CitySummaryResponseDTO,
} from "./api/event";
import type { RefObject } from "react";
import type { DeleteReason } from "./common";
import type { EventDetailResponseDTO } from "./api/event";

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
export interface FormData {
  id?: string;
  title: string;
  description: string;
  startDate: string | Date; // Use string for backend, Date for UI state
  endDate: string | Date;
  region: RegionSummaryResponseDTO | { value: string; label: string } | null;
  town: CitySummaryResponseDTO | { value: string; label: string } | null;
  location: string;
  imageUrl: string | null;
  url: string;
  email?: string;
}

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

// Parameters accepted by fetchEvents API
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

export { DeleteReason };
