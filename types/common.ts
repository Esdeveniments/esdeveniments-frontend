import type { CSSProperties } from "react";
import type { ErrorProps } from "next/error";
import type { EventLocation } from "../store";
import type { StoreState } from "@store";
import type { EventCategory } from "@store";
import {
  EventSummaryResponseDTO,
  EventDetailResponseDTO,
  ListEvent,
} from "types/api/event";
import { CategorySummaryResponseDTO } from "types/api/category";
import type { LinkProps } from "next/link";

export interface Option {
  label: string;
  value: string;
}

// Type guard for Option (centralized for reuse in forms)
export function isOption(obj: unknown): obj is Option {
  return !!obj && typeof obj === "object" && "value" in obj && "label" in obj;
}

export interface Location {
  lat: number;
  lng: number;
}

export type CategoryKey =
  | "Festes Majors"
  | "Festivals"
  | "Familiar"
  | "Música"
  | "Cinema"
  | "Teatre"
  | "Exposicions"
  | "Fires"
  | "Espectacles";

export type CategoryValue =
  | "Festa Major"
  | "Festival"
  | "Familiar"
  | "Música"
  | "Cinema"
  | "Teatre"
  | "Exposició"
  | "Fira"
  | "Espectacles";

export type Categories = Record<CategoryKey, CategoryValue>;

export interface CalendarUrls {
  google: string;
  outlook: string;
  ical: string;
}

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

export interface EventProps {
  event: EventDetailResponseDTO;
}

export interface EventsProps {
  events?: EventSummaryResponseDTO[];
}

export interface UseGetEventsProps {
  props?: EventsProps;
  pageIndex: number;
  refreshInterval?: boolean;
  maxResults?: number;
  zone?: string;
  category?: string;
  lat?: number;
  lon?: number;
  radius?: number;
}

export interface NetworkInformation extends EventTarget {
  effectiveType: string;
  addEventListener: (type: string, listener: EventListener) => void;
  removeEventListener: (type: string, listener: EventListener) => void;
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
  notFoundText: string;
}

export interface GeneratePagesDataProps {
  currentYear: string | number;
  place?: string;
  byDate?: ByDateOptions;
  placeTypeLabel?: PlaceTypeAndLabel;
}

export interface PlaceTypeAndLabel {
  type: PlaceType;
  label: string;
  regionLabel?: string;
}

export type ByDateOptions = "avui" | "dema" | "setmana" | "cap-de-setmana" | "";
export type PlaceType = "region" | "town" | "";

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

export interface FiltersProps {
  placeLabel: string;
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
}

export interface CalendarListProps {
  onClick: () => void;
  getUrls: () => CalendarUrls;
  title: string;
}

export interface CardProps {
  event: EventSummaryResponseDTO;
  isLoading?: boolean;
  isPriority?: boolean;
}

export interface CardHorizontalProps {
  event: EventSummaryResponseDTO;
  isLoading?: boolean;
  isPriority?: boolean;
}

export interface CardHorizontalServerProps {
  event: EventSummaryResponseDTO;
  isPriority?: boolean;
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
}

export interface BaseLayoutProps {
  children: React.ReactNode;
}

export interface ListProps {
  events: EventSummaryResponseDTO[];
  children: (
    event: EventSummaryResponseDTO,
    index: number
  ) => React.ReactElement;
}

export interface MapsProps {
  location: string;
}

export interface TooltipComponentProps {
  id: string;
  children: React.ReactNode;
}

export interface ViewCounterProps {
  visits: number;
  hideText?: boolean;
}

export interface InitialState {
  place: string;
  byDate: string;
  events: ListEvent[];
  noEventsFound: boolean;
  hasServerFilters: boolean;
}

export interface ByDateProps {
  initialState: InitialState;
  placeTypeLabel: PlaceTypeAndLabel;
}

export interface StaticProps {
  params: {
    place: string;
    byDate: string;
  };
}

export interface PlaceInitialState {
  // Only filter state - events are handled server-side
  place: string;
  byDate: string;
  category: EventCategory | "";
}

export interface PlaceProps {
  initialState: PlaceInitialState;
  placeTypeLabel: PlaceTypeAndLabel;
}

export interface PlaceStaticPathParams {
  place: string;
  [key: string]: string | string[] | undefined;
}

export type PlaceStaticPath = { params: PlaceStaticPathParams };

export interface MyErrorProps extends ErrorProps {
  hasGetInitialPropsRun: boolean;
  err?: Error;
}

export interface EditEventPageProps {
  params: {
    eventId: string;
  };
}

export interface ApiResponse {
  success: boolean;
  message?: string;
  event?: FormData;
}

export interface HomeInitialState {
  // Only initialize filter state - events are handled server-side
  userLocation?: EventLocation | null;
}

export interface TeamMember {
  name: string;
  role: string;
  title: string;
  image: string;
  linkedin: string;
}

export type DateRange = { from: Date; until: Date };

export type DateFunctionsMap = { [key: string]: () => DateRange };

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

export interface MonthProps {
  events: EventSummaryResponseDTO[];
  town: string;
  townLabel: string;
}

export interface MonthStaticPathParams {
  town: string;
  year?: string;
  month?: string;
  [key: string]: string | undefined;
}

export interface TownStaticPathParams {
  town: string;
  year?: string;
  month?: string;
  [key: string]: string | undefined;
}

export interface SitemapProps {
  town: string;
  label: string;
}

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

export interface LoaderProps {
  src: string;
  width: number;
  quality?: number;
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
}

export interface ActiveLinkProps extends LinkProps {
  children: React.ReactNode;
  activeLinkClass?: string;
  className?: string;
}

export interface URLFilters {
  category?: string;
  date?: string;
  distance?: string;
  searchTerm?: string;
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
