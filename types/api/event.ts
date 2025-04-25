export type EventType = "FREE" | "PAID";
export type EventOrigin = "SCRAPE" | "RSS" | "MANUAL" | "MIGRATION";

export interface CategorySummaryResponseDTO {
  id: number;
  name: string;
}

export interface CitySummaryResponseDTO {
  id: number;
  name: string;
  slug: string;
  latitude: number;
  longitude: number;
  postalCode: string;
  rssFeed: string | null;
  enabled: boolean;
}

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
  city: CitySummaryResponseDTO;
  region: RegionSummaryResponseDTO;
  province: ProvinceSummaryResponseDTO;
  categories: CategorySummaryResponseDTO[];
  weather?: {
    description?: string;
    icon?: string;
  };
  isAd?: boolean;
}

export interface AdEvent {
  isAd: true;
  id: string;
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
  startTime: EventTimeDTO;
  endDate: string;
  endTime: EventTimeDTO;
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
  startTime: EventTimeDTO;
  endDate: string;
  endTime: EventTimeDTO;
  location: string;
  categories: number[];
}
