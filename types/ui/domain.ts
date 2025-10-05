import { CategorySummaryResponseDTO } from "types/api/category";
import { GeolocationPosition } from "types/common";
import { RouteSegments, URLQueryParams } from "types/url-filters";

export interface NewsCtaProps {
  href: string;
  label: string; // precomputed CTA label
  "data-cta"?: string;
}

export interface FiltersProps {
  /** Current route segments from the URL */
  segments: RouteSegments;
  /** Current query parameters from the URL */
  queryParams: URLQueryParams;
  /** Available event categories for filtering */
  categories?: CategorySummaryResponseDTO[];
  /** Label for the current place type */
  placeTypeLabel?: { label: string };
  /** Current user location for distance filtering */
  userLocation?: GeolocationPosition | { latitude: number; longitude: number };
  /** Callback when filters are applied */
  onFiltersApplied?: () => void;
  /** Additional CSS classes */
  className?: string;
}

export interface FiltersState {
  /** Whether the filter modal is open */
  isModalOpen: boolean;
  /** Whether geolocation is currently loading */
  isLocationLoading: boolean;
  /** Any error message from geolocation */
  locationError: string | null;
}

export interface WeatherProps {
  /** Weather data for display */
  weather?: {
    temperature: string;
    description: string;
    icon: string;
  };
  /** Additional CSS classes */
  className?: string;
}
