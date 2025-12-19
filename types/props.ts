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
  Href,
} from "types/common";
import { EventSummaryResponseDTO, ListEvent } from "types/api/event";
import { CategorySummaryResponseDTO } from "types/api/category";
import { RegionsGroupedByCitiesResponseDTO } from "types/api/region";
import { RouteSegments, URLQueryParams } from "types/url-filters";
import type { NewsEventItemDTO, NewsSummaryResponseDTO } from "types/api/news";
import type { FaqItem } from "types/faq";

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
  testId?: string;
  autoFocus?: boolean;
  menuPosition?: "fixed" | "absolute";
}

export interface SelectSkeletonProps {
  label?: string;
  className?: string;
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
  onActionButtonClick?: () => boolean | void | Promise<boolean | void>;
  actionButtonDisabled?: boolean;
  testId?: string;
}

export interface TextAreaProps {
  id: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  error?: string;
  onBlur?: () => void;
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
  /**
   * Optional actions rendered next to the section title (e.g. a client island button).
   * Must remain serializable/ReactNode compatible with server rendering.
   */
  headerActions?: ReactNode;
  /**
   * Optional id applied to the main description HTML container so a client island
   * can replace its content (e.g. translated text) without converting this component to client.
   */
  descriptionHtmlId?: string;
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
  enableAllDayToggle?: boolean;
  isAllDay?: boolean;
  onToggleAllDay?: (isAllDayEvent: boolean) => void;
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
  onUpload: (file: File | null) => void;
  progress: number;
  isUploading?: boolean;
  uploadMessage?: string | null;
  mode?: "upload" | "url";
  onModeChange?: (mode: "upload" | "url") => void;
  imageUrlValue?: string;
  onImageUrlChange?: (url: string) => void;
  imageUrlError?: string | null;
}

export interface InputProps {
  id: string;
  title: string;
  subtitle?: string;
  value: string | number;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  onBlur?: () => void;
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
  onMouseDown?: () => void;
  onMouseUp?: () => void;
  onTouchStart?: () => void;
  onTouchEnd?: () => void;
  onClear?: () => void;
  testId?: string;
}

export interface NoEventsFoundProps {
  title?: string;
  description?: string;
}

export interface NoEventsFoundContentProps extends NoEventsFoundProps {
  prefix?: string;
  ctaLabel: string;
  helperText: string;
}

export interface VideoDisplayProps {
  videoUrl: string | null | undefined;
}

export interface LoadMoreButtonProps {
  onLoadMore: () => void | Promise<void>;
  isLoading?: boolean;
  hasMore?: boolean;
  currentCount?: number;
  totalEvents?: number;
}

export interface CategorySectionLabels {
  heading: string;
  seeMore: string;
  sponsored: string;
}

export interface FilterLoadingContextValue {
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}

export interface FilterLoadingGateProps {
  children: ReactNode;
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
  placeTypeLabel: PlaceTypeAndLabel;
  filterLabels: FilterLabels;
}

export interface ClientInteractiveLayerContentProps
  extends ClientInteractiveLayerProps {
  isNavbarVisible: boolean;
  isHydrated: boolean;
  isModalOpen: boolean;
  handleOpenModal: () => void;
  handleCloseModal: () => void;
}

export type FilterLabels = {
  triggerLabel: string;
  displayNameMap: Record<string, string>;
  byDates: Record<string, string>;
  categoryLabelsBySlug?: Record<string, string>;
};

export interface FiltersClientProps {
  segments: RouteSegments;
  queryParams: URLQueryParams;
  categories?: CategorySummaryResponseDTO[];
  placeTypeLabel: PlaceTypeAndLabel;
  onOpenModal: () => void;
  labels: FilterLabels;
}

export interface ActiveNavLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  activeLinkClass?: string;
}

export interface FilterButtonProps {
  filterKey: string;
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
  placeTypeLabel: PlaceTypeAndLabel;
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
  hasNews: boolean; // Whether the place has news articles
  categories?: CategorySummaryResponseDTO[]; // Categories for client-side filter parsing
  // totalServerEvents removed - SWR hook manages this via API response
}

export type HybridEventsListClientProps = Omit<
  HybridEventsListProps,
  "hasNews" | "placeTypeLabel" | "noEventsFound"
>;

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

export interface PlaceShellData {
  placeTypeLabel: PlaceTypeAndLabel;
  pageData: PageData;
}

export interface PlacePageShellProps {
  eventsPromise: Promise<PlacePageEventsResult>;
  shellDataPromise: Promise<PlaceShellData>;
  place: string;
  category?: string;
  date?: string;
  hasNewsPromise?: Promise<boolean>;
  categories?: CategorySummaryResponseDTO[];
  webPageSchemaFactory?: (pageData: PageData) => Record<string, unknown>;
}

export interface FeaturedPlaceConfig {
  title: string;
  subtitle?: string;
  slug: string;
  filter: {
    city?: string;
    region?: string;
    place?: string;
  };
}

export interface SeoLinkItem {
  href: Href;
  label: string;
}

export interface SeoLinkSection {
  id: string;
  title: string;
  links: SeoLinkItem[];
}

export interface ServerEventsCategorizedProps {
  categorizedEventsPromise: Promise<Record<string, ListEvent[]>>;
  pageData?: PageData;
  categoriesPromise?: Promise<CategorySummaryResponseDTO[]>;
  featuredPlaces?: FeaturedPlaceConfig[];
  seoLinkSections?: SeoLinkSection[];
}

export type ServerEventsCategorizedContentProps = Pick<
  ServerEventsCategorizedProps,
  "categorizedEventsPromise" | "categoriesPromise" | "featuredPlaces"
>;

export interface SearchAwareHeadingProps {
  pageData: PageData;
  categories?: CategorySummaryResponseDTO[];
  titleClass: string;
  subtitleClass: string;
  cta?: ReactNode;
}

export interface HybridEventsHeadingLayoutProps {
  title: string;
  subtitle: string;
  titleClass: string;
  subtitleClass: string;
  cta?: ReactNode;
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

export interface ListPageFaqProps {
  items: FaqItem[];
  title?: string;
}

export interface ListPageFaqParams {
  place: string;
  date?: string;
  category?: string;
  placeTypeLabel?: PlaceTypeAndLabel;
  categories?: CategorySummaryResponseDTO[];
  locale?: import("types/i18n").AppLocale;
}

export type DateContext = {
  inline: string;
  capitalized: string;
};

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

export interface NewsArticleDetailProps {
  detailPromise: Promise<import("./api/news").NewsDetailResponseDTO | null>;
  placeTypePromise: Promise<PlaceTypeAndLabel>;
  place: string;
  article: string;
}

export interface HubResult {
  hub: { slug: string; name: string };
  items: NewsSummaryResponseDTO[];
}

export interface NewsHubsGridProps {
  promise: Promise<HubResult[]>;
}

export interface NewsListProps {
  newsPromise: Promise<
    import("./api/news").PagedResponseDTO<NewsSummaryResponseDTO>
  >;
  placeTypePromise: Promise<PlaceTypeAndLabel>;
  place: string;
  currentPage: number;
  pageSize: number;
}

// Mobile share island component props
export interface MobileShareProps {
  title: string;
  slug: string;
  eventDate: string; // ISO or human readable date string used in share payload
  location: string; // Main location label
}

// Date filter badges component props
export interface DateFilterBadgesProps {
  placeSlug: string;
  categorySlug?: string;
  categories?: CategorySummaryResponseDTO[];
  contextName: string;
  ariaLabel?: string;
  labels?: DateFilterBadgeLabels;
}

export type TranslationFn = (
  key: string,
  values?: Record<string, any>
) => string;

export type DateFilterBadgeLabels = {
  navAriaLabel: string;
  today: { label: string; ariaLabelText: string };
  tomorrow: { label: string; ariaLabelText: string };
  weekend: { label: string; ariaLabelText: string };
  ariaPlace: (args: { ariaLabelText: string; contextName: string }) => string;
  ariaCategory: (args: {
    ariaLabelText: string;
    contextName: string;
  }) => string;
};

export interface CategoryEventsSectionProps {
  events: EventSummaryResponseDTO[];
  categoryName: string;
  categorySlug: string;
  categoryPhrase: string;
  categories?: CategorySummaryResponseDTO[];
  shouldUsePriority?: boolean;
  showAd?: boolean;
  labels: {
    heading: string;
    seeMore: string;
    sponsored: string;
  };
  badgeLabels?: DateFilterBadgeLabels;
}

export interface BreadcrumbNavItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbNavItem[];
  className?: string;
}
