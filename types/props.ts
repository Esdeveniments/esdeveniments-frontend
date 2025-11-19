export interface LatestNewsSectionProps {
  placeSlug: string;
  placeLabel: string;
  placeType: "region" | "town";
  newsHref: string;
}

import { ChangeEvent, MouseEvent, ReactNode } from "react";
import {
  Option,
  GroupedOption,
  PageData,
  PlaceTypeAndLabel,
  JsonLdScript,
} from "types/common";
import { EventSummaryResponseDTO, ListEvent } from "types/api/event";
import { CategorySummaryResponseDTO } from "types/api/category";
import { RegionsGroupedByCitiesResponseDTO } from "types/api/region";
import { RouteSegments, URLQueryParams } from "types/url-filters";
import type { NewsEventItemDTO, NewsSummaryResponseDTO } from "types/api/news";

// Google Scripts and WebsiteSchema no longer require nonce props (relaxed CSP)

export interface SelectComponentProps {
  id: string;
  title: string;
  value?: Option | null;
  onChange: (value: Option | null) => void;
  options?: Option[] | GroupedOption[];
  isDisabled?: boolean;
  isValidNewOption?: boolean;
  isClearable?: boolean;
  placeholder?: string;
}

export interface MultiSelectProps {
  id: string;
  title: string;
  value?: Option[];
  onChange: (values: Option[]) => void;
  options?: Option[];
  isDisabled?: boolean;
  placeholder?: string;
  isLoading?: boolean;
}

export interface ReportViewProps {
  slug: string;
}

export interface CardContentProps {
  event: EventSummaryResponseDTO; // CardContent should only receive real events, not ads
  isPriority?: boolean;
  isHorizontal?: boolean;
}

export interface NativeShareButtonProps {
  title: string;
  text?: string;
  url: string;
  date: string;
  location: string;
  subLocation: string;
  onShareClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  hideText?: boolean;
}

export interface ModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  title: string;
  children: ReactNode;
  actionButton?: ReactNode;
  onActionButtonClick?: () => void;
}

export interface TextAreaProps {
  id: string;
  value: string;
  onChange: (e: ChangeEvent<{ name: string; value: string }>) => void;
}

export interface SocialProps {
  links: {
    twitter?: string;
    instagram?: string;
    telegram?: string;
    facebook?: string;
  };
}

// Removed EventsListProps - no longer needed with server-side architecture

export interface CulturalMessageProps {
  location: string;
  locationValue: string; // URL-friendly version for analytics
  locationType?: "region" | "town" | "general"; // Type of location for proper preposition
}

export interface DescriptionProps {
  description?: string;
  location?: string;
  locationValue?: string;
  introText?: string;
  locationType?: "region" | "town" | "general";
}

// NavigationItem and Href are now imported from types/common.ts

export interface DatePickerComponentProps {
  idPrefix?: string;
  startDate: string; // "YYYY-MM-DD" or ISO string
  endDate: string; // "YYYY-MM-DD" or ISO string
  minDate?: string; // "YYYY-MM-DD" or ISO string
  onChange: (field: "startDate" | "endDate", value: string) => void;
  required?: boolean;
  className?: string;
}

export interface CustomHeaderProps {
  date: Date;
  decreaseMonth: () => void;
  increaseMonth: () => void;
  prevMonthButtonDisabled: boolean;
  nextMonthButtonDisabled: boolean;
}

export type AcceptedImageTypes =
  | "image/jpeg"
  | "image/png"
  | "image/jpg"
  | "image/webp";

export interface ImageUploaderProps {
  value: string | null;
  onUpload: (file: File) => void;
  progress: number;
}

export interface InputProps {
  id: string;
  title: string;
  subtitle?: string;
  value: string | number;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

export type RadioInputValue = string | number;
export interface RadioInputProps {
  id: string;
  name: string;
  value: RadioInputValue;
  checkedValue: RadioInputValue;
  onChange: (value: RadioInputValue) => void;
  label: string;
  disabled?: boolean;
}

export type RangeInputValue = string | number;
export interface RangeInputProps {
  id: string;
  min: number;
  max: number;
  value: number;
  onChange: (
    e: ChangeEvent<HTMLInputElement> | { target: { value: RangeInputValue } }
  ) => void;
  label: string;
  disabled?: boolean;
}

export interface NoEventsFoundProps {
  title?: string;
  description?: string;
}

export interface VideoDisplayProps {
  videoUrl: string | null | undefined;
}

export interface LoadMoreButtonProps {
  onLoadMore: () => void;
  isLoading?: boolean;
  isValidating?: boolean;
  hasMore?: boolean;
  currentCount?: number;
  totalEvents?: number;
}

// Next.js App Router page props interfaces
export interface FilteredPageProps {
  params: Promise<{
    place: string;
    byDate: string;
    category: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Component props interfaces
export interface ClientInteractiveLayerProps {
  categories?: CategorySummaryResponseDTO[];
  placeTypeLabel?: PlaceTypeAndLabel;
}

export interface ClientInteractiveLayerContentProps
  extends ClientInteractiveLayerProps {
  isNavbarVisible: boolean;
  isHydrated: boolean;
  isModalOpen: boolean;
  handleOpenModal: () => void;
  handleCloseModal: () => void;
}

export interface ActiveNavLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  activeLinkClass?: string;
}

export interface FilterButtonProps {
  text: string;
  enabled: boolean;
  removeUrl: string;
  onOpenModal: () => void;
  testId?: string;
}

export interface ServerFiltersProps {
  segments: RouteSegments;
  queryParams: URLQueryParams;
  categories?: CategorySummaryResponseDTO[];
  placeTypeLabel?: PlaceTypeAndLabel;
  onOpenModal: () => void;
}

export interface NavigationFiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSegments: RouteSegments;
  currentQueryParams: URLQueryParams;
  userLocation?: { latitude: number; longitude: number };
  categories?: CategorySummaryResponseDTO[];
}

export interface HybridEventsListProps {
  initialEvents: ListEvent[];
  placeTypeLabel?: PlaceTypeAndLabel;
  pageData?: PageData;
  noEventsFound?: boolean;
  place: string;
  category?: string;
  date?: string;
  serverHasMore?: boolean; // Add server pagination info
  hasNews?: boolean; // Whether the place has news articles
  categories?: CategorySummaryResponseDTO[]; // Categories for client-side filter parsing
  // totalServerEvents removed - SWR hook manages this via API response
}

export interface SsrListWrapperProps {
  children: ReactNode;
  categories?: CategorySummaryResponseDTO[];
}

export interface PlacePageEventsResult {
  events: ListEvent[];
  noEventsFound: boolean;
  serverHasMore: boolean;
  structuredScripts?: JsonLdScript[];
}

export interface PlacePageShellProps {
  scripts?: JsonLdScript[];
  eventsPromise: Promise<PlacePageEventsResult>;
  placeTypeLabel: PlaceTypeAndLabel;
  pageData: PageData;
  place: string;
  category?: string;
  date?: string;
  hasNews?: boolean;
  categories?: CategorySummaryResponseDTO[];
}

export interface ServerEventsCategorizedProps {
  categorizedEventsPromise: Promise<Record<string, ListEvent[]>>;
  pageData?: PageData;
  categoriesPromise?: Promise<CategorySummaryResponseDTO[]>;
}

// Location Discovery Widget Props
export interface LocationDiscoveryWidgetProps {
  className?: string;
  onLocationChange?: (location: Option) => void;
  onSearchSubmit?: (location: Option, searchTerm: string) => void;
}

export interface LocationDropdownProps {
  selectedLocation: Option | null;
  regions: RegionsGroupedByCitiesResponseDTO[];
  onLocationSelect: (location: Option) => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
}

export interface GeolocationButtonProps {
  onLocationDetected: (location: Option) => void;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
}

export interface UseGeolocationReturn {
  location: GeolocationCoordinates | null;
  isLoading: boolean;
  error: string | null;
  requestLocation: (
    regions: RegionsGroupedByCitiesResponseDTO[]
  ) => Promise<Option | null>;
  clearLocation: () => void;
}

// --- News components props ---
export interface NewsEventsSectionProps {
  title: string;
  events: NewsEventItemDTO[];
  showHero?: boolean;
  showNumbered?: boolean;
}

export interface NewsHeroEventProps {
  event: NewsEventItemDTO;
}

export interface NewsRichCardProps {
  event: NewsEventItemDTO;
  variant?: "default" | "horizontal";
  numbered?: number;
}

export interface NewsCardProps {
  event: NewsSummaryResponseDTO;
  placeSlug: string;
  placeLabel?: string;
  variant?: "default" | "hero";
}

// Mobile share island component props
export interface MobileShareProps {
  title: string;
  slug: string;
  eventDate: string; // ISO or human readable date string used in share payload
  location: string; // Main location label
}
