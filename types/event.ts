import type {
  RegionSummaryResponseDTO,
  EventDetailResponseDTO,
  EventSummaryResponseDTO,
  PagedResponseDTO,
} from "./api/event";
import type { CitySummaryResponseDTO } from "./api/city";
import type { CategorySummaryResponseDTO } from "./api/category";
import type { DateRange, DeleteReason, Option } from "./common";
import type { AppLocale } from "./i18n";

export type EventFormZodLabels = {
  titleRequired: string;
  descriptionRequired: string;
  locationRequired: string;
  invalidUrl: string;
  invalidEmail: string;
};

export interface ValidationLabels {
  genericError: string;
  imageRequired: string;
}

export const defaultEventFormZodLabels: EventFormZodLabels = {
  titleRequired: "Title is required",
  descriptionRequired: "Description is required",
  locationRequired: "Location is required",
  invalidUrl: "Invalid URL",
  invalidEmail: "Invalid email",
};

// Note: zod schema for event form has been moved to lib/validation/event-form.ts
// to keep zod out of the client bundle. Client-side validation uses the
// zod-free implementation in utils/form-validation.ts.

// --- Date handling interfaces ---
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

export interface EventTimeLabels {
  consult: string;
  startsAt: string;
  range: string;
  simpleRange: string;
}

// --- Centralized event form types ---
export interface FormData {
  id?: string;
  title: string;
  description: string;
  type: "FREE" | "PAID";
  startDate: string; // "YYYY-MM-DD" - consistent with API
  startTime: string | null; // ISO time string or null - consistent with API
  endDate: string; // "YYYY-MM-DD" - consistent with API
  endTime: string | null; // ISO time string or null - consistent with API
  region: RegionSummaryResponseDTO | { value: string; label: string } | null;
  town: CitySummaryResponseDTO | { value: string; label: string } | null;
  location: string;
  imageUrl: string | null;
  url: string;
  categories: Array<
    { id: number; name: string } | { value: string; label: string } | number
  >;
  email?: string; // UI only
  // Flag to mark single-day/all-day events (end time auto-handled)
  isAllDay?: boolean;
}

/**
 * Canonical FormData for event creation/edit forms.
 * Use this interface everywhere for event forms.
 * - For UI, use Option | null for region/town, then convert to DTO for backend.
 * - Dates should be string (ISO) for storage, can be Date in UI state.
 */

// Removed unused Event* props and helper types to keep the type surface minimal

export interface FetchEventsParams {
  page?: number;
  size?: number;
  place?: string;
  category?: string;
  lat?: number;
  lon?: number;
  radius?: number;
  term?: string; // Search term (API parameter)
  byDate?: string; // Date filter
  from?: string; // Start date
  to?: string; // End date
  type?: string; // Price filter: "FREE" | "PAID"
  isToday?: boolean;
  // Note: API expects 'term' for search queries
}

export interface EventFallbackStageOptions {
  enabled?: boolean;
  size?: number;
  includeCategory?: boolean;
  includeDateRange?: boolean;
  dateRangeFactory?: () => DateRange;
  place?: string;
}

export interface FetchEventsWithFallbackOptions {
  place: string;
  initialParams: FetchEventsParams;
  regionFallback?: EventFallbackStageOptions;
  finalFallback?: EventFallbackStageOptions;
}

export interface FetchEventsWithFallbackResult {
  eventsResponse: PagedResponseDTO<EventSummaryResponseDTO> | null;
  events: EventSummaryResponseDTO[];
  noEventsFound: boolean;
}

/**
 * Convert UI distance (from filters/URL) to API radius parameter
 * @param distance - Distance value from UI (number or string)
 * @param defaultRadius - Default radius when distance is not significant (default: 50)
 * @returns radius for API call, or undefined if distance equals default
 */
export function distanceToRadius(
  distance: number | string | undefined,
  defaultRadius: number = 50,
): number | undefined {
  if (distance === undefined) return undefined;

  const numericDistance =
    typeof distance === "string" ? parseInt(distance) : distance;

  // Only return radius if it's different from default
  return numericDistance !== defaultRadius ? numericDistance : undefined;
}

export interface EventHeaderProps {
  title: string;
}

export interface EventMediaProps {
  event: EventDetailResponseDTO;
  title: string;
}

export interface EventShareBarProps {
  slug: string;
  title: string;
  description: string;
  eventDateString: string;
  location: string;
  cityName: string;
  regionName: string;
  postalCode: string;
}

// Client-side props for EventShareBar include an optional server hint for
// initial mobile rendering to avoid hydration layout shifts.
export interface EventShareBarClientProps extends EventShareBarProps {
  initialIsMobile?: boolean;
}

export interface EventDescriptionProps {
  description: string;
  introText?: string;
  locale?: AppLocale;
  showTranslate?: boolean;
}

export interface EventTagsProps {
  tags: string[];
}

export interface EventCalendarProps {
  event: EventDetailResponseDTO;
  compact?: boolean;
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
  cityName: string;
  regionName: string;
}

export interface EventWeatherProps {
  weather?: {
    temperature: string;
    description: string;
    icon: string;
  };
}

export interface EventImageProps {
  image: string | undefined;
  title: string;
  eventId: string;
}

export interface EventLocationProps {
  location: string;
  cityName: string;
  regionName: string;
  citySlug?: string;
  regionSlug?: string;
  compact?: boolean;
}

export interface EventFormProps {
  form: FormData;
  onSubmit: (e: React.FormEvent) => Promise<void> | void;
  submitLabel: string;
  analyticsContext?: string;
  isEditMode?: boolean;
  isLoading?: boolean;
  cityOptions: Option[];
  categoryOptions: Option[];
  isLoadingCities?: boolean;
  isLoadingCategories?: boolean;
  isLocating?: boolean;
  handleFormChange: <K extends keyof FormData>(
    name: K,
    value: FormData[K],
  ) => void;
  handleImageChange: (file: File | null) => void;
  handleTownChange: (town: Option | null) => void;
  handleCategoriesChange: (categories: Option[]) => void;
  handleUseGeolocation?: () => void;
  handleTestUrl?: (url: string) => void;
  progress: number;
  imageToUpload: string | null;
  imageFile?: File | null;
  isUploadingImage?: boolean;
  uploadMessage?: string | null;
  onPreview?: () => void;
  canPreview?: boolean;
  previewLabel?: string;
  previewTestId?: string;
  imageMode?: "upload" | "url";
  onImageModeChange?: (mode: "upload" | "url") => void;
  handleImageUrlChange?: (url: string) => void;
  imageUrlValue?: string | null;
}

export interface UseEventsOptions {
  place?: string;
  category?: string;
  date?: string;
  search?: string; // Client-side search term filter
  distance?: string; // Client-side distance filter
  price?: string; // Client-side price filter: "gratis" | "pagament"
  from?: string; // Calendar date filter (YYYY-MM-DD)
  to?: string; // Calendar date filter (YYYY-MM-DD)
  lat?: string; // Client-side latitude filter
  lon?: string; // Client-side longitude filter
  initialSize?: number;
  fallbackData?: EventSummaryResponseDTO[];
  serverHasMore?: boolean; // Add server pagination info
}

export interface UseEventsReturn {
  events: EventSummaryResponseDTO[];
  hasMore: boolean;
  totalEvents: number;
  /** True while fetching the first page after a filter change (no cached data yet) */
  isLoading: boolean;
  isLoadingMore: boolean;
  loadMore: () => void | Promise<void>;
  error: Error | undefined;
}

export interface EventCategoriesProps {
  categories: CategorySummaryResponseDTO[];
  place: string;
}

export { DeleteReason };

// --- UI Event (DTO + computed view fields) ---
export type UIEvent = EventSummaryResponseDTO & {
  formattedStart: string;
  formattedEnd?: string;
  isFullDayEvent: boolean;
  duration: string;
  timeUntilEvent: string;
};
