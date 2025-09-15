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
  price_level?: number;
  types: string[];
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
  }>;
}

export interface GooglePlaceNewApi {
  place_id: string;
  name: string;
  vicinity: string;
  rating?: number;
  price_level?: number;
  types?: string[];
  location?: {
    latitude: number;
    longitude: number;
  };
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
  }>;
}

export interface GooglePlacesNearbyResponse {
  results: GooglePlace[];
  status: string;
  error_message?: string;
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
  eventId: string;
  eventLocation?: string;
  eventLat?: number;
  eventLng?: number;
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
}

export interface PromotedRestaurantCardProps {
  promotion: ActivePromotion;
}

export interface CloudinaryUploadWidgetProps {
  onUpload: (imageData: { public_id: string; secure_url: string }) => void;
  image: { public_id: string; secure_url: string } | null;
}
