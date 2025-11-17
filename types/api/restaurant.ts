/**
 * Restaurant promotion API types
 */

import { GeoScopeType, TaxMode } from "../../config/pricing";

export interface RestaurantLead {
  id: string;
  restaurantName: string;
  location: string;
  displayDurationDays: number;
  geoScopeType: GeoScopeType;
  geoScopeId: string;
  image: {
    public_id: string;
    secure_url: string;
  };
  eventId: string;
  placeId?: string; // Google Places ID
  status: "pending_payment" | "active" | "expired" | "cancelled";
  createdAt: string;
  expiresAt?: string;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
}

export interface CreateRestaurantLeadRequest {
  restaurantName: string;
  location: string;
  displayDurationDays: number;
  geoScopeType: GeoScopeType;
  geoScopeId: string;
  image: {
    public_id: string;
    secure_url: string;
  };
  eventId: string;
  placeId?: string;
  _honey?: string; // Honeypot field for spam protection
}

export interface CreateRestaurantLeadResponse {
  leadId: string;
}

export interface GooglePlace {
  place_id: string;
  name: string;
  vicinity: string;
  rating?: number;
  price_level?: number | string; // Google may return enum string or numeric (0-4)
  types: string[];
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  // Photos (Places API v1 only)
  photos?: Array<{
    name: string; // places/{place_id}/photos/{photo_id}
    widthPx?: number;
    heightPx?: number;
    authorAttributions?: Array<{
      displayName?: string;
      uri?: string;
      photoUri?: string;
    }>;
    googleMapsUri?: string;
  }>;
  // Structured address fields from postalAddress (preferred over 'vicinity')
  address_lines?: string[];
  address_locality?: string;
  address_administrative_area?: string;
  address_postal_code?: string;
  // Enriched fields returned by our nearby proxy (optional)
  business_status?: PlaceBusinessStatus;
  is_open_on_event_day?: boolean;
  open_confidence?: OpenConfidence; // confidence of open determination for event date
  hours_display?: string; // deprecated: use opening_info + format util
  raw_weekday_text?: string[]; // original weekday descriptions (if requested)
  opening_info?: OpeningInfo; // structured opening data (preferred)
}

export type OpenConfidence = "confirmed" | "inferred" | "none";

export interface OpeningSegment {
  start: string; // HH:MM 24h
  end: string; // HH:MM 24h (can be 24:00 for midnight)
  overnight: boolean;
  source: "current" | "regular";
}

export interface OpeningInfo {
  open_status: "open" | "closed" | "unknown"; // relative to now OR event date context
  open_confidence?: OpenConfidence;
  event_date?: string | null; // YYYY-MM-DD when filtering by date
  segments?: OpeningSegment[]; // relevant segments for the day
  is_24h?: boolean;
  next_change?: string; // ISO date-time (optional, not always provided)
  source?: "current" | "regular"; // which schedule produced segments
}

export interface PlaceOpeningHoursPoint {
  // google.type.Date subset (we only need calendar parts)
  date?:
    | string
    | {
        year?: number;
        month?: number;
        day?: number;
      };
  day?: number; // 0=Sunday ... 6=Saturday
  hour?: number;
  minute?: number;
  truncated?: boolean;
}

export interface PlaceOpeningHoursPeriod {
  open?: PlaceOpeningHoursPoint;
  close?: PlaceOpeningHoursPoint;
}

export interface PlaceCurrentOpeningHours {
  openNow?: boolean;
  periods?: PlaceOpeningHoursPeriod[];
  weekdayDescriptions?: string[];
}

export interface PlaceRegularOpeningHours {
  periods?: PlaceOpeningHoursPeriod[];
  weekdayDescriptions?: string[];
}

export type PlaceBusinessStatus =
  | "OPERATIONAL"
  | "CLOSED_TEMPORARILY"
  | "CLOSED_PERMANENTLY"
  | string; // fallback for unexpected values

// Extend existing GooglePlaceResponse (add these fields if not already present)
export interface GooglePlaceResponse {
  name?: string;
  displayName?: { text: string };
  formattedAddress?: string;
  rating?: number;
  priceLevel?: number;
  types?: string[];
  location?: { latitude: number; longitude: number };
  photos?: Array<{
    name: string;
    widthPx?: number;
    heightPx?: number;
    authorAttributions?: Array<{
      displayName?: string;
      uri?: string;
      photoUri?: string;
    }>;
    googleMapsUri?: string;
  }>;

  postalAddress?: {
    addressLines?: string[];
    locality?: string;
    administrativeArea?: string;
    postalCode?: string;
    regionCode?: string;
    languageCode?: string;
  };

  // Newly added:
  businessStatus?: PlaceBusinessStatus;
  currentOpeningHours?: PlaceCurrentOpeningHours;
  regularOpeningHours?: PlaceRegularOpeningHours;
  utcOffsetMinutes?: number;
}

export interface GooglePlacesNearbyResponse {
  results: GooglePlace[];
  status: string;
  error_message?: string;
}

/**
 * Google Places v1 Nearby Search request payload
 */
export interface GooglePlacesNearbyRequest {
  includedTypes: string[];
  maxResultCount: number;
  locationRestriction: {
    circle: {
      center: { latitude: number; longitude: number };
      radius: number; // meters
    };
  };
  rankPreference?: "POPULARITY" | "DISTANCE";
  languageCode?: string; // e.g. "ca" for Catalan
}

/**
 * Raw response from Google Places v1 searchNearby endpoint.
 * We only type the fields we request via the field mask.
 */
export interface GooglePlacesSearchNearbyRawResponse {
  places?: GooglePlaceResponse[];
  error?: {
    message?: string;
    status?: string;
    code?: number;
  };
}

export interface CloudinaryUploadResponse {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
}

export interface CloudinarySignatureResponse {
  signature: string;
  timestamp: number;
  cloud_name: string;
  api_key: string;
}

export interface StripeCheckoutRequest {
  leadId: string;
  eventId: string;
}

export interface StripeCheckoutResponse {
  sessionUrl: string;
  sessionId: string;
}

export interface ActivePromotion {
  id: string;
  restaurantName: string;
  location: string;
  image: {
    public_id: string;
    secure_url: string;
  };
  expiresAt: string;
  geoScopeType: GeoScopeType;
  geoScopeId: string;
}

export interface PromotionsConfigResponse {
  durations: number[];
  geoScopes: GeoScopeType[];
  currency: string;
  taxMode: TaxMode;
}

export interface PricePreviewRequest {
  durationDays: number;
  geoScopeType: GeoScopeType;
}

export interface PricePreviewResponse {
  currency: string;
  unitAmount: number;
}

export interface RestaurantPromotionSectionProps {
  eventId?: string; // Required if RestaurantPromotionForm is enabled
  eventLocation?: string;
  eventLat?: number;
  eventLng?: number;
  eventStartDate?: string; // ISO date string
  eventEndDate?: string; // ISO date string
  eventStartTime?: string | null; // ISO time string or null
  eventEndTime?: string | null; // ISO time string or null
}

export interface RestaurantPromotionFormProps {
  eventId: string;
  eventLocation?: string;
  onSuccess?: (leadId: string) => void;
  onError?: (error: string) => void;
}

export interface RestaurantFormData {
  restaurantName: string;
  location: string;
  displayDurationDays: number;
  geoScopeType: GeoScopeType;
  geoScopeId: string;
  image: {
    public_id: string;
    secure_url: string;
  } | null;
  placeId: string;
}

export interface PlacesResponse {
  results: GooglePlace[];
  status: string;
  attribution: string;
}

export interface WhereToEatSectionProps {
  places: GooglePlace[];
  attribution: string;
  /** Optional callback to open a promotion info modal */
  onPromoteClick?: () => void;
}

export interface PromotedRestaurantCardProps {
  promotion: ActivePromotion;
}

export interface CloudinaryUploadWidgetProps {
  onUpload: (imageData: { public_id: string; secure_url: string }) => void;
  image: { public_id: string; secure_url: string } | null;
}
