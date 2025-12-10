import type { CSSProperties } from "react";
import type { LinkProps } from "next/link";
import { CategorySummaryResponseDTO } from "types/api/category";
import { EventSummaryResponseDTO, ListEvent } from "types/api/event";
import type { CalendarUrls } from "types/calendar";
import type { StoreState } from "types/store";
import type { AppLocale } from "types/i18n";

export interface Option {
  label: string;
  value: string;
  placeType?: PlaceType;
  latitude?: number;
  longitude?: number;
}

export interface ByDateOption {
  value: string;
  labelKey: string;
}

// Type guard for Option (centralized for reuse in forms)
export function isOption(obj: unknown): obj is Option {
  return !!obj && typeof obj === "object" && "value" in obj && "label" in obj;
}

export interface Location {
  lat: number;
  lng: number;
}

// Legacy category unions removed in favor of backend DTOs

export interface CalendarOption {
  name: string;
  url?: string;
  icon: string;
  download?: string;
}

export type DeleteReason =
  | "not-exist"
  | "duplicated"
  | "offensive"
  | "others"
  | null;

// Removed duplicate/unused EventProps (conflicted with types/event)

export interface NetworkInformation {
  downlink?: number;
  effectiveType?: "slow-2g" | "2g" | "3g" | "4g";
  saveData?: boolean;
}

// Google Analytics types
export interface WindowWithGtag extends Window {
  gtag: (...args: unknown[]) => void;
  dataLayer: unknown[];
}

// Image optimization types
export type NetworkQuality = "high" | "medium" | "low" | "unknown";

export interface NetworkQualityCache {
  quality: NetworkQuality;
  timestamp: number;
}

export interface UseOnScreenOptions extends IntersectionObserverInit {
  freezeOnceVisible?: boolean;
}

export interface PageData {
  metaTitle: string;
  metaDescription: string;
  title: string;
  subTitle: string;
  canonical: string;
  notFoundTitle: string;
  notFoundDescription: string;
}

export interface GeneratePagesDataProps {
  currentYear: string | number;
  place?: string;
  byDate?: ByDateOptions;
  placeTypeLabel?: PlaceTypeAndLabel;
  category?: string;
  categoryName?: string;
  search?: string;
}

export interface PlaceTypeAndLabel {
  type: PlaceType;
  label: string;
  regionLabel?: string;
}

export type ByDateOptions = "avui" | "dema" | "setmana" | "cap-de-setmana" | "";
export type PlaceType = "region" | "town" | "";

export type Href = `/${string}`;

// Unified NavigationItem interface for both UI and SEO use cases
export interface NavigationItem {
  name: string;
  href?: Href; // UI navigation (preferred for ActiveLink)
  url?: string; // SEO structured data (fallback if href not provided)
  current?: boolean; // UI navigation state
}

export interface SocialLinks {
  web: string;
  twitter: string;
  instagram: string;
  telegram: string;
  facebook: string;
  [key: string]: string;
}

export interface FetchedData {
  content?: ListEvent[];
  noEventsFound?: boolean;
  allEventsLoaded?: boolean;
}

export interface RenderButtonProps {
  text: string;
  enabled: string | boolean | undefined;
  onClick: () => void;
  handleOpenModal: () => void;
  scrollToTop: () => void;
}

// Props for restaurant promotion info modal component
export interface PromotionInfoModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export interface GeolocationPosition {
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude: number | null;
    altitudeAccuracy: number | null;
    heading: number | null;
    speed: number | null;
  };
  timestamp: number;
}

export interface GroupedOption {
  label: string;
  options: Option[];
}

export interface GeolocationError {
  code: number;
  message: string;
}

export interface Gradient {
  gradient: string;
  color: string;
}

export interface ImgDefaultProps {
  title: string;
  location?: string;
  region?: string;
  date?: string;
}

export interface MetaProps {
  title: string;
  description: string;
  canonical: string;
  image?: string;
  preload?: string;
}

export type AdStatus = "unfilled" | "filled";

export interface GoogleAdsenseContainerProps {
  id: string;
  style?: CSSProperties;
  layout?: "horizontal" | "vertical" | "in-article" | "in-feed";
  format?: "auto" | "rectangle" | "vertical" | "horizontal";
  responsive?: boolean;
  slot: string;
  setDisplayAd?: (display: boolean) => void;
  adClient?: string;
}

export interface AdArticleProps {
  isDisplay?: boolean;
  slot: string;
}

export interface AdContentProps {
  children: React.ReactNode;
}

export type DateString = string | Date;

export interface PastEventBannerProps {
  temporalStatus: import("./event-status").EventTemporalStatus;
  cityName?: string;
  regionName?: string;
  explorePlaceHref: string;
  exploreCategoryHref: string;
  primaryCategorySlug?: string | null;
}

export interface AddToCalendarProps {
  title: string;
  description: string;
  location: string;
  startDate: DateString;
  endDate: DateString;
  canonical: string;
  hideText?: boolean;
}

export interface CalendarButtonProps {
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  hideText?: boolean;
  open?: boolean;
  label?: string;
}

export interface CalendarProviderLabels {
  google: string;
  outlook: string;
  other: string;
  ariaAdd: string;
}

export interface ArticleLabels {
  el: string;
  la: string;
  l: string;
  els: string;
  les: string;
}

export interface PrepositionLabels {
  a: string;
  al: string;
  als: string;
  aLa: string;
  aLes: string;
  aL: string;
  de: string;
  del: string;
  dels: string;
  deLa: string;
  deLes: string;
  deL: string;
}

export interface StringHelperLabels {
  articles: ArticleLabels;
  prepositions: PrepositionLabels;
  capitalizePrepositions: string[];
  feminineExceptions: string[];
  masculineExceptions: string[];
}

export interface EventCopySentenceLabels {
  verbSingular: string;
  verbPlural: string;
  dateRange: string;
  dateSingle: string;
  sentence: string;
  timeSuffix: string;
  placeSuffix: string;
}

export interface EventCopyFaqLabels {
  whenQ: string;
  whenA: string;
  whereQ: string;
  whereA: string;
  isFreeQ: string;
  isFreeYes: string;
  isFreeNo: string;
  durationQ: string;
  durationA: string;
}

export interface EventCopyLabels {
  sentence: EventCopySentenceLabels;
  faq: EventCopyFaqLabels;
}

export interface OpeningHoursLabels {
  openNow: string;
  closesAt: string;
  closedNow: string;
  opensAt: string;
  unknown: string;
  overnight: string;
  inferred: string;
  confirmed: string;
  openConfirmed: string;
  openProbable: string;
  closed: string;
  unconfirmed: string;
}

export interface CalendarListProps {
  onClick: () => void;
  getUrls: () => CalendarUrls;
  title: string;
  labels: CalendarProviderLabels;
}

export interface CardProps {
  event: ListEvent;
  isLoading?: boolean;
  isPriority?: boolean;
}

export interface CardHorizontalProps {
  event: ListEvent;
  isLoading?: boolean;
  isPriority?: boolean;
}

export interface CardHorizontalServerProps {
  event: EventSummaryResponseDTO;
  isPriority?: boolean;
  useDetailTimeFormat?: boolean; // Use phrase format for times (e.g., "De 9.00 a 11.30") instead of numeric format
}

export interface CardShareButtonProps {
  slug: string;
}

export interface CustomIconProps {
  bgStyle?: CSSProperties;
  iconFillColor?: string;
  size?: number;
  round?: boolean;
  className?: string;
}

export type EventsAroundLayout = "compact" | "horizontal" | "cards";

export interface EventsAroundProps {
  events: EventSummaryResponseDTO[];
  title?: string;
}

export interface EventsAroundServerProps extends EventsAroundProps {
  layout?: EventsAroundLayout;
  loading?: boolean;
  usePriority?: boolean;
  showJsonLd?: boolean;
  jsonLdId?: string;
  analyticsCategory?: string;
  useDetailTimeFormat?: boolean; // Use phrase format for times in detail pages
}

export interface BaseLayoutProps {
  children: React.ReactNode;
}

export interface ListProps {
  events: ListEvent[];
  children: (event: ListEvent, index: number) => React.ReactElement;
}

export interface TooltipComponentProps {
  id: string;
  children: React.ReactNode;
}

export interface ViewCounterProps {
  visits: number;
  hideText?: boolean;
}

// Removed unused MyErrorProps based on current app error boundaries

export interface TeamMember {
  name: string;
  role: string;
  title: string;
  image: string;
  linkedin: string;
}

export type DateRange = { from: Date; until: Date };

export interface RssEvent {
  id: string;
  title: string;
  slug: string;
  nameDay: string;
  formattedStart: string;
  location: string;
  town: string;
  region: string;
  startDate: string;
  imageUrl?: string;
}

export interface MonthStaticPathParams {
  town: string;
  year: string;
  month: string;
  [key: string]: string | undefined;
}

export interface TownStaticPathParams {
  town: string;
  year?: string;
  month?: string;
  [key: string]: string | undefined;
}

export interface PlaceStaticPathParams {
  place: string;
  [key: string]: string | string[] | undefined;
}

export type PlaceStaticPath = { params: PlaceStaticPathParams };

// SearchState type
export interface SearchState {
  searchTerm: string;
  setState: <K extends keyof StoreState>(key: K, value: StoreState[K]) => void;
}

// Utility function to safely construct a PlaceTypeAndLabel from any input
export function makePlaceTypeAndLabel(
  type: string,
  label: string,
  regionLabel?: string
): PlaceTypeAndLabel {
  const allowedTypes: PlaceType[] = ["region", "town", ""];
  return {
    type: allowedTypes.includes(type as PlaceType) ? (type as PlaceType) : "",
    label,
    regionLabel,
  };
}

export interface ImageComponentProps {
  title: string;
  image?: string;
  className?: string;
  priority?: boolean;
  alt?: string;
  location?: string;
  region?: string;
  date?: string;
  quality?: number;
  cacheKey?: string;
}

export interface ActiveLinkProps extends Omit<LinkProps, "href"> {
  children: React.ReactNode;
  activeLinkClass?: string;
  className?: string;
  href?: Href;
}

// Generic Badge component props used across UI
export interface BadgeProps {
  href?: string;
  className?: string;
  variant?: "outline" | "solid";
  onClick?: () => void;
  ariaLabel?: string;
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "neutral" | "primary" | "muted" | "outline" | "solid";
}

// Hook return types
export interface UseCategoriesReturn {
  categories: CategorySummaryResponseDTO[];
  isLoading: boolean;
  error: Error | null;
  getCategoryById: (id: number) => CategorySummaryResponseDTO | null;
  getCategoryBySlug: (slug: string) => CategorySummaryResponseDTO | null;
  refetch: () => Promise<void>;
}

export interface QualityOptions {
  isPriority?: boolean;
  isExternal?: boolean;
  networkQuality?: number;
  customQuality?: number;
}

export type QualityPreset =
  | "LCP_EXTERNAL"
  | "EXTERNAL_HIGH"
  | "EXTERNAL_STANDARD"
  | "INTERNAL_HIGH"
  | "INTERNAL_STANDARD"
  | "NETWORK_SLOW"
  | "NETWORK_FAST"
  | "EMERGENCY";

export interface ImagePerformanceMetrics {
  loadTime: number;
  size: number;
  src: string;
  networkType?: string;
  quality: number;
}

export interface PreloadOptions {
  priority?: boolean;
  sizes?: string;
  quality?: number;
  fetchPriority?: "high" | "low" | "auto";
}

export interface GoogleAnalyticsEvent {
  [key: string]: unknown;
}

// Opening hours formatting options (shared between utils and UI)
export interface FormatOpeningHoursOptions {
  locale?: string;
  now?: Date; // override for deterministic tests
}

// SEO and structured data types
export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface WebPageOptions {
  title: string;
  description: string;
  url: string;
  breadcrumbs?: BreadcrumbItem[];
  isPartOf?: string;
  mainContentOfPage?: Record<string, unknown>;
  locale?: AppLocale;
}

export interface CollectionPageOptions {
  title: string;
  description: string;
  url: string;
  breadcrumbs?: BreadcrumbItem[];
  mainEntity?: Record<string, unknown>;
  numberOfItems?: number;
  locale?: AppLocale;
}

export interface LocationNewsLabels {
  newsAll: string;
  newsWithPlace: string;
}

// E2E test component props
export interface ClientTestProps {
  initialEvents: EventSummaryResponseDTO[];
  place: string;
  category?: string;
  date?: string;
}

// Sitemap component props
export interface SitemapLayoutProps {
  children: React.ReactNode;
  testId?: string;
}

export interface SitemapBreadcrumbProps {
  items: BreadcrumbItem[];
}

// PlacePageShell JSON-LD script type
export interface JsonLdScript {
  id: string;
  data: unknown;
}
