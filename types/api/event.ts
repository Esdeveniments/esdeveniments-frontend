import { CategorySummaryResponseDTO } from "./category";
import type { CitySummaryResponseDTO } from "./city";

export type EventType = "FREE" | "PAID";
export type EventOrigin = "SCRAPE" | "RSS" | "MANUAL" | "MIGRATION";

// Use the canonical CitySummaryResponseDTO from types/api/city
export interface RegionSummaryResponseDTO {
  id: number;
  name: string;
  slug: string;
}

export interface ProvinceSummaryResponseDTO {
  id: number;
  name: string;
  slug: string;
}

export interface EventSummaryResponseDTO {
  id: string; // UUID
  hash: string;
  slug: string;
  title: string;
  type: EventType;
  url: string;
  description: string;
  imageUrl: string;
  startDate: string; // ISO date
  startTime: string | null; // ISO time or null
  endDate: string; // ISO date
  endTime: string | null; // ISO time or null
  location: string;
  visits: number;
  origin: EventOrigin;
  // NOTE: These fields are marked optional due to a backend API issue where events
  // queried without a 'place' parameter may be returned without city/region/province.
  // According to Swagger, these should always be present. This is a workaround.
  // TODO: Fix backend to always return these fields and make them required again.
  city?: CitySummaryResponseDTO;
  region?: RegionSummaryResponseDTO;
  province?: ProvinceSummaryResponseDTO;
  categories: CategorySummaryResponseDTO[];
  updatedAt?: string; // ISO date string for last update
  weather?: {
    temperature: string;
    description: string;
    icon: string;
  };
  isAd?: boolean;
}

export interface AdEvent {
  isAd: true;
  id: string;
  images?: string[];
  location?: string;
  slug?: string;
  [key: string]: unknown;
}

export type ListEvent = EventSummaryResponseDTO | AdEvent;

export interface PagedResponseDTO<T> {
  content: T[];
  currentPage: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface EventDetailResponseDTO extends EventSummaryResponseDTO {
  duration?: string;
  videoUrl?: string;
  tags?: string[];
  relatedEvents?: EventSummaryResponseDTO[]; // Add related events from backend
}

export type CategorizedEvents = {
  [category: string]: EventSummaryResponseDTO[];
};

// --- Backend time object ---
export interface EventTimeDTO {
  hour: number;
  minute: number;
  second?: number;
  nano?: number;
}

// --- Event update (PUT) request DTO ---
export interface EventUpdateRequestDTO {
  title: string;
  type: EventType;
  url: string;
  description: string;
  imageUrl: string | null;
  regionId: number;
  cityId: number;
  startDate: string; // YYYY-MM-DD
  startTime: string;
  endDate: string;
  endTime: string;
  location: string;
  categories: number[];
}

// --- Event create (POST) request DTO ---
export interface EventCreateRequestDTO {
  title: string;
  type: EventType;
  url: string;
  description: string;
  imageUrl: string | null;
  regionId: number;
  cityId: number;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  location: string;
  categories: number[];
}
