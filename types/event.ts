import { z } from "zod";
import type {
  RegionSummaryResponseDTO,
  EventDetailResponseDTO,
  EventSummaryResponseDTO,
  PagedResponseDTO,
} from "./api/event";
import type { CitySummaryResponseDTO } from "./api/city";
import type { CategorySummaryResponseDTO } from "./api/category";
import type { DateRange, DeleteReason, Option } from "./common";

// Helper schemas for form validation
const OptionSchema = z.object({ value: z.string(), label: z.string() });

const RegionSummaryResponseDTOSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
});

const CitySummaryResponseDTOSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  postalCode: z.string(),
  rssFeed: z.string().nullable(),
  enabled: z.boolean(),
});

const CategoryFormItemSchema = z.union([
  z.object({ id: z.number(), name: z.string() }),
  OptionSchema,
  z.number(),
]);

// --- Zod schema for canonical event form data ---
export const EventFormSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Títol obligatori"),
  description: z.string().min(1, "Descripció obligatòria"),
  type: z.enum(["FREE", "PAID"]),
  startDate: z.string(), // "YYYY-MM-DD" - consistent with API
  startTime: z.string().nullable(), // ISO time string or null - consistent with API
  endDate: z.string(), // "YYYY-MM-DD" - consistent with API
  endTime: z.string().nullable(), // ISO time string or null - consistent with API
  region: z.union([RegionSummaryResponseDTOSchema, OptionSchema]).nullable(),
  town: z.union([CitySummaryResponseDTOSchema, OptionSchema]).nullable(),
  location: z.string().min(1, "Localització obligatòria"),
  imageUrl: z.string().nullable(),
  url: z
    .string()
    .refine(
      (val) => !val || z.string().url().safeParse(val).success,
      "URL invàlida"
    ),
  categories: z.array(CategoryFormItemSchema),
  email: z.string().email("Email invàlid").or(z.literal("")).optional(),
});

export type EventFormSchemaType = z.infer<typeof EventFormSchema>;

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
  defaultRadius: number = 50
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
  location: string;
  locationValue: string;
  introText?: string;
  locationType?: "region" | "town" | "general";
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
}

export interface EventFormProps {
  form: FormData;
  onSubmit: (e: React.FormEvent) => Promise<void> | void;
  submitLabel: string;
  isEditMode?: boolean;
  isLoading?: boolean;
  regionOptions: Option[];
  cityOptions: Option[];
  categoryOptions: Option[];
  isLoadingRegionsWithCities?: boolean;
  isLoadingCategories?: boolean;
  handleFormChange: <K extends keyof FormData>(
    name: K,
    value: FormData[K]
  ) => void;
  handleImageChange: (file: File) => void;
  handleRegionChange: (region: Option | null) => void;
  handleTownChange: (town: Option | null) => void;
  handleCategoriesChange: (categories: Option[]) => void;
  progress: number;
  imageToUpload: string | null;
  imageFile?: File | null;
}

export interface UseEventsOptions {
  place?: string;
  category?: string;
  date?: string;
  search?: string; // Client-side search term filter
  distance?: string; // Client-side distance filter
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
